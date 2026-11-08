// Personajes: nombres, países, estilos y frases para que los rivales parezcan personas.

export const BOTS = [
  // ---- 300-700: principiantes ----
  { id: 'lucia_m', name: 'lucia_m04', flag: '🇪🇸', rating: 380, style: 'aggressive', lang: 'es', chat: 0.8, title: '' },
  { id: 'pepe_r', name: 'PepeRuiz1962', flag: '🇪🇸', rating: 450, style: 'solid', lang: 'es', chat: 0.6 },
  { id: 'tommy', name: 'tommy_plays', flag: '🇬🇧', rating: 520, style: 'aggressive', lang: 'en', chat: 0.7 },
  { id: 'anita', name: 'anitaxd', flag: '🇲🇽', rating: 590, style: 'tricky', lang: 'es', chat: 0.9 },
  { id: 'kavi', name: 'Kavi_2011', flag: '🇮🇳', rating: 650, style: 'aggressive', lang: 'en', chat: 0.4 },
  { id: 'marcos', name: 'MarcosDelBarrio', flag: '🇦🇷', rating: 710, style: 'tricky', lang: 'es', chat: 0.8 },
  // ---- 750-1100 ----
  { id: 'elena', name: 'Elena_Petrova', flag: '🇷🇺', rating: 770, style: 'solid', lang: 'en', chat: 0.3 },
  { id: 'joao', name: 'joaozinho_sp', flag: '🇧🇷', rating: 830, style: 'aggressive', lang: 'es', chat: 0.7 },
  { id: 'hans', name: 'HansMueller', flag: '🇩🇪', rating: 890, style: 'solid', lang: 'en', chat: 0.3 },
  { id: 'sofi', name: 'sofi_valencia', flag: '🇪🇸', rating: 950, style: 'balanced', lang: 'es', chat: 0.6 },
  { id: 'omar', name: 'omar.hdz', flag: '🇲🇽', rating: 1010, style: 'tricky', lang: 'es', chat: 0.5 },
  { id: 'nguyen', name: 'nguyen_vt', flag: '🇻🇳', rating: 1070, style: 'aggressive', lang: 'en', chat: 0.2 },
  // ---- 1100-1500 ----
  { id: 'carla', name: 'CarlaBCN', flag: '🇪🇸', rating: 1130, style: 'balanced', lang: 'es', chat: 0.5 },
  { id: 'mike', name: 'MikeFromOhio', flag: '🇺🇸', rating: 1190, style: 'aggressive', lang: 'en', chat: 0.6 },
  { id: 'piotr', name: 'Piotr_K', flag: '🇵🇱', rating: 1250, style: 'solid', lang: 'en', chat: 0.2 },
  { id: 'dani', name: 'danirojas', flag: '🇨🇴', rating: 1310, style: 'tricky', lang: 'es', chat: 0.7 },
  { id: 'yuki', name: 'yuki_chess', flag: '🇯🇵', rating: 1370, style: 'solid', lang: 'en', chat: 0.3 },
  { id: 'alvaro', name: 'alvaro_gm_wannabe', flag: '🇪🇸', rating: 1440, style: 'aggressive', lang: 'es', chat: 0.9 },
  { id: 'fatima', name: 'Fatima_Z', flag: '🇲🇦', rating: 1490, style: 'balanced', lang: 'es', chat: 0.4 },
  // ---- 1500-1900 ----
  { id: 'giorgi', name: 'GiorgiTbilisi', flag: '🇬🇪', rating: 1560, style: 'aggressive', lang: 'en', chat: 0.3 },
  { id: 'ines', name: 'ines.ferreira', flag: '🇵🇹', rating: 1620, style: 'solid', lang: 'es', chat: 0.4 },
  { id: 'sergio', name: 'SergioTorres77', flag: '🇪🇸', rating: 1690, style: 'balanced', lang: 'es', chat: 0.5 },
  { id: 'amir', name: 'amir_tehrani', flag: '🇮🇷', rating: 1750, style: 'tricky', lang: 'en', chat: 0.2 },
  { id: 'lea', name: 'LeaDubois', flag: '🇫🇷', rating: 1810, style: 'solid', lang: 'en', chat: 0.3 },
  { id: 'rodrigo', name: 'rodrigo_chess', flag: '🇨🇱', rating: 1870, style: 'aggressive', lang: 'es', chat: 0.4 },
  // ---- 1900-2300 ----
  { id: 'viktor', name: 'ViktorS', flag: '🇺🇦', rating: 1940, style: 'balanced', lang: 'en', chat: 0.2 },
  { id: 'nerea', name: 'nerea_endgames', flag: '🇪🇸', rating: 2010, style: 'solid', lang: 'es', chat: 0.4 },
  { id: 'arjun', name: 'ArjunRao', flag: '🇮🇳', rating: 2080, style: 'tricky', lang: 'en', chat: 0.2 },
  { id: 'mateo', name: 'MateoFerrer', flag: '🇪🇸', rating: 2150, style: 'aggressive', lang: 'es', chat: 0.3, title: 'CM' },
  { id: 'olga', name: 'Olga_Ivanova', flag: '🇷🇺', rating: 2220, style: 'solid', lang: 'en', chat: 0.1, title: 'WFM' },
  { id: 'lucas', name: 'LucasBrandt', flag: '🇳🇱', rating: 2290, style: 'balanced', lang: 'en', chat: 0.2, title: 'FM' },
  // ---- 2300-2650: maestros ----
  { id: 'javier', name: 'JavierOrtega', flag: '🇪🇸', rating: 2360, style: 'balanced', lang: 'es', chat: 0.3, title: 'FM' },
  { id: 'magnusfan', name: 'Erlend_N', flag: '🇳🇴', rating: 2430, style: 'solid', lang: 'en', chat: 0.1, title: 'IM' },
  { id: 'diego', name: 'DiegoFlores', flag: '🇵🇪', rating: 2500, style: 'aggressive', lang: 'es', chat: 0.2, title: 'IM' },
  { id: 'levon', name: 'Levon_A', flag: '🇦🇲', rating: 2580, style: 'balanced', lang: 'en', chat: 0.1, title: 'GM' },
  { id: 'wei', name: 'WeiChen', flag: '🇨🇳', rating: 2650, style: 'solid', lang: 'en', chat: 0.05, title: 'GM' },
];

