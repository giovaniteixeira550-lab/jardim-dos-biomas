/** Critérios visuais mínimos: distribuição ampla, espaço entre árvores e vistas livres. */
import assert from 'node:assert/strict';
import test from 'node:test';
import {gerarMundo} from '../src/mundo.js';
for(const semente of [1234,2468,9001])test(`plantio ${semente}: árvores espalhadas e pontos de vista preservados`,()=>{
 const m=gerarMundo(semente),arvores=m.objetos.filter(o=>o.tipo==='arvore'),celulas=Array(12).fill(0);
 for(let i=0;i<arvores.length;i++){
  const p=arvores[i];
  if(p.x>=0&&p.y>=0&&p.x<m.largura&&p.y<m.altura)
   celulas[Math.floor(p.y/m.altura*3)*4+Math.floor(p.x/m.largura*4)]++;
  for(let j=i+1;j<arvores.length;j++)assert.ok(Math.hypot(p.x-arvores[j].x,p.y-arvores[j].y)>=7.8,'árvores novamente aglomeradas');
  assert.ok(m.distTrilha(p.x,p.y)>4.6,'árvore bloqueia o percurso');
  assert.ok(Math.hypot(p.x-m.plano.pesca.x,p.y-m.plano.pesca.y)>8,'árvore ocupa a vista do banco');
  for(const ponte of m.pontes)assert.ok(Math.hypot(p.x-ponte.x,p.y-ponte.y)>9.5,'árvore ocupa a travessia');
  for(const queda of m.riacho.quedas)assert.ok(Math.hypot(p.x-queda.x,p.y-queda.y)>6.5,'árvore ocupa a vista da cascata');
 }
 // Grade usada apenas na auditoria: o plantio continua irregular, sem linhas ou lotes.
 assert.ok(celulas.every(n=>n>=3),`região inteira sem árvores: ${celulas}`);
 // Pontos das faixas que continuavam vazias na primeira revisão.
 for(const [px,py] of [[-12,100],[90,-4],[145,-8],[183,83]]){
  const x=px/180*m.largura,y=py/120*m.altura;
  assert.ok(arvores.some(o=>Math.hypot(o.x-x,o.y-y)<10),'trecho indicado na referência continua sem árvore próxima');
 }
 for(const zona of m.plano.reforcosPlantio){
  const extras=arvores.filter(o=>o.reforcoVisual===zona.id);
  assert.ok(extras.length>0,`borda indicada continua vazia: ${zona.id}`);
  for(const p of extras){
   assert.ok(m.altitude(p.x,p.y)>3.8,'reforço plantado fora do platô');
   assert.ok(!m.ingreme(p.x,p.y),'reforço plantado na encosta');
  }
 }
 const casa=m.plano.locais.find(l=>l.id==='casa-madeira');
 for(const p of m.objetos)assert.ok(Math.abs(p.x-casa.x)>=casa.largura/2+casa.margemVegetacao||Math.abs(p.y-casa.y)>=casa.profundidade/2+casa.margemVegetacao,'objeto ocupa a reserva da casa');
 const cotas=[];
 for(let dx=-9;dx<=9;dx+=3)for(let dy=-7;dy<=7;dy+=2)cotas.push(m.altitude(casa.x+dx,casa.y+dy));
 assert.ok(Math.min(...cotas)>4,'reserva da casa invade a borda do barranco');
 assert.ok(Math.max(...cotas)-Math.min(...cotas)<.2,'reserva da casa não está no patamar plano');
});
