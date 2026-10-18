/** Largo do mirante e banco simples de pesca junto à margem. */
import * as THREE from "three";
import { RAMPAS } from "./paleta.js";

function criarBanco(m,x,y,yaw,recursos) {
  const banco=new THREE.Group();banco.name="Banco horizontal";
  const mundo=(px,pz)=>({x:x+px*Math.cos(yaw)+pz*Math.sin(yaw),y:y-px*Math.sin(yaw)+pz*Math.cos(yaw)});
  const apoios=[-1.12,1.12].map(px=>{const p=mundo(px,0);return {x:px,h:m.altitude(p.x,p.y)};});
  const base=Math.max(...apoios.map(p=>p.h));
  banco.position.set(x,base,y);banco.rotation.set(0,yaw,0);
  const bloco=(px,py,pz,sx,sy,sz,mat=recursos.madeira)=>{
    const p=new THREE.Mesh(recursos.caixa,mat);p.position.set(px,py,pz);p.scale.set(sx,sy,sz);
    p.castShadow=p.receiveShadow=true;banco.add(p);
  };
  // Os pés alcançam o chão separadamente; o assento nunca inclina com o relevo.
  for(const apoio of apoios) {
    const chao=apoio.h-base,altura=.70-chao;
    bloco(apoio.x,chao+altura/2,0,.25,altura,.68,recursos.pedra);
    bloco(apoio.x,.95,-.32,.15,1,.14);
  }
  for(const z of [-.22,0,.22])bloco(0,.78,z,3.1,.16,.18,recursos.topo);
  bloco(0,1.2,-.33,3.1,.27,.13);
  return banco;
}

export function criarLargosTrilha(m,toon) {
  const grupo=new THREE.Group();grupo.name="Mirante e banco de pesca";
  const recursos={madeira:toon({color:RAMPAS.terra[3]}),topo:toon({color:RAMPAS.terra[4]}),pedra:toon({color:RAMPAS.pedra[2]}),caixa:new THREE.BoxGeometry(1,1,1)};
  const pedraLuz=toon({color:RAMPAS.pedra[3]}),gPedra=new THREE.DodecahedronGeometry(1,0);
  for(const l of m.trilha.largos) {
    grupo.add(criarBanco(m,l.x,l.y-l.ry*.57,0,recursos));
    for(let i=0;i<7;i++) {
      const a=Math.PI+.22+i*(Math.PI-.44)/6;
      const x=l.x+Math.cos(a)*l.rx*.91,y=l.y+Math.sin(a)*l.ry*.91;
      const p=new THREE.Mesh(gPedra,i%3?recursos.pedra:pedraLuz);
      p.position.set(x,m.altitude(x,y)+.12,y);p.scale.set(.28+i%2*.06,.18,.24);p.rotation.y=i*1.7;
      p.castShadow=p.receiveShadow=true;grupo.add(p);
    }
  }
  const pesca=m.plano.pesca;
  if(pesca) {
    const banco=criarBanco(m,pesca.x,pesca.y,pesca.yaw,recursos);
    banco.name="Banco de pesca — margem norte";grupo.add(banco);
  }
  return grupo;
}