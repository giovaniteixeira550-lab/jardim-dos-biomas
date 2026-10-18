/** Prancha de composição: o mesmo mundo e o mesmo motor do mapa, com enquadramento amplo. */
import {Jardim} from './cena.js';
const estado=document.querySelector('#estado');
const jardim=new Jardim(document.querySelector('#mapa'));
const geral=()=>{jardim.recentrar();jardim.altura=225;};
document.querySelector('#geral').onclick=geral;
document.querySelector('#aproximar').onclick=()=>jardim.zoom(.8);
document.querySelector('#afastar').onclick=()=>jardim.zoom(1.25);
document.querySelector('#girar').onclick=()=>jardim.girar(1);
document.querySelector('#casa').onclick=()=>{jardim.irParaLocal('casa-madeira');jardim.altura=35;};
const centrosBordas=[[-12,100],[90,-4],[145,-8],[183,83]];
for(const botao of document.querySelectorAll('[data-borda]'))botao.onclick=()=>{
 const [px,py]=centrosBordas[Number(botao.dataset.borda)],x=px/180*260,y=py/120*170;
 jardim.alvo.set(x,jardim.mundo.altitude(x,y),y);jardim.altura=82;
};
try{
 jardim.setCrescimento(1);
 await jardim.carregar(1234,(_,etapa)=>estado.textContent=etapa);
 // Simulação restrita à prancha: todas as copas no estágio adulto, sem mudar
 // as regras de crescimento do mapa ou estabelecer métricas de estudo.
 for(const individuo of jardim.individuos)individuo.nasce=0;
 // A vitrine em fileiras fica fora desta prancha de composição, mantendo o
 // viveiro completo disponível no mapa normal.
 for(const modelo of jardim.viveiro)modelo.visible=false;
 jardim.viveiro=[];
 jardim.atualizarCrescimento(true);
 geral();
 if(new URLSearchParams(location.search).get('hora')==='noite')jardim.setHora('noite');
 if(new URLSearchParams(location.search).get('local')==='casa-madeira')document.querySelector('#casa').onclick();
 estado.hidden=true;
}catch(e){estado.textContent=`Não foi possível abrir a paisagem: ${e.message}`;console.error(e);}
window.addEventListener('pagehide',()=>jardim.dispose(),{once:true});
