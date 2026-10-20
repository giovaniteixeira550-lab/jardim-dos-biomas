import * as THREE from 'three';
import {construirVariacao} from '../../src/arvoreProc.js';
import {ESPECIES} from '../../src/especies.js';
import {RAMPAS} from '../../src/paleta.js';
import {criarMaterialPixel} from '../../src/pixel.js';
import {aplicarEstiloCopa} from '../../src/estiloCopa.js';
import {REGRAS_EXPERIMENTAIS,avaliarCrescimento,registrarEvento,somarDias} from '../../src/crescimentoEstudo.js';
import {criarVisualCrescimento} from '../../src/visualCrescimentoEstudo.js';

const $=id=>document.getElementById(id),CHAVE='jardim-amostra-crescimento-v1';
const INICIO='2026-01-01',nomes=['Broto','Muda','Jovem','Adulta'];
const tipos={estudo:'Estudo',tentativa:'Tentativa',retomada:'Trabalhou uma dificuldade',dificuldade:'Dificuldade registrada',pausa:'Pausa planejada'};
const resultados={autonomo:'Sem ajuda',pista:'Com pista',apos_explicacao:'Após explicação',nao_recuperou:'Ainda não recuperou',nao_avaliado:'Sem avaliação de autonomia'};
let amostra,renderer,cena,camera,rt,pixel,tela,camTela,rampa,material,variacao,ro,encerrado=false,giro=.55,malhas=[],salvamentoSuspenso=false;
const direita={value:new THREE.Vector2(1,0)},cv=$('tela');
const regrasNovas=()=>({...REGRAS_EXPERIMENTAIS,jovem:{...REGRAS_EXPERIMENTAIS.jovem,intervalo:Number($('regra-jovem').value)},adulta:{...REGRAS_EXPERIMENTAIS.adulta,intervalo:Number($('regra-adulta').value)},toleranciaSemRegistro:Number($('regra-tolerancia').value)});
function exemplo(regras=REGRAS_EXPERIMENTAIS){
  return {schema:1,id:'amostra-assunto-1',especie:'carvalho',agora:'2026-05-01',regras,eventos:Array.from({length:16},(_,i)=>({id:'exemplo-'+i,data:somarDias(INICIO,i*8),tipo:i%3===0?'tentativa':'estudo',resultado:i%3===0?'autonomo':'nao_avaliado'}))};
}
function exemploConcentrado(regras){
  const a=exemplo(regras);
  a.eventos=Array.from({length:16},(_,i)=>({id:'concentrado-'+i,data:somarDias(INICIO,i*8),tipo:'estudo',resultado:'nao_avaliado'}));
  for(const [i,dia] of [0,14,28].entries())a.eventos=registrarEvento(a.eventos,{id:'recuperacao-'+i,data:somarDias(INICIO,dia),tipo:'tentativa',resultado:'autonomo'});
  return a;
}
function validar(a){
  if(a?.schema!==1||a.id!=='amostra-assunto-1'||!['carvalho','freixo'].includes(a.especie))throw Error('Formato de amostra inválido.');
  avaliarCrescimento(a.eventos,a.agora,a.regras);return a;
}
function avisar(e){$('estado').textContent=e.message??String(e);$('estado').classList.add('erro');}
function salvar(){
  if(salvamentoSuspenso){avisar(Error('A amostra anterior não pôde ser lida e foi preservada. O teste atual é temporário; escolha um exemplo ou comece do zero para substituir a amostra salva.'));return;}
  try{const texto=JSON.stringify(amostra);localStorage.setItem(CHAVE,texto);if(localStorage.getItem(CHAVE)!==texto)throw Error('Não foi possível confirmar o salvamento da amostra.');$('estado').classList.remove('erro');$('estado').textContent='Amostra salva e conferida neste navegador. Nenhum registro da sua conta foi alterado.';}
  catch(e){avisar(Error('A amostra funciona, mas o salvamento local falhou: '+e.message));}
}
function limparMalhas(){for(const m of malhas){cena.remove(m);m.geometry.dispose();}malhas=[];}
function carregarEspecie(){
  limparMalhas();variacao?.estagios.forEach(g=>g.dispose());variacao=construirVariacao(ESPECIES[amostra.especie],1234);
}
function desenhar(){
  if(encerrado||!renderer||!variacao)return;
  const caixa=cv.getBoundingClientRect();if(caixa.width<1||caixa.height<1)return;
  const w=Math.round(caixa.width),h=Math.round(caixa.height),aspecto=w/h;
  renderer.setSize(w*2,h*2,false);rt.setSize(w,h);
  const meiaX=Math.max(16,9*aspecto),meiaY=meiaX/aspecto;
  camera.left=-meiaX;camera.right=meiaX;camera.top=meiaY;camera.bottom=-meiaY;
  camera.position.set(0,21,48);camera.lookAt(0,5.0,0);camera.updateProjectionMatrix();
  pixel.uniforms.uTam.value.set(w,h);pixel.uniforms.uTexel.value=meiaX*2/w;direita.value.set(Math.cos(giro),-Math.sin(giro));
  renderer.setRenderTarget(rt);renderer.render(cena,camera);renderer.setRenderTarget(null);
  pixel.uniforms.tCor.value=rt.texture;pixel.uniforms.tProf.value=rt.depthTexture;pixel.uniforms.uNear.value=camera.near;pixel.uniforms.uFar.value=camera.far;renderer.render(tela,camTela);
}
function atualizar(){
  const estado=avaliarCrescimento(amostra.eventos,amostra.agora,amostra.regras);
  $('data').value=amostra.agora;$('especie').value=amostra.especie;
  $('fase').textContent=estado.indice<0?'Ainda não plantada':nomes[estado.indice];
  $('dias').textContent=estado.diasDeEstudo;$('intervalo').textContent=estado.intervaloEstudado+' dias';$('autonomias').textContent=estado.autonomiasEspacadas;
  $('distribuicao').textContent=estado.intervaloRecuperacoes+' dias';
  $('copa').textContent=estado.pausaAtiva?'Em pausa planejada':({sem_registros:'Ainda sem registros',sem_acompanhamento:'Sem registro recente',em_retomada:'Em retomada',acompanhada:'Acompanhada'})[estado.acompanhamento];
  $('sinal').textContent=estado.pausaAtiva?'Pausa planejada: o relógio de acompanhamento está suspenso.':estado.acompanhamento==='sem_acompanhamento'?'Sem acompanhamento recente. Isso não mede esquecimento.':estado.acompanhamento==='em_retomada'?'A copa se recupera em etapas. Novos cliques hoje não aceleram essa recuperação.':estado.indice<0?'O primeiro encontro planta o broto.':'O acompanhamento está registrado; o porte conquistado permanece.';
  const dataTentativa=estado.dataUltimaTentativa?.split('-').reverse().join('/');
  $('evidencia').textContent=estado.retomadaEmAndamento?'Dificuldade em trabalho: retomada registrada, autonomia ainda não reavaliada.':estado.dificuldadeAtiva?'Última evidência: houve dificuldade ou ajuda. Uma retomada não declara o problema resolvido.':estado.ultimaTentativa==='nao_avaliado'?'Ainda sem tentativa avaliada neste histórico.':'Última tentativa ('+dataTentativa+'): '+resultados[estado.ultimaTentativa].toLowerCase()+'. Essa evidência se refere à tentativa registrada.';
  $('explicacao').textContent=estado.indice<0?'Registre um primeiro estudo para plantar o broto.':estado.estagio==='adulta'?'A árvore adulta mantém o porte. O próximo trabalho é continuar e ampliar o estudo do assunto; chegar à adulta não certifica domínio de todos os seus conteúdos.':'As atividades em dias diferentes e as recuperações espaçadas constroem o próximo estágio. Dias passando sozinhos não aumentam o porte.';
  const lista=$('criterios');lista.replaceChildren();
  $('titulo-criterios').textContent=estado.proximo?'Para chegar à fase '+nomes[estado.indice+1].toLowerCase():estado.indice<0?'Primeiro passo':'Etapa adulta conquistada';
  for(const c of estado.proximo?.criterios??[]){
    // Com estes critérios, os dias distintos já garantem o mínimo de encontros.
    if(c.chave==='encontros'&&c.meta<=amostra.regras[estado.proximo.estagio].dias)continue;
    const li=document.createElement('li'),rotulo=document.createElement('span'),valor=document.createElement('strong');
    li.className=c.concluido?'feito':'';rotulo.textContent=c.rotulo;
    const unidade=['intervalo','intervaloRecuperacoes'].includes(c.chave)?' dias':'';
    const formatar=n=>Number(n.toFixed(2)).toLocaleString('pt-BR');
    valor.textContent=(c.concluido?'✓ ':'')+formatar(c.atual)+' / '+formatar(c.meta)+unidade;li.append(rotulo,valor);lista.append(li);
  }
  $('orientacao').textContent=estado.indice<0?'Comece com um estudo ou uma tentativa, mesmo que seja difícil.':estado.proximo?'Todos os critérios precisam ser atendidos. Os intervalos são entre encontros registrados: esperar sem voltar ao assunto não os completa.':'Os registros seguintes continuam no histórico. Flores e frutos como marcos de manutenção ainda serão estudados.';
  $('versao-regras').textContent=amostra.regras.versao==='crescimento-estudo-0.1'?'Amostra anterior preservada com as regras iniciais. Os novos critérios só entram ao escolher um exemplo ou começar do zero.':'Amostra com os critérios aprimorados de crescimento e retomada.';
  document.querySelectorAll('[data-etapa]').forEach((el,i)=>{el.className=i===estado.indice?'atual':i<estado.indice?'conquistado':'';});
  const corpo=$('registros');corpo.replaceChildren();
  for(const e of [...amostra.eventos].reverse().slice(0,9)){
    const tr=document.createElement('tr');
    for(const texto of [e.data,tipos[e.tipo],e.tipo==='pausa'?'Até '+e.fim:resultados[e.resultado??'nao_avaliado']]){const td=document.createElement('td');td.textContent=texto;tr.append(td);}corpo.append(tr);
  }
  limparMalhas();
  for(const [referencia,x] of [[true,-7.5],[false,7.5]]){
    const v=criarVisualCrescimento(variacao,estado,{referencia});if(!v)continue;
    const mesh=new THREE.Mesh(v.geometria,material);mesh.position.x=x;mesh.scale.setScalar(v.escala);mesh.rotation.y=giro;mesh.castShadow=mesh.receiveShadow=true;cena.add(mesh);malhas.push(mesh);
  }
  desenhar();salvar();
}
function proteger(fn){return()=>{try{fn();}catch(e){avisar(e);}};}
function atividade(tipo,resultado='nao_avaliado'){
  const evento={id:'manual-'+amostra.eventos.length+'-'+amostra.agora,tipo,resultado,data:amostra.agora};
  const novos=registrarEvento(amostra.eventos,evento);avaliarCrescimento(novos,amostra.agora,amostra.regras);amostra.eventos=novos;atualizar();
}
function avancar(dias){amostra.agora=somarDias(amostra.agora,dias);atualizar();}
function novaAmostra(modo){
  const regras=regrasNovas(),candidata=modo==='concentrado'?exemploConcentrado(regras):modo==='distribuido'?exemplo(regras):{schema:1,id:'amostra-assunto-1',especie:amostra.especie,agora:INICIO,regras,eventos:[]};
  validar(candidata);amostra=candidata;salvamentoSuspenso=false;carregarEspecie();atualizar();
}
try{
  let avisoInicial=null;
  try{const salvo=localStorage.getItem(CHAVE);amostra=salvo?validar(JSON.parse(salvo)):exemplo();}catch(e){amostra=exemplo();salvamentoSuspenso=true;avisoInicial='A amostra salva foi preservada, mas não pôde ser carregada: '+e.message;}
  $('regra-jovem').value=amostra.regras.jovem.intervalo;$('regra-adulta').value=amostra.regras.adulta.intervalo;$('regra-tolerancia').value=amostra.regras.toleranciaSemRegistro;
  renderer=new THREE.WebGLRenderer({canvas:cv,antialias:false,preserveDrawingBuffer:true});renderer.setPixelRatio(1);renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.BasicShadowMap;
  cena=new THREE.Scene();cena.background=new THREE.Color(RAMPAS.salvia[2]);camera=new THREE.OrthographicCamera(-1,1,1,-1,.1,160);
  rampa=new THREE.DataTexture(new Uint8Array([105,105,105,255,178,178,178,255,255,255,255,255]),3,1,THREE.RGBAFormat);rampa.minFilter=rampa.magFilter=THREE.NearestFilter;rampa.needsUpdate=true;
  material=new THREE.MeshToonMaterial({vertexColors:true,side:THREE.DoubleSide,gradientMap:rampa});pixel=criarMaterialPixel();aplicarEstiloCopa(material,direita,pixel.uniforms.uTexel);
  cena.add(new THREE.HemisphereLight(0xe4ecd2,0x6c7a52,1.25));const sol=new THREE.DirectionalLight(0xfff1d6,2.2);sol.position.set(-25,45,30);sol.castShadow=true;sol.shadow.mapSize.set(2048,2048);Object.assign(sol.shadow.camera,{left:-30,right:30,top:25,bottom:-25,near:.1,far:120});sol.shadow.bias=-.0003;sol.shadow.normalBias=.035;cena.add(sol,sol.target);
  const matSolo=new THREE.MeshToonMaterial({color:RAMPAS.salvia[3],gradientMap:rampa});
  matSolo.onBeforeCompile=shader=>{shader.fragmentShader=shader.fragmentShader.replace('#include <opaque_fragment>','#include <opaque_fragment>\ngl_FragColor.a=.75;');};matSolo.customProgramCacheKey=()=> 'solo-amostra-sem-grade';
  const solo=new THREE.Mesh(new THREE.PlaneGeometry(100,100),matSolo);solo.rotation.x=-Math.PI/2;solo.position.y=-.03;solo.receiveShadow=true;cena.add(solo);
  rt=new THREE.WebGLRenderTarget(1,1,{type:THREE.HalfFloatType,minFilter:THREE.NearestFilter,magFilter:THREE.NearestFilter,depthTexture:new THREE.DepthTexture(1,1)});tela=new THREE.Scene();tela.add(new THREE.Mesh(new THREE.PlaneGeometry(2,2),pixel));camTela=new THREE.OrthographicCamera(-1,1,1,-1,0,1);
  $('estudar').onclick=proteger(()=>atividade('estudo'));$('autonomo').onclick=proteger(()=>atividade('tentativa','autonomo'));$('pista').onclick=proteger(()=>atividade('tentativa','pista'));$('dificil').onclick=proteger(()=>atividade('tentativa','nao_recuperou'));$('retomar').onclick=proteger(()=>atividade('retomada'));
  $('semana').onclick=proteger(()=>avancar(7));$('mes').onclick=proteger(()=>avancar(30));
  $('pausa').onclick=proteger(()=>{const fim=somarDias(amostra.agora,30);amostra.eventos=registrarEvento(amostra.eventos,{id:'pausa-'+amostra.eventos.length,tipo:'pausa',data:amostra.agora,fim});amostra.agora=fim;atualizar();});
  $('data').onchange=()=>{try{avaliarCrescimento(amostra.eventos,$('data').value,amostra.regras);amostra.agora=$('data').value;atualizar();}catch(e){$('data').value=amostra.agora;avisar(e);}};
  $('especie').onchange=proteger(()=>{amostra.especie=$('especie').value;carregarEspecie();atualizar();});
  $('exemplo').onclick=proteger(()=>novaAmostra('distribuido'));$('concentrado').onclick=proteger(()=>novaAmostra('concentrado'));$('zerar').onclick=proteger(()=>novaAmostra('vazio'));
  $('girar').onclick=()=>{giro+=Math.PI/4;for(const m of malhas)m.rotation.y=giro;desenhar();};
  ro=new ResizeObserver(desenhar);ro.observe(cv);carregarEspecie();atualizar();if(avisoInicial)avisar(Error(avisoInicial));
  addEventListener('pagehide',()=>{encerrado=true;ro.disconnect();limparMalhas();variacao.estagios.forEach(g=>g.dispose());cena.traverse(o=>{o.geometry?.dispose();if(o.material!==material)o.material?.dispose();o.shadow?.dispose();});tela.traverse(o=>o.geometry?.dispose());material.dispose();rampa.dispose();rt.dispose();pixel.dispose();renderer.dispose();},{once:true});
  addEventListener('pageshow',evento=>{if(evento.persisted)location.reload();});
}catch(e){avisar(Error('Não foi possível preparar a amostra: '+e.message));console.error(e);}
