/** Verificação geométrica independente de WebGL: node --test testes/percursos.mjs */
import assert from "node:assert/strict";
import test from "node:test";
import { gerarMundo } from "../src/mundo.js";

const sementes = [1234, 42, 2026, 7, 99];
const mundos = sementes.map((semente) => gerarMundo(semente));
const tolerancia = 1e-7;
const distancia = (a, b) => Math.hypot(b.x - a.x, b.y - a.y);
const propostos = (m) => m.plano.locais.filter((l) => l.status === "proposto");

// Projeção própria sobre TODOS os segmentos: também verifica a consulta espacial
// usada pela produção, sem reutilizar sua lógica de filtragem ou seus índices.
function rioEm(m, x, y) {
  let melhor = null;
  for (let i = 1; i < m.riacho.pontos.length; i++) {
    const a = m.riacho.pontos[i - 1], b = m.riacho.pontos[i];
    const dx = b.x - a.x, dy = b.y - a.y, l2 = dx * dx + dy * dy;
    if (l2 < 1e-10) continue;
    const t = Math.max(0, Math.min(1, ((x - a.x) * dx + (y - a.y) * dy) / l2));
    const d = Math.hypot(x - a.x - t * dx, y - a.y - t * dy);
    if (!melhor || d < melhor.d - 1e-9) melhor = {
      d, agua: a.agua + (b.agua - a.agua) * t,
      largura: a.largura + (b.largura - a.largura) * t,
    };
  }
  return melhor;
}

function macro(m) {
  const alturas = [];
  for (let y = 0; y <= m.altura; y += 3) for (let x = 0; x <= m.largura; x += 3) alturas.push(m.altitude(x, y));
  return { plano: m.plano, lago: m.lago.contorno, trilha: m.trilha, riacho: m.riacho, pontes: m.pontes, alturas };
}

test("a mesma semente repete o projeto e o plantio; outras sementes preservam o projeto", () => {
  const repetido = gerarMundo(1234);
  assert.deepEqual(macro(repetido), macro(mundos[0]));
  assert.deepEqual(repetido.objetos, mundos[0].objetos);
  const projeto = macro(mundos[0]);
  for (const m of mundos.slice(1)) {
    assert.deepEqual(macro(m), projeto, `projeto mudou com a semente ${m.semente}`);
    assert.notDeepEqual(m.objetos, mundos[0].objetos, `plantio não variou na semente ${m.semente}`);
  }
});

