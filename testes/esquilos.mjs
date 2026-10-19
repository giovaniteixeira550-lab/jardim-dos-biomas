import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {gerarMundo} from '../src/mundo.js';
import {geometriasEsquilo,criarPopulacaoEsquilos,estadoEsquilo,criarEsquilos} from '../src/esquilos.js';

const m=gerarMundo(1234),pop=criarPopulacaoEsquilos(m);
test('poucos esquilos determinísticos, distribuídos em áreas de bosque',()=>{
  assert.deepEqual(pop,criarPopulacaoEsquilos(m));assert.ok(pop.length>=5&&pop.length<=9);
  for(const b of pop)for(const p of b.pontos)assert.ok(m.fatorLago(p.x,p.z)>1.15);
});
test('ciclos incluem corrida, saltos, alerta e pausa para roer',()=>{
  for(const b of pop){
    const estados=Array.from({length:301},(_,i)=>estadoEsquilo(b,b.periodo*i/300));
    for(const a of ['correndo','roendo','atento'])assert.ok(estados.some(e=>e.acao===a));
    assert.ok(estados.some(e=>e.salto>.3));
    for(const e of estados){assert.ok(m.fatorLago(e.x,e.z)>1.05);for(const v of Object.values(e))if(typeof v==='number')assert.ok(Number.isFinite(v));}
  }
});
test('todas as peças articuladas têm geometria finita, incluindo a cauda',()=>{
  const g=geometriasEsquilo();assert.equal(Object.keys(g).length,6);
  for(const geo of Object.values(g)){for(const a of Object.values(geo.attributes))for(const x of a.array)assert.ok(Number.isFinite(x));geo.dispose();}
});
test('movimento atualiza as articulações e oculta os esquilos na vista distante',()=>{
  const grupo=criarEsquilos(m,p=>new THREE.MeshToonMaterial(p)),f=grupo.userData.foco;
  const alvo=new THREE.Vector3(f.x,m.altitude(f.x,f.z),f.z),cam=new THREE.OrthographicCamera(-12,12,12,-12,.1,600);
  cam.position.copy(alvo).add(new THREE.Vector3(120,150,120));cam.lookAt(alvo);cam.updateMatrixWorld();
  grupo.userData.atualizar(4,cam,24,'dia',alvo);assert.ok(grupo.userData.visiveis>0&&grupo.userData.visiveis<=4);
  grupo.traverse(o=>{assert.ok([...o.position.toArray(),...o.quaternion.toArray()].every(Number.isFinite));});
  grupo.userData.atualizar(5,cam,180,'dia',alvo);assert.equal(grupo.visible,false);
});
