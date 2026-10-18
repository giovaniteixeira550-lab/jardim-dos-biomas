/** Dois pixels físicos por bloco, inclusive no modo de maior definição. */
export function dimensoesRender(largura, altura, qualidade, limite = 8192) {
  const escalaDesejada = qualidade === "alta" ? 2 : 1;
  // Limites explícitos: não tentar alocar alvos maiores que a GPU suporta.
  const escala = Math.min(escalaDesejada, limite / largura, limite / altura,
    Math.sqrt(16000000 / (largura * altura)));
  const w = Math.max(2, Math.floor(largura * escala / 2) * 2);
  const h = Math.max(2, Math.floor(altura * escala / 2) * 2);
  return { largura: w, altura: h };
}
