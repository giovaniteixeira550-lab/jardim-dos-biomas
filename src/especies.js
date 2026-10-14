/**
 * Catálogo de espécies — as REGRAS de cada árvore, separadas do motor gráfico.
 *
 * Para criar uma espécie nova: acrescente uma entrada aqui (forma da copa,
 * cores, altura, habitat). O motor (cena.js) não precisa mudar.
 *
 * Cada árvore do mapa é um indivíduo (ver `Arvore` em cena.js) com espécie,
 * posição, estágio e tom próprios; a espécie só diz COMO ela cresce e onde vive.
 */
import { BASE, RAMPAS } from "./paleta.js";

/**
 * Estágios de vida, comuns a todas as espécies (frações do crescimento do indivíduo).
 * `escala` = tamanho relativo à adulta. Nada morre: o mínimo é a muda.
 */
export const ESTAGIOS = [
  { id: "muda", nome: "Muda", ate: 0.3, escala: 0.3 },
  { id: "jovem", nome: "Jovem", ate: 0.75, escala: 0.65 },
  { id: "adulta", nome: "Adulta", ate: 1.01, escala: 1 },
];

/** Estágio e escala contínua de um indivíduo para um crescimento 0..1. */
export function estagioDe(g) {
  if (g <= 0.01) return { estagio: null, escala: 0 };
  const e = ESTAGIOS.find((x) => g < x.ate) ?? ESTAGIOS[ESTAGIOS.length - 1];
  // Escala contínua (cresce suave entre estágios), com mínimo de muda visível.
  return { estagio: e, escala: 0.22 + 0.78 * Math.min(1, g) };
}

/**
 * Forma da copa:
 *  - "lobada": vários volumes irregulares agrupados (folhosas)
 *  - "camadas": cones empilhados com borda serrilhada (coníferas)
 *  - "pendente": copa lobada + cortina de galhos caídos (salgueiro)
 *  - "moita": 2–4 volumes baixos, sem tronco aparente (arbustos)
 */
export const ESPECIES = {
  carvalho: {
    nome: "Carvalho", preset: "Oak Large", altura: [10, 13], variacoes: 3,
    copa: { forma: "lobada", grupos: 10, fator: 1.02 }, cor: BASE.carvalho, casca: BASE.casca,
  },
  freixo: {
    nome: "Freixo", preset: "Ash Medium", altura: [10, 13], variacoes: 2,
    copa: { forma: "lobada", grupos: 7, fator: 0.95 }, cor: BASE.freixo, casca: BASE.casca,
  },
  betula: {
    nome: "Bétula", preset: "Aspen Medium", altura: [9, 12], variacoes: 2, casca: "betula", barkType: "Birch",
    copa: { forma: "lobada", grupos: 6, fator: 0.85 }, cor: BASE.betula,
  },
  pinheiro: {
    nome: "Pinheiro", preset: "Pine Medium", altura: [11, 15], variacoes: 3,
    copa: { forma: "camadas", camadas: 5 }, cor: BASE.pinheiro, casca: BASE.casca,
  },
  salgueiro: {
    nome: "Salgueiro", preset: "Ash Medium", altura: [8, 10], variacoes: 2, barkType: "Willow", pendente: true,
    copa: { forma: "pendente", grupos: 7, fator: 0.95 }, cor: BASE.salgueiro, casca: BASE.casca,
  },
  outonal: {
    nome: "Bordo de outono", preset: "Oak Small", altura: [7, 9], variacoes: 2,
    copa: { forma: "lobada", grupos: 6, fator: 0.95 }, cor: BASE.outonal, casca: BASE.casca,
  },
  dourada: {
    nome: "Bétula dourada", preset: "Aspen Small", altura: [7, 9], variacoes: 1, casca: "betula", barkType: "Birch",
    copa: { forma: "lobada", grupos: 5, fator: 0.85 }, cor: BASE.dourada,
  },
  cerejeira: {
    nome: "Cerejeira", preset: "Ash Small", altura: [6, 8], variacoes: 1,
    copa: { forma: "lobada", grupos: 6, fator: 1.0 }, cor: BASE.cerejeira, casca: BASE.casca,
  },
  arbusto: {
    nome: "Arbusto", altura: [1.2, 2.2], variacoes: 4, arbusto: true,
    copa: { forma: "moita" }, cor: RAMPAS.mata[3],
  },
};

/**
 * Habitat: escolhe a espécie de um lugar (determinístico pelo rng da semente).
 * `lugar`: { tipo, lago (fator; <1 é água), zona (ruído 0..1 de manchas) }.
 */
export function especieDoLugar(lugar, rng) {
  if (lugar.tipo === "arbusto") return "arbusto";
  if (lugar.lago < 1.6 && rng() < 0.7) return "salgueiro"; // beira d'água
  const r = rng();
  if (r < 0.05) return "cerejeira"; // acentos raros
  if (r < 0.1) return "outonal";
  if (r < 0.13) return "dourada";
  if (lugar.zona > 0.58) return r < 0.7 ? "pinheiro" : "betula"; // manchas de coníferas
  if (lugar.zona < 0.42) return r < 0.6 ? "carvalho" : "freixo"; // bosque de folhosas
  return r < 0.4 ? "freixo" : r < 0.7 ? "betula" : "carvalho";
}
