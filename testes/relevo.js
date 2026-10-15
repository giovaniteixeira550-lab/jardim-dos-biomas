import * as THREE from "three";
import { Jardim } from "../src/cena.js";
const $=id=>document.getElementById(id),afirmar=(v,m)=>{if(!v)throw Error(m);};
const registrar=m=>{const li=document.createElement("li");li.textContent=`PASSOU — ${m}`;$("resultados").append(li);};
let jardim;
$("executar").onclick=async()=>{
  $("executar").disabled=true;
  try {
    jardim?.dispose();jardim=new Jardim($("canvas"));
    await jardim.carregar(1234,(_,m)=>$("estado").textContent=m);
    cancelAnimationFrame(jardim.raf);jardim.raf=null;jardim.scene.updateMatrixWorld();
    const m=jardim.mundo;
    afirmar(jardim.aguaPercurso.userData.quedas.length===3,"Quantidade de cortinas incorreta");
    const cortinas=jardim.aguaPercurso.getObjectByName("cortinas-cascatas").geometry;
    for(const y of Array.from(cortinas.attributes.normal.array).filter((_,i)=>i%3===1))afirmar(Math.abs(y)<0.00001,"Cortina virou rampa diagonal");
    const superficie=jardim.aguaPercurso.getObjectByName("superficie-riacho").geometry;
    for(const y of Array.from(superficie.attributes.normal.array).filter((_,i)=>i%3===1))afirmar(Math.abs(y)>0.999,"Água entre quedas deixou de ser horizontal");
    const grama=jardim.aguaPercurso.getObjectByName("bordas-grama-riacho");
    afirmar(grama,"Borda de grama ausente");
    const margemRay=new THREE.Raycaster();let margensConferidas=0;
    for(let i=3;i<m.riacho.pontos.length-3;i+=8) {
      const p=m.riacho.pontos[i],a=m.riacho.pontos[i-1],b=m.riacho.pontos[i+1];
      const d=Math.hypot(b.x-a.x,b.y-a.y);if(!d||a.agua!==b.agua)continue;
      for(const lado of [-1,1]) {
        const r=(p.largura/2+0.25)*lado,x=p.x-(b.y-a.y)/d*r,y=p.y+(b.x-a.x)/d*r;
        margemRay.set(new THREE.Vector3(x,p.agua+2,y),new THREE.Vector3(0,-1,0));
        const hit=margemRay.intersectObject(grama,false)[0];
        afirmar(hit&&hit.point.y>=p.agua+0.1,"Margem geométrica sem suporte acima da água");margensConferidas++;
      }
    }
    registrar(`Três cortinas verticais, água horizontal e ${margensConferidas} margens 3D sustentadas.`);
    const degraus=[];jardim.travessias.traverse(o=>{if(o.userData.tipo==="degrau")degraus.push(o);});
    const ray=new THREE.Raycaster(),chao=[jardim.terreno,jardim.scene.getObjectByName("paredoes-facetados"),...degraus].filter(Boolean);
    let verificados=0;
    for(const p of m.trilha.amostras.filter(a=>a.escada&&!a.ponte)) {
      ray.set(new THREE.Vector3(p.x,p.h+1,p.y),new THREE.Vector3(0,-1,0));
      const hit=ray.intersectObjects(chao,false)[0];
      afirmar(hit?.object.userData.tipo==="degrau",`Chão atravessa o degrau em s=${p.s}`);
      afirmar(Math.abs(hit.point.y-p.h)<0.02,`Piso sem apoio ou altura divergente em s=${p.s}`);verificados++;
    }
    afirmar(verificados>20,"Escadaria não foi construída");
    registrar(`${verificados} pisos conferidos por interseção 3D; terreno não atravessa os degraus.`);
    let lateraisConferidas=0;
    for(let i=1;i<m.trilha.amostras.length-1;i++) {
      const p=m.trilha.amostras[i],a=m.trilha.amostras[i-1],b=m.trilha.amostras[i+1];
      if(!p.escada||p.ponte)continue;
      const d=Math.hypot(b.x-a.x,b.y-a.y);
      for(const lado of [-.35,.35]) {
        ray.set(new THREE.Vector3(p.x-(b.y-a.y)/d*m.trilha.largura*lado,p.h+1,p.y+(b.x-a.x)/d*m.trilha.largura*lado),new THREE.Vector3(0,-1,0));
        const hit=ray.intersectObjects(degraus,false)[0];
        afirmar(hit&&Math.abs(hit.point.y-p.h)<.02,'Piso inclinado, torcido ou com fenda lateral em '+p.s);
        lateraisConferidas++;
      }
    }
    for(const degrau of degraus) {
      const pos=degrau.geometry.attributes.position;
      for(let i=0;i<pos.count;i+=3) {
        const tri=[0,1,2].map(j=>new THREE.Vector3().fromBufferAttribute(pos,i+j));
        if(!tri.every(v=>Math.abs(v.y-degrau.userData.topo)<.001))continue;
        for(let j=0;j<3;j++)afirmar(tri[j].distanceTo(tri[(j+1)%3])<.9,'Face do piso continua larga demais');
      }
    }
    registrar(lateraisConferidas+' bordas de piso niveladas; faces menores que 0,9 m e degraus sem torção.');
    const ponte=m.pontes[0],malhasPonte=[];
    jardim.travessias.traverse(o=>{if(o.userData.tipo==="piso-ponte")malhasPonte.push(o);});
    ray.set(new THREE.Vector3(ponte.x,ponte.h+1,ponte.y),new THREE.Vector3(0,-1,0));
    const piso=ray.intersectObjects(malhasPonte,false)[0];
    afirmar(piso&&Math.abs(piso.point.y-(ponte.h+ponte.arqueamento*Math.sin(Math.PI*(.5))**2))<0.015,"Tabuleiro diverge do perfil da estrada");
    registrar("Tabuleiro real acompanha o arco previsto e o eixo da estrada.");
    afirmar(jardim.terreno.material.userData.relevo.referencia==="mundo","Textura sem referência espacial fixa");
    const geometrias=new Set(),materiais=new Set();
    jardim.scene.traverse(o=>{if(o.geometry){geometrias.add(o.geometry);for(const v of o.geometry.attributes.position.array)afirmar(Number.isFinite(v),"Vértice inválido");}for(const mat of [].concat(o.material??[]))materiais.add(mat);});
    for(const yaw of [0.2,1.6,3.3,5.1]){jardim.yaw=jardim.yawAlvo=yaw;jardim.quadroAnim();}
    registrar("Geometrias finitas e renderização em quatro ângulos com textura presa ao terreno.");
    let liberadas=0;
    for(const geo of geometrias)geo.addEventListener("dispose",()=>liberadas++);
    jardim.dispose();jardim.dispose();afirmar(liberadas===geometrias.size,"Geometria abandonada ou liberada em duplicidade");
    registrar("Encerramento libera os recursos novos uma única vez.");
    $("estado").textContent="Todas as 6 verificações de relevo passaram.";
  } catch(e){$("estado").textContent=`FALHOU — ${e.message}`;console.error(e);}
};
window.addEventListener("pagehide",()=>jardim?.dispose());
