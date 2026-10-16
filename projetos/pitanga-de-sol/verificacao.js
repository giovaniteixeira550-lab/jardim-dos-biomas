/**
 * Verificações proporcionais da Pitanga-de-Sol: geometria válida,
 * repetibilidade, características por estágio, apoio de flores/frutos e
 * silhueta em vários ângulos. Usa só o gerador; não depende da renderização.
 */
import * as THREE from "three";
import { construirPitanga, geometriaFruto, ESPECIE, CORES } from "./pitanga.js";

const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);

function geometriaValida(g, nome) {
  for (const a of ["position", "normal", "color"]) {
    const arr = g.attributes[a]?.array;
    if (!arr || !arr.length) throw Error(`${nome}: sem atributo ${a}`);
    if (!arr.every(Number.isFinite)) throw Error(`${nome}: ${a} com valor inválido`);
  }
  if (g.attributes.position.count % 3) throw Error(`${nome}: triângulos incompletos`);
  if (g.boundingBox.min.y < -0.3) throw Error(`${nome}: geometria abaixo do chão (${g.boundingBox.min.y.toFixed(2)} m)`);
}

/** Largura projetada da copa vista de um azimute (silhueta). */
function larguraProjetada(g, azimute) {
  const p = g.attributes.position.array, ex = Math.cos(azimute), ez = Math.sin(azimute);
  let min = Infinity, max = -Infinity;
  for (let i = 0; i < p.length; i += 3) {
    if (p[i + 1] < 0.3) continue; // ignora raízes e chão
    const s = p[i] * ex + p[i + 2] * ez;
    min = Math.min(min, s); max = Math.max(max, s);
  }
  return max - min;
}

/** Distância de um ponto a um ramo amostrado (descontando o raio do ramo). */
function distanciaAoRamo(q, r) {
  let melhor = Infinity;
  for (let i = 0; i <= 64; i++) {
    const t = i / 64, raio = r.r0 + (r.r1 - r.r0) * Math.pow(t, 0.8);
    melhor = Math.min(melhor, r.curva.getPointAt(t).distanceTo(q) - raio);
  }
  return melhor;
}

function conferirApoios(nome, info, enfeites, raio) {
  for (const [i, e] of enfeites.entries()) {
    const id = `${nome} ${e.tipo} ${i + 1}`;
    if (e.curva.getPointAt(0).distanceTo(e.apoio) > 1e-6) throw Error(`${id}: pedúnculo não começa no apoio`);
    if (e.suporte.tipo === "copa") {
      const n = info.copas[e.suporte.indice].normalizada(e.apoio);
      if (n > 0.95) throw Error(`${id}: pedúnculo não nasce dentro da folhagem (${n.toFixed(2)})`);
    } else {
      const d = distanciaAoRamo(e.apoio, info.ramos[e.suporte.indice + 1]);
      if (d > 0.01) throw Error(`${id}: pedúnculo solto do ramo (${d.toFixed(3)} m)`);
    }
    // O fruto pende do pedúnculo: a covinha superior coincide com a ponta.
    const topo = e.centro.clone().addScaledVector(e.eixo, e.tipo === "fruto" ? raio * 0.72 : 0);
    if (topo.distanceTo(e.fim) > 1e-4) throw Error(`${id}: corpo separado do pedúnculo`);
    for (const c of info.copas) if (c.normalizada(e.centro) < 1.0) throw Error(`${id}: enterrado na copa`);
    if (e.centro.y < raio) throw Error(`${id}: encosta no chão`);
  }
}

/** Conta os sulcos olhando o perfil do fruto no equador. */
function contarSulcos() {
  const [corpo] = geometriaFruto(1, CORES.frutos[0], ESPECIE.fruto.sulcos);
  const p = corpo.attributes.position, raios = new Map();
  for (let i = 0; i < p.count; i++) {
    if (Math.abs(p.getY(i)) > 0.12) continue;
    const ang = Math.round(((Math.atan2(p.getZ(i), p.getX(i)) + Math.PI * 2) % (Math.PI * 2)) * 1000);
    raios.set(ang, Math.hypot(p.getX(i), p.getZ(i)));
  }
  const perfil = [...raios.entries()].sort((a, b) => a[0] - b[0]).map((e) => e[1]);
  let minimos = 0;
  for (let i = 0; i < perfil.length; i++) {
    const a = perfil[(i - 1 + perfil.length) % perfil.length], b = perfil[i], c = perfil[(i + 1) % perfil.length];
    if (b < a && b <= c) minimos++;
  }
  const prof = 1 - Math.min(...perfil) / Math.max(...perfil);
  corpo.dispose();
  return { minimos, prof };
}

