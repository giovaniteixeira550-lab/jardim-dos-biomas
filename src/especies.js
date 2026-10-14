/**
 * Catálogo de espécies — as REGRAS de cada árvore, separadas do motor gráfico.
 *
 * Para criar uma espécie nova, acrescente uma entrada aqui. O gerador
 * (arvoreProc.js) e o motor (cena.js) não precisam mudar, desde que a FORMA
 * já exista. Formas: redonda, oval, conica, colunar, pendente, guarda-chuva,
 * bananeira, garrafa (baobá), bambu, cristal,
 * palmeira, araucaria, cogumelo, moita.
 *
 * Campos:
 *  - forma / formaJovem: arquitetura (a jovem pode ser outra, como na natureza)
 *  - altura [min, max] em metros da adulta; largura e grossura: proporções
 *  - cores: folha (e folha2 para manchas), casca, broto; folhaJovem (cor antes
 *    de florescer, nas floríferas); cogumelo: pinta, lamela
 *  - flor / fruto: { cor, raio, quantidade, nome } — aparecem na adulta
 *  - marcas: casca de bétula
 *  - nicho (ecologia, simplificada): umidade = [ótimo, tolerância] do solo
 *    (0 seco … 1 encharcado); sombra = tolerância (0 precisa de sol … 1 sob
 *    dossel); altitude = [ótimo, tolerância] relativa (0 baixada … 1 alto).
 *  - raridade: peso no sorteio (1 comum … 0,05 raríssima)
 */
import { RAMPAS as R } from "./paleta.js";

/**
 * Estágios de vida (os mesmos para todas as espécies). `ate` = fração do
 * crescimento do indivíduo. Cada estágio é um MODELO próprio (arvoreProc.js).
 * Nada morre: o mínimo é o broto.
 */
export const ESTAGIOS = [
  { id: "broto", nome: "Broto", ate: 0.2 },
  { id: "muda", nome: "Muda", ate: 0.45 },
  { id: "jovem", nome: "Jovem", ate: 0.75 },
  { id: "adulta", nome: "Adulta", ate: Infinity },
];

/** Estágio de um crescimento 0..1, com leve crescimento dentro do estágio. */
export function estagioDe(g) {
  if (g <= 0.01) return { indice: -1, estagio: null, escala: 0 };
  const i = ESTAGIOS.findIndex((e) => g < e.ate);
  const inicio = i === 0 ? 0 : ESTAGIOS[i - 1].ate;
  const fim = Math.min(1, ESTAGIOS[i].ate);
  const t = Math.min(1, Math.max(0, (g - inicio) / Math.max(0.01, fim - inicio)));
  return { indice: i, estagio: ESTAGIOS[i], escala: 0.86 + 0.14 * t };
}

const CASCA = R.terra[1];

