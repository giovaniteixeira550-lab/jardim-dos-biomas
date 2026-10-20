/** Composição autoral do jardim. A semente varia o plantio, não o projeto. */
export function criarPlano(largura=260,altura=170) {
  const ponto=([x,y])=>({x:x/180*largura,y:y/120*altura});
  const locais=[
    {id:"casa-madeira",nome:"Casa de madeira",x:-4,y:47.5,recuo:4.5,largura:18,profundidade:14,margemVegetacao:6,status:"implantado",tipo:"casa",descricao:"Cabana recuada 4,5 m na clareira, com espaço aberto diante da ponte, telhas curvas verdes e fumaça na chaminé durante a noite. Protótipo local em revisão artística."},
    {id:"grande-arvore",nome:"Grande Árvore do balanço",x:129.5,y:36.7,largura:22,profundidade:22,raioReserva:11,alturaCamera:56,status:"implantado",tipo:"marco",descricao:"Árvore-marco de 18 m, a maior do jardim: tronco maciço em placas, raízes em arco, vários braços, copa larga em domo, cipós e um balanço num dos braços. Fica na clareira a leste do lago, abaixo do platô."},
    {id:"fogueira",nome:"Roda da fogueira",x:-13.85,y:30.35,largura:12,profundidade:12,raioReserva:8.5,alturaCamera:24,status:"proposto",tipo:"quintal",descricao:"Fogueira de acampamento ao lado da casa: anel de pedras, assentos em roda, tripé com chaleira, violão, varal de lâmpadas e caminho de pedras até a varanda. Um lugar para juntar os amigos."},
    {id:"chegada",acesso:"replanejar",nome:"Jardim de chegada",x:16,y:75,largura:14,profundidade:12,status:"proposto",tipo:"jardim",descricao:"Clareira de recepção com banco, placa e canteiros baixos. Com a retirada do percurso antigo, seu acesso será revisto após a aprovação da ponte."},
    {id:"mirante",nome:"Mirante das Pedras",x:25,y:24,largura:10,profundidade:8,status:"proposto",tipo:"mirante",descricao:"Patamar alto para uma praça de pedra, banco e pequena pérgola. A vista acompanha as cascatas em direção ao lago; a estrada passa pelo acesso."},
    {id:"nascente",nome:"Nascente do bosque",x:31,y:17,largura:7,profundidade:6,status:"implantado",tipo:"agua",descricao:"Início do curso no patamar alto, enquadrado pelo bosque. A água desce por três níveis até o lago."},
    {id:"poco-alto",nome:"Poço da primeira cascata",x:45,y:27,largura:9,profundidade:8,status:"implantado",tipo:"agua",descricao:"Alargamento do riacho depois da primeira queda. Rocha, espuma baixa e vegetação nas margens formam um pequeno lugar de contemplação."},
    {id:"ponte",nome:"Ponte do vale",x:74,y:49,largura:8,profundidade:4,status:"implantado",tipo:"travessia",descricao:"Ponte de madeira em arco abaixo da última cascata: sobe suavemente até o centro e desce até a outra margem. O caminho acompanha a margem esquerda, desce por escadas e cruza o trecho baixo com cabeceiras niveladas."},
    {id:"poco-baixo",nome:"Poço do vale",x:97,y:64,largura:10,profundidade:9,status:"implantado",tipo:"agua",descricao:"Segundo alargamento na parte baixa, preparando a transição do riacho para o lago principal."},
    {id:"lago",nome:"Lago da clareira",x:130,y:81,largura:40,profundidade:32,status:"implantado",tipo:"agua",descricao:"Principal espaço aberto da composição. As margens curvas, taboas e folhas aquáticas contrastam com a pedra dos terraços."},
    {id:"pavilhao",nome:"Pavilhão de estudos",x:153,y:57,largura:12,profundidade:10,status:"proposto",tipo:"pavilhao",descricao:"Possibilidade de abrigo aberto de madeira e pedra, baixo e voltado ao lago. A entrada nasce da estrada; a implantação reserva vista e evita a margem inundada."},
    {id:"ponte-madeira",nome:"Ponte das encostas",x:-7,y:63.25,largura:2.8,profundidade:28,status:"implantado",tipo:"ponte-madeira",descricao:"Travessia curta entre a encosta do poente e o terraço da crista, com tábuas, vigas e guarda-corpos de madeira."},
    {id:"escada-vale",nome:"Escada do vale",x:70.64,y:70.49,largura:3.2,profundidade:10,status:"implantado",tipo:"escada",descricao:"Descida de pedra pela margem esquerda, com degraus regulares e bordas alinhadas. Liga o terraço ao caminho da ponte inferior."},
    {id:"escada-cascata",nome:"Escada da primeira cascata",x:40.74,y:29.37,largura:3.2,profundidade:10,status:"implantado",tipo:"escada",alturaCamera:32,descricao:"Descida afastada da primeira cascata, com uma faixa de grama entre o caminho e a água."},
    ...[["espigao-norte","Espigão do norte",99,14,"Crista curva entre a nascente e o bosque oriental; o vale ao sul permanece aberto."],["serra-leste","Serra do bosque",165,15,"Dois níveis de encosta com o cume deslocado para leste e vista para o pavilhão."],["encosta-poente","Encosta da chegada",15,110,"Encosta longitudinal com ombro elevado ao sul e passagem larga para a chegada."],["lombo-sul","Lombo da clareira",80,109,"Elevação baixa no sul, separada das outras encostas por vales largos."],["promontorio-lago","Promontório do lago",174,105,"Relevo oriental que enquadra a água sem fechar suas margens."]].map(([id,nome,x,y,descricao])=>({id,nome,x,y,descricao,largura:8,profundidade:6,status:"implantado",tipo:"paisagem"})),
  ].map(l=>({...l,...ponto([l.x,l.y]),largura:l.id==="lago"?l.largura/180*largura:l.largura,profundidade:l.id==="lago"?l.profundidade/120*altura:l.profundidade}));
  const trilhaPlantio=[[25,24],[30,24],[44,31],[50,41],[61,57],[76,78],[82,81],[88,81],[94,78],[112,60],[122,53],[134,54],[153,57]].map(ponto);
  const trilha=trilhaPlantio.map(p=>({...p}));
  // Corredor vermelho indicado pelo usuário: desloca o lance inteiro, sem
  // curvar os degraus nem mover a água. As conexões acontecem nos patamares.
  const dx=trilha[2].x-trilha[1].x,dy=trilha[2].y-trilha[1].y,tam=Math.hypot(dx,dy);
  const deslocamento={x:-dy/tam*7,y:dx/tam*7};
  for(const i of [1,2]){trilha[i].x+=deslocamento.x;trilha[i].y+=deslocamento.y;}
  const escada=locais.find(l=>l.id==='escada-cascata');
  escada.x+=deslocamento.x;escada.y+=deslocamento.y;
  return {
    nome:"Jardim dos Patamares",versao:6,
    ideia:"Seis regiões de relevo, com encostas curvas e alturas variadas, enquadram vales abertos e a clareira do lago. Uma caminhada sobe ao mirante, atravessa o vale por uma ponte e termina junto à vista do lago. A água conta o caminho inverso: nasce no alto, passa pelos poços e cascatas e chega à clareira.",
    locais,
    // Cada ponta coincide com um destino; nenhuma estrada segue para fora do mapa.
    trilha,
    trilhaPlantio,
    ajusteTrilha:{id:'escada-cascata',deslocamento:7,indices:[1,2]},
    // Reserva histórica de plantio: retirar a cauda não sorteia de novo o bosque.
    // A antiga faixa vira gramado; não é mais uma superfície de circulação.
    corredorPlantio:[...trilhaPlantio,ponto([185,62])],
    largos:["mirante"].map(id=>{
      const l=locais.find(l=>l.id===id);
      return {id,x:l.x,y:l.y,rx:l.largura*.43,ry:l.profundidade*.43};
    }),
    arqueamentoPonte:.8,
    passarela:{id:"ponte-madeira",inicio:ponto([-8,73]),fim:ponto([-6,53.5]),largura:2.8,altura:4.6,arqueamento:.24},
    riacho:[[31,17],[39,24],[48,28],[56,34],[62,40],[69,47],[81,54],[99,65],[113,72],[124,78]].map(ponto),
    lago:{...ponto([130,81]),rx:18/180*largura,ry:14/120*altura},
    colina:ponto([24,20]),
    // Massas vegetais de larguras diferentes, distribuídas por todo o relevo.
    // São decisões de composição visual; não representam áreas de estudo.
    bosques:[[21,16,25,19,.52],[14,54,20,28,.44],[24,103,28,19,.54],
      [86,13,30,17,.50],[103,48,24,20,.40],[161,22,27,24,.58],
      [167,98,23,27,.50],[83,105,28,18,.46]]
      .map(([x,y,rx,ry,forca])=>({...ponto([x,y]),rx:rx/180*largura,ry:ry/120*altura,forca})),
    // Faixas indicadas em vermelho pelo usuário; incluem as porções dos
    // platôs fora do retângulo original de geração do plantio.
    reforcosPlantio:[
      {id:"borda-poente",x0:-22,y0:74,x1:5,y1:125},
      {id:"borda-norte",x0:78,y0:-16,x1:117,y1:4},
      {id:"borda-leste",x0:170,y0:-5,x1:198,y1:34},
      {id:"borda-promontorio",x0:176,y0:78,x1:195,y1:117},
    ].map(z=>({...z,x0:z.x0/180*largura,y0:z.y0/120*altura,x1:z.x1/180*largura,y1:z.y1/120*altura})),
    // Correção das faixas da referência: o reforço anterior cobria apenas
    // uma parte das marcações, sobretudo no fundo da serra oriental.
    complementosPlantio:[
      {id:"borda-poente",x0:-22,y0:68,x1:12,y1:126},
      {id:"borda-norte",x0:69,y0:-18,x1:107,y1:8},
      {id:"borda-leste",x0:130,y0:-17,x1:198,y1:25},
      {id:"borda-promontorio",x0:155,y0:69,x1:195,y1:112},
    ].map(z=>({...z,x0:z.x0/180*largura,y0:z.y0/120*altura,x1:z.x1/180*largura,y1:z.y1/120*altura})),
    setores:[
      {nome:"Crista e mirante",x:28,y:24,largura:48,profundidade:44,descricao:"Topo largo, encosta de terra, subida em escadas e vista longa."},
      {nome:"Vale das cascatas",x:73,y:45,largura:64,profundidade:46,descricao:"Curso d’água, poços e ponte conectada à estrada."},
      {nome:"Clareira do lago",x:130,y:81,largura:64,profundidade:54,descricao:"Água aberta, bordas naturais e contemplação."},
      {nome:"Jardim habitado",x:156,y:52,largura:38,profundidade:30,descricao:"Reserva para pavilhão discreto junto ao caminho."},
    ].map(l=>({...l,...ponto([l.x,l.y]),largura:l.largura/180*largura,profundidade:l.profundidade/120*altura})),
  };
}
