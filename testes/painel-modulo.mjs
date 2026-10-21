import test from 'node:test';
import assert from 'node:assert/strict';
import { CATALOGO_PEDIATRIA as C } from '../src/catalogoPediatria.js';
import { gerarExemploModulo, MODULO_PEDIATRIA } from '../src/exemploModulo.js';
import { resumirModulo, ESTAGIOS_PAINEL } from '../src/resumoModulo.js';

const exemplo = gerarExemploModulo(C);
const resumo = (agora, dados = exemplo) => resumirModulo({ ...dados, agora }, C);

test('início real: tudo em semente, sem marcos nem sugestões', () => {
  const r = resumirModulo({ modulo: MODULO_PEDIATRIA, agora: '2026-10-21', registros: [], confusoes: [] }, C);
  assert.equal(r.total, 278); assert.equal(r.iniciados, 0); assert.equal(r.porEstagio.semente, 278);
  assert.equal(r.marcos.length, 0); assert.ok(r.ritmo.antes);
  assert.deepEqual(Object.values(r.proximos).map(l => l.length), [0, 0, 0, 0]);
});
test('exemplo é determinístico e nunca usa registros futuros', () => {
  assert.deepEqual(gerarExemploModulo(C).registros, exemplo.registros);
  const r = resumo('2026-11-20');
  assert.ok(r.assuntos.every(a => a.registros.every(x => x.data <= '2026-11-20')));
  assert.equal(r.serie.at(-1).data, '2026-11-20');
});
test('o porte nunca diminui ao avançar o dia simulado', () => {
  let anterior = null;
  for (const dia of ['2026-11-10', '2026-12-01', '2026-12-19', '2027-01-20', '2027-03-31']) {
    const r = resumo(dia), ordem = new Map(r.assuntos.map(a => [a.id, ESTAGIOS_PAINEL.indexOf(a.estagio)]));
    if (anterior) for (const [id, i] of anterior) assert.ok(ordem.get(id) >= i, id);
    anterior = ordem;
  }
});
test('contagens batem: série, áreas e estágios', () => {
  const r = resumo('2027-02-15');
  const ultimo = r.serie.at(-1);
  for (const e of ESTAGIOS_PAINEL.slice(1)) assert.equal(ultimo.porEstagio[e], r.porEstagio[e]);
  assert.equal(r.areas.reduce((s, a) => s + a.total, 0), 278);
  assert.equal(r.areas.reduce((s, a) => s + a.iniciados, 0), r.iniciados);
  assert.ok(r.porEstagio.adulta > 0, 'o exemplo chega a árvores adultas');
});
test('"perto de crescer" só lista árvores a um critério da próxima fase', () => {
  const r = resumo('2026-12-05');
  assert.ok(r.proximos.pertoDeCrescer.length > 0);
  for (const x of r.proximos.pertoDeCrescer) {
    assert.equal(x.assunto.estado.proximo.criterios.filter(c => !c.concluido).length, 1);
    assert.equal(x.pronto, x.desde <= '2026-12-05');
  }
});
test('confusões: o mesmo par conta junto nos dois sentidos', () => {
  const dados = { modulo: MODULO_PEDIATRIA, registros: [], confusoes: [{ a: 'escarlatina', b: 'doenca-de-kawasaki-diagnostico', data: '2026-11-10' }, { a: 'doenca-de-kawasaki-diagnostico', b: 'escarlatina', data: '2026-11-12' }] };
  const r = resumirModulo({ ...dados, agora: '2026-11-20' }, C);
  assert.equal(r.confusoes.length, 1); assert.equal(r.confusoes[0].vezes, 2); assert.equal(r.confusoes[0].ultima, '2026-11-12');
});

// ---------- caderno: objetivos e evidências ----------
const base = { modulo: MODULO_PEDIATRIA, confusoes: [], objetivos: [
  { id: 'asma#1', assunto: 'asma-diagnostico-e-classificacao', descricao: 'Reconhecer a apresentação clínica' },
  { id: 'asma#2', assunto: 'asma-diagnostico-e-classificacao', descricao: 'Diferenciar de quadros semelhantes' },
  { id: 'asma#3', assunto: 'asma-diagnostico-e-classificacao', descricao: 'Justificar a escolha do tratamento' },
] };
const ev = (id, data, extra) => ({ id, assunto: 'asma-diagnostico-e-classificacao', data, ...extra });
const caderno = (registros, agora) => resumirModulo({ ...base, registros, agora }, C).assuntos.find(a => a.id === 'asma-diagnostico-e-classificacao');

