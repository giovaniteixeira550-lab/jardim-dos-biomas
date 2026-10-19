/** Prévia de lotação (branch claude/previa-lotacao): substitui o plantio por ~270 árvores de estudo das 11 espécies
 * de Pediatria, misturadas entre si e com árvores de paisagem, no terreno inteiro (inclusive as partes dos platôs fora
 * do retângulo de 260 × 170 m). Só entra com ?lotacao=1 na URL. Serve para julgar quantidade e distribuição; não é a
 * composição definitiva. */
import { poisson, criarRng, criarRuido } from "./mundo.js";
import { ESPECIES } from "./especies.js";
import { aptidao, condicoes, criarAmbiente } from "./ecossistema.js";

// Quantas árvores de estudo cada espécie recebe: proporcional aos subtemas atuais (112), escalado para ~270.
const SUBTEMAS = { paineiraAbracos: 13, arvoreCatavento: 8, arvoreNinhos: 7, pitanga: 14, salgueiroCancoes: 9, arvoreSegredos: 13,
  manguePontes: 13, jabuticabeiraConstelacoes: 9, araucariaCometas: 9, acaciaMosaicos: 11, oliveiraNos: 6 };
// Área do plantio: o retângulo do mundo mais as faixas dos platôs que o ultrapassam (as mesmas que o plano reforça).
const AREA = { x0: -32, x1: 286, y0: -26, y1: 179 };

