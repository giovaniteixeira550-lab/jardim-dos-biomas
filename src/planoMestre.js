/** Composição autoral do jardim. A semente varia o plantio, não o projeto. */
export function criarPlano(largura=260,altura=170) {
  const ponto=([x,y])=>({x:x/180*largura,y:y/120*altura});
  const locais=[
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
    ...[["espigao-norte","Espigão do norte",99,14,"Crista curva entre a nascente e o bosque oriental; o vale ao sul permanece aberto."],["serra-leste","Serra do bosque",165,15,"Dois níveis de encosta com o cume deslocado para leste e vista para o pavilhão."],["encosta-poente","Encosta da chegada",15,110,"Encosta longitudinal com ombro elevado ao sul e passagem larga para a chegada."],["lombo-sul","Lombo da clareira",80,109,"Elevação baixa no sul, separada das outras encostas por vales largos."],["promontorio-lago","Promontório do lago",174,105,"Relevo oriental que enquadra a água sem fechar suas margens."]].map(([id,nome,x,y,descricao])=>({id,nome,x,y,descricao,largura:8,profundidade:6,status:"implantado",tipo:"paisagem"})),
  ].map(l=>({...l,...ponto([l.x,l.y]),largura:l.id==="lago"?l.largura/180*largura:l.largura,profundidade:l.id==="lago"?l.profundidade/120*altura:l.profundidade}));
  return {
    nome:"Jardim dos Patamares",versao:4,
    ideia:"Seis regiões de relevo, com encostas curvas e alturas variadas, enquadram vales abertos e a clareira do lago. Uma caminhada sobe ao mirante, atravessa o vale por uma ponte e termina junto à vista do lago. A água conta o caminho inverso: nasce no alto, passa pelos poços e cascatas e chega à clareira.",
    locais,
    trilha:[[25,24],[30,24],[44,31],[50,41],[61,57],[76,78],[82,81],[88,81],[94,78],[112,60],[122,53],[134,54],[153,57],[185,62]].map(ponto),
    arqueamentoPonte:.8,
    passarela:{id:"ponte-madeira",inicio:ponto([-8,73]),fim:ponto([-6,53.5]),largura:2.8,altura:4.6,arqueamento:.24},
    riacho:[[31,17],[39,24],[48,28],[56,34],[62,40],[69,47],[81,54],[99,65],[113,72],[124,78]].map(ponto),
    lago:{...ponto([130,81]),rx:18/180*largura,ry:14/120*altura},
    colina:ponto([24,20]),
    bosques:[[12,34,24],[80,8,28],[106,111,27],[169,29,24]].map(([x,y,r])=>({...ponto([x,y]),raio:r/180*largura})),
    setores:[
      {nome:"Crista e mirante",x:28,y:24,largura:48,profundidade:44,descricao:"Topo largo, encosta de terra, subida em escadas e vista longa."},
      {nome:"Vale das cascatas",x:73,y:45,largura:64,profundidade:46,descricao:"Curso d’água, poços e ponte conectada à estrada."},
      {nome:"Clareira do lago",x:130,y:81,largura:64,profundidade:54,descricao:"Água aberta, bordas naturais e contemplação."},
      {nome:"Jardim habitado",x:156,y:52,largura:38,profundidade:30,descricao:"Reserva para pavilhão discreto junto ao caminho."},
    ].map(l=>({...l,...ponto([l.x,l.y]),largura:l.largura/180*largura,profundidade:l.profundidade/120*altura})),
  };
}
