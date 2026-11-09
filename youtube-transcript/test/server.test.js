// Pruebas del servidor con un `fetch` falso que imita a YouTube,
// así no hace falta conexión a internet para ejecutarlas.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";

const VIDEO = "dQw4w9WgXcQ";
const realFetch = globalThis.fetch;

const playerResponse = {
  playabilityStatus: { status: "OK" },
  videoDetails: { videoId: VIDEO, title: "Vídeo de prueba", author: "Canal", lengthSeconds: "10" },
  captions: {
    playerCaptionsTracklistRenderer: {
      captionTracks: [
        { baseUrl: "https://www.youtube.com/api/timedtext?v=x&lang=es", languageCode: "es", name: { simpleText: "Español" } },
        { baseUrl: "https://www.youtube.com/api/timedtext?v=x&lang=en&kind=asr", languageCode: "en", kind: "asr", name: { simpleText: "English (auto)" }, isTranslatable: true },
      ],
      translationLanguages: [{ languageCode: "de", languageName: { simpleText: "German" } }],
    },
  },
};

function fakeFetch(url, options = {}) {
  const u = String(url);
  const ok = (body, type = "text/plain") =>
    new Response(typeof body === "string" ? body : JSON.stringify(body), { status: 200, headers: { "Content-Type": type } });

  if (u.startsWith("https://www.youtube.com/watch?v=")) {
    const id = u.slice(-11);
    if (id === "nocaptions0") return Promise.resolve(ok(`<html>ytInitialPlayerResponse = ${JSON.stringify({ playabilityStatus: { status: "OK" } })};</html>`));
    if (id === "missing0000") return Promise.resolve(ok(`<html>ytInitialPlayerResponse = ${JSON.stringify({ playabilityStatus: { status: "ERROR", reason: "Video unavailable" } })};</html>`));
    return Promise.resolve(ok(`<html>"INNERTUBE_API_KEY":"KEY123" ytInitialPlayerResponse = ${JSON.stringify(playerResponse)};</html>`));
  }
  if (u.startsWith("https://www.youtube.com/youtubei/v1/player")) {
    assert.equal(options.method, "POST");
    return Promise.resolve(ok(playerResponse, "application/json"));
  }
  if (u.startsWith("https://www.youtube.com/api/timedtext")) {
    if (u.includes("tlang=de")) return Promise.resolve(ok(`<transcript><text start="0" dur="1">Hallo</text></transcript>`));
    if (u.includes("lang=en")) return Promise.resolve(ok(JSON.stringify({ events: [{ tStartMs: 0, dDurationMs: 1000, segs: [{ utf8: "Hello" }] }] })));
    return Promise.resolve(ok(`<transcript><text start="0" dur="1.5">Hola a todos</text><text start="1.5" dur="2">Segunda frase</text></transcript>`));
  }
  if (u.startsWith("https://www.youtube.com/oembed")) {
    return Promise.resolve(ok({ title: "Vídeo de prueba (oEmbed)", author_name: "Canal", thumbnail_url: "https://i.ytimg.com/vi/x/hqdefault.jpg" }, "application/json"));
  }
  return Promise.resolve(new Response("not found", { status: 404 }));
}

let server;
let base;

before(async () => {
  globalThis.fetch = fakeFetch;
  const { createServer } = await import("../server.js");
  server = createServer();
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  base = `http://127.0.0.1:${server.address().port}`;
});

after(() => {
  globalThis.fetch = realFetch;
  server.close();
});

// Usamos el fetch real para hablar con nuestro propio servidor.
const call = (path, init) => realFetch(base + path, init);

test("GET / sirve la página", async () => {
  const res = await call("/");
  assert.equal(res.status, 200);
  assert.match(res.headers.get("content-type"), /text\/html/);
  assert.match(await res.text(), /Transcriptor de YouTube/);
});

test("GET /api/health", async () => {
  const res = await call("/api/health");
  assert.deepEqual(await res.json(), { ok: true });
});