export function aplicarLotacao(m, { estudo = 270, paisagem = 210, espacoMin = 6.4, espacoMax = 12 } = {}) {
  const rng = criarRng(m.semente ^ 0x10ca), ruido = criarRuido(m.semente ^ 0x5a1), amb = criarAmbiente(m), plano = m.plano;
  const pesca = plano.pesca, casa = plano.locais.find(l => l.id === "casa-madeira"), marcos = plano.locais.filter(l => l.tipo === "marco");
  const perto = (x, y, a, b, r) => { const dx = b.x - a.x, dy = b.y - a.y, t = Math.max(0, Math.min(1, ((x - a.x) * dx + (y - a.y) * dy) / (dx * dx + dy * dy || 1))); return Math.hypot(x - a.x - dx * t, y - a.y - dy * t) < r; };
  // Mesmas regras do plantio do jardim: fora da água, da trilha, das pontes, das quedas, das encostas íngremes e das reservas.
  const livre = (x, y) => {
    // Folga maior que a do jardim em volta do lago e da trilha, para a água e o caminho continuarem à vista.
    if (m.fatorLago(x, y) < 1.25 || m.distTrilha(x, y) < 5.5 || m.ingreme(x, y)) return false;
    const dr = m.distRiacho(x, y); if (dr != null && dr < m.larguraRiacho(x, y) * .5 + 1.6) return false;
    if (pesca && Math.hypot(x - pesca.x, y - pesca.y) < 8) return false;
    if ((m.pontes ?? []).some(p => Math.hypot(x - p.x, y - p.y) < 9.5)) return false;
    if ((m.riacho?.quedas ?? []).some(q => Math.hypot(x - q.x, y - q.y) < 6.5)) return false;
    if ([[-3, 0], [3, 0], [0, -3], [0, 3]].some(([dx, dy]) => m.ingreme(x + dx, y + dy))) return false;
    if (plano.passarela && perto(x, y, plano.passarela.inicio, plano.passarela.fim, plano.passarela.largura / 2 + 1.2)) return false;
    if (casa && Math.abs(x - casa.x) < casa.largura / 2 + casa.margemVegetacao && Math.abs(y - casa.y) < casa.profundidade / 2 + casa.margemVegetacao) return false;
    if (marcos.some(l => Math.hypot(x - l.x, y - l.y) < l.raioReserva)) return false;
    return true;
  };
  // Densidade em manchas: um ruído largo decide onde o bosque fecha (espaço ~5 m) e onde abre (~9,5 m);
  // nos pontos mais baixos do ruído ficam clareiras sem árvore, de propósito.
  const mancha = (x, y) => (ruido(x / 34 + 7, y / 34 + 3, 3) + 1) / 2;
  const clareira = (x, y) => mancha(x, y) < .3;
  const raio = (x, y) => espacoMin + (espacoMax - espacoMin) * Math.pow(1 - Math.min(1, mancha(x, y) * 1.15), 1.3);
  const W = AREA.x1 - AREA.x0, H = AREA.y1 - AREA.y0;
  const vagas = poisson({ largura: W, altura: H, raioMin: espacoMin, raio: (x, y) => raio(x + AREA.x0, y + AREA.y0), rng, aceitar: (x, y) => livre(x + AREA.x0, y + AREA.y0) && !clareira(x + AREA.x0, y + AREA.y0) })
    .map(p => ({ x: p.x + AREA.x0, y: p.y + AREA.y0 })).map(v => ({ ...v, cond: condicoes(amb, v.x, v.y) }));

  // Quotas por espécie, somando exatamente 'estudo'.
  const ids = Object.keys(SUBTEMAS).filter(id => ESPECIES[id]), total = ids.reduce((a, id) => a + SUBTEMAS[id], 0);
  const quota = Object.fromEntries(ids.map(id => [id, Math.round(SUBTEMAS[id] / total * estudo)]));
  let dif = estudo - Object.values(quota).reduce((a, b) => a + b, 0);
  for (const id of [...ids].sort((a, b) => SUBTEMAS[b] - SUBTEMAS[a])) { if (!dif) break; quota[id] += Math.sign(dif); dif -= Math.sign(dif); }

  // Quais vagas são de estudo: espalhadas pelo mapa todo (sorteio uniforme), sem regiões por espécie.
  const ordem = vagas.map(v => ({ v, k: rng() })).sort((a, b) => a.k - b.k).map(o => o.v);
  const deEstudo = ordem.slice(0, Math.min(estudo, ordem.length));
  // Paisagem: só parte das vagas que sobram, preferindo as massas de bosque; o resto fica aberto.
  const daPaisagem = ordem.slice(deEstudo.length).map(v => ({ v, k: m.densidade(v.x, v.y) + mancha(v.x, v.y) * .6 + rng() * .35 })).sort((a, b) => b.k - a.k).slice(0, paisagem).map(o => o.v);
  // Espécie de cada árvore de estudo: sorteio pelo nicho do lugar (aptidão²), pesado pelo que falta da quota.
  // Às vezes repete a espécie de uma vizinha próxima, formando duplas ou trios naturais, nunca manchas.
  const resta = { ...quota }, plantadas = [];
  for (const v of deEstudo) {
    let especie = null;
    const vizinha = plantadas.find(p => Math.hypot(p.x - v.x, p.y - v.y) < 9);
    if (vizinha && resta[vizinha.especie] > 0 && rng() < .3 && aptidao(vizinha.especie, v.cond) > .25) especie = vizinha.especie;
    if (!especie) {
      const pesos = ids.map(id => (resta[id] > 0 ? (aptidao(id, v.cond) ** 2 + .04) * resta[id] / quota[id] : 0)), t = pesos.reduce((a, b) => a + b, 0);
      let r = rng() * t; especie = ids[ids.length - 1];
      for (let i = 0; i < ids.length; i++) { r -= pesos[i]; if (r <= 0) { especie = ids[i]; break; } }
    }
    resta[especie]--; plantadas.push({ ...v, especie });
  }
  // Paisagem: as outras vagas, com espécie escolhida pelo nicho entre as que não são de estudo.
  const estudoIds = new Set(ids), candidatas = Object.entries(ESPECIES).filter(([id, e]) => !estudoIds.has(id) && e.raridade > 0 && !e.mapa && !e.arbusto);
  const escolherPaisagem = cond => { const pesos = candidatas.map(([id, e]) => aptidao(id, cond) ** 2 * e.raridade), t = pesos.reduce((a, b) => a + b, 0); let r = rng() * t; for (let i = 0; i < pesos.length; i++) { r -= pesos[i]; if (r <= 0) return candidatas[i][0]; } return candidatas[0][0]; };

  const nova = (v, especie, estudoSim) => ({ tipo: "arvore", x: v.x, y: v.y, d: m.densidade(v.x, v.y), zona: 0, lago: m.fatorLago(v.x, v.y), escala: .9 + rng() * .18, nasce: 0, giro: rng() * 6.28, especiePaisagem: especie, ...(estudoSim ? { estudo: true } : { paisagem: true }) });
  const arvores = [...plantadas.map(p => nova(p, p.especie, true)), ...daPaisagem.map(v => nova(v, escolherPaisagem(v.cond), false))];
  // Arbustos e objetos ficam, menos os que caem embaixo de um tronco novo.
  const resto = m.objetos.filter(o => o.tipo !== "arvore" && !(o.tipo === "arbusto" && arvores.some(a => Math.hypot(a.x - o.x, a.y - o.y) < 3)));
  for (const a of resto) if (a.tipo === "arbusto") a.nasce = 0;
  m.objetos = [...arvores, ...resto];
  m.sequenciaPlantio = m.objetos.filter(o => o.tipo === "arvore" || o.tipo === "arbusto");
  const porEspecie = {}; for (const p of plantadas) porEspecie[p.especie] = (porEspecie[p.especie] || 0) + 1;
  const resumo = { vagas: vagas.length, estudo: plantadas.length, paisagem: daPaisagem.length, arbustos: resto.filter(o => o.tipo === "arbusto").length, porEspecie };
  globalThis.__lotacao = resumo;
  return resumo;
}
