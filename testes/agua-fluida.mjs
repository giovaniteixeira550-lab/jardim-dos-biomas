import assert from 'node:assert/strict';
import test from 'node:test';
import * as THREE from 'three';
import {gerarMundo} from '../src/mundo.js';
import {criarAguaPercurso} from '../src/aguaPercurso.js';
import {criarLago} from '../src/aguaLago.js';

const mundo = gerarMundo(1234);
const antes = JSON.stringify({rio:mundo.riacho,lago:mundo.lago,objetos:mundo.objetos});
const toon = opcoes => new THREE.MeshToonMaterial(opcoes);
const agua = criarAguaPercurso(mundo,toon);
const cortina = agua.getObjectByName('cortinas-cascatas').geometry;

test('as três quedas têm posições, normais e coordenadas de animação finitas',()=>{
  assert.equal(agua.userData.quedas.length,3);
  assert.ok(cortina.attributes.position.count>1000);
  for(const atributo of Object.values(cortina.attributes)) assert.ok(atributo.array.every(Number.isFinite));
  const progresso=cortina.attributes.aProgresso.array;
  assert.ok(progresso.every(t=>t>=0&&t<=1));
  assert.ok(progresso.includes(0)&&progresso.includes(1));
});

test('cada arco encontra a superfície anterior sem fresta e tem tangente quase horizontal no topo',()=>{
  const p=cortina.attributes.position,t=cortina.attributes.aProgresso,s=cortina.attributes.aLado;
  const superficie=agua.getObjectByName('superficie-riacho').geometry.attributes.position;
  let encontros=0;
  for(let i=0;i<p.count;i++) if(t.getX(i)===0&&Math.abs(s.getX(i))===1){
    let distancia=Infinity;
    for(let j=0;j<superficie.count;j++) distancia=Math.min(distancia,Math.hypot(p.getX(i)-superficie.getX(j),p.getY(i)-superficie.getY(j),p.getZ(i)-superficie.getZ(j)));
    assert.ok(distancia<1e-4,`emenda abriu ${distancia} m`);
    encontros++;
  }
  assert.ok(encontros>=6);
  for(const queda of agua.userData.quedas){
    const rows=[];
    for(let i=0;i<p.count;i++) if(Math.abs(s.getX(i))<1e-6&&p.getY(i)<=queda.superior+1e-4&&p.getY(i)>queda.superior-.15) rows.push({x:p.getX(i),y:p.getY(i),z:p.getZ(i),t:t.getX(i)});
    rows.sort((a,b)=>a.t-b.t);
    const a=rows.find(v=>v.t===0),b=rows.find(v=>v.t>0);
    assert.ok(a&&b);
    assert.ok((a.y-b.y)/Math.hypot(a.x-b.x,a.z-b.z)<.15,'o arco começou com uma quina vertical');
  }
});

test('a água preserva terreno, lago, trajeto e plantio e conecta a espuma à animação',()=>{
  assert.equal(JSON.stringify({rio:mundo.riacho,lago:mundo.lago,objetos:mundo.objetos}),antes);
  assert.ok(agua.userData.materiaisAnimados.some(m=>m.name==='espuma-cascata-animada'));
  const espuma=agua.getObjectByName('espuma-cascatas');
  assert.ok(espuma.geometry.attributes.position.array.every(Number.isFinite));
  const respingos=agua.getObjectByName('respingos-cascatas').geometry;
  for(const atributo of Object.values(respingos.attributes)) assert.ok(atributo.array.every(Number.isFinite));
  assert.ok(respingos.boundingSphere.radius>0&&Number.isFinite(respingos.boundingSphere.radius));
});

test('o lago mantém profundidades e ondas e não contém o mecanismo de pontos piscantes',()=>{
  const lago=criarLago(mundo,toon);
  const shader={uniforms:{},vertexShader:'#include <begin_vertex>',fragmentShader:'#include <color_fragment>\n#include <emissivemap_fragment>\n#include <opaque_fragment>'};
  lago.material.onBeforeCompile(shader);
  assert.ok(!shader.fragmentShader.includes('float pisca'));
  assert.ok(shader.fragmentShader.includes('float onda='));
  assert.ok(shader.fragmentShader.includes('float fundo='));
  assert.equal(lago.geometry.attributes.position.count,1+mundo.lago.contorno.length*40);
});
