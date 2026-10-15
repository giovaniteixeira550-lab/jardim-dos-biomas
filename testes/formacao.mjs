/** Regressões da planta do terreno: node --test testes/formacao.mjs */
import assert from "node:assert/strict";
import test from "node:test";
import { elevacaoPlanejada, FORMACOES_PLANEJADAS } from "../src/formacaoTerreno.js";
import { criarPlano } from "../src/planoMestre.js";

const EPS = 1e-7;
const segmentos = (pontos) => pontos.map((p, i) => [p, pontos[(i + 1) % pontos.length]]);
const orientacao = (a, b, p) => (b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0]);
const entre = (a, b, p) => Math.abs(orientacao(a, b, p)) < EPS &&
  p[0] >= Math.min(a[0], b[0]) - EPS && p[0] <= Math.max(a[0], b[0]) + EPS &&
  p[1] >= Math.min(a[1], b[1]) - EPS && p[1] <= Math.max(a[1], b[1]) + EPS;

function cruzam(a, b, c, d) {
  const abC = orientacao(a, b, c), abD = orientacao(a, b, d);
  const cdA = orientacao(c, d, a), cdB = orientacao(c, d, b);
  return (abC * abD < -EPS && cdA * cdB < -EPS) ||
    entre(a, b, c) || entre(a, b, d) || entre(c, d, a) || entre(c, d, b);
}

function distanciaPontoSegmento(p, a, b) {
  const dx = b[0] - a[0], dy = b[1] - a[1];
  const t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / (dx * dx + dy * dy)));
  return Math.hypot(p[0] - a[0] - dx * t, p[1] - a[1] - dy * t);
}

// Predicado independente do campo de distância da produção. Um contorno sem
// cruzamentos, contido no exterior e longe dele, não deixa um corredor fino.
function dentro(p, pontos) {
  let soma = 0;
  for (const [a, b] of segmentos(pontos)) {
    if (entre(a, b, p)) return true;
    if (a[1] <= p[1] && b[1] > p[1] && orientacao(a, b, p) > 0) soma++;
    if (a[1] > p[1] && b[1] <= p[1] && orientacao(a, b, p) < 0) soma--;
  }
  return soma !== 0;
}

for (const formacao of FORMACOES_PLANEJADAS) {
  test(`${formacao.id}: contorno simples, sem arestas nulas ou cruzamentos`, () => {
    const arestas = segmentos(formacao.pontos);
    assert.ok(arestas.length >= 3);
    for (let i = 0; i < arestas.length; i++) {
      const [a, b] = arestas[i];
      assert.ok([...a, ...b].every(Number.isFinite), `coordenada inválida na aresta ${i}`);
      assert.ok(Math.hypot(b[0] - a[0], b[1] - a[1]) > EPS, `aresta nula ${i}`);
      for (let j = i + 1; j < arestas.length; j++) {
        if (j === i + 1 || (i === 0 && j === arestas.length - 1)) continue;
        assert.equal(cruzam(a, b, ...arestas[j]), false, `arestas ${i}/${j} se cruzam ou se tocam`);
      }
    }
  });
}

for (let k = 1; k < FORMACOES_PLANEJADAS.length; k++) {
  const interno = FORMACOES_PLANEJADAS[k], externo = FORMACOES_PLANEJADAS[k - 1];
  test(`${interno.id}: encaixado em ${externo.id}, com pelo menos 4 m entre contornos`, () => {
    const arestasInternas = segmentos(interno.pontos), arestasExternas = segmentos(externo.pontos);
    for (const p of interno.pontos) assert.ok(dentro(p, externo.pontos), `vértice ${p} fora do patamar de apoio`);
    let separacao = Infinity;
    for (const [a, b] of arestasInternas) for (const [c, d] of arestasExternas) {
      assert.equal(cruzam(a, b, c, d), false, "contornos de patamares se cruzam");
      separacao = Math.min(separacao, distanciaPontoSegmento(a, c, d), distanciaPontoSegmento(b, c, d),
        distanciaPontoSegmento(c, a, b), distanciaPontoSegmento(d, a, b));
    }
    assert.ok(separacao >= 4 - EPS, `passagem entre patamares estreitou para ${separacao.toFixed(3)} m`);
  });
}