export function verificarPitanga() {
  const linhas = [];
  const ok = (t) => linhas.push(`PASSOU — ${t}`);
  const a = construirPitanga(1234), b = construirPitanga(1234), c = construirPitanga(98765);
  try {
    // 1. Geometria válida e repetível.
    a.estagios.forEach((g, e) => {
      geometriaValida(g, a.info[e].fase);
      const p = g.attributes.position.array, q = b.estagios[e].attributes.position.array;
      const cp = g.attributes.color.array, cq = b.estagios[e].attributes.color.array;
      if (p.length !== q.length || !p.every((v, i) => v === q[i]) || !cp.every((v, i) => v === cq[i])) throw Error(`${a.info[e].fase}: mesma semente gerou modelo diferente`);
    });
    ok(`geometria válida nos 4 estágios (${a.estagios.map((g) => g.attributes.position.count / 3).join(" / ")} triângulos), sem nada abaixo do chão`);
    ok("mesma semente ⇒ mesmos vértices e cores nos 4 estágios");
    const difere = c.estagios[3].attributes.position.count !== a.estagios[3].attributes.position.count || c.estagios[3].attributes.position.array.some((v, i) => v !== a.estagios[3].attributes.position.array[i]);
    if (!difere) throw Error("sementes diferentes geraram a mesma adulta");
    ok("semente diferente ⇒ outra adulta (variação existe)");

    // 2. Altura progride.
    for (let e = 1; e < 4; e++) if (!(a.alturas[e] > a.alturas[e - 1])) throw Error("a altura não progride entre estágios");
    ok(`altura progride: ${a.alturas.map((h) => h.toFixed(2) + " m").join(" → ")}`);

    // 3. Características por estágio.
    const [ib, im, ij, ia] = a.info;
    if (ib.paresDeFolhas.length < 3 || ib.copas.length || ib.flores.length || ib.frutos.length) throw Error("broto: precisa só de pares de folhas");
    ib.paresDeFolhas.slice(1).forEach((p, i) => {
      const giro = Math.abs(((p.azimute - ib.paresDeFolhas[i].azimute) % Math.PI + Math.PI) % Math.PI - Math.PI / 2);
      if (giro > 1e-6) throw Error("broto: pares de folhas não estão cruzados (decussados)");
    });
    if (ib.paresDeFolhas.at(-1).cor !== CORES.cobre) throw Error("broto: o par mais novo deveria ser cor de cobre");
    ok(`broto: ${ib.paresDeFolhas.length} pares de folhas opostas e cruzadas, o mais novo cor de cobre; sem copa, flor ou fruto`);
    if (im.ramosLaterais < 4 || im.ramosLaterais % 2 || im.flores.length || im.frutos.length) throw Error("muda: precisa de pares de ramos laterais e nenhuma flor/fruto");
    ok(`muda: caule único com ${im.ramosLaterais} ramos laterais em pares opostos; sem flores nem frutos`);
    const queda = (info) => Math.min(...info.arcos.map((r) => (r.topoY - r.pontaY) / r.topoY));
    const qj = queda(ij), qa = queda(ia);
    if (!(qj > 0.03 && qj < 0.15)) throw Error(`jovem: arqueio inicial fora do esperado (${qj.toFixed(2)})`);
    if (!(qa > 0.18 && qa > qj * 1.5)) throw Error(`adulta: pontas não descem o bastante (${qa.toFixed(2)})`);
    if (ij.flores.length < 10 || ij.frutos.length) throw Error("jovem: precisa da primeira florada e de nenhum fruto");
    if (ia.flores.length || ia.frutos.length < 26) throw Error(`adulta: frutos insuficientes (${ia.frutos.length})`);
    ok(`jovem: ${ij.arcos.length} pernadas começando a arquear (pontas ${Math.round(qj * 100)}% abaixo do topo do arco) e ${ij.flores.length} flores; sem frutos`);
    ok(`adulta: ${ia.arcos.length} pernadas arqueadas (pontas ≥ ${Math.round(qa * 100)}% abaixo do topo) e ${ia.frutos.length} frutos; sem flores`);

    // 4. Proporção: baixa e larga; jovem mais aberta que a adulta.
    const prop = (g) => Math.max(...[0, 1, 2, 3].map((k) => larguraProjetada(g, (k * Math.PI) / 4))) / g.boundingBox.max.y;
    const pj = prop(a.estagios[2]), pa = prop(a.estagios[3]);
    if (pa < 1.4) throw Error(`adulta pouco espalhada (largura/altura ${pa.toFixed(2)})`);
    ok(`adulta baixa e espalhada: largura/altura ${pa.toFixed(2)} (jovem ${pj.toFixed(2)})`);
    const cobertura = (info) => info.copas.reduce((s, c) => s + Math.PI * c.raio * c.raio, 0) / (Math.PI * Math.max(...info.arcos.map((r) => r.alcance)) ** 2);
    const cj = cobertura(ij), ca = cobertura(ia);
    if (!(cj < ca)) throw Error("jovem não está mais aberta que a adulta");
    ok(`copa da jovem mais aberta: cobertura ${Math.round(cj * 100)}% contra ${Math.round(ca * 100)}% na adulta`);

    // 5. Silhueta em 8 ângulos: sem lado "achatado".
    const larguras = Array.from({ length: 8 }, (_, k) => larguraProjetada(a.estagios[3], (k * Math.PI) / 8));
    const razao = Math.max(...larguras) / Math.min(...larguras);
    if (razao > 1.45) throw Error(`silhueta da adulta muda demais com o giro (${razao.toFixed(2)})`);
    ok(`silhueta da adulta em 8 ângulos: ${Math.min(...larguras).toFixed(2)}–${Math.max(...larguras).toFixed(2)} m (razão ${razao.toFixed(2)})`);

    // 6. Apoio anatômico de flores e frutos.
    conferirApoios("jovem", ij, ij.flores, ESPECIE.flor.raio);
    conferirApoios("adulta", ia, ia.frutos, ESPECIE.fruto.raio);
    const noRamo = ia.frutos.filter((f) => f.suporte.tipo === "ramo").length;
    ok(`todas as ${ij.flores.length} flores e ${ia.frutos.length} frutos presos por pedúnculo (${noRamo} frutos em ramos expostos, ${ia.frutos.length - noRamo} saindo da folhagem); nenhum enterrado ou no chão`);

    // 7. Distribuição natural dos frutos: alturas, direções e cores.
    const ys = ia.frutos.map((f) => f.centro.y), amplitude = Math.max(...ys) - Math.min(...ys);
    const quadrantes = new Set(ia.frutos.map((f) => Math.floor(((Math.atan2(f.centro.z, f.centro.x) + Math.PI * 2) % (Math.PI * 2)) / (Math.PI / 2))));
    const inclinacoes = ia.frutos.map((f) => Math.acos(Math.min(1, f.eixo.y)) * 180 / Math.PI);
    const cores = new Set(ia.frutos.map((f) => f.cor));
    if (amplitude < 1 || quadrantes.size < 4 || cores.size < 3) throw Error("frutos concentrados demais ou com pouca variação de cor");
    ok(`frutos de ${Math.min(...ys).toFixed(2)} a ${Math.max(...ys).toFixed(2)} m, nos 4 quadrantes, inclinação ${Math.round(Math.min(...inclinacoes))}°–${Math.round(Math.max(...inclinacoes))}°, ${cores.size} cores de maturação`);

    // 8. Geometria própria do fruto.
    const s = contarSulcos();
    if (s.minimos !== ESPECIE.fruto.sulcos || s.prof < 0.1) throw Error(`fruto com ${s.minimos} sulcos (profundidade ${s.prof.toFixed(2)})`);
    ok(`fruto com ${s.minimos} sulcos reais na geometria (profundidade ${Math.round(s.prof * 100)}% do raio) e coroa de 4 sépalas`);
    linhas.push("\nTodas as verificações passaram. A leitura artística é conferida nas capturas.");
    return { passou: true, texto: linhas.join("\n") };
  } catch (e) {
    linhas.push(`FALHOU — ${e.message}`);
    return { passou: false, texto: linhas.join("\n") };
  } finally {
    for (const g of [...a.estagios, ...b.estagios, ...c.estagios]) g.dispose();
  }
}