test('evidência por objetivo: não avaliado, com ajuda, sem ajuda e repetiu', () => {
  const regs = [
    ev('1', '2026-11-03', { tipo: 'estudo' }),
    ev('2', '2026-11-04', { tipo: 'tentativa', objetivo: 'asma#1', resultado: 'autonomo', fonte: 'observado' }),
    ev('3', '2026-11-20', { tipo: 'tentativa', objetivo: 'asma#1', resultado: 'autonomo', fonte: 'observado' }),
    ev('4', '2026-11-20', { tipo: 'tentativa', objetivo: 'asma#2', resultado: 'pista', evidencia: 'Precisou de pista para diferenciar de bronquiolite' }),
  ];
  const [o1, o2, o3] = caderno(regs, '2026-11-21').objetivos;
  assert.equal(o1.estado, 'repetiu'); assert.equal(o1.fonte, 'observado');
  assert.equal(o2.estado, 'com_ajuda'); assert.match(o2.motivo, /bronquiolite/);
  assert.equal(o3.estado, 'nao_avaliado'); assert.match(o3.motivo, /nenhuma tentativa/);
});
test('autonomia no mesmo dia ou com menos de 14 dias não conta como repetição', () => {
  const regs = [ev('1', '2026-11-04', { tipo: 'tentativa', objetivo: 'asma#1', resultado: 'autonomo' }), ev('2', '2026-11-10', { tipo: 'tentativa', objetivo: 'asma#1', resultado: 'autonomo' })];
  assert.equal(caderno(regs, '2026-11-12').objetivos[0].estado, 'sem_ajuda');
});
test('precisar de ajuda depois não apaga a trajetória da árvore nem a autonomia anterior', () => {
  const regs = [ev('1', '2026-11-04', { tipo: 'tentativa', objetivo: 'asma#1', resultado: 'autonomo' }), ev('2', '2026-11-25', { tipo: 'tentativa', objetivo: 'asma#1', resultado: 'nao_recuperou' })];
  const antes = caderno(regs.slice(0, 1), '2026-11-24'), depois = caderno(regs, '2026-11-25');
  assert.equal(depois.objetivos[0].estado, 'com_ajuda');
  assert.match(depois.objetivos[0].motivo, /Já tinha recuperado sem ajuda em 04\/11/);
  assert.ok(ESTAGIOS_PAINEL.indexOf(depois.estagio) >= ESTAGIOS_PAINEL.indexOf(antes.estagio));
});
test('panorama mostra quantos objetivos as tentativas cobriram, não só a taxa', () => {
  const regs = Array.from({ length: 10 }, (_, i) => ev('t' + i, '2026-11-1' + (i % 9), { tipo: 'tentativa', objetivo: 'asma#1', resultado: 'autonomo' }));
  const d = resumirModulo({ ...base, registros: regs, agora: '2026-11-20' }, C).dimensoes;
  assert.equal(d.autonomia.taxaTentativas, 1);
  assert.equal(d.autonomia.objetivosNasTentativas, 1);
  assert.equal(d.autonomia.por.nao_avaliado, 2);
});
test('revisar explica cada sugestão e mudanças com significado são detectadas', () => {
  const regs = [
    ev('1', '2026-11-03', { tipo: 'estudo' }),
    ev('2', '2026-11-05', { tipo: 'tentativa', objetivo: 'asma#2', resultado: 'pista' }),
    ev('3', '2026-11-12', { tipo: 'tentativa', objetivo: 'asma#2', resultado: 'autonomo' }),
    ev('4', '2026-11-12', { tipo: 'tentativa', objetivo: 'asma#1', resultado: 'apos_explicacao' }),
  ];
  const r = resumirModulo({ ...base, registros: regs, agora: '2026-11-14' }, C);
  assert.ok(r.revisar.every(s => s.porque && s.passo));
  assert.deepEqual(r.revisar.filter(s => s.assunto.id === 'asma-diagnostico-e-classificacao').map(s => s.tipo), ['dificuldade', 'nao_avaliado']);
  assert.ok(r.mudancas.some(m => m.objetivo?.id === 'asma#2' && /antes precisava de pista/.test(m.texto)));
});
test('exemplo: objetivos de exemplo cobrem todos os assuntos', () => {
  const ids = new Set(exemplo.objetivos.map(o => o.assunto));
  assert.equal(ids.size, 278);
  assert.ok(exemplo.registros.filter(r => r.tipo === 'tentativa').every(r => r.objetivo && r.fonte));
});

