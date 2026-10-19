import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {gerarMundo} from '../src/mundo.js';
import {percursoEscorregador,criarEscorregadorLago} from '../src/escorregadorLago.js';

const mundo=gerarMundo(1234),percurso=percursoEscorregador();
test('desce continuamente da torre até uma boca sobre o lago',()=>{
  let anterior=Infinity;
  for(let i=0;i<=260;i++){
    const {p}=percurso.amostra(i/260);assert.ok(p.y<=anterior);anterior=p.y;
  }
  const fim=percurso.amostra(1).p;
  assert.ok(mundo.fatorLago(fim.x,fim.z)<.8);
  assert.ok(fim.y>-.55&&fim.y<.6);
  assert.ok(mundo.altitude(fim.x,fim.z)<-1.5);
});
test('calha inteira passa acima do terreno natural, inclusive nas bordas',()=>{
  for(let i=0;i<=260;i++)for(const u of [-1.35,0,1.35]){
    const {p,n,inclinacao}=percurso.amostra(i/260);
    const x=p.x+n.x*u,z=p.z+n.z*u;
    const h=p.y+.78*Math.abs(u/1.35)**3+inclinacao*u/1.35-.16;
    assert.ok(h-mundo.altitude(x,z)>.7,`Interferência em ${i}: ${x},${z}`);
  }
});
test('curvas têm espaço entre os lances, sem cruzamento da calha',()=>{
  const pontos=Array.from({length:261},(_,i)=>percurso.amostra(i/260).p);
  for(let i=0;i<pontos.length;i++)for(let j=i+22;j<pontos.length;j++){
    const a=pontos[i],b=pontos[j];
    assert.ok(Math.hypot(a.x-b.x,a.z-b.z)>3,`Lances próximos: ${i},${j}`);
  }
});
test('pista, torre e apoios têm geometria finita e normais válidas',()=>{
  const g=criarEscorregadorLago(mundo,p=>new THREE.MeshToonMaterial(p));
  assert.equal(g.children.length,2);assert.ok(g.userData.apoios>=10);
  g.traverse(o=>{
    if(!o.geometry)return;
    for(const a of Object.values(o.geometry.attributes))for(const v of a.array)assert.ok(Number.isFinite(v));
    assert.ok(o.geometry.attributes.normal.count>0);
    o.geometry.dispose();o.material.dispose();
  });
});
