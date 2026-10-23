import { ESPECIES } from './especies.js';

/** Abre espaço visual sem mudar plantio, sorteios ou competição já calculados.
 * A borda acompanha os patamares reais, independentemente do ângulo da câmera.
 * A seleção só retira árvores de cenário; estudo, arbustos e marcos ficam. */
export function abrirClareirasPediatria(individuos, mundo) {
  const estudo = individuos.filter(a => a.assuntoEstudo);
  if (!estudo.length) return individuos;
  const cenarios = individuos.filter(a => !a.assuntoEstudo && !ESPECIES[a.especie].arbusto);
  const acaso = a => {
    let h = Math.imul(Math.round(a.x * 100), 374761393) ^ Math.imul(Math.round(a.z * 100), 668265263) ^ mundo.semente;
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  };
  const naBorda = a => {
    const h = mundo.altitude(a.x, a.z);
    return [[-10, 0], [10, 0], [0, -10], [0, 10]].some(([dx, dz]) =>
      Math.abs(mundo.altitude(a.x + dx, a.z + dz) - h) > 2.5);
  };
  const candidatas = cenarios.map(a => ({ a, borda: naBorda(a), acaso: acaso(a) })).filter(({ a, borda, acaso }) => {
    // Folga considera as copas adultas, mesmo quando o assunto ainda é semente.
    const folga = estudo.every(b => Math.hypot(a.x - b.x, a.z - b.z) >=
      Math.max(9.5, Math.min(13, (a.altura + b.altura) * .28 + 1.5)));
    return folga && (borda || acaso < .28);
  });
  // Cenário minoritário; a ordenação não muda a ordem de desenho dos indivíduos.
  candidatas.sort((a, b) => Number(b.borda) - Number(a.borda) || a.acaso - b.acaso);
  const manter = new Set(candidatas.slice(0, Math.round(estudo.length * .32)).map(o => o.a));
  return individuos.filter(a => a.assuntoEstudo || ESPECIES[a.especie].arbusto || manter.has(a));
}
