/** Prévia de lotação (branch claude/previa-lotacao): substitui o plantio por ~270 árvores de estudo das 11 espécies
 * de Pediatria, em grupos compactos por espécie, mais ~150 árvores de paisagem nas massas de bosque. Só entra com
 * ?lotacao=1 na URL. Serve para julgar se a quantidade cabe e fica bonita; não é a composição definitiva. */
import { poisson, criarRng } from "./mundo.js";
import { ESPECIES } from "./especies.js";
import { aptidao, condicoes, criarAmbiente } from "./ecossistema.js";

// Quantas árvores de estudo cada espécie recebe: proporcional aos subtemas atuais (112), escalado para ~270.
const SUBTEMAS = { paineiraAbracos: 13, arvoreCatavento: 8, arvoreNinhos: 7, pitanga: 14, salgueiroCancoes: 9, arvoreSegredos: 13,
  manguePontes: 13, jabuticabeiraConstelacoes: 9, araucariaCometas: 9, acaciaMosaicos: 11, oliveiraNos: 6 };

export function aplicarLotacao(m, { estudo = 270, paisagem = 150, espaco = 6.2 } = {}) {
  const rng = criarRng(m.semente ^ 0x10ca),amb = criarAmbiente(m),plano = m.plano;
  const pesca = plano.pesca,casa = plano.locais.find(l => l.id === "casa-madeira"),marcos = plano.locais.filter(l => l.tipo === "marco");
  const perto = (x, y, a, b, r) => { const dx = b.x - a.x, dy = b.y - a.y, t = Math.max(0, Math.min(1, ((x - a.x) * dx + (y - a.y) * dy) / (dx * dx + dy * dy || 1))); return Math.hypot(x - a.x - dx * t, y - a.y - dy * t) < r; };
  // Mesmas regras do plantio do jardim: fora da água, da trilha, das pontes, das quedas, das encostas íngremes e das reservas.
  const livre = (x, y) => {
    if (m.fatorLago(x, y) < 1.12 || m.distTrilha(x, y) < 4.6 || m.ingreme(x, y)) return false;
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
  const vagas = poisson({ largura: m.largura, altura: m.altura, raioMin: espaco, raio: () => espaco, rng, aceitar: livre }).map(p => ({ x: p.x, y: p.y, cond: condicoes(amb, p.x, p.y) }));

  // Quotas por espécie, somando exatamente 'estudo'.
  const total = Object.values(SUBTEMAS).reduce((a, b) => a + b, 0),ids = Object.keys(SUBTEMAS).filter(id => ESPECIES[id]);
  const quota = Object.fromEntries(ids.map(id => [id, Math.round(SUBTEMAS[id] / total * estudo)]));
  let dif = estudo - Object.values(quota).reduce((a, b) => a + b, 0);
  for (const id of ids.sort((a, b) => SUBTEMAS[b] - SUBTEMAS[a])) { if (!dif) break; quota[id] += Math.sign(dif); dif -= Math.sign(dif); }

  // Núcleos: cada espécie se divide em 2 ou 3 grupos, cada um no lugar mais apto ao nicho e longe dos outros núcleos
  // (as espécies mais exigentes escolhem primeiro). Assim o bosque não vira manchas enormes de uma espécie só.
  const sel = id => vagas.filter(v => aptidao(id, v.cond) > .6).length;
  const ordem = [...ids].sort((a, b) => sel(a) - sel(b)),nucleos = [];
  for (const id of ordem) {
    const n = quota[id] > 26 ? 3 : 2;
    for (let k = 0; k < n; k++) {
      let melhor = null, nota = -1;
      for (const v of vagas) { const dmin = Math.min(99, ...nucleos.map(c => Math.hypot(c.x - v.x, c.y - v.y))); const nt = aptidao(id, v.cond) * Math.min(1, dmin / 30) * (.85 + rng() * .3); if (nt > nota) { nota = nt; melhor = v; } }
      nucleos.push({ id, x: melhor.x, y: melhor.y, quota: Math.round(quota[id] / n) + (k === 0 ? quota[id] - Math.round(quota[id] / n) * n : 0), plantadas: 0 });
    }
  }
  // Crescimento em rodadas: cada núcleo pega a vaga livre mais próxima (ponderada pela aptidão). Cerca de uma em cada
  // cinco vagas do caminho fica para a paisagem, abrindo o grupo e misturando outras árvores nas bordas.
  const usada = new Set(), paraPaisagem = new Set(), plantio = [];
  for (let falta = true; falta;) {
    falta = false;
    for (const nc of nucleos) {
      if (nc.plantadas >= nc.quota) continue;
      falta = true;
      let melhor = null, d = Infinity;
      for (const v of vagas) { if (usada.has(v)) continue; const dd = Math.hypot(v.x - nc.x, v.y - nc.y) / (.35 + aptidao(nc.id, v.cond)); if (dd < d) { d = dd; melhor = v; } }
      if (!melhor) { nc.plantadas = nc.quota; continue; }
      usada.add(melhor);
      if (nc.plantadas > 3 && rng() < .2) { paraPaisagem.add(melhor); continue; }
      plantio.push({ ...melhor, especie: nc.id }); nc.plantadas++;
    }
  }
  const centros = Object.fromEntries(ids.map(id => [id, nucleos.find(n => n.id === id)]));
  // Paisagem: primeiro as vagas deixadas dentro dos grupos; depois as mais densas do bosque, até 'paisagem'.
  const restantes = [...paraPaisagem, ...vagas.filter(v => !usada.has(v)).sort((a, b) => m.densidade(b.x, b.y) - m.densidade(a.x, a.y))].slice(0, paisagem);
  // Espécie de paisagem pelo nicho, sem usar as espécies de estudo.
  const estudoIds = new Set(ids),candidatasPaisagem = Object.entries(ESPECIES).filter(([id, e]) => !estudoIds.has(id) && e.raridade > 0 && !e.mapa && !e.arbusto);
  const escolherPaisagem = cond => { const pesos = candidatasPaisagem.map(([id, e]) => aptidao(id, cond) ** 2 * e.raridade), t = pesos.reduce((a, b) => a + b, 0); let r = rng() * t; for (let i = 0; i < pesos.length; i++) { r -= pesos[i]; if (r <= 0) return candidatasPaisagem[i][0]; } return candidatasPaisagem[0][0]; };
  const nova = (v, especie) => ({ tipo: "arvore", x: v.x, y: v.y, d: m.densidade(v.x, v.y), zona: 0, lago: m.fatorLago(v.x, v.y), escala: .92 + rng() * .16, nasce: 0, giro: rng() * 6.28, ...(especie ? { especiePaisagem: especie, estudo: true } : { especiePaisagem: escolherPaisagem(v.cond), paisagem: true }) });
  const arvores = [...plantio.map(p => nova(p, p.especie)), ...restantes.map(v => nova(v))];
  // Arbustos e objetos ficam, menos os que caem embaixo de um tronco novo.
  const resto = m.objetos.filter(o => o.tipo !== "arvore" && !(o.tipo === "arbusto" && arvores.some(a => Math.hypot(a.x - o.x, a.y - o.y) < 3)));
  for (const a of resto) if (a.tipo === "arbusto") a.nasce = 0;
  m.objetos = [...arvores, ...resto];
  m.sequenciaPlantio = m.objetos.filter(o => o.tipo === "arvore" || o.tipo === "arbusto");
  const resumo = { vagas: vagas.length, estudo: plantio.length, paisagem: restantes.length, livres: vagas.length - plantio.length - restantes.length, arbustos: resto.filter(o => o.tipo === "arbusto").length, quota, nucleos: nucleos.length };
  globalThis.__lotacao = resumo;
  return resumo;
}