const PHRASES = {
  es: {
    hello: ['hola', 'hola, suerte', 'buenas!', 'hola! buena partida', 'ey, suerte 🙂', 'hola, a ver qué tal'],
    gg_won: ['gg', 'buena partida', 'gg, bien jugado', 'gracias por la partida', 'gg wp'],
    gg_lost: ['gg', 'bien jugado', 'buena, me has pillado', 'gg, la próxima te pillo', 'uf, bien jugado', 'gg bp'],
    blunder: ['uf', 'ay no', 'madre mía', 'no lo he visto...', 'vaya', 'ufff', 'que mal'],
    big_capture: ['toma', 'jeje', 'gracias', 'eso no lo esperabas', '😏'],
    lost_piece: ['uy', 'vaya regalo', 'no me puede pasar esto', 'ups'],
    thanks: ['de nada', 'igualmente', '🙂', 'a ti'],
    reply_hello: ['hola!', 'buenas', 'hola, suerte', 'hey'],
    reply_gg: ['gg', 'igualmente', 'buena partida', 'gracias'],
    draw_decline: ['no, gracias', 'aún no', 'sigamos', 'todavía hay partida'],
    draw_accept: ['vale, tablas', 'ok tablas', 'tablas, buena partida'],
    resign: ['me rindo, gg', 'gg, bien jugado', 'esto está perdido, gg'],
    check_fun: ['jaque!', 'cuidado'],
    time: ['qué rápido vas', 'me quedo sin tiempo...'],
  },
  en: {
    hello: ['hi', 'hello, gl', 'hey gl hf', 'good luck!', 'hi there', 'glhf'],
    gg_won: ['gg', 'good game', 'gg wp', 'thanks for the game', 'ggs'],
    gg_lost: ['gg', 'well played', 'gg wp', 'nice one', 'gg, you got me', 'wp'],
    blunder: ['oops', 'ugh', 'no...', 'didnt see that', 'damn', 'ouch'],
    big_capture: ['thanks', 'hehe', 'nice', 'ty', '😏'],
    lost_piece: ['oops', 'what a gift', 'ugh', 'my bad'],
    thanks: ['np', 'you too', '🙂', 'sure'],
    reply_hello: ['hi!', 'hey', 'hello, gl', 'hi gl'],
    reply_gg: ['gg', 'you too', 'good game', 'thanks'],
    draw_decline: ['no thanks', 'not yet', 'lets play on', 'still a game'],
    draw_accept: ['ok draw', 'sure, draw', 'draw, gg'],
    resign: ['i resign, gg', 'gg wp', 'lost, gg'],
    check_fun: ['check!', 'careful'],
    time: ['so fast', 'running out of time...'],
  },
};

export function phrase(bot, key, rng = Math.random) {
  const list = PHRASES[bot.lang]?.[key] || PHRASES.es[key] || [];
  if (!list.length) return null;
  return list[Math.floor(rng() * list.length)];
}

export const STYLE_LABEL = {
  aggressive: 'Agresivo',
  solid: 'Sólido',
  tricky: 'Táctico',
  balanced: 'Equilibrado',
};

export function levelName(rating) {
  if (rating < 600) return 'Novato';
  if (rating < 1000) return 'Principiante';
  if (rating < 1400) return 'Intermedio';
  if (rating < 1800) return 'Avanzado';
  if (rating < 2200) return 'Experto';
  if (rating < 2500) return 'Maestro';
  return 'Gran Maestro';
}

// Color de avatar determinista por id.
export function avatarColor(id) {
  let h = 0;
  for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  const hues = [8, 28, 48, 140, 170, 200, 220, 260, 290, 330];
  return `hsl(${hues[h % hues.length]} 55% 45%)`;
}

// Elige el siguiente rival en función del Elo del jugador y la racha.
export function pickOpponent(playerRating, streak, lastBotId, rng = Math.random) {
  let target = playerRating;
  if (streak > 0) target += 25 + 20 * Math.min(streak, 4) + rng() * 40; // rachas → rivales más fuertes
  else if (streak < 0) target -= 15 + 15 * Math.min(-streak, 3) + rng() * 30;
  target += (rng() - 0.5) * 80;
  const sorted = [...BOTS].sort((a, b) => Math.abs(a.rating - target) - Math.abs(b.rating - target));
  let candidates = sorted.slice(0, 3).filter((b) => b.id !== lastBotId);
  if (!candidates.length) candidates = sorted.slice(0, 1);
  const bot = candidates[Math.floor(rng() * candidates.length)];
  // Su Elo también fluctúa un poco, como el de una persona real.
  const shown = Math.round(bot.rating + (rng() - 0.5) * 70);
  return { ...bot, shownRating: shown };
}
