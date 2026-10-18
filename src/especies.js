/**
 * Catálogo de espécies — as REGRAS de cada árvore, separadas do motor gráfico.
 *
 * Para criar uma espécie nova, acrescente uma entrada aqui. O gerador
 * (arvoreProc.js) e o motor (cena.js) não precisam mudar, desde que a FORMA
 * já exista. Formas: redonda, oval, conica, colunar, pendente, guarda-chuva,
 * bananeira, garrafa (baobá), bambu, cristal, cacto, candelabro (embaúba),
 * leque (buriti), acai (touceira de palmeiras), esparramada (cajueiro),
 * palmeira, araucaria, cogumelo, moita.
 *
 * Campos:
 *  - brasil: espécie nativa do Brasil (filtro "Brasileiras" no catálogo do diário)
 *  - rascunho: espécie em aprovação — aparece SÓ na prancheta (evolucao.html),
 *    fora do mapa, do viveiro e do catálogo. Aprovada = apagar o campo.
 *  - espinhos: acúleos no tronco (paineira); fruto.cores: frutos de mais de uma cor
 *  - forma / formaJovem: arquitetura (a jovem pode ser outra, como na natureza)
 *  - gerador: espécie com gerador próprio, fora das formas genéricas ("pitanga")
 *  - altura [min, max] em metros da adulta; largura e grossura: proporções
 *  - cores: folha (e folha2 para manchas), casca, broto; folhaJovem (cor antes
 *    de florescer, nas floríferas); cogumelo: pinta, lamela
 *  - flor / fruto: { disposicao: "copa", cor, raio, quantidade, nome } — aparecem na adulta
 *  - FASES (cada estágio tem cara própria, ver arvoreProc.js):
 *    cascaJovem (bétula nasce marrom), larguraJovem, floracao (cor das flores
 *    da jovem nas frutíferas; null = não floresce à vista), tapete (pétalas
 *    caídas sob a adulta), noTronco (nº de frutos colados no tronco)
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

export const TODAS = {
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
    cores: { folha: R.mata[5], folha2: R.mata[4], casca: R.betula[0], cascaJovem: R.terra[2] }, variacoes: 2,
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
    flor: { cor: R.flor[3], raio: 0.22, quantidade: 26, achatar: 0.6, nome: "flores" }, tapete: true,
    nicho: { umidade: [0.5, 0.25], sombra: 0.2, altitude: null }, raridade: 0.2,
  },
  betulaDourada: {
    nome: "Bétula dourada", forma: "oval", altura: [7, 9], largura: 0.8, grossura: 0.75, marcas: true,
    cores: { folha: R.amarelo[1], folha2: R.outono[3], casca: R.betula[0], cascaJovem: R.terra[2], broto: R.mata[5] }, variacoes: 1,
    nicho: { umidade: [0.5, 0.3], sombra: 0.15, altitude: null }, raridade: 0.15,
  },

  // --- Frutíferas ----------------------------------------------------------
  macieira: {
    nome: "Macieira", forma: "redonda", altura: [5, 7], largura: 1.15, grossura: 1.1,
    cores: { folha: R.mata[4], folha2: R.mata[3], casca: R.terra[2] }, variacoes: 2,
    fruto: { disposicao: "copa", cor: R.vermelho[1], raio: 0.17, quantidade: 22, nome: "maçãs" }, floracao: R.flor[3],
    nicho: { umidade: [0.5, 0.25], sombra: 0.25, altitude: null }, raridade: 0.3,
  },
  laranjeira: {
    nome: "Laranjeira", forma: "redonda", altura: [5, 7], largura: 1.0,
    cores: { folha: R.mata[2], folha2: R.mata[3], casca: R.terra[1] }, variacoes: 2,
    fruto: { disposicao: "copa", cor: R.outono[3], raio: 0.16, quantidade: 26, nome: "laranjas" },
    nicho: { umidade: [0.45, 0.25], sombra: 0.3, altitude: null }, raridade: 0.25,
  },
  coqueiro: {
    nome: "Coqueiro", forma: "palmeira", altura: [9, 12],
    cores: { folha: R.mata[4], casca: R.terra[3], broto: R.mata[4] }, variacoes: 2,
    fruto: { disposicao: "cacho", cor: R.terra[1], raio: 0.26, quantidade: 5, nome: "cocos" }, floracao: null,
    nicho: { umidade: [0.75, 0.2], sombra: 0.15, altitude: [0.25, 0.3] }, raridade: 0.3, // baixada úmida e ensolarada
  },

  // --- Floríferas brasileiras ---------------------------------------------
  ipeAmarelo: {
    nome: "Ipê-amarelo", brasil: true, forma: "guarda-chuva", formaJovem: "oval", altura: [9, 12], largura: 1.0,
    cores: { folhaJovem: R.mata[4], folhaJovem2: R.mata[3], folha: R.amarelo[1], folha2: R.amarelo[2], casca: CASCA, broto: R.mata[4] }, variacoes: 2,
    flor: { cor: R.amarelo[2], raio: 0.2, quantidade: 18, achatar: 0.6, nome: "flores" }, tapete: true,
    nicho: { umidade: [0.35, 0.25], sombra: 0.2, altitude: null }, raridade: 0.3, // tolera solo seco (cerrado)
  },
  jacaranda: {
    nome: "Jacarandá", brasil: true, forma: "guarda-chuva", formaJovem: "oval", altura: [9, 12], largura: 1.1,
    cores: { folhaJovem: R.mata[4], folhaJovem2: R.mata[5], folha: R.lilas[2], folha2: R.lilas[3], casca: CASCA, broto: R.mata[4] }, variacoes: 2,
    flor: { cor: R.lilas[3], raio: 0.2, quantidade: 18, achatar: 0.6, nome: "flores" }, tapete: true,
    nicho: { umidade: [0.45, 0.25], sombra: 0.25, altitude: null }, raridade: 0.3,
  },
  araucaria: {
    nome: "Araucária", brasil: true, forma: "araucaria", formaJovem: "conica", altura: [14, 18],
    cores: { folha: R.mata[2], casca: R.terra[1] }, variacoes: 2,
    nicho: { umidade: [0.5, 0.25], sombra: 0.3, altitude: [0.8, 0.25] }, raridade: 0.4, // terreno alto
  },

  // --- Coníferas e fantasia ------------------------------------------------
  cipreste: {
    nome: "Cipreste", forma: "colunar", formaJovem: "conica", larguraJovem: 0.6, altura: [9, 13],
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
    fruto: { disposicao: "copa", cor: R.outono[3], raio: 0.2, quantidade: 20, achatar: 1.3, nome: "mangas" }, floracao: R.amarelo[2],
    nicho: { umidade: [0.55, 0.25], sombra: 0.3, altitude: [0.3, 0.35] }, raridade: 0.3, // copa densa e escura
  },
  limoeiro: {
    nome: "Limoeiro", forma: "redonda", altura: [4, 6], largura: 1.0,
    cores: { folha: R.mata[3], folha2: R.mata[4], casca: R.terra[2] }, variacoes: 2,
    fruto: { disposicao: "copa", cor: R.amarelo[2], raio: 0.13, quantidade: 24, achatar: 1.2, nome: "limões" },
    nicho: { umidade: [0.5, 0.25], sombra: 0.3, altitude: null }, raridade: 0.25,
  },
  ipeRoxo: {
    nome: "Ipê-roxo", brasil: true, forma: "guarda-chuva", formaJovem: "oval", altura: [9, 12], largura: 1.05,
    cores: { folhaJovem: R.mata[4], folhaJovem2: R.mata[3], folha: R.flor[1], folha2: R.flor[2], casca: R.terra[1], broto: R.mata[4] }, variacoes: 2,
    flor: { cor: R.flor[2], raio: 0.2, quantidade: 18, achatar: 0.6, nome: "flores" }, tapete: true,
    nicho: { umidade: [0.45, 0.25], sombra: 0.2, altitude: null }, raridade: 0.25,
  },
  bananeira: {
    nome: "Bananeira", forma: "bananeira", altura: [4, 6],
    cores: { folha: R.mata[4], folha2: R.mata[5], casca: R.salvia[2], coracao: R.lilas[0], broto: R.mata[4] }, variacoes: 2,
    fruto: { disposicao: "proprio", cor: R.amarelo[1], raio: 0.1, quantidade: 0, nome: "bananas" }, // cacho desenhado pela forma
    nicho: { umidade: [0.75, 0.2], sombra: 0.3, altitude: [0.25, 0.35] }, raridade: 0.3, // baixada úmida
  },
  baoba: {
    nome: "Baobá", forma: "garrafa", altura: [9, 12], grossura: 1.2,
    cores: { folha: R.mata[3], folha2: R.mata[4], casca: R.terra[3] }, variacoes: 2,
    nicho: { umidade: [0.2, 0.18], sombra: 0.1, altitude: null }, raridade: 0.2, // solo seco, sol pleno
  },
  bambu: {
    nome: "Bambuzal", forma: "bambu", altura: [8, 11],
    cores: { folha: R.mata[4], folha2: R.mata[3], casca: R.salvia[3], broto: R.mata[5] }, variacoes: 2,
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
    fruto: { disposicao: "copa", cor: R.luz[0], raio: 0.2, quantidade: 14, nome: "lanternas" }, floracao: R.agua[5],
    nicho: { umidade: [0.8, 0.2], sombra: 0.5, altitude: null }, raridade: 0.06, // rara, junto à água
  },

  // --- Leva 3: evolução visível (v0.8) --------------------------------------
  jabuticabeira: {
    nome: "Jabuticabeira", brasil: true, forma: "redonda", altura: [5, 7], largura: 1.25, grossura: 1.5,
    cores: { folha: R.mata[3], folha2: R.mata[2], casca: R.terra[3] }, variacoes: 2,
    fruto: { disposicao: "tronco", cor: R.lilas[0], raio: 0.09, quantidade: 0, nome: "jabuticabas no tronco" },
    noTronco: 54, // frutos (e antes, flores brancas) colados no tronco
    nicho: { umidade: [0.6, 0.22], sombra: 0.45, altitude: null }, raridade: 0.2,
  },
  abacateiro: {
    nome: "Abacateiro", forma: "oval", altura: [10, 13], largura: 1.45, grossura: 1.2,
    cores: { folha: R.mata[2], folha2: R.mata[3], casca: R.terra[1] }, variacoes: 2,
    fruto: { disposicao: "copa", cor: R.mata[5], raio: 0.2, quantidade: 14, achatar: 1.4, nome: "abacates" }, floracao: R.amarelo[2],
    nicho: { umidade: [0.55, 0.25], sombra: 0.3, altitude: null }, raridade: 0.25,
  },
  oliveira: {
    nome: "Oliveira", forma: "redonda", altura: [5, 7], largura: 1.2, grossura: 1.5,
    cores: { folha: R.salvia[3], folha2: R.salvia[4], casca: R.pedra[2] }, variacoes: 2,
    fruto: { disposicao: "copa", cor: R.lilas[0], raio: 0.08, quantidade: 30, achatar: 1.3, nome: "azeitonas" },
    nicho: { umidade: [0.3, 0.2], sombra: 0.15, altitude: [0.6, 0.35] }, raridade: 0.25, // seca e ensolarada
  },
  mandacaru: {
    nome: "Mandacaru", brasil: true, forma: "cacto", altura: [4, 6],
    cores: { folha: R.salvia[2], folha2: R.salvia[3], casca: R.salvia[1] }, variacoes: 2,
    flor: { cor: R.betula[0], raio: 0.2, quantidade: 6, nome: "flores" },
    nicho: { umidade: [0.12, 0.15], sombra: 0.05, altitude: null }, raridade: 0.25, // solo seco, sol pleno
  },

  // --- Leva 4: árvores brasileiras (v0.17) ----------------------------------
  embauba: {
    nome: "Embaúba", forma: "candelabro", altura: [9, 12], brasil: true,
    cores: { folha: R.salvia[3], folha2: R.pedra[4], casca: R.pedra[3] }, variacoes: 2, // folhas com avesso prateado
    nicho: { umidade: [0.6, 0.25], sombra: 0.1, altitude: null }, raridade: 0.35, // pioneira de clareira, precisa de sol
  },
  buriti: {
    nome: "Buriti", forma: "leque", altura: [12, 16], brasil: true,
    cores: { folha: R.mata[3], folha2: R.mata[4], casca: R.pedra[2] }, variacoes: 2,
    fruto: { disposicao: "cacho", cor: R.vermelho[0], raio: 0.13, quantidade: 34, nome: "cachos de buriti" }, floracao: null,
    nicho: { umidade: [0.85, 0.22], sombra: 0.2, altitude: null }, raridade: 0.4, // veredas: solo encharcado
  },
  acai: {
    nome: "Açaizeiro", forma: "acai", altura: [8, 12], brasil: true,
    cores: { folha: R.mata[3], folha2: R.mata[4], casca: R.salvia[2] }, variacoes: 2,
    fruto: { disposicao: "cacho", cor: R.lilas[0], raio: 0.07, quantidade: 44, nome: "cachos de açaí" }, floracao: null,
    nicho: { umidade: [0.85, 0.15], sombra: 0.45, altitude: [0.2, 0.3] }, raridade: 0.3, // várzea úmida
  },
  cajueiro: {
    nome: "Cajueiro", forma: "esparramada", altura: [5, 7], largura: 1.2, grossura: 1.2, brasil: true,
    cores: { folha: R.mata[3], folha2: R.mata[4], casca: R.terra[1] }, variacoes: 2,
    fruto: { disposicao: "copa", cor: R.vermelho[2], cores: [R.vermelho[2], R.amarelo[1]], raio: 0.14, quantidade: 20, achatar: 1.4, nome: "cajus" },
    nicho: { umidade: [0.3, 0.25], sombra: 0.15, altitude: null }, raridade: 0.25, // solo arenoso e sol
  },
  paineira: {
    nome: "Paineira (barriguda)", forma: "garrafa", altura: [10, 13], grossura: 1.0, espinhos: true, tapete: true, brasil: true,
    cores: { folhaJovem: R.mata[3], folhaJovem2: R.mata[4], folha: R.flor[2], folha2: R.flor[1], casca: R.salvia[2] }, variacoes: 2,
    flor: { cor: R.flor[2], raio: 0.2, quantidade: 22, achatar: 0.6, nome: "flores" },
    nicho: { umidade: [0.4, 0.25], sombra: 0.15, altitude: null }, raridade: 0.2,
  },
  pauBrasil: {
    nome: "Pau-brasil", forma: "redonda", altura: [8, 11], largura: 1.05, grossura: 1.1, brasil: true,
    cores: { folha: R.mata[3], folha2: R.mata[2], casca: R.vermelho[0] }, variacoes: 2, // casca e cerne avermelhados
    flor: { cor: R.amarelo[2], raio: 0.13, quantidade: 30, achatar: 0.7, nome: "flores amarelas" },
    nicho: { umidade: [0.55, 0.25], sombra: 0.45, altitude: null }, raridade: 0.2, // Mata Atlântica
  },
  quaresmeira: {
    nome: "Quaresmeira", forma: "redonda", altura: [6, 8], largura: 0.9, tapete: true, brasil: true,
    cores: { folhaJovem: R.mata[4], folhaJovem2: R.mata[3], folha: R.lilas[1], folha2: R.lilas[2], casca: R.terra[2] }, variacoes: 2,
    flor: { cor: R.lilas[2], raio: 0.17, quantidade: 26, achatar: 0.6, nome: "flores roxas" },
    nicho: { umidade: [0.55, 0.25], sombra: 0.3, altitude: null }, raridade: 0.25,
  },
  jequitiba: {
    nome: "Jequitibá", forma: "guarda-chuva", formaJovem: "oval", altura: [18, 24], largura: 1.35, grossura: 1.6, brasil: true,
    cores: { folha: R.mata[2], folha2: R.mata[3], casca: R.terra[2] }, variacoes: 1,
    nicho: { umidade: [0.6, 0.25], sombra: 0.55, altitude: null }, raridade: 0.1, // gigante emergente da mata, raro
  },

  // --- Leva 5: brasileiras do lote 1 (aprovadas na prancheta, v0.18) -------
  pequizeiro: {
    nome: "Pequizeiro", forma: "redonda", altura: [6, 9], largura: 1.3, grossura: 1.6, brasil: true,
    cores: { folha: R.mata[2], folha2: R.salvia[3], casca: R.terra[3] }, variacoes: 2, // casca grossa e clara, tronco tortuoso
    flor: { cor: R.amarelo[2], raio: 0.16, quantidade: 14, achatar: 0.7, nome: "flores de estames" },
    fruto: { disposicao: "copa", cor: R.mata[4], raio: 0.22, quantidade: 10, nome: "pequis" },
    nicho: { umidade: [0.25, 0.2], sombra: 0.1, altitude: [0.6, 0.35] }, raridade: 0.25, // Cerrado: chapada seca e sol
  },
  aroeira: {
    nome: "Aroeira-pimenteira", forma: "redonda", altura: [5, 8], largura: 1.2, grossura: 0.9, brasil: true,
    cores: { folha: R.mata[3], folha2: R.mata[4], casca: R.terra[2] }, variacoes: 2,
    fruto: { disposicao: "copa", cor: R.vermelho[2], cores: [R.vermelho[2], R.flor[1]], raio: 0.11, quantidade: 45, nome: "cachos de pimenta-rosa" },
    nicho: { umidade: [0.5, 0.35], sombra: 0.2, altitude: null }, raridade: 0.35, // pioneira, aguenta quase tudo
  },
  sibipiruna: {
    nome: "Sibipiruna", forma: "guarda-chuva", formaJovem: "redonda", altura: [10, 14], largura: 1.35, brasil: true, tapete: true,
    cores: { folha: R.mata[4], folha2: R.mata[3], casca: R.pedra[2] }, variacoes: 2, // copa larga de folhinhas miúdas
    flor: { cor: R.amarelo[2], raio: 0.19, quantidade: 55, achatar: 0.6, nome: "cachos amarelos" },
    nicho: { umidade: [0.5, 0.25], sombra: 0.3, altitude: null }, raridade: 0.25, // Mata Atlântica
  },
  ipeBranco: {
    nome: "Ipê-branco", forma: "guarda-chuva", formaJovem: "oval", altura: [8, 11], largura: 0.95, brasil: true, tapete: true,
    cores: { folhaJovem: R.mata[4], folhaJovem2: R.mata[3], folha: R.betula[0], folha2: R.flor[3], casca: R.pedra[2] }, variacoes: 2,
    flor: { cor: R.betula[0], raio: 0.2, quantidade: 22, achatar: 0.6, nome: "flores brancas" }, // florada branca, sem folhas
    nicho: { umidade: [0.4, 0.25], sombra: 0.15, altitude: null }, raridade: 0.15,
  },
  carnauba: {
    nome: "Carnaúba", forma: "leque", altura: [10, 14], brasil: true,
    cores: { folha: R.salvia[3], folha2: R.salvia[4], casca: R.terra[2] }, variacoes: 2, // leques acinzentados de cera
    fruto: { disposicao: "cacho", cor: R.tinta[1], raio: 0.08, quantidade: 40, nome: "cachos de coquinhos" }, floracao: null,
    nicho: { umidade: [0.65, 0.25], sombra: 0.05, altitude: [0.15, 0.25] }, raridade: 0.3, // várzea que alaga e seca (Caatinga)
  },
  guapuruvu: {
    nome: "Guapuruvu", forma: "guarda-chuva", formaJovem: "palmeira", altura: [18, 24], largura: 1.2, grossura: 1.1, brasil: true, tapete: true,
    cores: { folha: R.mata[4], folha2: R.mata[5], casca: R.salvia[2] }, variacoes: 1, // tronco liso esverdeado; jovem parece samambaia
    flor: { cor: R.amarelo[2], raio: 0.22, quantidade: 60, achatar: 0.6, nome: "flores amarelas" },
    nicho: { umidade: [0.6, 0.25], sombra: 0.1, altitude: null }, raridade: 0.12, // cresce rápido em clareiras
  },

  // --- Mapa de Pediatria (aprovadas uma a uma) -----------------------------
  pitanga: {
    // Gerador próprio (src/pitangaSol.js): folhas opostas, brotações cor de cobre,
    // pernadas arqueadas, florada branca na jovem e frutos de 8 gomos com sépalas.
    nome: "Pitanga-de-Sol", forma: "pitanga", gerador: "pitanga", altura: [4, 4.6], brasil: true,
    cores: { folha: R.mata[3], folha2: R.mata[2], casca: R.terra[2], broto: R.outono[1] }, variacoes: 2,
    fruto: { disposicao: "proprio", cor: R.outono[2], cores: [R.amarelo[1], R.outono[3], R.outono[2], R.vermelho[2], R.vermelho[1]], raio: 0.17, quantidade: 34, nome: "pitangas" },
    nicho: { umidade: [0.5, 0.3], sombra: 0.4, altitude: null }, raridade: 0.6, // árvore baixa de borda de mata e quintal
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
    fruto: { disposicao: "copa", cor: R.vermelho[2], raio: 0.07, quantidade: 14, nome: "frutinhas" },
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
    fruto: { disposicao: "copa", cor: R.lilas[1], raio: 0.06, quantidade: 16, nome: "bagas" },
    nicho: { umidade: [0.6, 0.35], sombra: 0.85, altitude: null }, raridade: 0.4,
  },
  // Bosque de Pediatria: modelo aprovado; posição no mapa ainda será planejada.
  arvoreCatavento: {
    nome: "Árvore-Catavento", forma: "catavento", fantasia: true, mapa: "pediatria",
    altura: [7, 8], cores: { folha: R.mata[4], casca: R.terra[2] }, variacoes: 1,
    nicho: { umidade: [0.45, 0.25], sombra: 0.15, altitude: [0.5, 0.35] }, raridade: 0,
  },
  // Neonatologia. Gerador próprio (src/paineiraAbracos.js), aprovado na proposta 02; posição no mapa ainda será planejada.
  paineiraAbracos: {
    nome: "Paineira dos Abraços", forma: "paineiraAbracos", fantasia: true, mapa: "pediatria",
    altura: [9, 10], cores: { folha: R.mata[4], casca: R.salvia[2] }, variacoes: 1,
    nicho: { umidade: [0.5, 0.3], sombra: 0.1, altitude: null }, raridade: 0,
  },
  // Pneumologia e alergia. Gerador próprio (src/salgueiroCancoes.js); posição planejada perto da água.
  salgueiroCancoes: {
    nome: "Salgueiro das Canções", forma: "salgueiroCancoes", fantasia: true, mapa: "pediatria",
    altura: [6, 7], cores: { folha: R.mata[4], casca: R.terra[2] }, variacoes: 1,
    nicho: { umidade: [0.8, 0.2], sombra: 0.2, altitude: null }, raridade: 0,
  },
  // Endocrinologia, genética e metabolismo. Gerador próprio (src/araucariaCometas.js): copa azul de céu noturno e luas
  // de luz própria. Posição planejada no alto do mapa e nos mirantes, sem bloquear a vista principal.
  araucariaCometas: {
    nome: "Araucária dos Cometas", forma: "araucariaCometas", fantasia: true, mapa: "pediatria",
    altura: [12, 13], cores: { folha: R.noite[2], casca: R.terra[2] }, variacoes: 1,
    nicho: { umidade: [0.5, 0.3], sombra: 0.2, altitude: [0.8, 0.25] }, raridade: 0,
  },
  // Cardiologia e nefrologia. Gerador próprio (src/manguePontes.js): raízes-escora em arco e propágulos pendentes.
  // Posição planejada em solo úmido perto do riacho, fora do canal e dos caminhos.
  manguePontes: {
    nome: "Mangue das Pontes", forma: "manguePontes", fantasia: true, mapa: "pediatria",
    altura: [6, 7], cores: { folha: R.mata[3], casca: R.terra[2] }, variacoes: 1,
    nicho: { umidade: [0.9, 0.15], sombra: 0.2, altitude: null }, raridade: 0,
  },
  // Neurologia. Gerador próprio (src/jabuticabeiraConstelacoes.js): troncos retorcidos, copa branca que acende à noite
  // e jabuticabas presas à casca. Posição planejada no caminho de observação junto ao lago.
  jabuticabeiraConstelacoes: {
    nome: "Jabuticabeira das Constelações", forma: "jabuticabeiraConstelacoes", fantasia: true, mapa: "pediatria",
    altura: [7, 8], cores: { folha: R.betula[0], casca: R.terra[3] }, variacoes: 1,
    nicho: { umidade: [0.6, 0.22], sombra: 0.3, altitude: null }, raridade: 0,
  },
  // Puericultura, prevenção e vacinação. Gerador próprio (src/arvoreNinhos.js): plataformas de folhas em camadas e ninhos
  // pousados nas forquilhas. Posição planejada perto da chegada, junto a uma ponte ou bifurcação de caminhos.
  arvoreNinhos: {
    nome: "Árvore dos Ninhos", forma: "arvoreNinhos", fantasia: true, mapa: "pediatria",
    altura: [6, 7], cores: { folha: R.mata[3], casca: R.terra[2] }, variacoes: 1,
    nicho: { umidade: [0.55, 0.25], sombra: 0.25, altitude: null }, raridade: 0,
  },
  // Infectologia. Gerador próprio (src/arvoreSegredos.js), inspirado no barbatimão do cerrado: tronco torto de casca sulcada,
  // copa rala de tufos e vagens que se abrem. Posição planejada num recanto sombreado, com intervalos entre copas.
  arvoreSegredos: {
    nome: "Árvore dos Segredos", forma: "arvoreSegredos", fantasia: true, mapa: "pediatria",
    altura: [5, 6], cores: { folha: R.mata[2], casca: R.terra[2] }, variacoes: 1,
    nicho: { umidade: [0.45, 0.25], sombra: 0.45, altitude: null }, raridade: 0,
  },
  // Hematologia e oncologia. Gerador próprio (src/acaciaMosaicos.js), inspirado na acácia-guarda-chuva da savana: troncos
  // finos em leque sob copa achatada em mosaico laranja. Posição planejada na transição entre bosque e clareira.
  acaciaMosaicos: {
    nome: "Acácia dos Mosaicos", forma: "acaciaMosaicos", fantasia: true, mapa: "pediatria",
    altura: [4.5, 5.5], cores: { folha: R.outono[3], casca: R.terra[2] }, variacoes: 1,
    nicho: { umidade: [0.35, 0.25], sombra: 0.15, altitude: null }, raridade: 0,
  },
  // Reumatologia. Gerador próprio (src/oliveiraNos.js), inspirado na oliveira centenária: tronco de feixes torcidos com nós.
  // Posição planejada em encosta pedregosa ou borda de muro de pedra, em terreno mais seco, longe do Mangue.
  oliveiraNos: {
    nome: "Oliveira dos Nós", forma: "oliveiraNos", fantasia: true, mapa: "pediatria",
    altura: [5, 6], cores: { folha: R.salvia[2], casca: R.terra[2] }, variacoes: 1,
    nicho: { umidade: [0.3, 0.25], sombra: 0.15, altitude: [0.6, 0.3] }, raridade: 0,
  },
};

// Catálogo imutável: uma variação não pode alterar as características da próxima.
function congelar(obj) {
  for (const valor of Object.values(obj)) if (valor && typeof valor === "object") congelar(valor);
  return Object.freeze(obj);
}
congelar(TODAS);

/** Espécies aprovadas: as únicas que vão ao mapa, ao viveiro e ao catálogo. */
export const ESPECIES = Object.freeze(Object.fromEntries(Object.entries(TODAS).filter(([, e]) => !e.rascunho)));
/** Rascunhos: só na prancheta de aprovação. */
export const RASCUNHOS = Object.freeze(Object.fromEntries(Object.entries(TODAS).filter(([, e]) => e.rascunho)));
