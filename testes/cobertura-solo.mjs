import {test} from 'node:test';
import assert from 'node:assert/strict';
import {gerarMundo} from '../src/mundo.js';
import {cabeCobertura,distribuirCobertura} from '../src/coberturaSolo.js';

test('zonas excluídas: água, caminho, encosta, reserva e ponte',()=>{
 const m={largura:100,altura:100,fatorLago:()=>2,distTrilha:()=>20,trilha:{largura:3},declive:()=>0,distRiacho:()=>20,larguraRiacho:()=>2,altitude:()=>0,plano:{locais:[]}};
 assert.equal(cabeCobertura(m,50,50),true);
 for(const alteracao of [{fatorLago:()=>1},{distTrilha:()=>1},{declive:()=>.6},{distRiacho:()=>1},{plano:{locais:[{status:'proposto',x:50,y:50,largura:5,profundidade:5}]}},{plano:{locais:[],passarela:{inicio:{x:40,y:50},fim:{x:60,y:50},largura:3}}},{altitude:(x)=>x>50?.8:0}])assert.equal(cabeCobertura({...m,...alteracao},50,50),false);
});
test('mundo real: distribuição repetível, sem alterar objetos ou ocupar zonas excluídas',()=>{
 const m=gerarMundo(1234),antes=JSON.stringify(m.objetos),a=distribuirCobertura(m);
 assert.deepEqual(a,distribuirCobertura(m));assert.equal(JSON.stringify(m.objetos),antes);
 assert.ok(a.folhas.length>0&&a.trevos.length>0);
 for(const p of [...a.folhas,...a.trevos])assert.ok(cabeCobertura(m,p.x,p.z));
});
