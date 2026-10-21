/** Exemplo FICTÍCIO de um rodízio de Pediatria, só para ver o painel funcionando.
 * Determinístico pela semente. Não representa desempenho de ninguém nem dados do site. */
import { criarRng } from './mundo.js';
import { somarDias, diaNumero } from './crescimentoEstudo.js';

export const MODULO_PEDIATRIA = Object.freeze({ nome: 'Pediatria', inicio: '2026-11-03', fim: '2026-12-19' });
/** O exemplo segue até o fim de março para mostrar árvores jovens e adultas. */
export const FIM_EXEMPLO = '2027-03-31';

// Pares que costumam ser confundidos em prova; ids da lista v2.
const PARES = [
  ['taquipneia-transitoria-do-rn', 'doenca-da-membrana-hialina-e-surfactante'],
  ['bronquiolite-diagnostico-e-gravidade', 'asma-diagnostico-e-classificacao'],
  ['escarlatina', 'doenca-de-kawasaki-diagnostico'],
  ['glomerulonefrite-pos-estreptococica', 'febre-reumatica-criterios-de-jones'],
  ['crupe-viral-laringotraqueobronquite', 'epiglotite-traqueite-bacteriana-e-abscessos-cervicais'],
  ['artrite-septica', 'sinovite-transitoria-do-quadril'],
  ['purpura-trombocitopenica-imune', 'leucemia-linfoide-aguda-diagnostico'],
  ['sarampo', 'exantema-subito-e-doenca-mao-pe-boca'],
];
const RETORNOS = [1, 4, 7, 14, 21, 30, 45, 60, 75, 95, 115, 135];

export function gerarExemploModulo(catalogo, semente = 2026) {
  const rng = criarRng(semente), registros = [], confusoes = [];
  const sortear = (lista) => lista[Math.floor(rng() * lista.length)];
  const ids = new Set(catalogo.map(a => a.id));
  const parDe = new Map();
  for (const [a, b] of PARES) if (ids.has(a) && ids.has(b)) { parDe.set(a, b); parDe.set(b, a); }

  // Ordem de estudo: blocos por área, em sequência parecida com a de um rodízio.
  const areas = [...new Set(catalogo.map(a => a.especie))];
  const fila = areas.map(e => catalogo.filter(a => a.especie === e));
  const pendentes = [];
  const iniciou = new Map(), tentativas = new Map(), agenda = new Map();
  const agendar = (data, id) => { if (!agenda.has(data)) agenda.set(data, []); agenda.get(data).push(id); };
  let n = 0;
  const reg = (r) => registros.push({ id: `ex-${++n}`, ...r });

  registros.push({ id: 'ex-pausa-fim-de-ano', assunto: null, tipo: 'pausa', data: '2026-12-24', fim: '2027-01-04' });
  const pausado = d => d >= '2026-12-24' && d < '2027-01-04';

  for (let d = MODULO_PEDIATRIA.inicio; d <= FIM_EXEMPLO; d = somarDias(d, 1)) {
    if (pausado(d)) continue;
    const dow = (new Date(diaNumero(d) * 86400000).getUTCDay() + 6) % 7;
    const rodizio = d <= MODULO_PEDIATRIA.fim;
    // No rodízio, estudo quase todo dia útil; depois, revisões 3 vezes por semana.
    const estuda = rodizio ? (dow < 6 && rng() > 0.12) || (dow === 6 && rng() > 0.7) : [0, 2, 4].includes(dow) && rng() > 0.15;
    if (!estuda) { for (const id of agenda.get(d) ?? []) agendar(somarDias(d, 1), id); continue; }

    if (rodizio) {
      // A área em foco muda a cada semana; às vezes entra um assunto de outra área.
      const semana = Math.floor((diaNumero(d) - diaNumero(MODULO_PEDIATRIA.inicio)) / 7);
      const novos = 4 + Math.floor(rng() * 4);
      for (let i = 0; i < novos; i++) {
        let bloco = fila[(semana + (rng() < 0.25 ? 1 + Math.floor(rng() * 3) : 0)) % fila.length];
        if (!bloco.length) bloco = fila.find(b => b.length) ?? [];
        const a = bloco.shift(); if (!a) break;
        reg({ assunto: a.id, tipo: 'estudo', data: d });
        iniciou.set(a.id, d); pendentes.push(a.id);
        for (const r of RETORNOS) agendar(somarDias(d, r + Math.floor(rng() * 5) - 1), a.id);
      }
    }
    // Retornos previstos: alguns ficam para depois, como acontece de verdade.
    const hoje = agenda.get(d) ?? [];
    for (const id of hoje) {
      if (rng() < (rodizio ? 0.22 : 0.3)) { agendar(somarDias(d, 2 + Math.floor(rng() * 6)), id); continue; }
      const k = tentativas.get(id) ?? 0;
      tentativas.set(id, k + 1);
      const sorte = rng(), pAuto = Math.min(0.85, 0.3 + 0.13 * k);
      const resultado = sorte < pAuto ? 'autonomo' : sorte < pAuto + 0.3 * (1 - pAuto) ? 'pista' : sorte < pAuto + 0.65 * (1 - pAuto) ? 'apos_explicacao' : 'nao_recuperou';
      reg({ assunto: id, tipo: 'tentativa', data: d, resultado });
      if (resultado !== 'autonomo' && parDe.has(id) && iniciou.has(parDe.get(id)) && rng() < 0.7) confusoes.push({ a: id, b: parDe.get(id), data: d });
      if (['apos_explicacao', 'nao_recuperou'].includes(resultado)) {
        if (rng() < 0.45) reg({ assunto: id, tipo: 'dificuldade', data: d });
        if (rng() < 0.5) agendar(somarDias(d, 3 + Math.floor(rng() * 4)), id);
      }
    }
    // Releituras curtas de assuntos recentes.
    if (pendentes.length && rng() < 0.4) reg({ assunto: sortear(pendentes.slice(-25)), tipo: rng() < 0.3 ? 'retomada' : 'estudo', data: d });
  }
  return { modulo: MODULO_PEDIATRIA, origem: 'exemplo', registros, confusoes };
}
