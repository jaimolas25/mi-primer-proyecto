// Caché en memoria muy sencilla con caducidad, para no pedir a YouTube
// lo mismo una y otra vez (y para no hacer saltar sus límites).

export class TtlCache {
  constructor({ ttlMs = 60 * 60 * 1000, maxEntries = 500 } = {}) {
    this.ttlMs = ttlMs;
    this.maxEntries = maxEntries;
    this.map = new Map();
  }

  get(key) {
    const entry = this.map.get(key);
    if (!entry) return undefined;
    if (entry.expires < Date.now()) {
      this.map.delete(key);
      return undefined;
    }
    // Lo movemos al final para que se comporte como "menos usado recientemente".
    this.map.delete(key);
    this.map.set(key, entry);
    return entry.value;
  }

  set(key, value) {
    if (this.map.size >= this.maxEntries) {
      const oldest = this.map.keys().next().value;
      this.map.delete(oldest);
    }
    this.map.set(key, { value, expires: Date.now() + this.ttlMs });
    return value;
  }
}

// Límite de peticiones por IP: como mucho `limit` peticiones por `windowMs`.
export class RateLimiter {
  constructor({ limit = 30, windowMs = 60 * 1000 } = {}) {
    this.limit = limit;
    this.windowMs = windowMs;
    this.hits = new Map();
  }

  allow(key) {
    const now = Date.now();
    const recent = (this.hits.get(key) || []).filter((t) => now - t < this.windowMs);
    if (recent.length >= this.limit) {
      this.hits.set(key, recent);
      return false;
    }
    recent.push(now);
    this.hits.set(key, recent);
    if (this.hits.size > 10000) this.hits.clear();
    return true;
  }
}
