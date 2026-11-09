// Lógica para hablar con YouTube y sacar la transcripción de un vídeo.
// No usa ninguna librería externa: solo el `fetch` que trae Node 18+.

const WATCH_URL = "https://www.youtube.com/watch?v=";
const INNERTUBE_URL = "https://www.youtube.com/youtubei/v1/player?key=";
const OEMBED_URL = "https://www.youtube.com/oembed?format=json&url=";

// Cabeceras que imitan a un navegador normal. YouTube devuelve páginas
// distintas (o directamente una pantalla de consentimiento) si no las ve.
const BROWSER_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
  "Accept-Language": "en-US,en;q=0.9",
  Cookie: "CONSENT=YES+cb; SOCS=CAI",
};

// Error con código HTTP para que el servidor sepa qué responder.
export class TranscriptError extends Error {
  constructor(message, status = 400, code = "error") {
    super(message);
    this.status = status;
    this.code = code;
  }
}

// ---------------------------------------------------------------------------
// 1. Sacar el identificador del vídeo (los 11 caracteres) de cualquier URL
// ---------------------------------------------------------------------------
const ID_RE = /^[A-Za-z0-9_-]{11}$/;

export function extractVideoId(input) {
  if (!input) return null;
  const text = String(input).trim();
  if (ID_RE.test(text)) return text;

  let url;
  try {
    url = new URL(text.includes("://") ? text : "https://" + text);
  } catch {
    return null;
  }

  const host = url.hostname.replace(/^www\.|^m\.|^music\./, "");
  if (host === "youtu.be") {
    const id = url.pathname.split("/")[1];
    return ID_RE.test(id || "") ? id : null;
  }
  if (host !== "youtube.com" && host !== "youtube-nocookie.com") return null;

  const fromQuery = url.searchParams.get("v");
  if (fromQuery && ID_RE.test(fromQuery)) return fromQuery;

  // /shorts/ID, /embed/ID, /live/ID, /v/ID, /e/ID
  const match = url.pathname.match(/^\/(?:shorts|embed|live|v|e)\/([A-Za-z0-9_-]{11})/);
  return match ? match[1] : null;
}

// ---------------------------------------------------------------------------
// 2. Pedir a YouTube los datos del reproductor (ahí vienen los subtítulos)
// ---------------------------------------------------------------------------
async function fetchText(url, options = {}) {
  const res = await fetch(url, { ...options, headers: { ...BROWSER_HEADERS, ...(options.headers || {}) } });
  if (!res.ok) {
    throw new TranscriptError(`YouTube respondió ${res.status} al pedir ${new URL(url).pathname}`, 502, "upstream");
  }
  return res.text();
}

// Busca `ytInitialPlayerResponse = {...};` dentro del HTML de la página.
export function parsePlayerResponseFromHtml(html) {
  const start = html.indexOf("ytInitialPlayerResponse");
  if (start === -1) return null;
  const braceStart = html.indexOf("{", start);
  if (braceStart === -1) return null;

  // Recorremos el texto contando llaves para encontrar dónde acaba el JSON.
  let depth = 0;
  let inString = false;
  for (let i = braceStart; i < html.length; i++) {
    const ch = html[i];
    if (inString) {
      if (ch === "\\") i++;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') inString = true;
    else if (ch === "{") depth++;
    else if (ch === "}") {
      depth--;
      if (depth === 0) {
        try {
          return JSON.parse(html.slice(braceStart, i + 1));
        } catch {
          return null;
        }
      }
    }
  }
  return null;
}

function extractApiKey(html) {
  const match = html.match(/"INNERTUBE_API_KEY":"([^"]+)"/);
  return match ? match[1] : null;
}

