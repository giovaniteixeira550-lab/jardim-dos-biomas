import test from 'node:test';
import assert from 'node:assert/strict';
import {avaliarCrescimento,registrarEvento,REGRAS_EXPERIMENTAIS as R,somarDias} from '../src/crescimentoEstudo.js';
import {construirVariacao} from '../src/arvoreProc.js';
import {ESPECIES} from '../src/especies.js';
import {criarVisualCrescimento} from '../src/visualCrescimentoEstudo.js';
const inicio='2026-01-01';
const evento=(n,dias,tipo='estudo',resultado='nao_avaliado')=>({id:'e'+n,data:somarDias(inicio,dias),tipo,resultado});
const meses=Array.from({length:16},(_,i)=>evento(i,i*8,i%3===0?'tentativa':'estudo',i%3===0?'autonomo':'nao_avaliado'));

test('dias passando sozinhos não produzem crescimento; repetições no mesmo dia têm teto',()=>{
  const um=[evento(0,0)];
  assert.equal(avaliarCrescimento(um,inicio).crescimento,avaliarCrescimento(um,somarDias(inicio,300)).crescimento);
  const repetidos=Array.from({length:30},(_,i)=>evento(i,0,'tentativa','autonomo'));
  const a=avaliarCrescimento(repetidos,inicio);assert.equal(a.estagio,'broto');assert.equal(a.encontros,1.25);assert.equal(a.autonomiasEspacadas,1);
});
test('voltar ao assunto em meses permite amadurecer; uma semana não alcança a adulta',()=>{
  assert.equal(avaliarCrescimento(meses,somarDias(inicio,120)).estagio,'adulta');
  const semana=Array.from({length:8},(_,i)=>evento(i,i,'tentativa','autonomo'));
  assert.notEqual(avaliarCrescimento(semana,somarDias(inicio,7)).estagio,'adulta');
});
test('recuperações concentradas no primeiro mês não maturam a árvore apenas com leituras posteriores',()=>{
  let e=Array.from({length:16},(_,i)=>evento('leitura'+i,i*8));
  for(const [i,dia] of [0,14,28].entries())e=registrarEvento(e,evento('rec'+i,dia,'tentativa','autonomo'));
  const a=avaliarCrescimento(e,somarDias(inicio,120));
  assert.equal(a.estagio,'jovem');assert.equal(a.autonomiasEspacadas,3);assert.equal(a.intervaloRecuperacoes,28);
  assert.deepEqual(a.proximo.criterios.filter(c=>!c.concluido).map(c=>c.chave),['intervaloRecuperacoes']);
  assert.equal(avaliarCrescimento(e,somarDias(inicio,500)).estagio,'jovem');
  e=registrarEvento(e,evento('retorno',120,'tentativa','autonomo'));
  assert.equal(avaliarCrescimento(e,somarDias(inicio,120)).estagio,'adulta');
});
test('inserir evidência antiga não diminui a distribuição de recuperações nem a conquista',()=>{
  const r={...R,muda:{dias:1,intervalo:0,encontros:1,autonomias:0},jovem:{dias:1,intervalo:0,encontros:1,autonomias:1},adulta:{dias:3,intervalo:30,encontros:3,autonomias:3,intervaloRecuperacoes:30}};
  let e=[0,20,34].map((d,i)=>evento(i,d,'tentativa','autonomo'));
  const antes=avaliarCrescimento(e,somarDias(inicio,34),r);
  e=registrarEvento(e,evento('antigo1',14,'tentativa','autonomo'));e=registrarEvento(e,evento('antigo2',28,'tentativa','autonomo'));
  const depois=avaliarCrescimento(e,somarDias(inicio,34),r);
  assert.equal(depois.intervaloRecuperacoes,34);assert.equal(depois.estagio,'adulta');assert.ok(depois.crescimento>=antes.crescimento);
});
test('acrescentar tentativas, erros e pausas não regride porte ou estágio conquistado',()=>{
  let e=[],crescimento=0,indice=-1;
  for(let i=0;i<80;i++){
    const data=somarDias(inicio,i*5);
    e=registrarEvento(e,evento(i,i*5,'tentativa',i%3===0?'nao_recuperou':'autonomo'));
    const a=avaliarCrescimento(e,data);assert.ok(a.crescimento>=crescimento);assert.ok(a.indice>=indice);crescimento=a.crescimento;indice=a.indice;
    if(i%13===0){e=registrarEvento(e,{id:'p'+i,tipo:'pausa',data,fim:somarDias(data,3)});assert.equal(avaliarCrescimento(e,data).crescimento,crescimento);}
  }
});
test('tentativa difícil acrescenta trajetória sem diminuir conquista nem simular autonomia',()=>{
  const antes=avaliarCrescimento(meses,somarDias(inicio,121));
  const registros=registrarEvento(meses,evento('erro',121,'tentativa','nao_recuperou'));
  const depois=avaliarCrescimento(registros,somarDias(inicio,121));
  assert.ok(depois.crescimento>=antes.crescimento);assert.equal(depois.autonomiasEspacadas,antes.autonomiasEspacadas);assert.equal(depois.dificuldadeAtiva,true);
});
test('pausas sobrepostas suspendem somente o acompanhamento e não duplicam dias',()=>{
  const registros=[evento(0,0),{id:'p1',tipo:'pausa',data:inicio,fim:somarDias(inicio,60)},{id:'p2',tipo:'pausa',data:somarDias(inicio,30),fim:somarDias(inicio,90)}];
  const a=avaliarCrescimento(registros,somarDias(inicio,100));assert.equal(a.diasSemAcompanhamento,10);assert.equal(a.senescencia,0);assert.equal(a.estagio,'broto');
});
test('copa muda com o acompanhamento, retorna gradualmente e mantém porte',()=>{
  const data=somarDias(inicio,360),a=avaliarCrescimento(meses,data);
  assert.ok(a.senescencia>.4);assert.equal(a.estagio,'adulta');
  const retomada=registrarEvento(meses,{id:'volta',tipo:'retomada',data});
  const b=avaliarCrescimento(retomada,data);assert.ok(b.senescencia<a.senescencia&&b.senescencia>0);assert.ok(b.crescimento>=a.crescimento);
  assert.equal(avaliarCrescimento(Array.from({length:20},(_,i)=>({id:'volta'+i,tipo:'retomada',data})).concat(meses),data).senescencia,b.senescencia);
});
test('a copa melhora por retornos espaçados: tipo de botão, cliques diários e pausa não aceleram a restauração',()=>{
  const data=somarDias(inicio,360),retomar=(e,id,dias,tipo='retomada')=>registrarEvento(e,{id,tipo,data:somarDias(data,dias)});
  const primeiro=retomar(meses,'r0',0),base=avaliarCrescimento(primeiro,data);
  assert.equal(base.acompanhamento,'em_retomada');
  assert.equal(avaliarCrescimento(retomar(meses,'leitura',0,'estudo'),data).senescencia,base.senescencia);
  let diarios=primeiro;
  for(let i=1;i<7;i++)diarios=retomar(diarios,'r'+i,i);
  assert.equal(avaliarCrescimento(diarios,somarDias(data,6)).senescencia,base.senescencia);
  diarios=retomar(diarios,'r7',7);
  assert.ok(avaliarCrescimento(diarios,somarDias(data,7)).senescencia<base.senescencia);
  let pausa=registrarEvento(primeiro,{id:'p',tipo:'pausa',data,fim:somarDias(data,30)});
  pausa=retomar(pausa,'apos-pausa',30);
  assert.equal(avaliarCrescimento(pausa,somarDias(data,30)).senescencia,base.senescencia);
  assert.equal(avaliarCrescimento(pausa,somarDias(data,30)).dificuldadeAtiva,false);
});
test('amostras antigas conservam critérios e resposta visual sob a versão original',()=>{
  const {intervaloRecuperacaoCopa,...antigas}=R;
  const {intervaloRecuperacoes,...adulta}=R.adulta;
  const regras={...antigas,versao:'crescimento-estudo-0.1',adulta};
  let e=Array.from({length:16},(_,i)=>evento('leitura'+i,i*8));
  for(const [i,dia] of [0,14,28].entries())e=registrarEvento(e,evento('rec'+i,dia,'tentativa','autonomo'));
  assert.equal(avaliarCrescimento(e,somarDias(inicio,120),regras).estagio,'adulta');
  const data=somarDias(inicio,360),antes=avaliarCrescimento(e,data,regras);
  e=registrarEvento(e,{id:'r',tipo:'retomada',data});
  assert.equal(avaliarCrescimento(e,data,regras).senescencia,antes.senescencia*.35);
  assert.equal(regras.versao,'crescimento-estudo-0.1');assert.equal(regras.adulta.intervaloRecuperacoes,undefined);
});
test('reenvio é idempotente e registros conflitantes, datas impossíveis e regras inválidas falham',()=>{
  const e=evento(1,0),a=registrarEvento([],e);assert.deepEqual(registrarEvento(a,e),a);
  assert.throws(()=>registrarEvento(a,{...e,tipo:'tentativa',resultado:'autonomo'}));
  assert.throws(()=>avaliarCrescimento([{...e,data:'2026-02-30'}],'2026-03-10'));
  assert.throws(()=>avaliarCrescimento([e],'2025-12-31'));
  assert.throws(()=>avaliarCrescimento([e],inicio,{...R,adulta:{...R.adulta,intervalo:2}}));
  assert.throws(()=>avaliarCrescimento([e],inicio,{...R,adulta:{...R.adulta,dias:3}}));
  assert.throws(()=>avaliarCrescimento([e],inicio,{...R,intervaloRecuperacaoCopa:0}));
  assert.throws(()=>avaliarCrescimento([e],inicio,{...R,versao:'desconhecida'}));
});
test('dias de estudo, confiança e recuperação não são confundidos; leituras não inventam autonomia',()=>{
  const a=avaliarCrescimento(Array.from({length:20},(_,i)=>evento(i,i*8)),somarDias(inicio,160));
  assert.equal(a.autonomiasEspacadas,0);assert.equal(a.ultimaTentativa,'nao_avaliado');assert.equal(a.dificuldadeAtiva,false);assert.notEqual(a.estagio,'adulta');
});
test('o último resultado do mesmo dia prevalece, mesmo após dez registros',()=>{
  let e=Array.from({length:12},(_,i)=>evento(i,0));
  e=registrarEvento(e,evento('a',0,'tentativa','autonomo'));
  e=registrarEvento(e,evento('b',0,'tentativa','nao_recuperou'));
  assert.equal(avaliarCrescimento(e,inicio).dificuldadeAtiva,true);
  e=registrarEvento(e,evento('c',0,'retomada'));assert.equal(avaliarCrescimento(e,inicio).dificuldadeAtiva,true);assert.equal(avaliarCrescimento(e,inicio).retomadaEmAndamento,true);
  assert.equal(avaliarCrescimento(e,inicio).autonomiasEspacadas,1);
  e=registrarEvento(e,evento('d',0,'tentativa','autonomo'));assert.equal(avaliarCrescimento(e,inicio).dificuldadeAtiva,false);
});
test('madeira conquistada é idêntica durante senescência e a geometria original permanece intacta',()=>{
  const v=construirVariacao(ESPECIES.carvalho,1234),base=v.estagios[3],original=base.attributes.position.array.slice();
  const estado=avaliarCrescimento(meses,somarDias(inicio,360));
  const s=criarVisualCrescimento(v,estado),r=criarVisualCrescimento(v,estado,{referencia:true});
  assert.equal(s.escala,r.escala);assert.equal(s.alturaConquistada,r.alturaConquistada);
  let j=0;
  for(let i=0;i<base.attributes.position.count;i+=3)if(!(base.attributes.banda.getX(i)>-2&&base.attributes.raioCopa.getX(i)>0)){
    for(let k=0;k<3;k++,j++)for(const nome of ['position','normal','color'])for(let c=0;c<3;c++)assert.equal(s.geometria.attributes[nome].array[j*3+c],base.attributes[nome].array[(i+k)*3+c]);
  }
  assert.deepEqual(base.attributes.position.array,original);
  for(const a of Object.values(s.geometria.attributes))assert.ok(a.array.every(Number.isFinite));
  s.geometria.dispose();r.geometria.dispose();v.estagios.forEach(g=>g.dispose());
});
