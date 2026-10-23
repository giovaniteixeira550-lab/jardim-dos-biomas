import test from 'node:test';
import assert from 'node:assert/strict';
import { gerarMundo } from '../src/mundo.js';
import { aplicarLotacao } from '../src/lotacao.js';
import { ESPECIES } from '../src/especies.js';
import { abrirClareirasPediatria } from '../src/paisagemPediatria.js';

for (const semente of [1234, 2468, 9001, 9876, 42, 456789, 278249951]) {
  test(`paisagem ${semente}: estudo intacto e cenário com folga para copas adultas`, () => {
    globalThis.location = { search: `?jardim=${semente}` };
    const m = gerarMundo(1234);
    aplicarLotacao(m);
    const originais = m.objetos.filter(o => o.tipo === 'arvore').map(o => ({
      ...o, z: o.y, altura: ESPECIES[o.especiePaisagem].altura[1], especie: o.especiePaisagem,
    }));
    const arbusto = Object.freeze({ especie: Object.keys(ESPECIES).find(k => ESPECIES[k].arbusto), x: 50, z: 50 });
    originais.push(arbusto);
    const snapshot = JSON.stringify(originais);
    for (const a of originais) Object.freeze(a);
    const depois = abrirClareirasPediatria(originais, m);
    const estudos = originais.filter(a => a.assuntoEstudo);
    assert.equal(estudos.length, 278);
    assert.deepEqual(depois.filter(a => a.assuntoEstudo), estudos);
    assert.ok(estudos.every(a => depois.includes(a)), 'mantém as mesmas entidades, sem recriação');
    assert.equal(JSON.stringify(originais), snapshot, 'não altera dados, ordem ou propriedades de entrada');
    assert.ok(depois.includes(arbusto));
    const paisagem = depois.filter(a => !a.assuntoEstudo && a !== arbusto);
    assert.ok(paisagem.length > 0 && paisagem.length <= 89);
    assert.ok(paisagem.length < originais.length - 279, 'reduz o cenário');
    for (const a of paisagem) for (const b of estudos) {
      const folga = Math.max(9.5, Math.min(13, (a.altura + b.altura) * .28 + 1.5));
      assert.ok(Math.hypot(a.x - b.x, a.z - b.z) >= folga);
    }
    assert.deepEqual(abrirClareirasPediatria(originais, m), depois, 'recarregar não sorteia outro cenário');
    console.info(`Semente ${semente}: 278 de estudo; ${originais.length - 279} → ${paisagem.length} de cenário.`);
  });
}

test('mundos sem árvores de estudo conservam o cenário original', () => {
  const entrada = [{ especie: 'carvalho', x: 1, z: 2 }];
  assert.equal(abrirClareirasPediatria(entrada, {}), entrada);
});
