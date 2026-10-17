/** Contratos e apoio anatômico compartilhados pelo bosque, catálogo e evolução. */
import * as THREE from 'three';
import { PALETA } from './paleta.js';
const V = () => new THREE.Vector3();

export function validarEspecie(def, formas) {
  const falha = motivo => { throw Error(`${def.nome ?? 'Espécie'}: ${motivo}`); };
  if (!def.cores || !PALETA.includes(def.cores.folha) || !PALETA.includes(def.cores.casca)) falha('folha e casca precisam de cores próprias');
  for (const [nome, cor] of Object.entries(def.cores ?? {})) if (!PALETA.includes(cor)) falha(`cor inválida em ${nome}`);
  if (!def.altura || def.altura.length !== 2 || !def.altura.every(x => Number.isFinite(x) && x > 0) || def.altura[1] < def.altura[0]) falha('intervalo de altura inválido');
  if (def.forma === 'catavento' && (def.flor || def.fruto || def.tapete || def.noTronco || def.espinhos || def.formaJovem)) falha('catavento não aceita enfeites ou arquiteturas de outra espécie');
  if ((def.forma === 'paineiraAbracos' || def.forma === 'salgueiroCancoes' || def.forma === 'araucariaCometas') && (def.flor || def.fruto || def.tapete || def.noTronco || def.espinhos || def.formaJovem)) falha(`${def.forma} traz enfeites próprios; não aceita enfeites de outra espécie`);
  if (def.noTronco && def.fruto?.disposicao !== 'tronco') falha('frutos no tronco sem contrato correspondente');
  if (!formas.includes(def.forma) || (def.formaJovem && !formas.includes(def.formaJovem))) falha('forma não cadastrada');
  for (const tipo of ['flor', 'fruto']) {
    const extra = def[tipo];
    if (!extra) continue;
    if (!Number.isFinite(extra.raio) || extra.raio <= 0 || !Number.isInteger(extra.quantidade) || extra.quantidade < 0 || !PALETA.includes(extra.cor)) falha(`${tipo} sem tamanho, cor ou quantidade válida`);
  }
  if (def.fruto?.cores && (!def.fruto.cores.length || !def.fruto.cores.every(c => PALETA.includes(c)))) falha('cores de frutos fora da paleta');
  if (def.fruto) {
    const modo = def.fruto.disposicao;
    if (!['copa', 'cacho', 'tronco', 'proprio'].includes(modo)) falha('declare a disposição do fruto');
    if (modo === 'cacho' && !['palmeira', 'leque', 'acai'].includes(def.forma)) falha('cacho sem arquitetura de apoio');
    if (modo === 'tronco' && (!def.noTronco || def.forma !== 'redonda' || def.fruto.quantidade !== 0)) falha('frutos no tronco precisam do suporte e contagem próprios');
    if (modo === 'proprio' && (def.forma !== 'bananeira' || def.fruto.quantidade !== 0)) falha('fruto próprio sem gerador específico');
    if (modo === 'copa' && !['redonda', 'oval', 'pendente', 'esparramada', 'moita', 'guarda-chuva', 'garrafa'].includes(def.forma)) falha('esta arquitetura precisa de suporte próprio para frutos');
  }
  if (def.espinhos && def.forma !== 'garrafa') falha('espinhos sem suporte no tronco');
  if (def.tapete && !def.flor) falha('tapete sem flores da própria espécie');
}

