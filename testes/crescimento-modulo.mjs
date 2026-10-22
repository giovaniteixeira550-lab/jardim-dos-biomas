import test from 'node:test';
import assert from 'node:assert/strict';
import { avaliarCrescimento, regrasDoModulo, validarRegras, somarDias, nomeCopa, REGRAS_EXPERIMENTAIS } from '../src/crescimentoEstudo.js';
import { resumirModulo } from '../src/resumoModulo.js';
import { CATALOGO_PEDIATRIA } from '../src/catalogoPediatria.js';

const PED = { nome: 'Pediatria', inicio: '2026-11-03', fim: '2026-12-19' };
const R = regrasDoModulo(PED);
const ev = (n, dia, tipo = 'estudo', resultado = 'nao_avaliado') => ({ id: 'e' + n, data: somarDias(PED.inicio, dia), tipo, resultado });
// Estudo no dia 0, revisão no 2, volta no 7, recupera sozinho no 9, revisa no 16 e recupera de novo no 23.
const rodizio = [ev(1, 0), ev(2, 2), ev(3, 7), ev(4, 9, 'tentativa', 'autonomo'), ev(5, 16), ev(6, 23, 'tentativa', 'autonomo')];
const em = (eventos, dia) => avaliarCrescimento(eventos.filter(e => e.data <= somarDias(PED.inicio, dia)), somarDias(PED.inicio, dia), R);

test('as metas acompanham a duração do módulo', () => {
  validarRegras(R);
  assert.equal(R.duracaoModulo, 47);
  assert.deepEqual([R.jovem.intervalo, R.adulta.intervalo, R.adulta.intervaloRecuperacoes, R.intervaloAutonomias, R.toleranciaSemRegistro], [9, 19, 14, 7, 19]);
  const longo = regrasDoModulo({ inicio: '2027-01-04', fim: '2027-04-03' });
  assert.ok(longo.adulta.intervalo > R.adulta.intervalo && longo.toleranciaSemRegistro > R.toleranciaSemRegistro);
  const curto = regrasDoModulo({ inicio: '2027-01-04', fim: '2027-01-17' });
  assert.deepEqual([curto.adulta.intervalo, curto.adulta.intervaloRecuperacoes], [14, 10]);
  assert.throws(() => regrasDoModulo({ inicio: '2027-01-04', fim: '2027-01-06' }));
});

test('um assunto começado na primeira metade do rodízio chega a adulta antes do fim', () => {
  assert.deepEqual([2, 9, 22, 23].map(d => em(rodizio, d).estagio), ['muda', 'jovem', 'jovem', 'adulta']);
  assert.ok(somarDias(PED.inicio, 23) <= PED.fim);
  // Com as regras de longo prazo, a mesma trajetória não passava de jovem.
  assert.equal(avaliarCrescimento(rodizio, PED.fim, REGRAS_EXPERIMENTAIS).estagio, 'jovem');
});

test('estudar tudo de uma vez não pula fases: falta espaçar', () => {
  const concentrado = Array.from({ length: 10 }, (_, i) => ev('c' + i, i, 'tentativa', 'autonomo'));
  const a = em(concentrado, 9);
  assert.equal(a.estagio, 'jovem');
  assert.ok(a.proximo.criterios.some(c => !c.concluido && c.chave.startsWith('intervalo')));
});

test('depois do módulo, sem retorno, a copa amarela e seca; o porte fica', () => {
  const fim = '2026-11-26'; // último estudo, dia 23
  const a = (data) => avaliarCrescimento(rodizio, data, R);
  assert.equal(a(somarDias(fim, R.toleranciaSemRegistro)).senescencia, 0);
  const datas = ['2027-01-10', '2027-02-15', '2027-03-15', '2027-05-15'];
  const s = datas.map(d => a(d).senescencia);
  assert.ok(s.every((x, i) => i === 0 || x > s[i - 1]), 'secura só aumenta enquanto não há retorno');
  assert.equal(s.at(-1), 1);
  assert.deepEqual(datas.map(d => a(d).estagio), ['adulta', 'adulta', 'adulta', 'adulta']);
  assert.deepEqual(s.map(nomeCopa), ['Amarelando', 'Copa rala', 'Copa rala', 'Seca']);
});

test('retomar o assunto em retornos espaçados recupera a copa; retornos colados não', () => {
  const volta = (dias) => [...rodizio, ...dias.map((d, i) => ev('r' + i, d, i === 1 ? 'tentativa' : 'retomada', i === 1 ? 'autonomo' : 'nao_avaliado'))];
  const espacados = volta([224, 231, 238]), colados = volta([224, 225, 226]);
  assert.equal(em(espacados, 223).senescencia, 1);
  assert.ok(em(espacados, 238).senescencia < .2);
  assert.ok(em(colados, 226).senescencia > .5);
  assert.equal(em(espacados, 238).estagio, 'adulta');
});

test('o caderno usa as regras do módulo e entrega porte e secura ao mapa', () => {
  const dados = { modulo: PED, agora: '2027-03-15', inicioCiclo: '2026-10-21', objetivos: [], confusoes: [],
    registros: rodizio.map(e => ({ ...e, assunto: CATALOGO_PEDIATRIA[0].id })) };
  const r = resumirModulo(dados, CATALOGO_PEDIATRIA, R);
  const a = r.assuntos.find(x => x.estado);
  assert.equal(r.regras, 'crescimento-estudo-0.3');
  assert.equal(a.estagio, 'adulta');
  assert.ok(a.estado.senescencia > .4 && a.estado.senescencia < 1);
});
