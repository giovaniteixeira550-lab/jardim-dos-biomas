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

// Objetivos GENÉRICOS por tipo de assunto, só para o exemplo. No site, cada tópico
// tem seus objetivos cadastrados (tabela de objetivos do organizador).
const MODELOS = {
  prevencao: ['Explicar a indicação e o fundamento', 'Aplicar o esquema, as idades e os intervalos', 'Reconhecer contraindicações e situações especiais'],
  conduta: ['Reconhecer a apresentação clínica', 'Reconhecer sinais de gravidade', 'Decidir e justificar a conduta', 'Definir seguimento e quando encaminhar'],
  diagnostico: ['Reconhecer a apresentação clínica', 'Aplicar os critérios diagnósticos ou a classificação', 'Diferenciar de quadros semelhantes'],
  conceito: ['Explicar o processo normal e seus marcos', 'Interpretar achados e medidas', 'Identificar o que é anormal e o que investigar'],
  padrao: ['Reconhecer a apresentação clínica', 'Diferenciar de quadros semelhantes', 'Justificar a escolha do tratamento'],
};
function modeloDe(nome) {
  const n = nome.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  if (/vacin|calendario|imuniz|profilax|prevenc|triage|teste do|rastre|aleitamento|alimentacao|esavi/.test(n)) return 'prevencao';
  if (/tratamento|conduta|manejo|reidrat|corticoter|emergencia|crise|choque|parada|reanima|estado de mal|intoxica/.test(n)) return 'conduta';
  if (/diagnostico|classifica|criterio|abordagem|avaliacao/.test(n)) return 'diagnostico';
  if (/desenvolvimento|crescimento|curvas|puberdade normal|marcos|fisiolog|metabolismo|semiologia|exame fisico/.test(n)) return 'conceito';
  return 'padrao';
}
export function objetivosDeExemplo(catalogo) {
  return catalogo.flatMap(a => MODELOS[modeloDe(a.nome)].map((descricao, i) => ({ id: `${a.id}#${i + 1}`, assunto: a.id, descricao })));
}
const ATIVIDADES = [['questão de prova', 'observado'], ['caso clínico', 'observado'], ['flashcard', 'informado'], ['explicação em voz alta', 'informado']];
const minuscula = (t) => t[0].toLowerCase() + t.slice(1);
function evidenciaDe(resultado, objetivo, confundiu) {
  if (confundiu) return `Confundiu com ${confundiu}`;
  return { autonomo: 'Respondeu sem consultar', pista: `Precisou de pista para ${minuscula(objetivo)}`, apos_explicacao: `Só conseguiu depois de rever a explicação`, nao_recuperou: 'Não conseguiu recuperar' }[resultado];
}

export function gerarExemploModulo(catalogo, semente = 2026) {
  const rng = criarRng(semente), registros = [], confusoes = [];
  const objetivos = objetivosDeExemplo(catalogo);
  const objetivosDo = new Map();
  for (const o of objetivos) { if (!objetivosDo.has(o.assunto)) objetivosDo.set(o.assunto, []); objetivosDo.get(o.assunto).push(o); }
  const nomeDe = new Map(catalogo.map(a => [a.id, a.nome]));
  const porObjetivo = new Map();
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
      tentativas.set(id, (tentativas.get(id) ?? 0) + 1);
      // As tentativas se concentram nos primeiros objetivos: alguns ficam sem avaliação,
      // como acontece quando se repete sempre o mesmo tipo de pergunta.
      const lista = objetivosDo.get(id), sorteio = rng();
      const objetivo = lista[sorteio < 0.55 ? 0 : sorteio < 0.82 ? 1 : sorteio < 0.95 ? 2 : lista.length - 1] ?? lista[0];
      const k = porObjetivo.get(objetivo.id) ?? 0;
      porObjetivo.set(objetivo.id, k + 1);
      const sorte = rng(), pAuto = Math.min(0.88, 0.3 + 0.16 * k);
      const resultado = sorte < pAuto ? 'autonomo' : sorte < pAuto + 0.3 * (1 - pAuto) ? 'pista' : sorte < pAuto + 0.65 * (1 - pAuto) ? 'apos_explicacao' : 'nao_recuperou';
      const confundiu = resultado !== 'autonomo' && parDe.has(id) && iniciou.has(parDe.get(id)) && rng() < 0.7 ? parDe.get(id) : null;
      const [atividade, fonte] = sortear(ATIVIDADES);
      reg({ assunto: id, objetivo: objetivo.id, tipo: 'tentativa', data: d, resultado, atividade, fonte, evidencia: evidenciaDe(resultado, objetivo.descricao, confundiu && nomeDe.get(confundiu)),
        ...(rng() < 0.3 ? { confianca: Math.max(1, Math.min(5, Math.round(resultado === 'autonomo' ? 3.5 + rng() * 1.5 : 1 + rng() * 2.5))) } : {}) });
      if (confundiu) confusoes.push({ a: id, b: confundiu, data: d });
      if (['apos_explicacao', 'nao_recuperou'].includes(resultado)) {
        if (rng() < 0.45) reg({ assunto: id, objetivo: objetivo.id, tipo: 'dificuldade', data: d });
        if (rng() < 0.5) agendar(somarDias(d, 3 + Math.floor(rng() * 4)), id);
      }
    }
    // Releituras curtas de assuntos recentes.
    if (pendentes.length && rng() < 0.4) reg({ assunto: sortear(pendentes.slice(-25)), tipo: rng() < 0.3 ? 'retomada' : 'estudo', data: d });
  }
  return { modulo: MODULO_PEDIATRIA, origem: 'exemplo', objetivos, registros, confusoes };
}
