import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { refinarBordasTerreno, aplicarCoordenadasParede } from '../src/acabamentoTerreno.js';
import { criarTexturaTerra } from '../src/texturaTerra.js';

const mundo={DEGRAU:4.5,trilha:{largura:3.2},distTrilha:()=>100,distRiacho:()=>100,larguraRiacho:()=>3.2,fatorLago:()=>2,plano:{locais:[]}};
function base(){
  const g=new THREE.PlaneGeometry(12,12,24,24);g.rotateX(-Math.PI/2);
  const p=g.attributes.position;
  for(let i=0;i<p.count;i++){
    const r=Math.hypot(p.getX(i),p.getZ(i)),t=Math.max(0,Math.min(1,(3.8-r)/.65));
    p.setY(i,t*t*(3-2*t)*4.5);
  }
  g.computeVertexNormals();return g;
}

test('borda fechada, alturas preservadas e triângulos sem inversão',()=>{
  const g=base(),nova=refinarBordasTerreno(g,mundo),p=nova.attributes.position;
  for(let i=0;i<g.attributes.position.count;i++)assert.equal(p.getY(i),g.attributes.position.getY(i));
  const arestas=new Map();
  let areaMin=Infinity;
  for(let i=0;i<nova.index.count;i+=3){
    const ids=[0,1,2].map(j=>nova.index.getX(i+j));
    const [a,b,c]=ids.map(id=>new THREE.Vector3().fromBufferAttribute(p,id));
    const normal=b.clone().sub(a).cross(c.clone().sub(a));
    areaMin=Math.min(areaMin,normal.y);
    assert.ok(normal.y>=-1e-8,'Triângulo invertido no plano do chão');
    for(let j=0;j<3;j++){
      const x=ids[j],y=ids[(j+1)%3],key=x<y?`${x}:${y}`:`${y}:${x}`;
      arestas.set(key,(arestas.get(key)??0)+1);
    }
  }
  for(const [key,n] of arestas){
    assert.ok(n<=2,'Aresta não manifold');
    if(n===1)for(const id of key.split(':').map(Number))assert.ok(Math.abs(p.getX(id))>=5.999||Math.abs(p.getZ(id))>=5.999,'Fenda interna');
  }
  assert.ok(nova.userData.acabamento.deslocados>0);
  assert.ok(nova.userData.acabamento.limiteDeslocamento<=.1);
  const semIndice=nova.toNonIndexed();aplicarCoordenadasParede(semIndice,nova.userData.contornos);
  assert.ok([...semIndice.attributes.aSoloUV.array].every(Number.isFinite));
  g.dispose();nova.dispose();semIndice.dispose();
});

test('corredores protegidos não recebem deslocamento lateral',()=>{
  const g=base(),protegido={...mundo,distTrilha:()=>0};
  const nova=refinarBordasTerreno(g,protegido);
  assert.equal(nova.userData.acabamento.deslocados,0);
  for(let i=0;i<g.attributes.position.count;i++)for(const eixo of ['getX','getY','getZ'])assert.equal(nova.attributes.position[eixo](i),g.attributes.position[eixo](i));
  g.dispose();nova.dispose();
});

test('textura autoral determinística e sem filtro de suavização',()=>{
  const a=criarTexturaTerra(),b=criarTexturaTerra();
  assert.deepEqual(a.image.data,b.image.data);
  assert.equal(a.magFilter,THREE.NearestFilter);assert.equal(a.minFilter,THREE.NearestFilter);
  const cores=new Set();for(let i=0;i<a.image.data.length;i+=4)cores.add(a.image.data.slice(i,i+3).join(','));
  assert.equal(cores.size,4);a.dispose();b.dispose();
});
