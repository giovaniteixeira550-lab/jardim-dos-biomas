/**
 * Planta autoral dos patamares, em coordenadas canônicas de 180 × 120 m.
 * As bordas são contornos de uma crista e de suas saias, não curvas de nível
 * de um cone. Trechos longos, pontas e reentrâncias amplas formam os paredões.
 */
export const FORMACOES_PLANEJADAS = Object.freeze([
  {
    id: "saia-baixa",
    descricao: "Saia ligada à crista NW, com promontório diagonal até o terceiro salto e reentrâncias largas no sul.",
    patamar: 1,
    pontos: [[-15,-7],[3,-15],[27,-14],[50,-8],[60,-2],[66,9],[68,19],[75,25],[76,34],[82,38],[87,46],[93,52],[93,59],[88,65],[76,70],[65,68],[58,72],[48,68],[38,72],[27,65],[18,63],[7,57],[-7,57],[-17,44],[-22,26]],
  },
  {
    id: "ombro-medio",
    descricao: "Ombro assimétrico apoiado na crista, com a primeira bacia e saída do rio entre 62/40 e 69/47.",
    patamar: 2,
    pontos: [[-8,3],[9,-4],[30,-3],[48,3],[56,12],[55,20],[61,24],[60,31],[65,37],[63,44],[54,49],[43,50],[37,44],[25,47],[16,44],[10,39],[-2,37],[-8,27]],
  },
  {
    id: "crista-alta",
    descricao: "Crista alongada de oeste para leste, preservando a nascente 31/17 e o mirante 25/24; o rio deixa o topo perto de 39/24.",
    patamar: 3,
    pontos: [[3,10],[15,4],[35,5],[46,13],[43,20],[38,25],[38,29],[27,34],[13,34],[8,27],[1,24]],
  },
].map((formacao) => Object.freeze({
  ...formacao,
  pontos: Object.freeze(formacao.pontos.map((ponto) => Object.freeze(ponto))),
})));

// Limites e segmentos prontos: a geração consulta este campo centenas de
// milhares de vezes; só há uma raiz quadrada por contorno próximo ao jardim.
const contornos = FORMACOES_PLANEJADAS.map(({ pontos }) => ({
  xmin: Math.min(...pontos.map((p) => p[0])), xmax: Math.max(...pontos.map((p) => p[0])),
  ymin: Math.min(...pontos.map((p) => p[1])), ymax: Math.max(...pontos.map((p) => p[1])),
  arestas: pontos.map((p, i) => {
    const q = pontos[(i + 1) % pontos.length], dx = q[0] - p[0], dy = q[1] - p[1];
    return { x: p[0], y: p[1], qx: q[0], qy: q[1], dx, dy, inverso: 1 / (dx * dx + dy * dy) };
  }),
}));

const meiaTransicao = 1.6;

function ocupacao(x, y, contorno) {
  if (x < contorno.xmin - meiaTransicao || x > contorno.xmax + meiaTransicao ||
      y < contorno.ymin - meiaTransicao || y > contorno.ymax + meiaTransicao) return 0;
  let dentro = false, d2 = Infinity;
  for (const a of contorno.arestas) {
    if ((a.y > y) !== (a.qy > y) && x < a.x + (y - a.y) * a.dx / a.dy) dentro = !dentro;
    const t = Math.max(0, Math.min(1, ((x - a.x) * a.dx + (y - a.y) * a.dy) * a.inverso));
    const dx = x - a.x - a.dx * t, dy = y - a.y - a.dy * t;
    d2 = Math.min(d2, dx * dx + dy * dy);
  }
  if (d2 >= meiaTransicao * meiaTransicao) return dentro ? 1 : 0;
  const distanciaAssinada = Math.sqrt(d2) * (dentro ? 1 : -1);
  const t = Math.max(0, Math.min(1, (distanciaAssinada + meiaTransicao) / (meiaTransicao * 2)));
  return t * t * (3 - 2 * t);
}

/** Campo de níveis: base 0,35; terraços 1,35 / 2,35 / 3,35. Sem sorteio. */
export function elevacaoPlanejada(px, py) {
  return 0.35 + ocupacao(px, py, contornos[0]) + ocupacao(px, py, contornos[1]) + ocupacao(px, py, contornos[2]);
}
