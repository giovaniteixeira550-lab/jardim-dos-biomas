import * as THREE from 'three';
import { RAMPAS as R } from './paleta.js';
import { distribuirCobertura } from './coberturaSolo.js';

/** Duas malhas estáticas: vértices apoiados na altitude real, sem decal na tela. */
export function criarDetalhesSolo(m, toon, cobertura=distribuirCobertura(m)) {
  const grupo=new THREE.Group();grupo.name='folhas-e-trevos';
  const construir=(itens,tipo)=>{
    const pos=[],cores=[];
    for(const p of itens) {
      const c=new THREE.Color((tipo==='folhas'?[R.terra[2],R.terra[3],R.terra[4]]:[R.mata[3],R.mata[4]])[p.tom]);
      const ponto=([x,y,z])=>{
        const co=Math.cos(p.giro),si=Math.sin(p.giro),px=p.x+(x*co-z*si)*p.tamanho,pz=p.z+(x*si+z*co)*p.tamanho;
        pos.push(px,m.altitude(px,pz)+.045+y*p.tamanho,pz);cores.push(c.r,c.g,c.b);
      };
      if(tipo==='folhas') {
        // Folha dobrada na nervura: seis faces grandes, topo em volume.
        const v=[[0,.07,-.8],[-.3,0,-.2],[-.24,0,.45],[0,.08,.8],[.24,0,.45],[.3,0,-.2],[0,.13,0]];
        for(let i=0;i<6;i++)[v[6],v[i],v[(i+1)%6]].forEach(ponto);
      } else {
        // Três folíolos em concha ligados ao mesmo centro.
        for(let k=0;k<3;k++) {
          const a=k*Math.PI*2/3,co=Math.cos(a),si=Math.sin(a),v=[[0,.08,0]];
          for(let j=0;j<=6;j++){const t=j*Math.PI*2/6,x=Math.cos(t)*.28,z=.4+Math.sin(t)*.35;v.push([x*co-z*si,.05+Math.sin(t)*.025,x*si+z*co]);}
          for(let j=1;j<7;j++)[v[0],v[j],v[j+1]].forEach(ponto);
        }
      }
    }
    const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));geo.setAttribute('color',new THREE.Float32BufferAttribute(cores,3));geo.computeVertexNormals();
    const malha=new THREE.Mesh(geo,toon({vertexColors:true,side:THREE.DoubleSide}));malha.name=tipo;malha.receiveShadow=true;grupo.add(malha);
  };
  construir(cobertura.folhas,'folhas');construir(cobertura.trevos,'trevos');
  grupo.userData.contagens={folhas:cobertura.folhas.length,trevos:cobertura.trevos.length};return grupo;
}