test("transcripción en JSON con caché", async () => {
  const res = await call(`/api/transcript?url=https://youtu.be/${VIDEO}`);
  assert.equal(res.status, 200);
  assert.equal(res.headers.get("x-cache"), "MISS");
  assert.equal(res.headers.get("access-control-allow-origin"), "*");
  const data = await res.json();
  assert.equal(data.videoId, VIDEO);
  assert.equal(data.language, "es");
  assert.equal(data.isGenerated, false);
  assert.equal(data.info.title, "Vídeo de prueba (oEmbed)");
  assert.equal(data.info.lengthSeconds, 10);
  assert.deepEqual(data.segments, [
    { start: 0, duration: 1.5, text: "Hola a todos" },
    { start: 1.5, duration: 2, text: "Segunda frase" },
  ]);
  assert.equal(data.availableLanguages.length, 2);
  assert.equal("baseUrl" in data.availableLanguages[0], false);

  const again = await call(`/api/transcript?url=https://youtu.be/${VIDEO}`);
  assert.equal(again.headers.get("x-cache"), "HIT");
});

test("formato text, srt y vtt", async () => {
  const text = await (await call(`/api/transcript?url=${VIDEO}&format=text`)).text();
  assert.equal(text, "Hola a todos Segunda frase");
  const stamped = await (await call(`/api/transcript?url=${VIDEO}&format=text&timestamps=1`)).text();
  assert.equal(stamped, "[0:00] Hola a todos\n[0:01] Segunda frase");

  const srt = await call(`/api/transcript?url=${VIDEO}&format=srt&download=1`);
  assert.match(srt.headers.get("content-disposition"), /attachment; filename\*=UTF-8''V%C3%ADdeo/);
  assert.match(await srt.text(), /^1\n00:00:00,000 --> 00:00:01,500\nHola a todos/);

  const vtt = await (await call(`/api/transcript?url=${VIDEO}&format=vtt`)).text();
  assert.match(vtt, /^WEBVTT/);
});

test("idioma automático (json3) y traducción", async () => {
  const en = await (await call(`/api/transcript?url=${VIDEO}&lang=en`)).json();
  assert.equal(en.isGenerated, true);
  assert.deepEqual(en.segments, [{ start: 0, duration: 1, text: "Hello" }]);

  const de = await (await call(`/api/transcript?url=${VIDEO}&lang=de`)).json();
  assert.equal(de.isTranslated, true);
  assert.equal(de.language, "de");
  assert.equal(de.languageName, "German");
  assert.equal(de.segments[0].text, "Hallo");
});

test("lista de idiomas", async () => {
  const res = await call(`/api/languages?url=${VIDEO}`);
  const data = await res.json();
  assert.equal(data.tracks.length, 2);
  assert.deepEqual(data.translations, [{ languageCode: "de", name: "German" }]);
});

test("errores con códigos claros", async () => {
  let res = await call(`/api/transcript?url=https://vimeo.com/1`);
  assert.equal(res.status, 400);
  assert.equal((await res.json()).code, "bad_url");

  res = await call(`/api/transcript?url=${VIDEO}&format=pdf`);
  assert.equal(res.status, 400);

  res = await call(`/api/transcript?url=${VIDEO}&lang=ja`);
  assert.equal(res.status, 404);
  assert.equal((await res.json()).code, "language_unavailable");

  res = await call(`/api/transcript?url=nocaptions0`);
  assert.equal(res.status, 404);
  assert.equal((await res.json()).code, "no_captions");

  res = await call(`/api/transcript?url=missing0000`);
  assert.equal(res.status, 404);
  assert.equal((await res.json()).code, "not_found");

  res = await call(`/api/nada`);
  assert.equal(res.status, 404);

  res = await call(`/api/health`, { method: "POST" });
  assert.equal(res.status, 405);
});

test("no permite salir de la carpeta public", async () => {
  const res = await call("/..%2F..%2Fserver.js");
  assert.notEqual(res.status, 200);
});
