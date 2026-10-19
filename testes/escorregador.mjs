import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {gerarMundo} from '../src/mundo.js';
import {percursoEscorregador,criarEscorregadorLago,criarReservaEscorregador} from '../src/escorregadorLago.js';
import {aplicarAcessoEscorregador,criarEscadaAcesso} from '../src/acessoEscorregador.js';
import {aplicarLotacao} from '../src/lotacao.js';

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
  assert.ok(Math.hypot(a.pontos.at(-1).x-238,a.pontos.at(-1).y-158)<1e-8);
  for(const p of a.pontos){assert.ok(m.fatorLago(p.x,p.y)>1.2);assert.ok(m.distTrilha(p.x,p.y)<.001);}
});
test('o plantio mantém as 278 árvores de estudo fora do brinquedo e do acesso',()=>{
  const localAntes=globalThis.location;
  try{
    globalThis.location={search:'?jardim=1234'};
    const m=gerarMundo(1234),a=aplicarAcessoEscorregador(m),r=criarReservaEscorregador(a);
    const resumo=aplicarLotacao(m,{livreExtra:r.livre});
    assert.equal(resumo.estudo,278);
    const estudo=m.objetos.filter(o=>o.estudo);
    assert.equal(estudo.length,278);
    for(const o of estudo)assert.ok(r.livre(o.x,o.y));
    assert.deepEqual(resumo.porEspecie,{paineiraAbracos:32,arvoreCatavento:21,arvoreNinhos:25,pitanga:34,salgueiroCancoes:23,arvoreSegredos:31,manguePontes:30,jabuticabeiraConstelacoes:20,araucariaCometas:22,acaciaMosaicos:25,oliveiraNos:15});
  }finally{if(localAntes===undefined)delete globalThis.location;else globalThis.location=localAntes;}
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
test('toda a largura do acesso passa por fora da calha e dos apoios',()=>{
  const m=gerarMundo(1234),a=aplicarAcessoEscorregador(m);
  const brinquedo=criarEscorregadorLago(m,p=>new THREE.MeshToonMaterial({...p,side:THREE.DoubleSide}));
  brinquedo.updateMatrixWorld(true);
  const raio=new THREE.Raycaster(),baixo=new THREE.Vector3(0,-1,0);
  for(let i=1;i<a.pontos.length-1;i++){
    const p=a.pontos[i],antes=a.pontos[i-1],depois=a.pontos[i+1];
    const dx=depois.x-antes.x,dz=depois.y-antes.y,l=Math.hypot(dx,dz);
    for(const u of [-a.largura/2,0,a.largura/2]){
      const x=p.x-dz/l*u,z=p.y+dx/l*u;
      // Os últimos metros se conectam intencionalmente ao primeiro degrau da torre.
      if(z>157&&Math.abs(x-238)<1.5)continue;
      raio.set(new THREE.Vector3(x,100,z),baixo);
      assert.equal(raio.intersectObject(brinquedo,true).length,0,`Brinquedo sobre a passagem: ${x.toFixed(2)},${z.toFixed(2)}`);
    }
  }
  brinquedo.traverse(o=>{o.geometry?.dispose();o.material?.dispose();});
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
