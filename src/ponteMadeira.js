import * as THREE from 'three';
import {RAMPAS} from './paleta.js';

/** Ponte de madeira em peças pequenas, reunidas numa malha para evitar centenas de chamadas de desenho. */
export function criarPonteMadeira({inicio,fim,largura=2.8,altura=4.6,arqueamento=.24,apoiosInteriores=true},toon,altitude=()=>0) {
  const grupo=new THREE.Group();grupo.name='ponte-madeira-proposta';
  const dx=fim.x-inicio.x,dz=fim.y-inicio.y,L=Math.hypot(dx,dz);
  grupo.position.set(inicio.x,0,inicio.y);grupo.rotation.y=-Math.atan2(dz,dx);
  grupo.userData={tipo:'ponte-madeira',inicio,fim,comprimento:L,largura,altura,arqueamento,proposta:true};
  const pos=[],cores=[];let pecas=0,tabuas=0;
  const piso=x=>altura+arqueamento*Math.sin(Math.PI*x/L);
  function caixa(centro,tamanho,tom,rotacao=null,bisel=.018) {
    const geo=new THREE.BoxGeometry(...tamanho,...tamanho.map(v=>Math.max(1,Math.ceil(v/.3)))).toNonIndexed();
    const cor=new THREE.Color(tom),p=geo.attributes.position,q=new THREE.Vector3();
    for(let i=0;i<p.count;i++) {
      q.fromBufferAttribute(p,i);
      const nucleo=q.clone().clamp(new THREE.Vector3(...tamanho.map(v=>-Math.max(0,v/2-bisel))),new THREE.Vector3(...tamanho.map(v=>Math.max(0,v/2-bisel))));
      const normal=q.clone().sub(nucleo);if(normal.lengthSq())q.copy(nucleo).add(normal.normalize().multiplyScalar(bisel));
      if(rotacao)q.applyQuaternion(rotacao);q.add(new THREE.Vector3(...centro));
      pos.push(q.x,q.y,q.z);cores.push(cor.r,cor.g,cor.b);
    }
    geo.dispose();pecas++;
  }
  function viga(a,b,espessura,cor) {
    const A=new THREE.Vector3(...a),B=new THREE.Vector3(...b),d=B.clone().sub(A);
    const q=new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),d.clone().normalize());
    caixa(A.add(B).multiplyScalar(.5).toArray(),[espessura,d.length(),espessura],cor,q);
  }
  const linhas=Math.ceil(L/.36),passo=L/linhas,colunas=5;
  for(let i=0;i<linhas;i++) {
    const x=(i+.5)*passo,h=piso(x);
    for(let j=0;j<colunas;j++) {
      const z=-largura/2+(j+.5)*largura/colunas;
      caixa([x,h-.09,z],[passo-.024,.18,largura/colunas-.018],RAMPAS.terra[(i+j)%5===0?4:3]);tabuas++;
      // Veios curtos seguem a madeira; ficam presos à peça em qualquer ângulo.
      if((i+j)%3===0)caixa([x,h-.004,z+.1],[.018,.009,largura/colunas*.52],RAMPAS.terra[2],null,.002);
      if(j===0||j===colunas-1)caixa([x,h-.0075,z],[.035,.016,.035],RAMPAS.pedra[1],null,.002);
    }
  }
  const vaos=Math.ceil(L/1.8);
  for(const lado of [-1,1]) {
    const z=lado*(largura/2+.12);
    for(let i=0;i<=vaos;i++) {
      const x=L*i/vaos,h=piso(x);
      caixa([x,h+.44,z],[.18,1.16,.18],RAMPAS.terra[2]);
      caixa([x,h+1.04,z],[.25,.1,.25],RAMPAS.terra[4]);
      if(i<vaos) {
        const xx=L*(i+1)/vaos,hh=piso(xx);
        viga([x,h+.97,z],[xx,hh+.97,z],.13,RAMPAS.terra[3]);
        viga([x,h+.48,z],[xx,hh+.48,z],.09,RAMPAS.terra[2]);
        viga([x,h+.12,z],[xx,hh+.82,z],.065,RAMPAS.terra[2]);
        viga([x,h-.34,z],[xx,hh-.34,z],.22,RAMPAS.terra[1]);
      }
    }
  }
  for(const t of (apoiosInteriores?[0,1/3,2/3,1]:[0,1])) {
    const x=L*t,h=piso(x),chao=altitude(inicio.x+dx*t,inicio.y+dz*t);
    if(chao>h-.35)continue;
    for(const lado of [-1,1]) {
      const z=lado*(largura/2-.25),pe=Math.max(-.15,chao-.12);
      viga([x,pe,z],[x,h-.3,z],.23,RAMPAS.terra[2]);
    }
    viga([x,h-.42,-largura/2-.2],[x,h-.42,largura/2+.2],.2,RAMPAS.terra[1]);
    viga([x,chao+.12,-largura/2+.3],[x,h-.5,largura/2-.3],.13,RAMPAS.terra[2]);
  }
  const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));geo.setAttribute('color',new THREE.Float32BufferAttribute(cores,3));geo.computeVertexNormals();geo.computeBoundingSphere();
  const material=toon({vertexColors:true}),mesh=new THREE.Mesh(geo,material);mesh.name='tabuas-vigas-guarda-corpos';mesh.castShadow=mesh.receiveShadow=true;
  grupo.add(mesh);Object.assign(grupo.userData,{pecas,tabuas,triangulos:pos.length/9});return grupo;
}
