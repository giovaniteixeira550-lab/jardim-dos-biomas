/** Composição autoral do jardim. A semente varia o plantio, não o projeto. */
export function criarPlano(largura=260,altura=170) {
  const ponto=([x,y])=>({x:x/180*largura,y:y/120*altura});
  const locais=[
    {id:"chegada",nome:"Jardim de chegada",x:16,y:75,largura:14,profundidade:12,status:"proposto",tipo:"jardim",descricao:"Clareira de recepção com banco, placa e canteiros baixos. Abre a vista antes da subida e não bloqueia a estrada."},
    {id:"mirante",nome:"Mirante das Pedras",x:25,y:24,largura:10,profundidade:8,status:"proposto",tipo:"mirante",descricao:"Patamar alto para uma praça de pedra, banco e pequena pérgola. A vista acompanha as cascatas em direção ao lago; a estrada passa pelo acesso."},
    {id:"nascente",nome:"Nascente do bosque",x:31,y:17,largura:7,profundidade:6,status:"implantado",tipo:"agua",descricao:"Início do curso no patamar alto, enquadrado pelo bosque. A água desce por três níveis até o lago."},
    {id:"poco-alto",nome:"Poço da primeira cascata",x:45,y:27,largura:9,profundidade:8,status:"implantado",tipo:"agua",descricao:"Alargamento do riacho depois da primeira queda. Rocha, espuma baixa e vegetação nas margens formam um pequeno lugar de contemplação."},
    {id:"ponte",nome:"Ponte do vale",x:74,y:49,largura:8,profundidade:4,status:"implantado",tipo:"travessia",descricao:"Travessia de pedra na interseção da estrada com o riacho, com cabeceiras niveladas e água passando livremente por baixo."},
    {id:"poco-baixo",nome:"Poço do vale",x:97,y:64,largura:10,profundidade:9,status:"implantado",tipo:"agua",descricao:"Segundo alargamento na parte baixa, preparando a transição do riacho para o lago principal."},
    {id:"lago",nome:"Lago da clareira",x:130,y:81,largura:40,profundidade:32,status:"implantado",tipo:"agua",descricao:"Principal espaço aberto da composição. As margens curvas, taboas e folhas aquáticas contrastam com a pedra dos terraços."},
    {id:"pavilhao",nome:"Pavilhão de estudos",x:153,y:57,largura:12,profundidade:10,status:"proposto",tipo:"pavilhao",descricao:"Possibilidade de abrigo aberto de madeira e pedra, baixo e voltado ao lago. A entrada nasce da estrada; a implantação reserva vista e evita a margem inundada."},
  ].map(l=>({...l,...ponto([l.x,l.y]),largura:l.id==="lago"?l.largura/180*largura:l.largura,profundidade:l.id==="lago"?l.profundidade/120*altura:l.profundidade}));
  return {
    nome:"Jardim dos Patamares",versao:2,
    ideia:"Uma caminhada sobe ao mirante, atravessa o vale por uma ponte e termina junto à vista do lago. A água conta o caminho inverso: nasce no alto, passa pelos poços e cascatas e chega à clareira.",
    locais,
    trilha:[[-5,88],[15,76],[24,58],[17,43],[21,32],[30,24],[44,31],[50,41],[60,47],[74,49],[92,51.57142857],[113,49],[134,54],[153,57],[185,62]].map(ponto),
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