/** Amostra triângulos reais, ponderados pela área; respeita copas achatadas. */
export function distribuirEnfeites(partes, apoios, extra, rng) {
  const n = extra.quantidade;
  if (!n) return [];
  const volumes = partes.filter(g => g.userData.copa);
  const registros = [];
  if (extra.disposicao === 'cacho') {
    if (!apoios.length) throw Error('Cacho sem ponto de apoio');
    const grupos = apoios.length * (n / apoios.length > 20 ? 3 : 1);
    for (let i = 0; i < n; i++) {
      const grupo = i % grupos, suporte = grupo % apoios.length, c = apoios[suporte];
      const ordem = Math.floor(i / grupos), camada = Math.floor(ordem / 4), a = ordem * 2.39996;
      const tamanho = extra.raio * (.92 + rng() * .16);
      const angulo = grupo * 2.39996;
      const raiz = c.c.clone().add(new THREE.Vector3(Math.cos(angulo) * c.r * .75, 0, Math.sin(angulo) * c.r * .75));
      const apoio = raiz.clone().add(new THREE.Vector3(0, -extra.raio * (2 + camada * 1.6), 0));
      const centro = apoio.clone().add(new THREE.Vector3(Math.cos(a) * tamanho * 1.7, -tamanho * .3, Math.sin(a) * tamanho * 1.7));
      const fim = raiz.clone().add(new THREE.Vector3(0, -extra.raio * (2 + Math.floor((Math.ceil(n / grupos)-1)/4) * 1.6), 0));
      registros.push({ centro, apoio, tamanho, suporte, ...(ordem === 0 ? { haste: [raiz, fim] } : {}) });
    }
    return registros;
  }
  if (!volumes.length) {
    // Mandacaru: flores exclusivamente nas pontas registradas pelos braços.
    if (extra.tipo === 'fruto' || !apoios.length) throw Error('Enfeite sem superfície de apoio');
    return Array.from({ length: n }, (_, i) => {
      const suporte = i % apoios.length, c = apoios[suporte], a = i * 2.39996;
      const apoio = c.c.clone().add(new THREE.Vector3(Math.cos(a) * c.r * .6, 0, Math.sin(a) * c.r * .6));
      return { centro: apoio.clone(), apoio, tamanho: extra.raio, suporte };
    });
  }
  const tris = [], a = V(), b = V(), c = V(); let area = 0;
  volumes.forEach((g, suporte) => {
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i += 3) {
      a.fromBufferAttribute(p, i); b.fromBufferAttribute(p, i + 1); c.fromBufferAttribute(p, i + 2);
      const normal = b.clone().sub(a).cross(c.clone().sub(a));
      const peso = normal.length() / 2;
      area += peso;
      tris.push({ a: a.clone(), b: b.clone(), c: c.clone(), normal: normal.normalize(), acumulada: area, suporte });
    }
  });
  const candidato = () => {
    const alvo = rng() * area;
    let lo = 0, hi = tris.length - 1;
    while (lo < hi) { const m = (lo + hi) >> 1; if (tris[m].acumulada < alvo) lo = m + 1; else hi = m; }
    const t = tris[lo], u = Math.sqrt(rng()), v = rng();
    const apoio = t.a.clone().multiplyScalar(1-u).addScaledVector(t.b, u*(1-v)).addScaledVector(t.c, u*v);
    const tamanho = extra.raio * (.9 + rng() * .2);
    const centro = apoio.clone().addScaledVector(t.normal, tamanho * .65);
    if (extra.tipo === 'fruto') centro.y -= tamanho * .55 * (extra.achatar ?? 1);
    // Não colocar frutos no miolo onde dois volumes da copa se sobrepõem.
    const enterrado = volumes.some((g, j) => {
      if (j === t.suporte) return false;
      const q = g.userData.copa, d = centro.clone().sub(q.centro);
      d.y /= q.achatar;
      return d.length() < q.raio * .79;
    });
    return { centro, apoio, tamanho, suporte: t.suporte, enterrado };
  };
  for (let i = 0; i < n; i++) {
    let melhor, distancia = -Infinity;
    // Melhor de 32 candidatos: espaçamento sem filas, anéis ou pilhas de frutas.
    for (let k = 0; k < 32; k++) {
      const p = candidato();
      if (p.enterrado) continue;
      const d = registros.length ? Math.min(...registros.map(q => p.centro.distanceTo(q.centro) / (p.tamanho + q.tamanho))) : 1;
      if (d > distancia) { distancia = d; melhor = p; }
    }
    if (melhor && distancia >= .92) { delete melhor.enterrado; registros.push(melhor); }
  }
  return registros;
}
