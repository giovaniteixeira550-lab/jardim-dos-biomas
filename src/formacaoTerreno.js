/**
 * Planta autoral dos patamares, em coordenadas canônicas de 180 × 120 m.
 * Seis regiões têm silhuetas curvas próprias e vales entre elas.
 * Cumes deslocados evitam a repetição de anéis concêntricos.
 */
const desenho = [
  {
    id: "saia-baixa", grupo: "nascente",
    descricao: "Saia ligada à crista NW, com promontório diagonal até o terceiro salto e reentrâncias largas no sul.",
    patamar: 1,
    pontos: [[-15,-7],[3,-15],[27,-14],[50,-8],[60,-2],[66,9],[68,19],[75,25],[76,34],[82,38],[87,46],[93,52],[93,59],[88,65],[76,70],[65,68],[58,72],[48,68],[38,72],[27,65],[18,63],[7,57],[-7,57],[-17,44],[-22,26]],
  },
  {
    id: "ombro-medio", grupo: "nascente", apoio: "saia-baixa",
    descricao: "Ombro assimétrico apoiado na crista, com a primeira bacia e saída do rio entre 62/40 e 69/47.",
    patamar: 2,
    pontos: [[-8,3],[9,-4],[30,-3],[48,3],[56,12],[55,20],[61,24],[60,31],[65,37],[63,44],[54,49],[43,50],[37,44],[25,47],[16,44],[10,39],[-2,37],[-8,27]],
  },
  {
    id: "crista-alta", grupo: "nascente", apoio: "ombro-medio",
    descricao: "Crista alongada de oeste para leste, preservando a nascente 31/17 e o mirante 25/24; o rio deixa o topo perto de 39/24.",
    patamar: 3,
    pontos: [[3,10],[15,4],[35,5],[46,13],[43,20],[38,25],[38,29],[27,34],[13,34],[8,27],[1,24]],
  },
  {id:"espigao-norte", grupo:"norte", patamar:1,
    descricao:"Espigão sinuoso ao norte, separado do corredor da ponte.",
    pontos:[[72,-17],[91,-12],[100,-4],[114,-2],[125,7],[121,17],[109,22],[99,31],[88,30],[84,21],[76,16],[69,5]]},
  {id:"serra-leste", grupo:"leste", patamar:1,
    descricao:"Encosta ramificada ao fundo do pavilhão, com a estrada no vale ao sul.",
    pontos:[[133,-14],[155,-12],[165,-4],[185,-1],[196,13],[188,28],[179,33],[177,43],[163,42],[153,34],[143,35],[138,23],[128,15]]},
  {id:"cume-leste", grupo:"leste", apoio:"serra-leste", patamar:2,
    descricao:"Cume deslocado para leste, com terraço largo voltado ao vale.",
    pontos:[[150,1],[164,5],[180,7],[182,17],[170,24],[158,23],[149,15]]},
  {id:"encosta-poente", grupo:"poente", patamar:1,
    descricao:"Encosta de chegada, separada da nascente por uma passagem larga.",
    pontos:[[-19,72],[-5,70],[2,79],[14,87],[28,89],[34,99],[47,104],[50,118],[38,132],[18,135],[3,123],[-9,121],[-18,104]]},
  {id:"ombro-poente", grupo:"poente", apoio:"encosta-poente", patamar:2,
    descricao:"Ombro longitudinal no sul, fora do jardim de chegada.",
    pontos:[[-6,92],[5,96],[12,105],[27,110],[35,118],[24,124],[12,121],[2,113],[-7,109]]},
  {id:"lombo-sul", grupo:"sul", patamar:1,
    descricao:"Lombo baixo alongado que preserva a margem sul do lago.",
    pontos:[[65,91],[78,88],[86,94],[98,96],[105,104],[101,116],[91,126],[74,130],[61,122],[57,109]]},
  {id:"promontorio-lago", grupo:"lago", patamar:1,
    descricao:"Promontório oriental separado da margem, sem formar um anel ao redor da água.",
    pontos:[[166,74],[177,69],[190,79],[193,95],[186,104],[184,119],[173,132],[158,129],[151,119],[155,108],[154,98],[162,90]]},
];

// Curvas autorais com tangentes curtas: suavizam os cantos sem converter
// as encostas em círculos ou criar ondulações aleatórias.
function curvar(pontos) {
  const resultado=[], n=pontos.length;
  for(let i=0;i<n;i++) {
    const a=pontos[(i+n-1)%n], b=pontos[i], c=pontos[(i+1)%n], d=pontos[(i+2)%n];
    for(let j=0;j<6;j++) {
      const t=j/6, t2=t*t, t3=t2*t;
      resultado.push([0,1].map(k=>(2*t3-3*t2+1)*b[k]+(t3-2*t2+t)*.35*(c[k]-a[k])+
        (-2*t3+3*t2)*c[k]+(t3-t2)*.35*(d[k]-b[k])));
    }
  }
  return resultado;
}
export const FORMACOES_PLANEJADAS = Object.freeze(desenho.map((formacao) => Object.freeze({
  ...formacao,
  pontos: Object.freeze(curvar(formacao.pontos).map((ponto) => Object.freeze(ponto))),
})));

// Limites e segmentos prontos: a geração consulta este campo centenas de
// milhares de vezes; só há uma raiz quadrada por contorno próximo ao jardim.
const contornos = FORMACOES_PLANEJADAS.map(({ pontos, grupo }) => ({
  grupo,
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

/** Terraços somam dentro de cada região; encontros usam a maior altura. */
export function elevacaoPlanejada(px, py) {
  const niveis={};
  for(const contorno of contornos) {
    const v=ocupacao(px,py,contorno);
    if(v) niveis[contorno.grupo]=(niveis[contorno.grupo]||0)+v;
  }
  return .35+Math.max(0,...Object.values(niveis));
}
