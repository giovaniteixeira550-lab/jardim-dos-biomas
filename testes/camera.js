import { Jardim } from '../src/cena.js';
const c = document.querySelector('canvas'), out = document.querySelector('pre');
const j = new Jardim(c), aprovados = [];
const erro = [];
window.addEventListener('error', e => erro.push(e.message));
function exigir(ok, msg) { if (!ok) throw Error(msg); }
function prazo(p, etapa, ms=60000) {
  let id;
  return Promise.race([p, new Promise((_, rejeitar) => id=setTimeout(()=>rejeitar(Error(`Prazo excedido: ${etapa}`)),ms))]).finally(()=>clearTimeout(id));
}
function projetar(p) {
  j.posicionarCamera(); j.camera.updateMatrixWorld();
  const v=p.clone().project(j.camera), r=c.getBoundingClientRect();
  return { x:r.left+(v.x+1)*r.width/2, y:r.top+(1-v.y)*r.height/2 };
}
function pointer(tipo,x,y,botao=0) {
  c.dispatchEvent(new PointerEvent(tipo,{clientX:x,clientY:y,button:botao,buttons:tipo==='pointerup'?0:botao===1?4:1,pointerId:17,pointerType:'mouse',bubbles:true}));
}
try {
  await prazo(j.carregar(1234,(_,etapa)=>out.textContent=etapa),'carregamento');
  exigir(!document.hidden,'O teste precisa de aba visível.');
  // Eventos sintéticos não têm um ponteiro físico para capturar. Só o teste
  // substitui essa chamada; a página principal usa captura nativa normalmente.
  const capturar=c.setPointerCapture;
  c.setPointerCapture=()=>{};
  const r=c.getBoundingClientRect(), x=r.width*.52, y=r.height*.46;
  for (const yaw of [0,Math.PI/2,Math.PI,Math.PI*1.5]) for (const pitch of [.4,1.1]) {
    j.recentrar(); j.yaw=j.yawAlvo=yaw; j.pitch=pitch;
    const antes=j.pontoNoMapa(x,y);
    pointer('pointerdown',x,y);
    pointer('pointermove',x+45,y+25);
    pointer('pointerup',x+45,y+25);
    const depois=projetar(antes);
    exigir(Math.hypot(depois.x-x-45,depois.y-y-25)<3,'Arraste não acompanhou o cursor após giro/inclinação.');
  }
  aprovados.push('Arraste ancorado: quatro orientações e duas inclinações.');
  j.recentrar();
  const antes=j.pontoNoMapa(x,y);
  j.zoom(.65,x,y);
  const depois=projetar(antes);
  exigir(Math.hypot(depois.x-x,depois.y-y)<3,'Zoom perdeu o ponto sob o cursor.');
  aprovados.push('Zoom preserva o ponto indicado pelo cursor.');
  for (const botao of [0,1]) {
    j.recentrar(); j.setModoCamera(botao===0?'girar':'mover');
    const yaw=j.yaw, pitch=j.pitch, alvo=j.alvo.clone();
    pointer('pointerdown',x,y,botao); pointer('pointermove',x+70,y+50,botao); pointer('pointerup',x+70,y+50,botao);
    exigir(Math.abs(j.yaw-yaw)>.1 && Math.abs(j.pitch-pitch)>.1,'Gesto não alterou giro e inclinação.');
    exigir(j.alvo.distanceTo(alvo)<.001,'Órbita moveu o ponto de foco.');
  }
  aprovados.push('Giro e inclinação juntos: botão do meio e modo Girar com botão esquerdo.');
  j.setModoCamera('mover'); j.recentrar();
  c.dispatchEvent(new MouseEvent('dblclick',{clientX:x,clientY:y,button:0,bubbles:true}));
  await prazo(new Promise(resolve=>{
    function quadro(){if(!j.animacaoFoco)resolve();else requestAnimationFrame(quadro);}requestAnimationFrame(quadro);
  }),'animação de foco',5000);
  exigir(j.altura<50,'Clique duplo não aproximou.');
  aprovados.push('Clique duplo aproxima e conclui a animação.');
  j.aproximarEm(x,y); pointer('pointerdown',x,y); pointer('pointerup',x,y);
  exigir(!j.animacaoFoco,'Arraste não cancelou o foco animado.');
  j.recentrar();
  exigir(j.altura===180 && Math.abs(j.yaw-Math.PI/4)<.001,'Visão geral não restaurada.');
  exigir(erro.length===0,erro.join('\n'));
  exigir(j.renderer.getContext().getError()===0,'Erro WebGL.');
  c.setPointerCapture=capturar;
  aprovados.push('Interrupção do foco, visão geral e ausência de erros gráficos.');
  out.textContent='PASSOU\n'+aprovados.join('\n');
} catch(e) {out.textContent='FALHOU — '+e.message+'\n'+aprovados.join('\n');}
finally {j.dispose();}
