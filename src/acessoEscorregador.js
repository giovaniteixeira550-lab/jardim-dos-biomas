import * as THREE from 'three';
import {RAMPAS} from './paleta.js';

/** Ramal de terra: sai da trilha, sobe o barranco e chega ao pé da escada. */
export function definirAcessoEscorregador(mundo) {
  const origem=mundo.trilha.pontos.at(-2),inicio={x:237,y:98},fim={x:246,y:104};
  const curvas=[
    [origem,{x:201,y:80},{x:215,y:85},{x:229,y:90},inicio],
    [fim,{x:249,y:114},{x:249,y:135},{x:249,y:155},{x:246,y:161},{x:241,y:162},{x:238,y:160},{x:238,y:158}],
  ].map(pontos=>new THREE.CatmullRomCurve3(pontos.map(p=>new THREE.Vector3(p.x,0,p.y)),false,'centripetal'));
  const pontos=[];
  curvas.forEach((c,i)=>{
    if(i)pontos.push({...fim});
    const n=Math.ceil(c.getLength()/.6);
    for(let j=0;j<=n;j++){const p=c.getPointAt(j/n);pontos.push({x:p.x,y:p.z});}
  });
  const segmentos=pontos.slice(1).map((b,i)=>{
    const a=pontos[i],dx=b.x-a.x,dy=b.y-a.y,l2=dx*dx+dy*dy;
    return {a,b,dx,dy,l2};
  }).filter(s=>s.l2>1e-8);
  const distancia=(x,y)=>{
    if(x<190||x>251||y<72||y>166)return Infinity;
    let d2=Infinity;
    for(const s of segmentos){const t=THREE.MathUtils.clamp(((x-s.a.x)*s.dx+(y-s.a.y)*s.dy)/s.l2,0,1);d2=Math.min(d2,(x-s.a.x-s.dx*t)**2+(y-s.a.y-s.dy*t)**2);}
    return Math.sqrt(d2);
  };
  const dx=fim.x-inicio.x,dy=fim.y-inicio.y,comprimento=Math.hypot(dx,dy);
  const escada={inicio,fim,dx,dy,comprimento,largura:2.8,degraus:18,altura:4.5};
  return {pontos,segmentos,origem,escada,distancia,largura:2.6,destino:{x:238,y:158}};
}

export function aplicarAcessoEscorregador(mundo) {
  const acesso=definirAcessoEscorregador(mundo),anterior=mundo.distTrilha,altitude=mundo.altitude;
  const e=acesso.escada;
  mundo.altitude=(x,z)=>{
    const h=altitude(x,z),t=((x-e.inicio.x)*e.dx+(z-e.inicio.y)*e.dy)/e.comprimento**2;
    if(t<0||t>1)return h;
    const lateral=Math.abs((x-e.inicio.x)*e.dy-(z-e.inicio.y)*e.dx)/e.comprimento;
    if(lateral>2.05)return h;
    const mistura=THREE.MathUtils.smoothstep(lateral,1.5,2.05);
    return Math.min(h,THREE.MathUtils.lerp(t*e.altura-.16,h,mistura));
  };
  // A máscara e o material são os mesmos do caminho de terra existente.
  mundo.distTrilha=(x,z)=>Math.min(anterior(x,z),acesso.distancia(x,z)*mundo.trilha.largura/acesso.largura);
  const g=mundo.grade;
  for(let j=0;j<g.ny;j++)for(let i=0;i<g.nx;i++){
    const x=g.x0+i*g.passo,z=g.y0+j*g.passo;
    if(x>=190&&x<=251&&z>=72&&z<=166)g.DT[j*g.nx+i]=mundo.distTrilha(x,z);
  }
  return acesso;
}

export function criarEscadaAcesso(acesso,mundo,toon) {
  const grupo=new THREE.Group();grupo.name='escadaria-acesso-escorregador';
  const e=acesso.escada,angulo=-Math.atan2(e.dy,e.dx),q=new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),angulo);
  const normal={x:-e.dy/e.comprimento,z:e.dx/e.comprimento},passo=e.comprimento/e.degraus;
  const cores=[toon({color:RAMPAS.pedra[3]}),toon({color:RAMPAS.pedra[2]})];
  for(let i=0;i<e.degraus;i++) {
    const t=(i+.5)/e.degraus,x=e.inicio.x+e.dx*t,z=e.inicio.y+e.dy*t,topo=(i+1)*e.altura/e.degraus;
    let base=Infinity;
    for(const u of [-1.4,0,1.4])base=Math.min(base,mundo.altitude(x+normal.x*u,z+normal.z*u));
    base=Math.min(topo-.2,base-.15);
    const bloco=new THREE.Mesh(new THREE.BoxGeometry(passo+.012,topo-base,e.largura),cores[i%5===0?1:0]);
    bloco.quaternion.copy(q);bloco.position.set(x,(base+topo)/2,z);bloco.castShadow=bloco.receiveShadow=true;grupo.add(bloco);
    for(const lado of [-1,1]) {
      const borda=new THREE.Mesh(new THREE.BoxGeometry(passo+.012,.18,.16),cores[1]);
      borda.quaternion.copy(q);borda.position.set(x+normal.x*lado*1.46,topo+.04,z+normal.z*lado*1.46);borda.castShadow=borda.receiveShadow=true;grupo.add(borda);
    }
  }
  grupo.userData={degraus:e.degraus,altura:e.altura};return grupo;
}
