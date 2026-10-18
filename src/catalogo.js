/** Inventário do diário: lê o mesmo catálogo de espécies utilizado pelo jogo. */
import { ESPECIES, ESTAGIOS } from "./especies.js";

const $ = id => document.getElementById(id);
const fantasias = new Set(["cogumelo", "arvoreCristal", "salgueiroLanterna"]);
const formas = { catavento:"Leques de folhas coloridas", paineiraAbracos:"Copa em arco sobre braços abertos", salgueiroCancoes:"Cortina de ramos pendentes", araucariaCometas:"Candelabro azul com luas acesas", manguePontes:"Raízes em arco sobre a lama", jabuticabeiraConstelacoes:"Troncos retorcidos sob copa branca", arvoreNinhos:"Plataformas de folhas e ninhos nas forquilhas", arvoreSegredos:"Tronco torto do cerrado e copa rala", cacto:"Cacto ramificado", redonda:"Copa redonda", oval:"Copa alongada", conica:"Copa em camadas", colunar:"Copa em coluna", pendente:"Copa pendente", "guarda-chuva":"Copa em guarda-chuva", palmeira:"Palmeira", araucaria:"Copa em candelabro", cogumelo:"Cogumelo de fantasia", moita:"Moita", garrafa:"Tronco em garrafa", bananeira:"Folhas em leque", bambu:"Colmos agrupados", cristal:"Coroa de cristais", candelabro:"Candelabro de guarda-sóis", leque:"Palmeira de leque", acai:"Touceira de palmeiras", esparramada:"Copa baixa e esparramada", pitanga:"Copa baixa de ramos arqueados" };
const normalizar = texto => texto.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
const imagens = new Map();
const itens = [];
let renderizador = null, versao = 0, encerrado = false;

for (const [id, def] of Object.entries(ESPECIES).sort((a,b)=>a[1].nome.localeCompare(b[1].nome,"pt-BR"))) {
  const grupo = def.arbusto ? "arbustos" : fantasias.has(id) || def.fantasia ? "fantasia" : "plantas";
  const detalhe = [def.flor?.nome,def.fruto?.nome].filter(Boolean).join(" e ");
  const card = document.createElement("article");
  card.className = "catalogo-card";
  card.dataset.especie = id;
  const figura = document.createElement("figure"); figura.className="catalogo-preview";
  const img = document.createElement("img"); img.hidden=true;
  const espera = document.createElement("span"); espera.textContent="Preparando prévia…";
  figura.append(img,espera);
  const corpo = document.createElement("div"); corpo.className="catalogo-card-conteudo";
  const nome = document.createElement("h3"); nome.textContent=def.nome;
  const tipo = document.createElement("p"); tipo.className="catalogo-tipo";
  tipo.textContent=`${grupo==="arbustos"?"Arbusto":grupo==="fantasia"?"Fantasia":"Árvore ou planta"} · ${formas[def.forma] ?? def.forma}${def.brasil?" · nativa do Brasil":""}`;
  const etapa = document.createElement("p");
  const extra = document.createElement("p"); extra.textContent=detalhe?`Na maturidade: ${detalhe}.`:"Quatro formas de crescimento.";
  const link = document.createElement("a"); link.className="botao";
  link.href=`./evolucao.html?especie=${encodeURIComponent(id)}`;
  link.textContent="Ver 4 estágios";
  link.setAttribute("aria-label",`Ver os 4 estágios de ${def.nome}`);
  corpo.append(nome,tipo,etapa,extra,link); card.append(figura,corpo);
  $("catalogo-grade").append(card);
  itens.push({id,def,grupo,card,img,espera,etapa,busca:normalizar(`${def.nome} ${id} ${formas[def.forma]??def.forma} ${detalhe} ${def.brasil?"brasil brasileira nativa":""}`)});
}

async function atualizar() {
  const atual=++versao, etapa=Number($("catalogo-estagio").value);
  const busca=normalizar($("catalogo-busca").value.trim()), grupo=$("catalogo-grupo").value;
  const visiveis=itens.filter(item=>{
    item.card.hidden=!(item.busca.includes(busca)&&(grupo==="todos"||grupo===item.grupo||(grupo==="brasileiras"&&item.def.brasil)));
    return !item.card.hidden;
  });
  $("catalogo-contagem").textContent=`${visiveis.length} de ${itens.length} espécies`;
  $("catalogo-vazio").hidden=visiveis.length>0;
  $("catalogo-estado").textContent=visiveis.length?"Preparando prévias…":"";
  for(const item of visiveis) {
    const pronta=imagens.get(`${item.id}:${etapa}`);
    item.etapa.textContent=`Prévia: ${ESTAGIOS[etapa].nome}`;
    item.img.alt=`${item.def.nome} — ${ESTAGIOS[etapa].nome}`;
    item.img.hidden=!pronta; item.espera.hidden=!!pronta;
    if(pronta)item.img.src=pronta;
  }
  if(!visiveis.length||encerrado)return;
  if(visiveis.every(item=>imagens.has(`${item.id}:${etapa}`))) {
    $("catalogo-estado").textContent=`${visiveis.length} de ${visiveis.length} prévias prontas`;
    return;
  }
  try {
    const { criarRenderizadorCatalogo } = await import("./catalogoRender.js");
    if(atual!==versao||encerrado)return;
    renderizador??=criarRenderizadorCatalogo();
    for(let i=0;i<visiveis.length;i++) {
      if(atual!==versao||encerrado)return;
      const item=visiveis[i], chave=`${item.id}:${etapa}`;
      if(!imagens.has(chave))imagens.set(chave,renderizador.imagem(item.def,etapa));
      item.img.src=imagens.get(chave); item.img.hidden=false; item.espera.hidden=true;
      $("catalogo-estado").textContent=`${i+1} de ${visiveis.length} prévias prontas`;
      // A geração de cada imagem cede a vez à busca, ao filtro e ao diário.
      await new Promise(resolve=>setTimeout(resolve,0));
    }
  } catch(e) {
    if(atual!==versao||encerrado)return;
    $("catalogo-estado").textContent="Não foi possível gerar as prévias. Os nomes e links continuam disponíveis.";
    for(const item of visiveis)if(item.img.hidden)item.espera.textContent="Prévia indisponível";
    console.error(e);
  }
}

for(const id of ["catalogo-grupo","catalogo-estagio"])$(id).addEventListener("change",atualizar);
$("catalogo-busca").addEventListener("input",atualizar);
window.addEventListener("pagehide",()=>{encerrado=true; ++versao; renderizador?.dispose(); renderizador=null;});
window.addEventListener("pageshow",e=>{if(e.persisted){encerrado=false; atualizar();}});
atualizar();
