import * as THREE from 'three';
import {RAMPAS} from './paleta.js';

/** Prévia autoral: calha aberta em S, com espessura, curvas inclinadas e apoios reais. */
export function percursoEscorregador() {
  const pontos=[[238,145],[238,138],[230,136],[221,138],[216,133],[218,127],[227,126],[233,122],[231,117],[223,114],[214,115],[210,115]];
  const curva=new THREE.CatmullRomCurve3(pontos.map(([x,z])=>new THREE.Vector3(x,0,z)),false,'centripetal');
  const comprimento=curva.getLength();
  function amostra(t) {
    const p=curva.getPointAt(t),d=curva.getTangentAt(t);d.y=0;d.normalize();
    p.y=.35+10.65*(1-t*t*(3-2*t));
    const antes=curva.getTangentAt(Math.max(0,t-.006)),depois=curva.getTangentAt(Math.min(1,t+.006));
    const giro=antes.x*depois.z-antes.z*depois.x;
    const inclinacao=THREE.MathUtils.clamp(giro*2,-.28,.28)*Math.sin(Math.PI*t);
    return {p,d,n:new THREE.Vector3(-d.z,0,d.x),inclinacao};
  }
  return {amostra,comprimento,largura:2.7};
}

export function criarEscorregadorLago(mundo,toon) {
  const grupo=new THREE.Group();grupo.name='previa-escorregador-lago';
  const percurso=percursoEscorregador(),{amostra,comprimento}=percurso;
  const partes=[];
  const amarelo=RAMPAS.amarelo[2],vermelho=RAMPAS.vermelho[1],azul=RAMPAS.agua[2],madeira=RAMPAS.terra[3];
  function adicionar(g,tom) {
    const geo=g.index?g.toNonIndexed():g;
    const c=new THREE.Color(tom),cores=new Float32Array(geo.attributes.position.count*3);
    for(let i=0;i<cores.length;i+=3){cores[i]=c.r;cores[i+1]=c.g;cores[i+2]=c.b;}
    geo.setAttribute('color',new THREE.BufferAttribute(cores,3));partes.push(geo);
  }
  function caixa(p,tam,tom,q=null) {
    const g=new THREE.BoxGeometry(...tam);if(q)g.applyQuaternion(q);g.translate(...p);adicionar(g,tom);
  }
  function barra(a,b,r,tom,lados=8) {
    const A=new THREE.Vector3(...a),B=new THREE.Vector3(...b),d=B.clone().sub(A);
    const g=new THREE.CylinderGeometry(r,r,d.length(),lados,1);
    g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),d.normalize()));
    g.translate(...A.add(B).multiplyScalar(.5).toArray());adicionar(g,tom);
  }
  function linha(pontos,r,tom) {
    adicionar(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pontos),pontos.length*2,r,7,false),tom);
  }
  const n=260,k=12,secao=2*(k+1),pos=[],idx=[],cores=[];
  for(let i=0;i<=n;i++) {
    const {p,n:normal,inclinacao}=amostra(i/n);
    for(let face=0;face<2;face++)for(let j=0;j<=k;j++) {
      const u=(face===0?j:k-j)/k*2-1;
      const altura=.78*Math.pow(Math.abs(u),3)+inclinacao*u-(face?.16:0);
      pos.push(p.x+normal.x*u*1.35,p.y+altura,p.z+normal.z*u*1.35);
      const c=new THREE.Color(face?RAMPAS.outono[1]:Math.abs(u)>.83?RAMPAS.outono[3]:amarelo);
      cores.push(c.r,c.g,c.b);
    }
    if(i<n)for(let j=0;j<secao;j++) {
      const a=i*secao+j,b=i*secao+(j+1)%secao,c=a+secao,d=b+secao;
      idx.push(a,b,c,b,d,c);
    }
  }
  // Fecha as extremidades: a boca mantém uma espessura real.
  for(const i of [0,n])for(let j=0;j<k;j++) {
    const a=i*secao+j,b=a+1,c=i*secao+secao-1-j,d=c-1;
    if(i===0)idx.push(a,b,c,b,d,c);else idx.push(a,c,b,b,c,d);
  }
  const calha=new THREE.BufferGeometry();calha.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));calha.setAttribute('color',new THREE.Float32BufferAttribute(cores,3));calha.setIndex(idx);calha.computeVertexNormals();
  const mat=toon({vertexColors:true,side:THREE.DoubleSide});
  const pista=new THREE.Mesh(calha,mat);pista.name='calha-amarela-com-espessura';pista.castShadow=pista.receiveShadow=true;grupo.add(pista);
  for(const lado of [-1,1]) {
    const pontos=[];
    for(let i=0;i<=n;i++){const a=amostra(i/n);pontos.push(a.p.clone().addScaledVector(a.n,lado*1.35).add(new THREE.Vector3(0,.8+a.inclinacao*lado,0)));}
    linha(pontos,.11,vermelho);
  }
  let apoios=0;
  for(let s=3;s<comprimento-5;s+=6.5) {
    const a=amostra(s/comprimento),chao=mundo.altitude(a.p.x,a.p.z);
    if(a.p.y<chao+.65)continue;
    const topo=a.p.y-.3;
    const laterais=[];
    for(const lado of [-1,1]) {
      const x=a.p.x+a.n.x*lado,z=a.p.z+a.n.z*lado,pe=mundo.altitude(x,z)-.1;
      caixa([x,pe+.13,z],[.8,.3,.8],RAMPAS.pedra[3]);
      barra([x,pe,z],[x,topo,z],.16,azul);
      laterais.push([x,topo,z]);
      if(topo-pe>2.5)barra([x,pe+.25,z],[a.p.x,topo-.05,a.p.z],.085,azul);
    }
    barra(laterais[0],laterais[1],.18,azul);apoios++;
  }
  // Torre de partida: tábuas, guarda-corpos, telhado e escada de acesso.
  const x=238,z=146.6,h=11,base=mundo.altitude(x,z);
  for(let i=0;i<11;i++)caixa([x-1.8+i*.36,h-.12,z],[.34,.24,3.3],i%3?madeira:RAMPAS.terra[4]);
  for(const dx of [-1.85,1.85])for(const dz of [-1.5,1.5]) {
    caixa([x+dx,base+.12,z+dz],[.7,.28,.7],RAMPAS.pedra[3]);
    barra([x+dx,base,z+dz],[x+dx,h+2.9,z+dz],.15,azul);
    caixa([x+dx,h+1.08,z+dz],[.4,.15,.4],amarelo);
  }
  for(const lado of [-1,1]) {
    barra([x+lado*1.85,h+1.15,z-1.5],[x+lado*1.85,h+1.15,z+1.5],.095,vermelho);
    barra([x+lado*1.85,h+.55,z-1.5],[x+lado*1.85,h+.55,z+1.5],.07,azul);
    barra([x-1.85,base+.35,z+lado*1.5],[x+1.85,h-.3,z+lado*1.5],.09,azul);
  }
  // Telhado de duas águas, feito de faixas largas de metal pintado.
  for(const lado of [-1,1])for(let j=0;j<9;j++) {
    const g=new THREE.BoxGeometry(2.25,.16,.43);g.rotateZ(-lado*.38);g.translate(x+lado*1.02,h+3.05,z-1.72+j*.43);adicionar(g,j%3===0?RAMPAS.outono[3]:vermelho);
  }
  barra([x,h+3.55,z],[x,h+4.85,z],.045,RAMPAS.betula[0]);
  const bandeira=new THREE.BufferGeometry();bandeira.setAttribute('position',new THREE.Float32BufferAttribute([x,h+4.85,z,x+1.25,h+4.5,z,x,h+4.15,z],3));bandeira.computeVertexNormals();adicionar(bandeira,amarelo);
  const z0=158,z1=148.15,baixo=mundo.altitude(x,z0)+.12,degraus=29;
  for(let i=0;i<degraus;i++) {
    const t=(i+.5)/degraus,zz=THREE.MathUtils.lerp(z0,z1,t),y=THREE.MathUtils.lerp(baixo,h,(i+1)/degraus);
    caixa([x,y-.1,zz],[2.15,.2,(z0-z1)/degraus+.015],i%4===0?RAMPAS.terra[4]:madeira);
  }
  const a0=new THREE.Vector3(x,baixo-.2,z0),a1=new THREE.Vector3(x,h-.2,z1);
  for(const lado of [-1,1]) {
    const dx=lado*1.15;
    barra([x+dx,baixo-.2,z0],[x+dx,h-.2,z1],.14,azul);
    barra([x+dx,baixo+1.05,z0],[x+dx,h+1.05,z1],.09,vermelho);
    for(let i=0;i<=8;i++) {
      const p=a0.clone().lerp(a1,i/8);barra([p.x+dx,p.y,p.z],[p.x+dx,p.y+1.25,p.z],.065,azul);
    }
  }
  // Ondas quebradas sob a saída, fixas no plano real do lago.
  for(let r=0;r<3;r++)for(let arco=0;arco<3;arco++) {
    const pontos=[];for(let i=0;i<=16;i++){const ang=arco*2.1+.2+i/16*1.25,raio=1.1+r*.85;pontos.push(new THREE.Vector3(208.7+Math.cos(ang)*raio,-.525,115+Math.sin(ang)*raio*.6));}
    linha(pontos,.025,RAMPAS.agua[4]);
  }
  // Reúne as ferragens e peças em uma malha; a pista preserva normais contínuas.
  const vertices=[],normais=[],tons=[];
  for(const g of partes){vertices.push(...g.attributes.position.array);normais.push(...g.attributes.normal.array);tons.push(...g.attributes.color.array);g.dispose();}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));g.setAttribute('normal',new THREE.Float32BufferAttribute(normais,3));g.setAttribute('color',new THREE.Float32BufferAttribute(tons,3));g.computeBoundingSphere();
  const estrutura=new THREE.Mesh(g,mat);estrutura.name='estrutura-torre-escada-bordas';estrutura.castShadow=estrutura.receiveShadow=true;grupo.add(estrutura);
  grupo.userData={tipo:'escorregador',proposta:true,comprimento,largura:2.7,altura:11,apoios,percurso};
  return grupo;
}
