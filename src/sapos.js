/** Sapos do lago: pousados nas vitórias-régias e na beira, com vida própria. Respiram (o papo pulsa), piscam,
 * coaxam inflando o saco vocal, viram a cabeça e, de vez em quando, saltam para outra folha num arco com um
 * anel de água onde caem. Tamanho exagerado (~0,5 m) para ler no pixel. Sem luz própria nem som. */
import * as THREE from "three";
import { RAMPAS as R } from "./paleta.js";
import { criarRng } from "./mundo.js";

function bola(r, cor, escala = [1, 1, 1], det = 1) { const g = new THREE.IcosahedronGeometry(r, det); g.scale(...escala); return { g, cor }; }
function malha({ g, cor }, toon, pos = [0, 0, 0]) { const m = new THREE.Mesh(g, toon({ color: cor })); m.position.set(...pos); m.castShadow = true; return m; }

/** Um sapo: corpo atarracado, barriga clara, cabeça com olhos saltados, pernas dobradas e saco vocal. */
function criarSapo(toon, rng) {
  const verde = [R.mata[3], R.mata[4], R.salvia[2]][Math.floor(rng() * 3)], escuro = R.mata[1];
  const sapo = new THREE.Group(), corpo = new THREE.Group(); sapo.add(corpo);
  corpo.add(malha(bola(.2, verde, [1.15, .62, 1.3], 2), toon, [0, .13, -.03]));
  corpo.add(malha(bola(.17, R.betula[0], [1.05, .45, 1.15], 1), toon, [0, .09, .0]));
  // Manchas escuras nas costas.
  for (const [x, z, r] of [[-.08, -.06, .045], [.07, -.1, .04], [.02, .03, .035]]) corpo.add(malha(bola(r, escuro, [1, .4, 1], 0), toon, [x, .245, z]));
  const cabeca = new THREE.Group(); cabeca.position.set(0, .16, .15); corpo.add(cabeca);
  cabeca.add(malha(bola(.15, verde, [1.15, .62, 1], 2), toon, [0, 0, .02]));
  const olhos = [];
  for (const s of [-1, 1]) {
    const olho = new THREE.Group(); olho.position.set(s * .085, .07, .02); cabeca.add(olho);
    olho.add(malha(bola(.055, verde, [1, 1, 1], 1), toon));
    olho.add(malha(bola(.04, R.amarelo[2], [1, 1, 1], 1), toon, [s * .012, .012, .022]));
    olho.add(malha(bola(.024, R.tinta[0], [1.4, .8, 1], 0), toon, [s * .016, .016, .045]));
    const palpebra = malha(bola(.058, verde, [1.02, .55, 1.02], 1), toon, [0, .03, 0]); palpebra.scale.y = .01; olho.add(palpebra);
    olhos.push(palpebra);
  }
  // Boca: risco escuro.
  const boca = new THREE.Mesh(new THREE.TorusGeometry(.11, .008, 3, 12, Math.PI * .8), toon({ color: R.tinta[0] })); boca.rotation.set(Math.PI / 2, 0, Math.PI * 1.1); boca.position.set(0, -.015, .08); cabeca.add(boca);
  const saco = malha(bola(.075, R.betula[0], [1.2, .9, 1], 1), toon, [0, -.05, .1]); saco.scale.setScalar(.01); cabeca.add(saco);
  // Pernas: traseiras dobradas e grandes dos lados; dianteiras curtas, apoiadas na frente.
  const pernas = [];
  for (const s of [-1, 1]) {
    const coxa = malha(bola(.08, verde, [.7, .55, 1.4], 1), toon, [s * .19, .08, -.1]); coxa.rotation.y = s * .4; corpo.add(coxa);
    const pe = malha(bola(.06, verde, [1.1, .3, 1.6], 0), toon, [s * .2, .02, .02]); corpo.add(pe); pernas.push(pe);
    const braco = malha(bola(.035, verde, [.7, 1.5, .7], 0), toon, [s * .1, .05, .19]); corpo.add(braco);
    corpo.add(malha(bola(.035, verde, [1.3, .3, 1.3], 0), toon, [s * .12, .01, .22]));
  }
  sapo.userData = { corpo, cabeca, olhos, saco, pernas };
  return sapo;
}

