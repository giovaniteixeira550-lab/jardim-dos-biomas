/**
 * Catálogo de espécies — as REGRAS de cada árvore, separadas do motor gráfico.
 *
 * Para criar uma espécie nova: acrescente uma entrada aqui (forma da copa,
 * cores, altura, habitat). O motor (cena.js) não precisa mudar.
 *
 * NICHO (ecologia real, simplificada): umidade = [ótimo, tolerância] do solo
 * (0 seco … 1 encharcado); sombra = tolerância à sombra (0 precisa de sol pleno …
 * 1 cresce sob dossel); altitude = [ótimo, tolerância] relativa (0 baixada … 1 alto).
 * O ecossistema (ecossistema.js) usa o nicho para decidir onde cada espécie
 * prospera e quão vigorosa cada árvore fica.
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
    nicho: { umidade: [0.5, 0.2], sombra: 0.65, altitude: null }, raridade: 1, // tolera sombra; evita solo encharcado; domina o bosque maduro
    nome: "Carvalho", preset: "Oak Large", altura: [10, 13], variacoes: 3,
    copa: { forma: "lobada", grupos: 10, fator: 1.02 }, cor: BASE.carvalho, casca: BASE.casca,
  },
  freixo: {
    nicho: { umidade: [0.7, 0.22], sombra: 0.5, altitude: [0.3, 0.3] }, raridade: 1, // solo úmido de fundo de vale
    nome: "Freixo", preset: "Ash Medium", altura: [10, 13], variacoes: 2,
    copa: { forma: "lobada", grupos: 7, fator: 0.95 }, cor: BASE.freixo, casca: BASE.casca,
  },
  betula: {
    nicho: { umidade: [0.5, 0.32], sombra: 0.15, altitude: null }, raridade: 1, // pioneira: precisa de luz, coloniza clareiras
    nome: "Bétula", preset: "Aspen Medium", altura: [9, 12], variacoes: 2, casca: "betula", barkType: "Birch",
    copa: { forma: "lobada", grupos: 6, fator: 0.85 }, cor: BASE.betula,
  },
  pinheiro: {
    nicho: { umidade: [0.25, 0.2], sombra: 0.35, altitude: [0.75, 0.3] }, raridade: 1, // solo seco, terreno mais alto
    nome: "Pinheiro", preset: "Pine Medium", altura: [11, 15], variacoes: 3,
    copa: { forma: "camadas", camadas: 5 }, cor: BASE.pinheiro, casca: BASE.casca,
  },
  salgueiro: {
    nicho: { umidade: [0.85, 0.15], sombra: 0.2, altitude: null }, raridade: 1, // solo encharcado, beira d'água, sol pleno
    nome: "Salgueiro", preset: "Ash Medium", altura: [8, 10], variacoes: 2, barkType: "Willow", pendente: true,
    copa: { forma: "pendente", grupos: 7, fator: 0.95 }, cor: BASE.salgueiro, casca: BASE.casca,
  },
  outonal: {
    nicho: { umidade: [0.55, 0.25], sombra: 0.8, altitude: null }, raridade: 0.1, // bordo: muito tolerante à sombra
    nome: "Bordo de outono", preset: "Oak Small", altura: [7, 9], variacoes: 2,
    copa: { forma: "lobada", grupos: 6, fator: 0.95 }, cor: BASE.outonal, casca: BASE.casca,
  },
  dourada: {
    nicho: { umidade: [0.5, 0.3], sombra: 0.15, altitude: null }, raridade: 0.2, // como a bétula, em borda ensolarada
    nome: "Bétula dourada", preset: "Aspen Small", altura: [7, 9], variacoes: 1, casca: "betula", barkType: "Birch",
    copa: { forma: "lobada", grupos: 5, fator: 0.85 }, cor: BASE.dourada,
  },
  cerejeira: {
    nicho: { umidade: [0.5, 0.25], sombra: 0.2, altitude: null }, raridade: 0.2, // borda de mata, sol
    nome: "Cerejeira", preset: "Ash Small", altura: [6, 8], variacoes: 1,
    copa: { forma: "lobada", grupos: 6, fator: 1.0 }, cor: BASE.cerejeira, casca: BASE.casca,
  },
  arbusto: {
    nicho: { umidade: [0.55, 0.4], sombra: 0.9, altitude: null }, raridade: 1, // sub-bosque
    nome: "Arbusto", altura: [1.2, 2.2], variacoes: 4, arbusto: true,
    copa: { forma: "moita" }, cor: RAMPAS.mata[3],
  },
};

// A escolha de espécie por lugar fica em ecossistema.js (escolherEspecie), a partir do nicho.
