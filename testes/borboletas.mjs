import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {gerarMundo} from '../src/mundo.js';
import {TIPOS_BORBOLETA,geometriaAsa,criarPopulacaoBorboletas,estadoBorboleta,escalaVisivelBorboleta,criarBorboletas} from '../src/borboletas.js';

const mundo=gerarMundo(1234),pop=criarPopulacaoBorboletas(mundo);
test('população determinística distribuída pelos canteiros, com quatro cores',()=>{
  assert.deepEqual(pop,criarPopulacaoBorboletas(mundo));
  assert.ok(pop.length>=70&&pop.length<=130);
  assert.equal(new Set(pop.map(b=>b.tipo)).size,4);
  for(const b of pop)for(const p of b.rota)assert.ok(Number.isFinite(p.y));
});
test('voo alterna pousos e batidas de asas, com posições contínuas nas transições',()=>{
  for(const b of pop){
    const estados=Array.from({length:101},(_,i)=>estadoBorboleta(b,i*b.periodo/100));
    assert.ok(estados.some(s=>s.pousada)&&estados.some(s=>!s.pousada));
    for(const s of estados)for(const x of Object.values(s))if(typeof x==='number')assert.ok(Number.isFinite(x));
    for(const fase of [0,...b.trechos.reduce((a,t)=>[...a,a.at(-1)+t.duracao,a.at(-1)+t.duracao+t.pausa],[0])]){
      const tempo=fase-b.fase*b.periodo,a=estadoBorboleta(b,tempo-.0001),c=estadoBorboleta(b,tempo+.0001);
      assert.ok(Math.hypot(a.x-c.x,a.y-c.y,a.z-c.z)<.005);
    }
  }
});
test('asas desenhadas têm geometria finita e padrões distintos',()=>{
  const assinaturas=[];
  for(const tipo of TIPOS_BORBOLETA){
    const g=geometriaAsa(tipo);assert.ok(g.attributes.position.count>100);
    for(const a of Object.values(g.attributes))for(const x of a.array)assert.ok(Number.isFinite(x));
    assinaturas.push(Array.from(g.attributes.color.array).join(','));g.dispose();
  }
  assert.equal(new Set(assinaturas).size,4);
});
test('aparecem de perto, são limitadas a 16 e ficam ocultas de longe ou à noite',()=>{
  assert.equal(escalaVisivelBorboleta(.5,180,1200),0);
  assert.equal(escalaVisivelBorboleta(.5,80,1200),0);
  assert.equal(escalaVisivelBorboleta(.5,14,1200),1);
  const grupo=criarBorboletas(mundo,p=>new THREE.MeshToonMaterial(p)),foco=grupo.userData.foco;
  const camera=new THREE.OrthographicCamera(-9,9,9,-9,.1,600),alvo=new THREE.Vector3(foco.x,0,foco.z);
  camera.position.copy(alvo).add(new THREE.Vector3(120,150,120));camera.lookAt(alvo);camera.updateMatrixWorld();
  grupo.userData.atualizar(10,camera,18,1200,'dia',alvo);
  assert.ok(grupo.userData.visiveis>0&&grupo.userData.visiveis<=16);
  for(const m of grupo.children)for(let i=0;i<m.count*16;i++)assert.ok(Number.isFinite(m.instanceMatrix.array[i]));
  grupo.userData.atualizar(11,camera,180,1200,'dia',alvo);assert.equal(grupo.visible,false);
  grupo.userData.atualizar(12,camera,18,1200,'noite',alvo);assert.equal(grupo.visible,false);
});