/** Cria o grupo de sapos. 'folhas' = [{x, z, r}] das vitórias-régias; 'beira' = pontos secos junto à água. */
export function criarSapos(mundo, toon, folhas, beira) {
  const grupo = new THREE.Group(); grupo.name = "sapos";
  if (!folhas.length) return grupo;
  const rng = criarRng(mundo.semente ^ 0x5a905);
  const Y_FOLHA = -0.495;
  const lugares = [...folhas.map(f => ({ ...f, y: Y_FOLHA, folha: true })), ...beira.map(b => ({ ...b, r: .5, y: b.y, folha: false }))];
  const ocupados = new Set(), sapos = [];
  // Anéis de água onde um sapo cai (reaproveitados).
  const aneis = Array.from({ length: 4 }, () => { const m = new THREE.Mesh(new THREE.RingGeometry(.3, .38, 20), new THREE.MeshBasicMaterial({ color: R.agua[5], transparent: true, opacity: 0, depthWrite: false })); m.rotation.x = -Math.PI / 2; grupo.add(m); return { m, t: -1 }; });
  const qtd = Math.min(7, lugares.length);
  const ordem = lugares.map((l, i) => ({ i, k: rng() + (l.folha ? 0 : .35) })).sort((a, b) => a.k - b.k);
  for (let n = 0; n < qtd; n++) {
    const i = ordem[n].i, l = lugares[i]; ocupados.add(i);
    const s = criarSapo(toon, rng), giro = rng() * Math.PI * 2;
    const o = l.folha ? { x: l.x + (rng() - .5) * l.r * .5, z: l.z + (rng() - .5) * l.r * .5 } : { x: l.x, z: l.z };
    s.position.set(o.x, l.y, o.z); s.rotation.y = giro; s.scale.setScalar(.9 + rng() * .3);
    grupo.add(s);
    sapos.push({ s, lugar: i, fase: rng() * 10, piscaEm: rng() * 4, coaxaEm: 3 + rng() * 12, saltaEm: 8 + rng() * 25, cabecaAlvo: 0, salto: null });
  }
  const cair = (x, y, z, t) => { const a = aneis.find(a => a.t < 0) ?? aneis[0]; a.t = t; a.m.position.set(x, y + .02, z); };

  grupo.userData.animar = (t) => {
    for (const a of aneis) {
      if (a.t < 0) continue;
      const k = (t - a.t) / 1.1;
      if (k >= 1) { a.t = -1; a.m.material.opacity = 0; continue; }
      a.m.scale.setScalar(.6 + k * 2.4); a.m.material.opacity = (1 - k) * .8;
    }
    for (const p of sapos) {
      const { corpo, cabeca, olhos, saco, pernas } = p.s.userData;
      // Salto em andamento: arco de 0,7 s até a nova folha, pernas esticadas no ar.
      if (p.salto) {
        const k = Math.min(1, (t - p.salto.t0) / .7), e = k * k * (3 - 2 * k);
        p.s.position.set(p.salto.de.x + (p.salto.para.x - p.salto.de.x) * e, p.salto.de.y + (p.salto.para.y - p.salto.de.y) * e + Math.sin(k * Math.PI) * p.salto.altura, p.salto.de.z + (p.salto.para.z - p.salto.de.z) * e);
        for (const pe of pernas) pe.position.z = .02 - Math.sin(k * Math.PI) * .22;
        corpo.rotation.x = -Math.sin(k * Math.PI) * .45;
        if (k >= 1) { p.salto = null; corpo.rotation.x = 0; for (const pe of pernas) pe.position.z = .02; if (lugares[p.lugar].folha) cair(p.s.position.x, p.s.position.y, p.s.position.z, t); p.saltaEm = t + 12 + Math.random() * 30; }
        continue;
      }
      // Respiração: o corpo sobe e desce de leve, o papo pulsa rápido.
      const resp = Math.sin((t + p.fase) * 2.6);
      corpo.scale.set(1 + resp * .02, 1 + resp * .04, 1);
      // Coaxar: o saco vocal enche três vezes seguidas.
      const dc = t - p.coaxaEm;
      if (dc >= 0 && dc < 1.5) saco.scale.setScalar(.01 + Math.max(0, Math.sin(dc / 1.5 * Math.PI * 3)) * 1.1);
      else { saco.scale.setScalar(.15 + (resp + 1) * .08); if (dc >= 1.5) p.coaxaEm = t + 6 + Math.random() * 18; }
      // Piscar.
      const dp = t - p.piscaEm;
      const fechado = dp >= 0 && dp < .16;
      for (const pal of olhos) pal.scale.y = fechado ? 1 : .01;
      if (dp >= .16) p.piscaEm = t + 2 + Math.random() * 5;
      // Virar a cabeça de vez em quando.
      if (Math.random() < .004) p.cabecaAlvo = (Math.random() - .5) * .9;
      cabeca.rotation.y += (p.cabecaAlvo - cabeca.rotation.y) * .06;
      // Hora de saltar para outro lugar livre e próximo.
      if (t >= p.saltaEm) {
        const aqui = lugares[p.lugar];
        const opcoes = lugares.map((l, i) => ({ l, i, d: Math.hypot(l.x - aqui.x, l.z - aqui.z) })).filter(o => !ocupados.has(o.i) && o.d > .8 && o.d < 7);
        if (!opcoes.length) { p.saltaEm = t + 10; continue; }
        const alvo = opcoes[Math.floor(Math.random() * opcoes.length)];
        ocupados.delete(p.lugar); ocupados.add(alvo.i); p.lugar = alvo.i;
        const para = { x: alvo.l.x + (Math.random() - .5) * alvo.l.r * .4, y: alvo.l.y, z: alvo.l.z + (Math.random() - .5) * alvo.l.r * .4 };
        p.s.rotation.y = Math.atan2(para.x - p.s.position.x, para.z - p.s.position.z);
        p.salto = { t0: t, de: p.s.position.clone(), para, altura: .5 + alvo.d * .12 };
        if (aqui.folha) cair(p.s.position.x, p.s.position.y, p.s.position.z, t);
      }
    }
  };
  grupo.userData.quantidade = sapos.length;
  grupo.userData.sapos = sapos; // inspeção no console
  return grupo;
}