async function fetchPlayerResponse(videoId) {
  const html = await fetchText(WATCH_URL + videoId);

  if (html.includes('action="https://consent.youtube.com/s"')) {
    throw new TranscriptError("YouTube pide aceptar cookies desde esta IP; inténtalo desde otro servidor.", 502, "consent");
  }

  // Primera opción: la API interna ("innertube") con el cliente Android,
  // que es la que suele devolver las pistas de subtítulos completas.
  const apiKey = extractApiKey(html);
  if (apiKey) {
    try {
      const res = await fetch(INNERTUBE_URL + apiKey, {
        method: "POST",
        headers: { ...BROWSER_HEADERS, "Content-Type": "application/json" },
        body: JSON.stringify({
          context: { client: { clientName: "ANDROID", clientVersion: "20.10.38" } },
          videoId,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data?.captions || data?.playabilityStatus) return data;
      }
    } catch {
      // Si falla, probamos con el HTML de la propia página.
    }
  }

  const fromHtml = parsePlayerResponseFromHtml(html);
  if (fromHtml) return fromHtml;

  throw new TranscriptError("No se pudo leer la información del vídeo en YouTube.", 502, "parse");
}

function assertPlayable(player) {
  const status = player?.playabilityStatus?.status;
  const reason = player?.playabilityStatus?.reason || "";
  if (!status || status === "OK") return;
  if (status === "LOGIN_REQUIRED") {
    throw new TranscriptError("El vídeo requiere iniciar sesión (restricción de edad o privado).", 403, "login_required");
  }
  if (status === "ERROR") {
    throw new TranscriptError(reason || "El vídeo no existe o ha sido retirado.", 404, "not_found");
  }
  if (status === "UNPLAYABLE") {
    throw new TranscriptError(reason || "El vídeo no se puede reproducir (puede ser de pago o estar bloqueado).", 403, "unplayable");
  }
  if (status === "LIVE_STREAM_OFFLINE") {
    throw new TranscriptError("El directo aún no ha empezado; no hay transcripción.", 404, "live_offline");
  }
}

// ---------------------------------------------------------------------------
// 3. Listar las pistas de subtítulos disponibles
// ---------------------------------------------------------------------------
function trackName(track) {
  return track?.name?.simpleText || track?.name?.runs?.map((r) => r.text).join("") || track?.languageCode || "";
}

export function listTracks(player) {
  const renderer = player?.captions?.playerCaptionsTracklistRenderer;
  const tracks = (renderer?.captionTracks || []).map((t) => ({
    languageCode: t.languageCode,
    name: trackName(t),
    isGenerated: t.kind === "asr",
    isTranslatable: Boolean(t.isTranslatable),
    baseUrl: t.baseUrl,
  }));
  const translations = (renderer?.translationLanguages || []).map((l) => ({
    languageCode: l.languageCode,
    name: l.languageName?.simpleText || l.languageName?.runs?.map((r) => r.text).join("") || l.languageCode,
  }));
  return { tracks, translations };
}

// Elige la pista que mejor encaja con los idiomas pedidos.
// Si nada encaja pero alguna pista es traducible, devolvemos esa pista con
// `translateTo` para pedirle a YouTube la traducción automática.
export function pickTrack(tracks, translations, preferred = []) {
  if (!tracks.length) return null;
  const wanted = preferred.map((l) => l.toLowerCase()).filter(Boolean);

  for (const lang of wanted) {
    // Preferimos subtítulos hechos a mano sobre los generados automáticamente.
    const manual = tracks.find((t) => t.languageCode.toLowerCase() === lang && !t.isGenerated);
    if (manual) return { track: manual, translateTo: null };
    const auto = tracks.find((t) => t.languageCode.toLowerCase() === lang);
    if (auto) return { track: auto, translateTo: null };
    // Variante regional: "es" sirve para "es-419", "en" para "en-GB"...
    const regional = tracks.find((t) => t.languageCode.toLowerCase().split("-")[0] === lang.split("-")[0]);
    if (regional) return { track: regional, translateTo: null };
  }

  for (const lang of wanted) {
    const canTranslate = translations.some((l) => l.languageCode.toLowerCase() === lang);
    const source = tracks.find((t) => t.isTranslatable);
    if (canTranslate && source) return { track: source, translateTo: lang };
  }

  if (wanted.length) return null;
  const manual = tracks.find((t) => !t.isGenerated);
  return { track: manual || tracks[0], translateTo: null };
}

// ---------------------------------------------------------------------------
// 4. Descargar y convertir los subtítulos a una lista de segmentos
//    { start, duration, text } (tiempos en segundos)
// ---------------------------------------------------------------------------
const ENTITIES = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", "#39": "'", nbsp: " " };

export function decodeEntities(text) {
  return text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (whole, entity) => {
    if (entity[0] === "#") {
      const code = entity[1].toLowerCase() === "x" ? parseInt(entity.slice(2), 16) : parseInt(entity.slice(1), 10);
      return Number.isFinite(code) ? String.fromCodePoint(code) : whole;
    }
    return ENTITIES[entity.toLowerCase()] ?? whole;
  });
}

// YouTube a veces codifica las entidades dos veces (&amp;#39;), así que
// decodificamos, quitamos las etiquetas (<i>, <b>...) y decodificamos otra vez.
function cleanText(text) {
  const once = decodeEntities(text);
  return decodeEntities(once.replace(/<[^>]+>/g, "")).replace(/\s+/g, " ").trim();
}

// Formato clásico: <text start="1.23" dur="4.5">Hola</text>
export function parseXmlTranscript(xml) {
  const segments = [];
  const re = /<text\b([^>]*)>([\s\S]*?)<\/text>/g;
  let match;
  while ((match = re.exec(xml))) {
    const attrs = match[1];
    const start = parseFloat(attrs.match(/start="([^"]+)"/)?.[1] ?? "0");
    const duration = parseFloat(attrs.match(/dur="([^"]+)"/)?.[1] ?? "0");
    const text = cleanText(match[2]);
    if (text) segments.push({ start, duration, text });
  }
  return segments;
}

// Formato json3: { events: [ { tStartMs, dDurationMs, segs: [ { utf8 } ] } ] }
export function parseJson3Transcript(json) {
  const data = typeof json === "string" ? JSON.parse(json) : json;
  const segments = [];
  for (const event of data?.events || []) {
    if (!event.segs) continue;
    const text = cleanText(event.segs.map((s) => s.utf8 || "").join(""));
    if (!text) continue;
    segments.push({
      start: (event.tStartMs || 0) / 1000,
      duration: (event.dDurationMs || 0) / 1000,
      text,
    });
  }
  return segments;
}

async function downloadTrack(track, translateTo) {
  let url = track.baseUrl;
  if (translateTo) url += `&tlang=${encodeURIComponent(translateTo)}`;
  const body = await fetchText(url);
  if (!body.trim()) {
    throw new TranscriptError("YouTube devolvió la pista de subtítulos vacía.", 502, "empty");
  }
  const segments = body.trim().startsWith("{") ? parseJson3Transcript(body) : parseXmlTranscript(body);
  if (!segments.length) {
    throw new TranscriptError("No se pudo interpretar la pista de subtítulos.", 502, "parse");
  }
  return segments;
}

// ---------------------------------------------------------------------------
// 5. Información básica del vídeo (título, canal, miniatura) vía oEmbed
// ---------------------------------------------------------------------------
async function fetchVideoInfo(videoId) {
  try {
    const res = await fetch(OEMBED_URL + encodeURIComponent(WATCH_URL + videoId), { headers: BROWSER_HEADERS });
    if (!res.ok) return null;
    const data = await res.json();
    return {
      title: data.title,
      author: data.author_name,
      authorUrl: data.author_url,
      thumbnail: data.thumbnail_url,
    };
  } catch {
    return null;
  }
}

function infoFromPlayer(player) {
  const d = player?.videoDetails;
  if (!d) return null;
  const thumbs = d.thumbnail?.thumbnails || [];
  return {
    title: d.title,
    author: d.author,
    authorUrl: d.channelId ? `https://www.youtube.com/channel/${d.channelId}` : undefined,
    thumbnail: thumbs.length ? thumbs[thumbs.length - 1].url : `https://i.ytimg.com/vi/${d.videoId}/hqdefault.jpg`,
    lengthSeconds: d.lengthSeconds ? Number(d.lengthSeconds) : undefined,
  };
}

// ---------------------------------------------------------------------------
// 6. Funciones públicas que usa el servidor
// ---------------------------------------------------------------------------
export async function getLanguages(videoId) {
  const player = await fetchPlayerResponse(videoId);
  assertPlayable(player);
  const { tracks, translations } = listTracks(player);
  return {
    videoId,
    tracks: tracks.map(({ baseUrl, ...rest }) => rest),
    translations,
  };
}

export async function getTranscript(videoId, preferredLanguages = []) {
  const player = await fetchPlayerResponse(videoId);
  assertPlayable(player);

  const { tracks, translations } = listTracks(player);
  if (!tracks.length) {
    throw new TranscriptError("Este vídeo no tiene subtítulos ni transcripción automática.", 404, "no_captions");
  }

  const choice = pickTrack(tracks, translations, preferredLanguages);
  if (!choice) {
    const available = tracks.map((t) => t.languageCode).join(", ");
    throw new TranscriptError(`No hay subtítulos en ese idioma. Disponibles: ${available}.`, 404, "language_unavailable");
  }

  const [segments, info] = await Promise.all([
    downloadTrack(choice.track, choice.translateTo),
    fetchVideoInfo(videoId).then((i) => i || infoFromPlayer(player)),
  ]);

  return {
    videoId,
    url: WATCH_URL + videoId,
    info: { ...(infoFromPlayer(player) || {}), ...(info || {}) },
    language: choice.translateTo || choice.track.languageCode,
    languageName: choice.translateTo
      ? translations.find((l) => l.languageCode === choice.translateTo)?.name || choice.translateTo
      : choice.track.name,
    isGenerated: choice.track.isGenerated,
    isTranslated: Boolean(choice.translateTo),
    availableLanguages: tracks.map(({ baseUrl, ...rest }) => rest),
    segments,
  };
}
