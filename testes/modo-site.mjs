import test from 'node:test';
import assert from 'node:assert/strict';
import { modoSite } from '../src/modoSite.js';
import { Jardim } from '../src/cena.js';

test('demo direta conserva o viveiro; modo do site direto e iframe o excluem', () => {
  const direto = { location: { search: '' } }; direto.parent = direto;
  assert.equal(modoSite(direto), false);
  direto.location.search = '?jardim=278249951&incorporado=1';
  assert.equal(modoSite(direto), true);
  direto.location.search = '?incorporado=0';
  assert.equal(modoSite(direto), false);
  direto.parent = {};
  assert.equal(modoSite(direto), true);
});

test('modo do site não cria malhas ou rótulos de viveiro e não permite visitá-lo', () => {
  const anterior = globalThis.location;
  globalThis.location = { search: '?incorporado=1' };
  try {
    // Executa os métodos reais: qualquer acesso ao catálogo ou à scene falharia.
    const cena = { mundo: { altura: 170 }, alvo: { set() { assert.fail('moveu a câmera ao viveiro'); } } };
    Jardim.prototype.montarViveiro.call(cena);
    assert.deepEqual(cena.viveiro, []);
    assert.deepEqual(cena.rotulosViveiro, []);
    assert.equal(cena.posicoesViveiro.size, 0);
    assert.equal(cena.fimViveiro, 180);
    Jardim.prototype.irAoViveiro.call(cena, true);
    // Nem uma chamada posterior pode montar o viveiro no mapa do site.
    Jardim.prototype.montarViveiro.call(cena);
    assert.equal(cena.viveiro.length, 0);
  } finally {
    if (anterior === undefined) delete globalThis.location;
    else globalThis.location = anterior;
  }
});
