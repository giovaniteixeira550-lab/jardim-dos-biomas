/** Contrato dos destinos: mirante e banco junto à água, sem o antigo largo. */
import test from "node:test";
import assert from "node:assert/strict";
import {gerarMundo} from "../src/mundo.js";
for(const semente of [1234,2468,9001])test(`percurso ${semente}: mirante e ponto de pesca conectados`,()=>{
  const m=gerarMundo(semente),p=m.plano.pesca,pontos=m.trilha.pontos;
  assert.deepEqual(m.trilha.largos.map(l=>l.id),["mirante"]);
  assert.deepEqual(pontos.at(-1),p.acesso);
  assert.ok(m.distTrilha(221,80.75)>12,"antigo largo ou sua estrada continuam presentes");
  assert.ok(m.distTrilha(255,86)>m.trilha.largura*2,"cauda sem destino continua presente");
  assert.ok(Math.abs(Math.hypot(p.x-p.acesso.x,p.y-p.acesso.y)-2.1)<1e-6);
  const dx=m.lago.cx-p.x,dy=m.lago.cy-p.y;
  assert.ok((Math.sin(p.yaw)*dx+Math.cos(p.yaw)*dy)/Math.hypot(dx,dy)>.999,"banco não olha para a água");
  for(const lado of [-1,1])for(const frente of [-.34,.34]){
    const x=p.x+lado*1.55*Math.cos(p.yaw)+frente*Math.sin(p.yaw);
    const y=p.y-lado*1.55*Math.sin(p.yaw)+frente*Math.cos(p.yaw);
    assert.ok(m.fatorLago(x,y)>1.04,"assento invade a água");
    assert.ok(m.declive(x,y)<.2,"banco fica em barranco");
  }
  assert.ok(m.fatorLago(p.x,p.y)<1.15,"banco distante da margem");
  const arvores=m.objetos.filter(o=>["arvore","arbusto"].includes(o.tipo));
  assert.ok(arvores.every(o=>Math.hypot(o.x-p.x,o.y-p.y)>3),"vegetação ocupa o banco");
  for(const ponto of pontos)assert.ok(ponto.x>0&&ponto.x<m.largura&&ponto.y>0&&ponto.y<m.altura);
  for(let i=1;i<pontos.length;i++)for(let t=0;t<=1;t+=.1){
    const x=pontos[i-1].x*(1-t)+pontos[i].x*t,y=pontos[i-1].y*(1-t)+pontos[i].y*t;
    if(!m.perfilTrilha(x,y).ponte)assert.ok(m.fatorLago(x,y)>1.06,"trilha invade o lago");
  }
});