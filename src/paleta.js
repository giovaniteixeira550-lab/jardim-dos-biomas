/**
 * Paleta do Jardim — direção de arte "pixel art de cena 3D".
 *
 * Toda cor que chega à tela é UMA destas (quantização no pós-processamento,
 * com dithering ordenado entre as duas mais próximas). Cada material usa uma
 * cor-base da sua rampa; a luz em 3 faixas + a quantização escolhem os tons
 * vizinhos da mesma rampa. Rampas vão do escuro ao claro.
 *
 * Inspiração: ilustração de referência (verdes-sálvia dessaturados, tinta
 * verde-escura) + vivacidade de jogo (acentos de outono/flor/água).
 */
export const RAMPAS = {
  tinta: ["#141c18", "#1e2a22"],
  mata: ["#22382b", "#2f5236", "#3f6e3c", "#568a45", "#75a650", "#9cc364", "#c6dd84"],
  salvia: ["#4f6447", "#5d7350", "#74895c", "#8c9f6b", "#a6b67f", "#c0cb97"],
  agua: ["#1e3b45", "#28566a", "#34748a", "#4f97a3", "#86c2bd", "#c7e6d8"],
  terra: ["#3e3126", "#5a4635", "#7a604a", "#9c8062", "#bfa37f", "#dcc69c"],
  outono: ["#6e3221", "#a24f2a", "#d07a36", "#ecab4c", "#f6d27a"],
  flor: ["#7a3d5c", "#b8648a", "#e399b6", "#f6cddc"],
  vermelho: ["#6e1f24", "#a8323a", "#d65a4e"],
  lilas: ["#4b3266", "#6f52a0", "#9b80cc", "#c9b6ea"],
  amarelo: ["#a8801e", "#e0b52c", "#f6dc5c"],
  pedra: ["#3a3f3e", "#585f5c", "#7c847e", "#a5ac9f", "#cfd4c4"],
  betula: ["#e9e3d1"],
  noite: ["#11162a", "#1d2845", "#2e4068", "#4a6290"],
  luz: ["#fff3c4"],
};

/** Lista plana (ordem estável) para o shader de quantização. */
export const PALETA = Object.values(RAMPAS).flat();

const hex = (h) => [parseInt(h.slice(1, 3), 16) / 255, parseInt(h.slice(3, 5), 16) / 255, parseInt(h.slice(5, 7), 16) / 255];
/** Paleta em sRGB 0..1 (o shader compara no espaço de exibição). */
export const PALETA_RGB = PALETA.map(hex);

/** Cor-base de cada material (índice na rampa: meio-tom; a luz sobe/desce). */
export const BASE = {
  carvalho: RAMPAS.mata[3],
  freixo: RAMPAS.mata[4],
  betula: RAMPAS.mata[5],
  pinheiro: RAMPAS.mata[2],
  salgueiro: RAMPAS.mata[4],
  outonal: RAMPAS.outono[2],
  dourada: RAMPAS.outono[3],
  cerejeira: RAMPAS.flor[2],
  arbusto: RAMPAS.mata[3],
  casca: RAMPAS.terra[1],
  cascaBetula: RAMPAS.betula[0],
  pedra: RAMPAS.pedra[2],
  musgo: RAMPAS.mata[3],
  agua: RAMPAS.agua[2],
};