for (const m of mundos) {
  test(`semente ${m.semente}: água contínua em patamares, três cortinas verticais e foz no lago`, () => {
    const pontos = m.riacho.pontos;
    assert.equal(m.riacho.quedas.length, 3);
    assert.equal(pontos.at(-1).agua, -0.55);
    assert.ok(m.fatorLago(pontos.at(-1).x, pontos.at(-1).y) < 1, "foz termina fora do lago");
    let cortinas = 0;
    for (let i = 1; i < pontos.length; i++) {
      const a = pontos[i - 1], b = pontos[i], queda = a.agua - b.agua;
      assert.ok([a.x, a.y, a.agua, a.largura, b.x, b.y, b.agua, b.largura].every(Number.isFinite));
      assert.ok(queda >= -tolerancia, `água sobe no segmento ${i}: ${a.agua} → ${b.agua}`);
      assert.ok(b.largura >= m.riacho.largura, `largura inválida no segmento ${i}`);
      if (queda > tolerancia) {
        assert.ok(distancia(a, b) < tolerancia, `queda ${i} virou rampa de ${distancia(a, b)} m`);
        cortinas++;
      }
    }
    assert.equal(cortinas, 3, "metadados de queda divergem da superfície da água");
    assert.ok(Math.max(...pontos.map((p) => p.largura)) > 6, "poços não alargam o riacho");
  });

  test(`semente ${m.semente}: ponte alinhada à estrada, com desembarques conectados`, () => {
    assert.equal(m.pontes.length, 1);
    const p = m.ponte;
    assert.ok(Math.abs(Math.hypot(p.dx, p.dy) - 1) < tolerancia);
    assert.ok(m.distTrilha(p.x, p.y) < tolerancia, "centro da ponte está fora do caminho");
    const centroRio = rioEm(m, p.x, p.y);
    assert.ok(centroRio.d < tolerancia, "ponte não cruza o riacho");
    assert.ok(p.h - centroRio.agua >= 0.9 - tolerancia, "água invade o tabuleiro");
    for (const sinal of [-1, 1]) {
      const d = p.comprimento / 2 + 0.5;
      const x = p.x + sinal * p.dx * d, y = p.y + sinal * p.dy * d;
      const erroDirecao = m.distTrilha(x, y), erroAltura = Math.abs(m.altitude(x, y) - p.h);
      assert.ok(erroDirecao < 1e-5, `desembarque ${sinal} fora da estrada: ${erroDirecao} m`);
      assert.ok(erroAltura <= 0.12, `desembarque ${sinal} desnivelado: ${erroAltura} m (piso ${m.altitude(x, y)}, ponte ${p.h})`);
      assert.ok(Math.abs(m.perfilTrilha(x, y).h - p.h) < tolerancia, "patamar de acesso não continua o tabuleiro");
      const margem = rioEm(m, x, y);
      assert.ok(margem.d > margem.largura / 2 + 0.4, `desembarque ${sinal} termina no canal`);
    }
    for (let s = p.s0; s <= p.s1; s += 0.25) {
      const x = p.x + p.dx * (s - p.s), y = p.y + p.dy * (s - p.s);
      assert.ok(Math.abs(m.perfilTrilha(x, y).h - p.h) < tolerancia, `perfil muda de altura sobre a ponte em ${s}`);
    }
  });

  test(`semente ${m.semente}: caminho possui degraus limitados e patamares de acesso`, () => {
    const pontos = m.trilha.amostras;
    let degraus = 0, patamares = 0;
    for (let i = 1; i < pontos.length; i++) {
      const a = pontos[i - 1], b = pontos[i], delta = Math.abs(b.h - a.h);
      assert.ok(b.s > a.s && b.s - a.s <= 0.5 + tolerancia, `amostragem descontínua em ${i}`);
      assert.ok(delta <= 0.3 + tolerancia, `espelho de ${delta} m em ${i}`);
      assert.ok(Math.abs(b.h / 0.3 - Math.round(b.h / 0.3)) < tolerancia, `altura fora da modulação em ${i}`);
      if (delta > tolerancia) { degraus++; assert.ok(a.escada || b.escada, `desnível sem escada em ${i}`); }
      else patamares++;
    }
    assert.ok(degraus > 10, "subida perdeu os degraus");
    assert.ok(patamares > 10, "caminho perdeu os patamares");
  });

  test(`semente ${m.semente}: cortinas sem triângulo de terra e margens sustentadas`, () => {
    for (const q of m.riacho.quedas) for (const lateral of [-0.25, 0, 0.25]) {
      const x = q.x - q.dy * q.largura * lateral, y = q.y + q.dx * q.largura * lateral;
      const piso = m.altitude(x, y);
      assert.ok(piso <= q.agua - 0.1, `terra atravessa a cortina ${q.numero}, lateral ${lateral}: piso ${piso}, água ${q.agua}`);
    }
    const pontos = m.riacho.pontos;
    for (let i = 1; i < pontos.length - 1; i += 3) {
      const p = pontos[i], a = pontos[i - 1], b = pontos[i + 1];
      if (m.riacho.quedas.some((q) => Math.abs(q.s - p.s) < 3) || m.fatorLago(p.x, p.y) < 1.1) continue;
      const comprimento = distancia(a, b);
      if (comprimento < tolerancia) continue;
      const dx = (b.x - a.x) / comprimento, dy = (b.y - a.y) / comprimento;
      for (const sinal of [-1, 1]) {
        // O tampo junto à água pertence agora à malha explícita das margens;
        // aqui verificamos a união EXTERNA dessa peça com a grade do terreno.
        const afastamento = p.largura / 2 + 0.95;
        const x = p.x - sinal * dy * afastamento, y = p.y + sinal * dx * afastamento;
        assert.ok(m.altitude(x, y) >= p.agua - 0.12, `água sem margem em ${i}/${sinal}: água ${p.agua}, terra ${m.altitude(x, y)}`);
      }
    }
  });

  test(`semente ${m.semente}: ombros do canal ficam abaixo da água, inclusive nas cascatas`, () => {
    const pontos = m.riacho.pontos;
    let pertoDeQueda = 0, foraDeQueda = 0;
    for (let i = 1; i < pontos.length - 1; i++) {
      const p = pontos[i], a = pontos[i - 1], b = pontos[i + 1];
      const comprimento = distancia(a, b);
      if (comprimento < tolerancia) continue;
      const dx = (b.x - a.x) / comprimento, dy = (b.y - a.y) / comprimento;
      const juntoDeQueda = m.riacho.quedas.some((q) => Math.abs(q.s - p.s) < 3);
      for (const proporcao of [0.8, 0.95]) for (const sinal of [-1, 1]) {
        const afastamento = p.largura / 2 * proporcao;
        const x = p.x - sinal * dy * afastamento, y = p.y + sinal * dx * afastamento;
        const piso = m.altitude(x, y);
        assert.ok(piso <= p.agua - 0.1,
          `terra atravessa o ombro ${i}, lado ${sinal}, ${(proporcao * 100).toFixed(0)}% da meia largura: piso ${piso}, água ${p.agua}, x ${x}, y ${y}`);
        if (juntoDeQueda) pertoDeQueda++;
        else foraDeQueda++;
      }
    }
    assert.ok(pertoDeQueda > 0 && foraDeQueda > 0, "amostragem não cobriu canal e cascatas");
  });

  test(`semente ${m.semente}: reservas propostas acessíveis, planas e sem árvores`, () => {
    assert.equal(propostos(m).length, 3);
    for (const l of propostos(m)) {
      assert.ok(m.distTrilha(l.x, l.y) <= 6, `${l.id}: reserva sem acesso próximo`);
      const alturas = [];
      for (const tx of [-0.4, 0, 0.4]) for (const ty of [-0.4, 0, 0.4]) {
        const x = l.x + tx * l.largura, y = l.y + ty * l.profundidade;
        alturas.push(m.altitude(x, y));
        const rio = rioEm(m, x, y);
        assert.ok(rio.d > rio.largura / 2 + 0.5, `${l.id}: reserva invade o canal`);
        assert.ok(m.fatorLago(x, y) > 1.08, `${l.id}: reserva invade o lago`);
      }
      const desnivel = Math.max(...alturas) - Math.min(...alturas);
      assert.ok(desnivel <= 0.3, `${l.id}: plataforma desnivelada em ${desnivel} m`);
      const intrusos = m.objetos.filter((o) => ["arvore", "arbusto"].includes(o.tipo)
        && Math.abs(o.x - l.x) < l.largura / 2 + 1 && Math.abs(o.y - l.y) < l.profundidade / 2 + 1);
      assert.equal(intrusos.length, 0, `${l.id}: ${intrusos.length} árvores/arbustos ocupam a reserva`);
    }
  });
}
