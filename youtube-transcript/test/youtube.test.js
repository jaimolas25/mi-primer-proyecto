import { test } from "node:test";
import assert from "node:assert/strict";

import {
  extractVideoId,
  parsePlayerResponseFromHtml,
  listTracks,
  pickTrack,
  parseXmlTranscript,
  parseJson3Transcript,
  decodeEntities,
} from "../lib/youtube.js";
import { toPlainText, toSrt, toVtt, formatTimestamp, formatClock } from "../lib/format.js";
import { TtlCache, RateLimiter } from "../lib/cache.js";

test("extrae el ID de distintos tipos de URL", () => {
  const id = "dQw4w9WgXcQ";
  const urls = [
    id,
    `https://www.youtube.com/watch?v=${id}`,
    `https://youtube.com/watch?v=${id}&t=42s`,
    `https://m.youtube.com/watch?feature=share&v=${id}`,
    `https://youtu.be/${id}`,
    `https://youtu.be/${id}?si=abc`,
    `https://www.youtube.com/shorts/${id}`,
    `https://www.youtube.com/embed/${id}`,
    `https://www.youtube.com/live/${id}?feature=share`,
    `https://www.youtube-nocookie.com/embed/${id}`,
    `youtube.com/watch?v=${id}`,
    `  https://www.youtube.com/watch?v=${id}  `,
  ];
  for (const url of urls) assert.equal(extractVideoId(url), id, url);
});

test("rechaza lo que no es un vídeo de YouTube", () => {
  for (const bad of ["", null, "hola", "https://vimeo.com/12345", "https://www.youtube.com/", "https://www.youtube.com/@canal", "abc"]) {
    assert.equal(extractVideoId(bad), null, String(bad));
  }
});

test("saca ytInitialPlayerResponse del HTML", () => {
  const html = `<script>var a = 1; var ytInitialPlayerResponse = {"a":{"b":"}{\\"x"},"c":[1,2]};var b=2;</script>`;
  assert.deepEqual(parsePlayerResponseFromHtml(html), { a: { b: '}{"x' }, c: [1, 2] });
  assert.equal(parsePlayerResponseFromHtml("<html></html>"), null);
});

const player = {
  captions: {
    playerCaptionsTracklistRenderer: {
      captionTracks: [
        { baseUrl: "https://x/en-asr", languageCode: "en", kind: "asr", name: { runs: [{ text: "English (auto-generated)" }] }, isTranslatable: true },
        { baseUrl: "https://x/en", languageCode: "en", name: { simpleText: "English" }, isTranslatable: true },
        { baseUrl: "https://x/es-419", languageCode: "es-419", name: { simpleText: "Spanish (Latin America)" } },
      ],
      translationLanguages: [{ languageCode: "fr", languageName: { simpleText: "French" } }],
    },
  },
};

test("lista pistas y traducciones", () => {
  const { tracks, translations } = listTracks(player);
  assert.equal(tracks.length, 3);
  assert.equal(tracks[0].isGenerated, true);
  assert.equal(tracks[0].name, "English (auto-generated)");
  assert.deepEqual(translations, [{ languageCode: "fr", name: "French" }]);
});

test("elige la pista adecuada", () => {
  const { tracks, translations } = listTracks(player);
  // Sin preferencia: la primera manual
  assert.equal(pickTrack(tracks, translations).track.baseUrl, "https://x/en");
  // Preferencia exacta: manual antes que automática
  assert.equal(pickTrack(tracks, translations, ["en"]).track.baseUrl, "https://x/en");
  // Variante regional
  assert.equal(pickTrack(tracks, translations, ["es"]).track.baseUrl, "https://x/es-419");
  // Primer idioma no existe, segundo sí
  assert.equal(pickTrack(tracks, translations, ["de", "es"]).track.baseUrl, "https://x/es-419");
  // Traducción automática
  const fr = pickTrack(tracks, translations, ["fr"]);
  assert.equal(fr.translateTo, "fr");
  assert.equal(fr.track.isTranslatable, true);
  // Imposible
  assert.equal(pickTrack(tracks, translations, ["ja"]), null);
  assert.equal(pickTrack([], [], ["en"]), null);
});

test("interpreta subtítulos en XML", () => {
  const xml = `<?xml version="1.0" encoding="utf-8" ?><transcript>
    <text start="0.5" dur="2.25">Hola &amp;amp; bienvenidos</text>
    <text start="2.75" dur="1">&lt;i&gt;segunda&lt;/i&gt;   l&#237;nea</text>
    <text start="4" dur="1"></text>
  </transcript>`;
  assert.deepEqual(parseXmlTranscript(xml), [
    { start: 0.5, duration: 2.25, text: "Hola & bienvenidos" },
    { start: 2.75, duration: 1, text: "segunda línea" },
  ]);
});

test("interpreta subtítulos en json3", () => {
  const json = JSON.stringify({
    events: [
      { tStartMs: 0, dDurationMs: 1500, segs: [{ utf8: "Hola" }, { utf8: " mundo" }] },
      { tStartMs: 1500, dDurationMs: 1000 },
      { tStartMs: 2500, dDurationMs: 1000, segs: [{ utf8: "\n" }] },
    ],
  });
  assert.deepEqual(parseJson3Transcript(json), [{ start: 0, duration: 1.5, text: "Hola mundo" }]);
});

test("decodifica entidades HTML", () => {
  assert.equal(decodeEntities("&amp;&lt;&gt;&quot;&#39;&#x41;&nbsp;x&desconocida;"), `&<>"'A x&desconocida;`);
});

const segments = [
  { start: 0, duration: 1.5, text: "Primera" },
  { start: 61.25, duration: 2, text: "Segunda" },
  { start: 3725.5, duration: 1, text: "Tercera" },
];

test("formatos de tiempo", () => {
  assert.equal(formatTimestamp(61.25), "00:01:01,250");
  assert.equal(formatTimestamp(61.25, "."), "00:01:01.250");
  assert.equal(formatClock(61), "1:01");
  assert.equal(formatClock(3725), "1:02:05");
});

test("texto plano, SRT y VTT", () => {
  assert.equal(toPlainText(segments), "Primera Segunda Tercera");
  assert.equal(toPlainText(segments, { timestamps: true }), "[0:00] Primera\n[1:01] Segunda\n[1:02:05] Tercera");
  assert.equal(
    toSrt(segments),
    "1\n00:00:00,000 --> 00:00:01,500\nPrimera\n\n2\n00:01:01,250 --> 00:01:03,250\nSegunda\n\n3\n01:02:05,500 --> 01:02:06,500\nTercera\n"
  );
  assert.ok(toVtt(segments).startsWith("WEBVTT\n\n00:00:00.000 --> 00:00:01.500\nPrimera\n"));
});

test("la caché caduca y limita el tamaño", async () => {
  const cache = new TtlCache({ ttlMs: 20, maxEntries: 2 });
  cache.set("a", 1);
  cache.set("b", 2);
  cache.set("c", 3);
  assert.equal(cache.get("a"), undefined);
  assert.equal(cache.get("c"), 3);
  await new Promise((r) => setTimeout(r, 30));
  assert.equal(cache.get("c"), undefined);
});

test("el limitador de peticiones corta al superar el límite", () => {
  const limiter = new RateLimiter({ limit: 2, windowMs: 1000 });
  assert.equal(limiter.allow("ip"), true);
  assert.equal(limiter.allow("ip"), true);
  assert.equal(limiter.allow("ip"), false);
  assert.equal(limiter.allow("otra"), true);
});
