// Pequeño libro de aperturas (en SAN). Los bots lo usan unas cuantas jugadas
// para no empezar todas las partidas igual y para "parecer" que conocen teoría.

const LINES = [
  // Italiana / Giuoco Piano
  'e4 e5 Nf3 Nc6 Bc4 Bc5 c3 Nf6 d3 d6 O-O O-O',
  'e4 e5 Nf3 Nc6 Bc4 Nf6 d3 Bc5 c3 d6 O-O a6',
  'e4 e5 Nf3 Nc6 Bc4 Bc5 b4 Bxb4 c3 Ba5 d4 exd4',
  // Española
  'e4 e5 Nf3 Nc6 Bb5 a6 Ba4 Nf6 O-O Be7 Re1 b5 Bb3 d6 c3 O-O',
  'e4 e5 Nf3 Nc6 Bb5 a6 Bxc6 dxc6 O-O f6 d4 exd4 Nxd4 c5',
  'e4 e5 Nf3 Nc6 Bb5 Nf6 O-O Nxe4 d4 Nd6 Bxc6 dxc6 dxe5 Nf5',
  // Escocesa / Vienesa / Rey
  'e4 e5 Nf3 Nc6 d4 exd4 Nxd4 Bc5 Be3 Qf6 c3 Nge7',
  'e4 e5 Nc3 Nf6 f4 d5 fxe5 Nxe4 Nf3 Be7',
  'e4 e5 f4 exf4 Nf3 g5 h4 g4 Ne5',
  'e4 e5 Nf3 Nf6 Nxe5 d6 Nf3 Nxe4 d4 d5 Bd3 Nc6 O-O Be7',
  // Siciliana
  'e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 a6 Be3 e5 Nb3 Be6',
  'e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 g6 Be3 Bg7 f3 O-O Qd2 Nc6',
  'e4 c5 Nf3 Nc6 d4 cxd4 Nxd4 Nf6 Nc3 e5 Ndb5 d6 Bg5 a6 Na3 b5',
  'e4 c5 Nf3 e6 d4 cxd4 Nxd4 Nc6 Nc3 Qc7 Be3 a6 Qd2 Nf6',
  'e4 c5 Nc3 Nc6 g3 g6 Bg2 Bg7 d3 d6 f4 e6',
  'e4 c5 c3 d5 exd5 Qxd5 d4 Nf6 Nf3 Bg4',
  // Francesa / Caro-Kann / Escandinava / Pirc
  'e4 e6 d4 d5 Nc3 Bb4 e5 c5 a3 Bxc3+ bxc3 Ne7',
  'e4 e6 d4 d5 Nd2 Nf6 e5 Nfd7 Bd3 c5 c3 Nc6 Ne2 cxd4 cxd4 f6',
  'e4 e6 d4 d5 e5 c5 c3 Nc6 Nf3 Qb6 a3 c4',
  'e4 c6 d4 d5 Nc3 dxe4 Nxe4 Bf5 Ng3 Bg6 h4 h6 Nf3 Nd7',
  'e4 c6 d4 d5 e5 Bf5 Nf3 e6 Be2 c5 Be3 Qb6',
  'e4 c6 d4 d5 exd5 cxd5 c4 Nf6 Nc3 e6 Nf3 Be7',
  'e4 d5 exd5 Qxd5 Nc3 Qa5 d4 Nf6 Nf3 c6 Bc4 Bf5',
  'e4 d5 exd5 Nf6 d4 Nxd5 c4 Nb6 Nf3 g6',
  'e4 d6 d4 Nf6 Nc3 g6 Nf3 Bg7 Be2 O-O O-O c6',
  'e4 g6 d4 Bg7 Nc3 d6 f4 Nf6 Nf3 O-O Bd3',
  // Gambito de dama / Eslava / Londres
  'd4 d5 c4 e6 Nc3 Nf6 Bg5 Be7 e3 O-O Nf3 h6 Bh4 b6',
  'd4 d5 c4 e6 Nc3 Nf6 cxd5 exd5 Bg5 Be7 e3 c6 Bd3 Nbd7',
  'd4 d5 c4 c6 Nf3 Nf6 Nc3 dxc4 a4 Bf5 e3 e6 Bxc4 Bb4',
  'd4 d5 c4 c6 Nc3 Nf6 e3 e6 Nf3 Nbd7 Bd3 dxc4 Bxc4 b5',
  'd4 d5 c4 dxc4 Nf3 Nf6 e3 e6 Bxc4 c5 O-O a6',
  'd4 d5 Nf3 Nf6 Bf4 e6 e3 c5 c3 Nc6 Nbd2 Bd6 Bg3 O-O Bd3',
  'd4 Nf6 Nf3 g6 Bf4 Bg7 e3 O-O h3 d6 Be2 c5',
  'd4 d5 Bf4 Nf6 e3 c5 c3 Nc6 Nd2 e6 Ngf3 Bd6',
  // India de rey / Nimzo / Grünfeld / Benoni
  'd4 Nf6 c4 g6 Nc3 Bg7 e4 d6 Nf3 O-O Be2 e5 O-O Nc6 d5 Ne7',
  'd4 Nf6 c4 g6 Nc3 Bg7 e4 d6 f3 O-O Be3 e5 d5 Nh5',
  'd4 Nf6 c4 e6 Nc3 Bb4 e3 O-O Bd3 d5 Nf3 c5 O-O Nc6',
  'd4 Nf6 c4 e6 Nc3 Bb4 Qc2 O-O a3 Bxc3+ Qxc3 b6',
  'd4 Nf6 c4 g6 Nc3 d5 cxd5 Nxd5 e4 Nxc3 bxc3 Bg7 Nf3 c5',
  'd4 Nf6 c4 e6 Nf3 b6 g3 Bb7 Bg2 Be7 O-O O-O Nc3 Ne4',
  'd4 Nf6 c4 c5 d5 e6 Nc3 exd5 cxd5 d6 e4 g6 Nf3 Bg7',
  // Inglesa / Reti
  'c4 e5 Nc3 Nf6 g3 d5 cxd5 Nxd5 Bg2 Nb6 Nf3 Nc6 O-O Be7',
  'c4 c5 Nf3 Nf6 Nc3 Nc6 g3 d5 cxd5 Nxd5 Bg2 Nc7',
  'c4 Nf6 Nc3 e6 Nf3 d5 d4 Be7 Bg5 O-O e3 h6',
  'Nf3 d5 g3 Nf6 Bg2 e6 O-O Be7 d3 O-O Nbd2 c5',
  'Nf3 Nf6 c4 g6 g3 Bg7 Bg2 O-O O-O d6 d4 Nbd7',
  // Líneas "de principiante" (para bots de Elo bajo)
  'e4 e5 Qh5 Nc6 Bc4 g6 Qf3 Nf6',
  'e4 e5 Bc4 Nf6 d3 Nc6 Nf3 Bc5 O-O d6',
  'e4 e5 Nf3 d6 d4 Bg4 dxe5 Bxf3 Qxf3 dxe5 Bc4 Nf6',
  'e4 e5 Nf3 Nc6 Bc4 h6 d3 Nf6 Nc3 d6',
  'd4 d5 Nc3 Nf6 Bf4 Bf5 f3 e6 g4 Bg6',
  'e4 d5 exd5 Qxd5 Nc3 Qe5+ Be2 c6 d4 Qc7',
  'e4 e5 Nf3 Nc6 Nc3 Nf6 Bc4 Bc5 d3 d6 Bg5 h6',
  'e4 c5 Bc4 e6 Nc3 Nc6 d3 d5 exd5 exd5 Bb3 Nf6',
  'e4 e5 d4 exd4 Qxd4 Nc6 Qe3 Nf6 Nc3 Bb4 Bd2 O-O',
  'd4 e5 dxe5 Nc6 Nf3 Qe7 Bf4 Qb4+ Bd2 Qxb2',
];

const BOOK = LINES.map((l) => l.split(' '));

// Devuelve las posibles continuaciones del libro para el historial dado (SAN).
export function bookMoves(history) {
  const out = new Map();
  for (const line of BOOK) {
    if (line.length <= history.length) continue;
    let ok = true;
    for (let i = 0; i < history.length; i++) if (line[i] !== history[i]) { ok = false; break; }
    if (!ok) continue;
    const san = line[history.length];
    out.set(san, (out.get(san) || 0) + 1);
  }
  return [...out.entries()].map(([san, weight]) => ({ san, weight }));
}

// Número de medias jugadas que el bot sigue el libro según su Elo (con ruido).
export function bookDepthFor(elo, rng = Math.random) {
  const base = elo < 700 ? 3 : elo < 1000 ? 5 : elo < 1400 ? 7 : elo < 1900 ? 10 : 14;
  return base + Math.floor(rng() * 4) - 1;
}
