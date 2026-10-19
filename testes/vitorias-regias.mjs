import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {gerarMundo,criarRng} from '../src/mundo.js';
import {ALTURA_FOLHA,disporVitoriasRegias,criarVitoriaRegia} from '../src/vitoriasRegias.js';
import {criarSapos} from '../src/sapos.js';

const toon=p=>new THREE.MeshToonMaterial(p);
const mundo=gerarMundo(1234);
const folhas=disporVitoriasRegias(mundo);

test('folhas maiores, separadas e inteiramente sobre o lago; saída do escorregador livre',()=>{
  assert.equal(folhas.length,16);
  assert.equal(folhas.filter(f=>f.flor).length,6);
  for(const [i,f] of folhas.entries()) {
    assert.ok(f.r>=1.5&&f.r<=2.1);
    assert.ok(Math.hypot(f.x-210,f.z-115)>f.r+2.4);
    for(const g of folhas.slice(0,i))assert.ok(Math.hypot(f.x-g.x,f.z-g.z)>f.r+g.r+.44);
    const mesh=criarVitoriaRegia(f,toon),p=mesh.geometry.attributes.position;
    for(let k=0;k<p.count;k++){
      assert.ok(mundo.altitude(f.x+p.getX(k),f.z+p.getZ(k))<-.55,'Folha ou flor sobre terra');
      assert.ok(p.getY(k)+ALTURA_FOLHA>-.55,'Geometria afundada');
    }
    mesh.geometry.dispose();mesh.material.dispose();
  }
});

test('disposição e modelo determinísticos, sem consumir sorteios extras das taboas',()=>{
  const rng=criarRng(1234^0x1e1a),antes=criarRng(1234^0x1e1a);
  const a=disporVitoriasRegias(mundo,rng),b=disporVitoriasRegias(mundo);
  assert.deepEqual(a,b);
  for(let i=0;i<80;i++)antes();
  assert.equal(rng(),antes());
  const x=criarVitoriaRegia(a[0],toon),y=criarVitoriaRegia(a[0],toon);
  assert.deepEqual(x.geometry.attributes.position.array,y.geometry.attributes.position.array);
  assert.deepEqual(x.geometry.attributes.color.array,y.geometry.attributes.color.array);
  for(const m of [x,y]){m.geometry.dispose();m.material.dispose();}
});

test('folha tem borda elevada, flor em volume e todos os vértices/normais válidos',()=>{
  for(const flor of [false,true]){
    const m=criarVitoriaRegia({...folhas[0],flor},toon),g=m.geometry;
    for(const nome of ['position','normal','color'])for(const v of g.attributes[nome].array)assert.ok(Number.isFinite(v));
    const p=g.attributes.position;
    assert.ok(Array.from({length:p.count},(_,i)=>p.getY(i)).some(y=>y>.22));
    assert.ok(p.count<5000,'Complexidade desnecessária por planta');
    const a=new THREE.Vector3(),b=new THREE.Vector3(),c=new THREE.Vector3();
    for(let k=0;k<p.count;k+=3){a.fromBufferAttribute(p,k);b.fromBufferAttribute(p,k+1);c.fromBufferAttribute(p,k+2);assert.ok(b.sub(a).cross(c.sub(a)).length()>1e-8,'Triângulo degenerado');}
    if(flor)assert.ok(Array.from({length:p.count},(_,i)=>p.getY(i)).some(y=>y>.5));
    g.dispose();m.material.dispose();
  }
});

test('sapos continuam apoiados no nível real da folha maior',()=>{
  const g=criarSapos(mundo,toon,folhas,[]);
  const sapos=g.children.filter(o=>o.isGroup);
  assert.equal(sapos.length,7);
  for(const s of sapos){
    assert.equal(s.position.y,ALTURA_FOLHA);
    assert.ok(folhas.some(f=>Math.hypot(s.position.x-f.x,s.position.z-f.z)<f.r*.5));
  }
  g.traverse(o=>{o.geometry?.dispose();o.material?.dispose();});
});
