/** Liga cada árvore de estudo a um assunto da lista v2 (base: prévia 14a85cf do Codex).
 * O assunto define a espécie; a ordem dentro da espécie segue o plantio, então o lugar de
 * cada assunto é reproduzível para a mesma semente e continua surpresa até a árvore nascer. */
import { CATALOGO_PEDIATRIA } from './catalogoPediatria.js';
import { nomeCopa } from './crescimentoEstudo.js';

const porEspecie = new Map();
for (const assunto of CATALOGO_PEDIATRIA) {
  if (!porEspecie.has(assunto.especie)) porEspecie.set(assunto.especie, []);
  porEspecie.get(assunto.especie).push(assunto);
}

/** Acrescenta o assunto depois de todos os sorteios, sem mudar a ordem nem a paisagem.
 * Quotas experimentais maiores que o catálogo deixam o excedente sem vínculo. */
export function identificarArvoresEstudo(arvores) {
  const usados = new Map();
  for (const arvore of arvores) {
    if (!arvore.estudo) continue;
    const especie = arvore.especiePaisagem;
    const indice = usados.get(especie) ?? 0;
    usados.set(especie, indice + 1);
    const assunto = porEspecie.get(especie)?.[indice];
    if (assunto) arvore.assuntoEstudo = assunto;
  }
}

export function descreverAssuntoEstudo(assunto, secura = 0) {
  if (!assunto) return [];
  return [`Assunto: ${assunto.nome}`, `Área: Pediatria · ${assunto.area}`, ...(secura >= .1 ? [`Copa: ${nomeCopa(secura).toLowerCase()} (sem estudo recente)`] : [])];
}
