import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dimensoesRender } from '../src/qualidade.js';

test('alta duplica os dois eixos sem depender da densidade da tela', () => {
  assert.deepEqual(dimensoesRender(1280, 720, 'alta'), { largura: 2560, altura: 1440 });
  assert.deepEqual(dimensoesRender(1280, 720, 'original'), { largura: 1280, altura: 720 });
});
test('telas grandes respeitam textura máxima e orçamento de pixels', () => {
  for (const [w, h, limite] of [[7680, 4320, 8192], [1280, 720, 2048], [393, 851, 8192]]) {
    const r = dimensoesRender(w, h, 'alta', limite);
    assert.ok(r.largura <= limite && r.altura <= limite);
    assert.ok(r.largura * r.altura <= 16000000);
    assert.equal(r.largura % 2, 0);
    assert.equal(r.altura % 2, 0);
    assert.ok(Math.abs(r.largura / r.altura - w / h) < .01);
  }
});