// Amostragem de toda a formação com margem vazia de 6 m. A busca usa vizinhos
// de quatro direções: diagonais isoladas não contam como ligação de terreno.
const todos = FORMACOES_PLANEJADAS.flatMap((f) => f.pontos);
const x0 = Math.floor(Math.min(...todos.map((p) => p[0]))) - 6;
const y0 = Math.floor(Math.min(...todos.map((p) => p[1]))) - 6;
const nx = Math.ceil(Math.max(...todos.map((p) => p[0]))) - x0 + 7;
const ny = Math.ceil(Math.max(...todos.map((p) => p[1]))) - y0 + 7;
const campo = Float64Array.from({ length: nx * ny }, (_, i) => elevacaoPlanejada(x0 + i % nx, y0 + Math.floor(i / nx)));
assert.ok(campo.every(Number.isFinite), "campo autoral contém altura inválida");

function preencher(inicios, aceita, vistos) {
  const fila = [];
  for (const i of inicios) if (!vistos[i] && aceita(i)) { vistos[i] = 1; fila.push(i); }
  for (let lido = 0; lido < fila.length; lido++) {
    const i = fila[lido], x = i % nx, y = Math.floor(i / nx);
    for (const j of [x > 0 ? i - 1 : -1, x + 1 < nx ? i + 1 : -1, y > 0 ? i - nx : -1, y + 1 < ny ? i + nx : -1]) {
      if (j >= 0 && !vistos[j] && aceita(j)) { vistos[j] = 1; fila.push(j); }
    }
  }
  return fila.length;
}

for (const nivel of [1, 2, 3]) {
  test(`acima do nível ${nivel}: uma massa conectada e nenhum buraco fechado na grade de 1 m`, () => {
    const ocupadas = Uint8Array.from(campo, (v) => Number(v > nivel));
    const primeiro = ocupadas.indexOf(1), total = ocupadas.reduce((s, v) => s + v, 0);
    assert.ok(total > 25, "patamar desapareceu ou virou um remanescente diminuto");
    const borda = [];
    for (let x = 0; x < nx; x++) borda.push(x, (ny - 1) * nx + x);
    for (let y = 1; y < ny - 1; y++) borda.push(y * nx, y * nx + nx - 1);
    assert.ok(borda.every((i) => !ocupadas[i]), "formação escapou da moldura de verificação");
    const conectadas = preencher([primeiro], (i) => Boolean(ocupadas[i]), new Uint8Array(campo.length));
    assert.equal(conectadas, total, `${total - conectadas} células formam ilhas separadas`);
    const exteriores = preencher(borda, (i) => !ocupadas[i], new Uint8Array(campo.length));
    assert.equal(exteriores, campo.length - total, `${campo.length - total - exteriores} células formam buracos fechados`);
  });
}

const plano = criarPlano(180, 120);
function areaDoLocal(id, passo = 0.5) {
  const local = plano.locais.find((l) => l.id === id);
  assert.ok(local, `local ${id} não existe`);
  const valores = [];
  for (let y = local.y - local.profundidade / 2; y <= local.y + local.profundidade / 2 + EPS; y += passo)
    for (let x = local.x - local.largura / 2; x <= local.x + local.largura / 2 + EPS; x += passo)
      valores.push(elevacaoPlanejada(x, y));
  return valores;
}

for (const id of ["nascente", "mirante"]) {
  test(`${id}: área reservada inteira apoiada no patamar alto`, () => {
    assert.ok(areaDoLocal(id).every((v) => v > 3), "reserva atravessa a borda do patamar alto");
  });
}
for (const id of ["chegada", "pavilhao"]) {
  test(`${id}: área reservada plana na base, sem nova colina`, () => {
    const valores = areaDoLocal(id);
    assert.ok(Math.max(...valores) - Math.min(...valores) < EPS, "reserva atravessa um desnível");
    assert.ok(valores.every((v) => v < 1), "reserva virou uma colina inesperada");
  });
}
