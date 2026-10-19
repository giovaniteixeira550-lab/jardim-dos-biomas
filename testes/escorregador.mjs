import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {gerarMundo} from '../src/mundo.js';
import {percursoEscorregador,criarEscorregadorLago} from '../src/escorregadorLago.js';
import {aplicarAcessoEscorregador,criarEscadaAcesso} from '../src/acessoEscorregador.js';

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

test('ramal liga a trilha original ao pé da escada, sempre fora do lago',()=>{
  const m=gerarMundo(1234),original=m.distTrilha,a=aplicarAcessoEscorregador(m);
  assert.ok(original(a.pontos[0].x,a.pontos[0].y)<.01);
  assert.deepEqual(a.pontos.at(-1),{x:238,y:158});
  for(const p of a.pontos){assert.ok(m.fatorLago(p.x,p.y)>1.2);assert.ok(m.distTrilha(p.x,p.y)<.001);}
});

test('escadaria vence o patamar sem degraus enterrados e mantém o relevo distante',()=>{
  const m=gerarMundo(1234),antes=m.altitude,amostras=[[187,115],[193,76],[238,158],[187,52]].map(([x,z])=>({x,z,h:antes(x,z)}));
  const a=aplicarAcessoEscorregador(m),e=a.escada;
  for(const p of amostras)assert.equal(m.altitude(p.x,p.z),p.h);
  for(let i=0;i<e.degraus;i++)for(const u of [-1.4,0,1.4]){
    const t=(i+.5)/e.degraus,x=e.inicio.x+e.dx*t-e.dy/e.comprimento*u,z=e.inicio.y+e.dy*t+e.dx/e.comprimento*u;
    assert.ok(m.altitude(x,z)<(i+1)*e.altura/e.degraus);
  }
  const g=criarEscadaAcesso(a,m,p=>new THREE.MeshToonMaterial(p));
  assert.equal(g.userData.degraus,18);
  g.traverse(o=>{if(o.geometry)for(const v of o.geometry.attributes.position.array)assert.ok(Number.isFinite(v));});
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