export const ESPECIES = {
  // --- Folhosas clássicas (melhoradas) ------------------------------------
  carvalho: {
    nome: "Carvalho", forma: "redonda", altura: [10, 13], largura: 1.3, grossura: 1.5,
    cores: { folha: R.mata[3], folha2: R.mata[2], casca: CASCA }, variacoes: 2,
    nicho: { umidade: [0.5, 0.2], sombra: 0.65, altitude: null }, raridade: 1, // tolera sombra; domina o bosque maduro
  },
  freixo: {
    nome: "Freixo", forma: "oval", altura: [10, 13], largura: 1.1,
    cores: { folha: R.mata[4], folha2: R.mata[3], casca: R.terra[2] }, variacoes: 2,
    nicho: { umidade: [0.7, 0.22], sombra: 0.5, altitude: [0.3, 0.3] }, raridade: 1, // fundo de vale úmido
  },
  betula: {
    nome: "Bétula", forma: "oval", altura: [9, 12], largura: 0.8, grossura: 0.8, marcas: true,
    cores: { folha: R.mata[5], folha2: R.mata[4], casca: R.betula[0] }, variacoes: 2,
    nicho: { umidade: [0.5, 0.32], sombra: 0.15, altitude: null }, raridade: 1, // pioneira de luz
  },
  pinheiro: {
    nome: "Pinheiro", forma: "conica", altura: [11, 15], largura: 1,
    cores: { folha: R.mata[2], casca: CASCA }, variacoes: 2,
    nicho: { umidade: [0.25, 0.2], sombra: 0.35, altitude: [0.75, 0.3] }, raridade: 1, // seco e alto
  },
  salgueiro: {
    nome: "Salgueiro", forma: "pendente", altura: [8, 10], largura: 1.1,
    cores: { folha: R.mata[4], folha2: R.mata[5], casca: R.terra[2] }, variacoes: 2,
    nicho: { umidade: [0.85, 0.15], sombra: 0.2, altitude: null }, raridade: 1, // beira d'água
  },
  bordo: {
    nome: "Bordo de outono", forma: "redonda", altura: [7, 9], largura: 1.05,
    cores: { folha: R.outono[2], folha2: R.outono[3], casca: CASCA }, variacoes: 2,
    nicho: { umidade: [0.55, 0.25], sombra: 0.8, altitude: null }, raridade: 0.1, // muito tolerante à sombra
  },
  cerejeira: {
    nome: "Cerejeira", forma: "redonda", altura: [6, 8], largura: 1.15,
    cores: { folhaJovem: R.mata[4], folhaJovem2: R.mata[3], folha: R.flor[2], folha2: R.flor[1], casca: R.terra[1] }, variacoes: 2,
    flor: { cor: R.flor[3], raio: 0.22, quantidade: 26, achatar: 0.6, nome: "flores" },
    nicho: { umidade: [0.5, 0.25], sombra: 0.2, altitude: null }, raridade: 0.2,
  },
  betulaDourada: {
    nome: "Bétula dourada", forma: "oval", altura: [7, 9], largura: 0.8, grossura: 0.75, marcas: true,
    cores: { folha: R.amarelo[1], folha2: R.outono[3], casca: R.betula[0], broto: R.mata[5] }, variacoes: 1,
    nicho: { umidade: [0.5, 0.3], sombra: 0.15, altitude: null }, raridade: 0.15,
  },

  // --- Frutíferas ----------------------------------------------------------
  macieira: {
    nome: "Macieira", forma: "redonda", altura: [5, 7], largura: 1.15, grossura: 1.1,
    cores: { folha: R.mata[4], folha2: R.mata[3], casca: R.terra[2] }, variacoes: 2,
    fruto: { cor: R.vermelho[1], raio: 0.17, quantidade: 22, nome: "maçãs" },
    nicho: { umidade: [0.5, 0.25], sombra: 0.25, altitude: null }, raridade: 0.3,
  },
  laranjeira: {
    nome: "Laranjeira", forma: "redonda", altura: [5, 7], largura: 1.0,
    cores: { folha: R.mata[2], folha2: R.mata[3], casca: R.terra[1] }, variacoes: 2,
    fruto: { cor: R.outono[3], raio: 0.16, quantidade: 26, nome: "laranjas" },
    nicho: { umidade: [0.45, 0.25], sombra: 0.3, altitude: null }, raridade: 0.25,
  },
  coqueiro: {
    nome: "Coqueiro", forma: "palmeira", altura: [9, 12],
    cores: { folha: R.mata[4], casca: R.terra[3], broto: R.mata[4] }, variacoes: 2,
    fruto: { cor: R.terra[1], raio: 0.26, quantidade: 5, nome: "cocos" },
    nicho: { umidade: [0.75, 0.2], sombra: 0.15, altitude: [0.25, 0.3] }, raridade: 0.3, // baixada úmida e ensolarada
  },

  // --- Floríferas brasileiras ---------------------------------------------
  ipeAmarelo: {
    nome: "Ipê-amarelo", forma: "guarda-chuva", formaJovem: "oval", altura: [9, 12], largura: 1.0,
    cores: { folhaJovem: R.mata[4], folhaJovem2: R.mata[3], folha: R.amarelo[1], folha2: R.amarelo[2], casca: CASCA, broto: R.mata[4] }, variacoes: 2,
    flor: { cor: R.amarelo[2], raio: 0.2, quantidade: 18, achatar: 0.6, nome: "flores" },
    nicho: { umidade: [0.35, 0.25], sombra: 0.2, altitude: null }, raridade: 0.3, // tolera solo seco (cerrado)
  },
  jacaranda: {
    nome: "Jacarandá", forma: "guarda-chuva", formaJovem: "oval", altura: [9, 12], largura: 1.1,
    cores: { folhaJovem: R.mata[4], folhaJovem2: R.mata[5], folha: R.lilas[2], folha2: R.lilas[3], casca: CASCA, broto: R.mata[4] }, variacoes: 2,
    flor: { cor: R.lilas[3], raio: 0.2, quantidade: 18, achatar: 0.6, nome: "flores" },
    nicho: { umidade: [0.45, 0.25], sombra: 0.25, altitude: null }, raridade: 0.3,
  },
  araucaria: {
    nome: "Araucária", forma: "araucaria", formaJovem: "conica", altura: [14, 18],
    cores: { folha: R.mata[2], casca: R.terra[1] }, variacoes: 2,
    nicho: { umidade: [0.5, 0.25], sombra: 0.3, altitude: [0.8, 0.25] }, raridade: 0.4, // terreno alto
  },

  // --- Coníferas e fantasia ------------------------------------------------
  cipreste: {
    nome: "Cipreste", forma: "colunar", altura: [9, 13],
    cores: { folha: R.mata[2], folha2: R.mata[3], casca: CASCA }, variacoes: 2,
    nicho: { umidade: [0.35, 0.2], sombra: 0.3, altitude: [0.7, 0.3] }, raridade: 0.3,
  },
  cogumelo: {
    nome: "Cogumelo-gigante", forma: "cogumelo", altura: [4, 6],
    cores: { folha: R.vermelho[1], casca: R.betula[0], pinta: R.betula[0], lamela: R.terra[4] }, variacoes: 2,
    nicho: { umidade: [0.8, 0.2], sombra: 0.9, altitude: null }, raridade: 0.06, // úmido e sombrio; raríssimo
  },

  // --- Leva 2: frutíferas, brasileiras e tropicais --------------------------
  mangueira: {
    nome: "Mangueira", forma: "redonda", altura: [10, 13], largura: 1.35, grossura: 1.3,
    cores: { folha: R.mata[2], folha2: R.mata[1], casca: R.terra[1] }, variacoes: 2,
    fruto: { cor: R.outono[3], raio: 0.2, quantidade: 20, achatar: 1.3, nome: "mangas" },
    nicho: { umidade: [0.55, 0.25], sombra: 0.3, altitude: [0.3, 0.35] }, raridade: 0.3, // copa densa e escura
  },
  limoeiro: {
    nome: "Limoeiro", forma: "redonda", altura: [4, 6], largura: 1.0,
    cores: { folha: R.mata[3], folha2: R.mata[4], casca: R.terra[2] }, variacoes: 2,
    fruto: { cor: R.amarelo[2], raio: 0.13, quantidade: 24, achatar: 1.2, nome: "limões" },
    nicho: { umidade: [0.5, 0.25], sombra: 0.3, altitude: null }, raridade: 0.25,
  },
  ipeRoxo: {
    nome: "Ipê-roxo", forma: "guarda-chuva", formaJovem: "oval", altura: [9, 12], largura: 1.05,
    cores: { folhaJovem: R.mata[4], folhaJovem2: R.mata[3], folha: R.flor[1], folha2: R.flor[2], casca: R.terra[1], broto: R.mata[4] }, variacoes: 2,
    flor: { cor: R.flor[2], raio: 0.2, quantidade: 18, achatar: 0.6, nome: "flores" },
    nicho: { umidade: [0.45, 0.25], sombra: 0.2, altitude: null }, raridade: 0.25,
  },
  bananeira: {
    nome: "Bananeira", forma: "bananeira", altura: [4, 6],
    cores: { folha: R.mata[4], folha2: R.mata[5], casca: R.salvia[2], coracao: R.lilas[0], broto: R.mata[4] }, variacoes: 2,
    fruto: { cor: R.amarelo[1], raio: 0.1, quantidade: 0, nome: "bananas" }, // cacho desenhado pela forma
    nicho: { umidade: [0.75, 0.2], sombra: 0.3, altitude: [0.25, 0.35] }, raridade: 0.3, // baixada úmida
  },
  baoba: {
    nome: "Baobá", forma: "garrafa", altura: [9, 12], grossura: 1.2,
    cores: { folha: R.mata[3], folha2: R.mata[4], casca: R.terra[3] }, variacoes: 2,
    nicho: { umidade: [0.2, 0.18], sombra: 0.1, altitude: null }, raridade: 0.2, // solo seco, sol pleno
  },
  bambu: {
    nome: "Bambuzal", forma: "bambu", altura: [8, 11],
    cores: { folha: R.mata[5], casca: R.mata[4], broto: R.mata[5] }, variacoes: 2,
    nicho: { umidade: [0.7, 0.2], sombra: 0.4, altitude: null }, raridade: 0.3, // úmido, forma touceiras
  },

  // --- Leva 2: fantasia ------------------------------------------------------
  arvoreCristal: {
    nome: "Árvore-de-cristal", forma: "cristal", altura: [4, 6],
    cores: { folha: R.agua[4], folha2: R.lilas[3], casca: R.pedra[1] }, variacoes: 2,
    nicho: { umidade: [0.4, 0.3], sombra: 0.5, altitude: [0.8, 0.3] }, raridade: 0.05, // rara, em terreno alto
  },
  salgueiroLanterna: {
    nome: "Salgueiro-lanterna", forma: "pendente", altura: [6, 8], largura: 1.0,
    cores: { folha: R.agua[3], folha2: R.mata[4], casca: R.terra[1] }, variacoes: 2,
    fruto: { cor: R.luz[0], raio: 0.2, quantidade: 14, nome: "lanternas" },
    nicho: { umidade: [0.8, 0.2], sombra: 0.5, altitude: null }, raridade: 0.06, // rara, junto à água
  },

  // --- Arbustos (sub-bosque) -----------------------------------------------
  arbusto: {
    nome: "Arbusto", forma: "moita", altura: [1.2, 2], arbusto: true,
    cores: { folha: R.mata[3], casca: CASCA }, variacoes: 1,
    nicho: { umidade: [0.55, 0.4], sombra: 0.9, altitude: null }, raridade: 1,
  },
  arbustoFrutinhas: {
    nome: "Arbusto de frutinhas", forma: "moita", altura: [1.1, 1.8], arbusto: true,
    cores: { folha: R.mata[2], casca: CASCA }, variacoes: 1,
    fruto: { cor: R.vermelho[2], raio: 0.07, quantidade: 14, nome: "frutinhas" },
    nicho: { umidade: [0.55, 0.4], sombra: 0.8, altitude: null }, raridade: 0.5,
  },
  arbustoFlorido: {
    nome: "Arbusto florido", forma: "moita", altura: [1.0, 1.6], arbusto: true,
    cores: { folha: R.mata[4], casca: CASCA }, variacoes: 1,
    flor: { cor: R.betula[0], raio: 0.08, quantidade: 16, achatar: 0.6, nome: "flores" },
    nicho: { umidade: [0.5, 0.4], sombra: 0.5, altitude: null }, raridade: 0.4,
  },
  arbustoBagas: {
    nome: "Arbusto de bagas", forma: "moita", altura: [1.0, 1.5], arbusto: true,
    cores: { folha: R.mata[3], casca: CASCA }, variacoes: 1,
    fruto: { cor: R.lilas[1], raio: 0.06, quantidade: 16, nome: "bagas" },
    nicho: { umidade: [0.6, 0.35], sombra: 0.85, altitude: null }, raridade: 0.4,
  },
};
