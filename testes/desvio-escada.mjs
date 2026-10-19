import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gerarMundo} from '../src/mundo.js';

const anterior=JSON.parse(readFileSync(new URL('./plantio-antes-escada.json',import.meta.url),'utf8'));
const m=gerarMundo(1234),id=o=>`${o.tipo}:${o.x}:${o.y}`;

test('desvio conserva o curso, as cascatas e a posição física da ponte',()=>{
  assert.deepEqual(m.riacho,anterior.riacho);
  for(const k of ['x','y','dx','dy','h','comprimento','largura','arqueamento'])assert.ok(Math.abs(m.ponte[k]-anterior.pontes[0][k])<1e-8,k+' da ponte mudou');
});

test('plantio fora da nova passagem preserva posição, espécie-base e sorteios',()=>{
  const antes=new Map(anterior.objetos.map(o=>[id(o),o])),depois=new Map(m.objetos.map(o=>[id(o),o]));
  for(const o of m.objetos)assert.deepEqual(o,antes.get(id(o)),'Indivíduo mudou ou foi sorteado novamente');
  for(const o of anterior.objetos)if(!depois.has(id(o)))assert.ok(m.distTrilha(o.x,o.y)<=4.6,'Remoção fora do corredor');
  assert.ok(m.objetos.length>=anterior.objetos.length-10,'Desvio retirou vegetação demais');
});

test('corredor pedido fica 7 m para dentro e a faixa antiga volta a ser gramado',()=>{
  const plano=m.plano,a=plano.trilhaPlantio[1],b=plano.trilhaPlantio[2];
  for(const i of [1,2])assert.ok(Math.abs(Math.hypot(plano.trilha[i].x-plano.trilhaPlantio[i].x,plano.trilha[i].y-plano.trilhaPlantio[i].y)-7)<1e-8);
  for(let i=0;i<plano.trilha.length;i++)if(![1,2].includes(i))assert.deepEqual(plano.trilha[i],plano.trilhaPlantio[i],'Trecho fora do corredor foi deslocado');
  const t=.65,x=a.x+(b.x-a.x)*t,y=a.y+(b.y-a.y)*t;
  assert.ok(m.distTrilha(x,y)>6.8,'Faixa antiga ainda contém caminho');
  const g=m.grade,i=Math.round((x-g.x0)/g.passo),j=Math.round((y-g.y0)/g.passo);
  assert.ok(g.DT[j*g.nx+i]>6.5,'Máscara antiga do caminho continuou na grade');
});

test('escada da primeira cascata tem um lance reto e uma faixa de grama antes da água',()=>{
  const centro=m.plano.locais.find(l=>l.id==='escada-cascata');
  const passos=m.trilha.amostras.filter(p=>p.escada&&Math.hypot(p.x-centro.x,p.y-centro.y)<10);
  assert.ok(passos.length>10,'Escada não acompanha a área indicada');
  let folga=Infinity;
  for(const p of passos)folga=Math.min(folga,m.distRiacho(p.x,p.y)-m.larguraRiacho(p.x,p.y)/2-m.trilha.largura/2);
  assert.ok(folga>4.5,`Escada ainda colada ao rio: ${folga}`);
});