test('ciclo zerado: registros anteriores ao início não entram em nada', () => {
  const regs = [
    ev('a', '2026-10-01', { tipo: 'estudo' }),
    ev('b', '2026-10-05', { tipo: 'tentativa', objetivo: 'asma#1', resultado: 'autonomo' }),
  ];
  const conf = [{ a: 'escarlatina', b: 'doenca-de-kawasaki-diagnostico', data: '2026-10-02' }];
  const r = resumirModulo({ ...base, registros: regs, confusoes: conf, inicioCiclo: '2026-10-21', agora: '2026-10-21' }, C);
  assert.equal(r.iniciados, 0); assert.equal(r.porEstagio.semente, 278);
  assert.equal(r.confusoes.length, 0); assert.equal(r.marcos.length, 0); assert.equal(r.revisar.length, 0);
  assert.equal(r.assuntos.find(a => a.id === 'asma-diagnostico-e-classificacao').objetivos[0].estado, 'nao_avaliado');
  const depois = resumirModulo({ ...base, registros: [...regs, ev('c', '2026-11-04', { tipo: 'estudo' })], inicioCiclo: '2026-10-21', agora: '2026-11-04' }, C);
  assert.equal(depois.iniciados, 1);
  assert.equal(depois.assuntos.find(a => a.estado).estado.primeiraAtividade, '2026-11-04');
});

// ---------- registros do site (organizador) ----------
import { traduzirOrganizador, resultadoDoOrganizador } from '../src/registrosOrganizador.js';

test('organizador → caderno: só sessões consolidadas, ajuda explícita vence o "autônomo"', () => {
  assert.equal(resultadoDoOrganizador('autonomo', 'autonoma'), 'autonomo');
  assert.equal(resultadoDoOrganizador('autonomo', 'com_pistas'), 'pista');
  assert.equal(resultadoDoOrganizador('autonomo', 'apos_explicacao'), 'apos_explicacao');
  assert.equal(resultadoDoOrganizador('com_pista', null), 'pista');
  assert.equal(resultadoDoOrganizador('nao_avaliado', null), null);
  const t = traduzirOrganizador({
    sessoes: [
      { id: 's1', data: '2026-11-05T01:30:00Z', data_real: null, tipo: 'estudo_guiado', status_fechamento: 'consolidado' },
      { id: 's2', data: '2026-11-06T15:00:00Z', data_real: '2026-11-06', tipo: 'revisao', status_fechamento: 'consolidado' },
      { id: 's3', data: '2026-11-07T15:00:00Z', data_real: '2026-11-07', tipo: 'questoes', status_fechamento: 'rascunho' },
    ],
    marcas: [
      { sessao_id: 's1', assunto_id: 'sarampo', objetivo_id: null },
      { sessao_id: 's1', assunto_id: 'sarampo', objetivo_id: 'o1' },
      { sessao_id: 's2', assunto_id: 'sarampo', objetivo_id: null },
      { sessao_id: 's3', assunto_id: 'escarlatina', objetivo_id: null },
    ],
    objetivos: [{ sessao_id: 's1', objetivo_id: 'o1', resultado: 'autonomo', grau_ajuda: 'com_pistas', evidencia_resumida: 'Precisou de pista para o enantema' }],
    descricoes: [{ id: 'o1', descricao: 'Reconhecer o exantema' }],
  });
  // 01:30 UTC de 05/11 ainda é 04/11 em São Paulo.
  assert.deepEqual(t.registros.map(r => [r.tipo, r.data, r.resultado ?? null]), [['estudo', '2026-11-04', null], ['tentativa', '2026-11-04', 'pista'], ['retomada', '2026-11-06', null]]);
  assert.deepEqual(t.objetivos, [{ id: 'o1@sarampo', assunto: 'sarampo', descricao: 'Reconhecer o exantema' }]);
  const r = resumirModulo({ modulo: MODULO_PEDIATRIA, inicioCiclo: '2026-10-21', agora: '2026-11-07', confusoes: [], ...t }, C);
  const sarampo = r.assuntos.find(a => a.id === 'sarampo');
  assert.equal(r.iniciados, 1); assert.notEqual(sarampo.estagio, 'semente');
  assert.equal(sarampo.objetivos[0].estado, 'com_ajuda'); assert.match(sarampo.objetivos[0].motivo, /enantema/);
});
