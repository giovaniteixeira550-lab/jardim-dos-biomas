import * as THREE from "three";
import { Jardim } from "../src/cena.js";
const $ = id => document.getElementById(id);
const afirmar = (ok, texto) => { if (!ok) throw new Error(texto); };
let j, ponto;
function renderizar() { j.quadroAnim(); }
function mostrar(ativo) { j.focarEm(ativo ? ponto.x : null, ponto.y); renderizar(); }
function registrar(texto) { const li=document.createElement("li"); li.textContent=`PASSOU — ${texto}`; $("resultados").append(li); }
$("opaca").onclick=()=>mostrar(false);
$("transparente").onclick=()=>mostrar(true);
$("executar").onclick=async()=>{
  $("executar").disabled=true;
  try {
    j?.dispose(); j=new Jardim($("canvas"));
    await j.carregar(1234,(_,texto)=>$("estado").textContent=texto);
    cancelAnimationFrame(j.raf); j.raf=null;
    renderizar();
    const rt=[j.rt.width,j.rt.height], geo=j.individuos[0].variacao.estagios[3];
    j.zoom(0.00001); afirmar(j.altura===8,"Zoom próximo não atingiu o limite");
    j.zoom(100000); afirmar(j.altura===240,"Zoom distante não atingiu o limite");
    for(const yaw of [0.13,1.71,3.67,6.48]) { j.yaw=j.yawAlvo=yaw; renderizar(); }
    afirmar(j.rt.width===rt[0]&&j.rt.height===rt[1]&&j.tamPixel===2,"Resolução mudou no giro/zoom");
    afirmar(j.individuos[0].variacao.estagios[3]===geo&&j.pixel.uniforms.uContorno.value===1,"Geometria/contorno alterados");
    registrar("Zoom 8–240 e giro em ângulos livres preservam resolução, geometria e contorno.");
    j.irAoViveiro(true);
    afirmar(j.rotulosViveiro.length===j.posicoesViveiro.size&&j.rotulosViveiro.every(r=>r.visible),"Faltam nomes no viveiro");
    for(const id of ['pitanga','arvoreCatavento']){
      j.focarEspecieViveiro(id);const g=j.posicoesViveiro.get(id);
      afirmar(j.alvo.x===(g.limites.minX+g.limites.maxX)/2,"Seletor não enquadrou a espécie");
      const z=j.alvo.z;j.limitar();afirmar(j.alvo.z===z,"Últimas fileiras inacessíveis");
    }
    j.irAoViveiro(false);afirmar(j.rotulosViveiro.every(r=>!r.visible),"Nomes continuam no bosque");
    registrar("Viveiro tem nomes, acesso direto à Pitanga e ao Catavento e câmera alcançando todas as fileiras.");
    j.recentrar(); j.altura=42; renderizar();
    const r=j.canvas.getBoundingClientRect();
    // Busca interseção real no centro do bosque, sem depender de uma espécie.
    for(let y=-0.65;y<0.7&&!ponto;y+=0.1)for(let x=-0.75;x<0.8&&!ponto;x+=0.1){
      const h=j.encontrarArvore(new THREE.Vector2(x,y));
      if(h?.ind) ponto={x:r.left+(x+1)*r.width/2,y:r.top+(1-y)*r.height/2};
    }
    afirmar(ponto,"Nenhuma árvore encontrada");
    mostrar(true);
    const h=j.sobrevoo, matriz=h.matriz.clone(), numero=h.ind.numero;
    afirmar(h&&j.fantasma.visible&&j.fantasma.material.transparent&&j.fantasma.material.opacity===0.22,"Opacidade individual não aplicada");
    afirmar(j.matArvore.opacity===1&&!j.matArvore.transparent,"Material compartilhado foi alterado");
    afirmar(!j.matArvore.customProgramCacheKey().includes("raiox"),"Shader circular ainda ativo");
    const m=new THREE.Matrix4(); h.malha.getMatrixAt(h.ind.vaga,m);
    afirmar(m.determinant()===0,"Árvore opaca sobreposta à translúcida");
    for(const ind of j.individuos.filter(i=>i!==h.ind&&i.indice>=0)) {
      ind.grupo.malhas[ind.indice].getMatrixAt(ind.vaga,m);
      afirmar(m.determinant()!==0,"Outra árvore ficou escondida");
    }
    registrar("Só um indivíduo fica translúcido; demais árvores continuam opacas, sem círculo ou descarte quadriculado.");
    j.ultimoRastreio=-Infinity; renderizar();
    afirmar(j.sobrevoo?.ind.numero===numero,`Interseção alternou de ${numero} para ${j.sobrevoo?.ind.numero}`);
    let ficha;
    j.aoSelecionar = valor => ficha = valor;
    j.selecionarEm(ponto.x,ponto.y);
    afirmar(ficha?.numero===numero,"Clique na árvore translúcida perdeu a ficha");
    renderizar();
    registrar("Cursor parado mantém a mesma árvore transparente, sem alternância com o fundo.");
    mostrar(false); h.malha.getMatrixAt(h.ind.vaga,m);
    afirmar(m.equals(matriz)&&!j.fantasma.visible,"Saída do mouse não restaurou a árvore");
    registrar("Sair da árvore restaura exatamente sua transformação e opacidade.");
    mostrar(true); j.crescimento=0; j.cresceVisto=0;
    j.restaurarSobrevoo(); j.atualizarCrescimento(true); renderizar();
    afirmar(!j.sobrevoo||j.fantasma.geometry===j.sobrevoo.malha.geometry,"Modelo de hover ficou no estágio anterior");
    mostrar(false); j.crescimento=0.9; j.cresceVisto=0.9; j.atualizarCrescimento(true); renderizar();
    registrar("Mudança de estágio restaura instância antiga e acompanha o modelo atual.");
    // Eventos de ponteiro sintéticos não possuem captura nativa no navegador.
    // Substitui apenas a captura durante o teste dos handlers, depois a repõe.
    const capturar=j.canvas.setPointerCapture;
    j.canvas.setPointerCapture=()=>{};
    try {
      const evento=(tipo,x,y,extra={})=>j.canvas.dispatchEvent(new PointerEvent(tipo,{pointerId:42,pointerType:"mouse",clientX:x,clientY:y,button:2,buttons:2,...extra}));
      const antes=j.pitch;
      evento("pointerdown",r.left+200,r.top+200); evento("pointermove",r.left+200,r.top+240); evento("pointerup",r.left+200,r.top+240,{buttons:0});
      afirmar(Math.abs(j.pitch-antes-40*0.006)<0.00001,"Arraste direito não inclinou a câmera");
      evento("pointerdown",r.left+200,r.top+200); evento("pointermove",r.left+200,r.top+2000); evento("pointerup",r.left+200,r.top+2000,{buttons:0});
      afirmar(Math.abs(j.pitch-THREE.MathUtils.degToRad(75))<0.00001,"Inclinação ultrapassou o limite superior");
      const meio=j.yaw;
      evento("pointerdown",r.left+200,r.top+200,{button:1,buttons:4});
      evento("pointermove",r.left+245,r.top+200,{button:1,buttons:4});
      evento("pointerup",r.left+245,r.top+200,{button:1,buttons:0});
      afirmar(Math.abs(j.yaw-meio-45*0.008)<0.00001,"Arraste com botão do meio não girou");
      const touch=(tipo,id,x,y)=>j.canvas.dispatchEvent(new PointerEvent(tipo,{pointerId:id,pointerType:"touch",clientX:x,clientY:y}));
      const alt=j.altura,yaw=j.yaw;
      touch("pointerdown",1,100,100);touch("pointerdown",2,200,100);touch("pointermove",2,220,140);
      afirmar(j.altura<alt&&j.yaw!==yaw,"Pinça e torção não combinadas");
      touch("pointercancel",1,100,100);touch("pointercancel",2,220,140);
    } finally {j.canvas.setPointerCapture=capturar;}
    registrar("Direito inclina; meio gira; dois dedos giram e aproximam, preservando os modelos 3D.");
    j.recentrar();j.altura=42;mostrar(true);
    $("opaca").disabled=$("transparente").disabled=false;
    $("estado").textContent="7 verificações passaram. Compare opaca/transparente nos botões.";
  } catch(e) {$("estado").textContent=`FALHOU — ${e.message}`;console.error(e);}
};
window.addEventListener("pagehide",()=>j?.dispose());
