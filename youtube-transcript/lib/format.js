// Convierte la lista de segmentos { start, duration, text } a distintos formatos.

function pad(n, width = 2) {
  return String(n).padStart(width, "0");
}

// 83.5 -> "00:01:23,500" (SRT usa coma; VTT usa punto)
export function formatTimestamp(seconds, separator = ",") {
  const total = Math.max(0, seconds);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = Math.floor(total % 60);
  const ms = Math.round((total - Math.floor(total)) * 1000);
  return `${pad(h)}:${pad(m)}:${pad(s)}${separator}${pad(ms, 3)}`;
}

// 83.5 -> "1:23" (para mostrar en pantalla)
export function formatClock(seconds) {
  const total = Math.max(0, Math.floor(seconds));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return h ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}

export function toPlainText(segments, { timestamps = false } = {}) {
  if (timestamps) {
    return segments.map((s) => `[${formatClock(s.start)}] ${s.text}`).join("\n");
  }
  return segments.map((s) => s.text).join(" ");
}

export function toSrt(segments) {
  return segments
    .map((s, i) => {
      const end = s.start + (s.duration || 0);
      return `${i + 1}\n${formatTimestamp(s.start)} --> ${formatTimestamp(end)}\n${s.text}\n`;
    })
    .join("\n");
}

export function toVtt(segments) {
  const cues = segments.map((s) => {
    const end = s.start + (s.duration || 0);
    return `${formatTimestamp(s.start, ".")} --> ${formatTimestamp(end, ".")}\n${s.text}\n`;
  });
  return "WEBVTT\n\n" + cues.join("\n");
}

export const FORMATS = {
  json: { contentType: "application/json; charset=utf-8", extension: "json" },
  text: { contentType: "text/plain; charset=utf-8", extension: "txt" },
  srt: { contentType: "application/x-subrip; charset=utf-8", extension: "srt" },
  vtt: { contentType: "text/vtt; charset=utf-8", extension: "vtt" },
};
