// Servidor HTTP del proxy de transcripciones de YouTube.
//
//   GET /                         -> la página web (public/index.html)
//   GET /api/transcript?url=...   -> la transcripción (json | text | srt | vtt)
//   GET /api/languages?url=...    -> idiomas de subtítulos disponibles
//   GET /api/health               -> comprobación de que el servidor vive
//
// Parámetros de /api/transcript:
//   url     URL o ID del vídeo (obligatorio)
//   lang    idiomas preferidos separados por coma, p. ej. "es,en" (opcional)
//   format  json (por defecto), text, srt o vtt
//   timestamps=1  en formato text, añade [m:ss] delante de cada línea
//   download=1    fuerza la descarga como archivo

import http from "node:http";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { extractVideoId, getTranscript, getLanguages, TranscriptError } from "./lib/youtube.js";
import { toPlainText, toSrt, toVtt, FORMATS } from "./lib/format.js";
import { TtlCache, RateLimiter } from "./lib/cache.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = path.join(__dirname, "public");

const PORT = Number(process.env.PORT) || 3000;
const CACHE_TTL_MS = Number(process.env.CACHE_TTL_SECONDS || 3600) * 1000;
const RATE_LIMIT = Number(process.env.RATE_LIMIT_PER_MINUTE || 30);
// Orígenes permitidos para CORS. "*" deja que cualquier web use la API.
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || "*";

const cache = new TtlCache({ ttlMs: CACHE_TTL_MS });
const limiter = new RateLimiter({ limit: RATE_LIMIT });

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
};

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
  };
}

function send(res, status, body, headers = {}) {
  res.writeHead(status, { ...corsHeaders(), ...headers });
  res.end(body);
}

function sendJson(res, status, data, headers = {}) {
  send(res, status, JSON.stringify(data), { "Content-Type": FORMATS.json.contentType, ...headers });
}

function clientIp(req) {
  const forwarded = req.headers["x-forwarded-for"];
  return (typeof forwarded === "string" ? forwarded.split(",")[0].trim() : "") || req.socket.remoteAddress || "?";
}

function safeFilename(text) {
  return (text || "transcripcion").replace(/[^\p{L}\p{N} _-]+/gu, "").trim().slice(0, 80) || "transcripcion";
}

// ---------------------------------------------------------------------------
// Rutas de la API
// ---------------------------------------------------------------------------
async function handleTranscript(url, res) {
  const videoId = extractVideoId(url.searchParams.get("url") || url.searchParams.get("v") || url.searchParams.get("id"));
  if (!videoId) {
    throw new TranscriptError("Falta el parámetro `url` o no parece una URL de YouTube válida.", 400, "bad_url");
  }

  const langs = (url.searchParams.get("lang") || "")
    .split(",")
    .map((l) => l.trim())
    .filter(Boolean);
  const format = (url.searchParams.get("format") || "json").toLowerCase();
  if (!FORMATS[format]) {
    throw new TranscriptError("Formato no válido. Usa json, text, srt o vtt.", 400, "bad_format");
  }

  const cacheKey = `${videoId}|${langs.join(",")}`;
  let result = cache.get(cacheKey);
  let fromCache = true;
  if (!result) {
    fromCache = false;
    result = await getTranscript(videoId, langs);
    cache.set(cacheKey, result);
  }

  const headers = {
    "Content-Type": FORMATS[format].contentType,
    "X-Cache": fromCache ? "HIT" : "MISS",
    "Cache-Control": "public, max-age=3600",
  };
  if (url.searchParams.get("download") === "1") {
    const name = `${safeFilename(result.info?.title)}.${FORMATS[format].extension}`;
    headers["Content-Disposition"] = `attachment; filename*=UTF-8''${encodeURIComponent(name)}`;
  }

  if (format === "json") {
    return sendJson(res, 200, result, headers);
  }
  const timestamps = url.searchParams.get("timestamps") === "1";
  const body =
    format === "srt" ? toSrt(result.segments) :
    format === "vtt" ? toVtt(result.segments) :
    toPlainText(result.segments, { timestamps });
  return send(res, 200, body, headers);
}

async function handleLanguages(url, res) {
  const videoId = extractVideoId(url.searchParams.get("url") || url.searchParams.get("v") || url.searchParams.get("id"));
  if (!videoId) {
    throw new TranscriptError("Falta el parámetro `url` o no parece una URL de YouTube válida.", 400, "bad_url");
  }
  const cacheKey = `langs|${videoId}`;
  let result = cache.get(cacheKey);
  if (!result) {
    result = await getLanguages(videoId);
    cache.set(cacheKey, result);
  }
  return sendJson(res, 200, result);
}

// ---------------------------------------------------------------------------
// Archivos estáticos (la página web)
// ---------------------------------------------------------------------------
async function serveStatic(pathname, res) {
  const relative = pathname === "/" ? "index.html" : pathname.slice(1);
  const filePath = path.normalize(path.join(PUBLIC_DIR, relative));
  if (!filePath.startsWith(PUBLIC_DIR)) return send(res, 403, "Prohibido");
  try {
    const data = await readFile(filePath);
    const type = MIME[path.extname(filePath)] || "application/octet-stream";
    return send(res, 200, data, { "Content-Type": type });
  } catch {
    return send(res, 404, "No encontrado", { "Content-Type": "text/plain; charset=utf-8" });
  }
}

// ---------------------------------------------------------------------------
// Servidor
// ---------------------------------------------------------------------------
export function createServer() {
  return http.createServer(async (req, res) => {
    const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);

    if (req.method === "OPTIONS") return send(res, 204, "");
    if (req.method !== "GET" && req.method !== "HEAD") {
      return sendJson(res, 405, { error: "Método no permitido", code: "method_not_allowed" });
    }

    try {
      if (url.pathname.startsWith("/api/")) {
        if (url.pathname === "/api/health") return sendJson(res, 200, { ok: true });

        if (!limiter.allow(clientIp(req))) {
          throw new TranscriptError("Demasiadas peticiones. Espera un minuto.", 429, "rate_limited");
        }
        if (url.pathname === "/api/transcript") return await handleTranscript(url, res);
        if (url.pathname === "/api/languages") return await handleLanguages(url, res);
        return sendJson(res, 404, { error: "Ruta no encontrada", code: "not_found" });
      }
      return await serveStatic(url.pathname, res);
    } catch (err) {
      const status = err instanceof TranscriptError ? err.status : 500;
      const message = err instanceof TranscriptError ? err.message : "Error interno del servidor.";
      if (status >= 500) console.error(`[${new Date().toISOString()}] ${req.url}:`, err);
      return sendJson(res, status, { error: message, code: err.code || "internal" });
    }
  });
}

// Solo arrancamos si este archivo se ejecuta directamente (no al importarlo en tests).
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  createServer().listen(PORT, () => {
    console.log(`Proxy de transcripciones escuchando en http://localhost:${PORT}`);
  });
}
