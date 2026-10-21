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
