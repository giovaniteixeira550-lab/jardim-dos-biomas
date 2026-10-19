import * as THREE from 'three';
import {construirVariacao} from '../../src/arvoreProc.js';
import {ESPECIES} from '../../src/especies.js';
import {RAMPAS} from '../../src/paleta.js';
import {criarMaterialPixel} from '../../src/pixel.js';
import {aplicarEstiloCopa} from '../../src/estiloCopa.js';
import {ESTADOS_SENESCENCIA,prepararSenescencia,construirSenescencia,descartarSenescencia} from '../../src/senescencia.js';

const $=id=>document.getElementById(id),cv=$('tela');
let renderer,cena,camera,rt,pixel,tela,camTela,material,anatomia,variacao,solo;
let modelos=[],modo='comparar',nivel=0,giro=.55,pitch=26,zoom=1,simulacao=null,raf=null,encerrado=false,ultimaTroca=0;
const direita={value:new THREE.Vector2(1,0)};
function limpar(){for(const m of modelos){cena.remove(m);m.geometry.dispose();}modelos=[];}
function montar(){
  limpar();const valores=modo==='comparar'?ESTADOS_SENESCENCIA.map(e=>e.valor):[nivel];
  valores.forEach((v,i)=>{const m=new THREE.Mesh(construirSenescencia(anatomia,v),material);m.position.x=valores.length>1?(i-2)*10.5:0;m.castShadow=m.receiveShadow=true;cena.add(m);modelos.push(m);});
  $('rotulos').style.gridTemplateColumns=`repeat(${valores.length},1fr)`;
  $('rotulos').replaceChildren(...valores.map((v,i)=>{const s=document.createElement('span');const e=ESTADOS_SENESCENCIA.reduce((a,b)=>Math.abs(b.valor-v)<Math.abs(a.valor-v)?b:a);s.innerHTML=`<strong>${valores.length>1?i+1+' · ':''}${e.nome}</strong><span>mesmo porte adulto</span>`;return s;}));
  for(const b of document.querySelectorAll('[data-valor]'))b.setAttribute('aria-pressed',String(modo!=='comparar'&&Math.abs(Number(b.dataset.valor)-nivel)<.02));
  $('comparar').setAttribute('aria-pressed',String(modo==='comparar'));
  $('nivel').value=Math.round(nivel*100);$('valor').textContent=Math.round(nivel*100)+'%';
  const e=ESTADOS_SENESCENCIA.reduce((a,b)=>Math.abs(b.valor-nivel)<Math.abs(a.valor-nivel)?b:a);
  $('descricao').textContent=modo==='comparar'?'Observe como a cor perde vigor e a copa abre espaço para os ramos. Tronco e raízes são os mesmos em todos os estágios.':e.texto;
  desenhar();
}
function carregarEspecie(){
  limpar();if(anatomia)descartarSenescencia(anatomia);if(variacao)for(const g of variacao.estagios)g.dispose();
  variacao=construirVariacao(ESPECIES[$('especie').value],1234);anatomia=prepararSenescencia(variacao.estagios[3],1234);
  $('estado').textContent=`${anatomia.especie} · amostra visual reversível · sem alteração no jardim publicado`;
  montar();
}
function desenhar(){
  if(encerrado||!anatomia)return;
  const r=cv.getBoundingClientRect();if(!r.width||!r.height)return;
  const w=Math.round(r.width),h=Math.round(r.height);renderer.setSize(w*2,h*2,false);rt.setSize(w,h);
  const aspecto=w/h,meia=(modo==='comparar'?28:Math.max(anatomia.altura*.67,7.1)*aspecto)/zoom;
  camera.left=-meia;camera.right=meia;camera.top=meia/aspecto;camera.bottom=-meia/aspecto;
  const alvo=new THREE.Vector3(0,anatomia.altura*.43,0),inc=THREE.MathUtils.degToRad(pitch);
  camera.position.copy(alvo).add(new THREE.Vector3(0,Math.sin(inc)*65,Math.cos(inc)*65));camera.lookAt(alvo);camera.updateProjectionMatrix();
  for(const m of modelos)m.rotation.y=giro;
  pixel.uniforms.uTam.value.set(w,h);pixel.uniforms.uTexel.value=2*meia/w;direita.value.set(Math.cos(giro),-Math.sin(giro));
  renderer.setRenderTarget(rt);renderer.render(cena,camera);renderer.setRenderTarget(null);
  Object.assign(pixel.uniforms.tCor,{value:rt.texture});pixel.uniforms.tProf.value=rt.depthTexture;pixel.uniforms.uNear.value=camera.near;pixel.uniforms.uFar.value=camera.far;
  renderer.render(tela,camTela);
}
function individual(v){modo='individual';nivel=THREE.MathUtils.clamp(v,0,1);montar();}
function parar(){simulacao=null;if(raf)cancelAnimationFrame(raf);raf=null;}
function animar(destino){
  parar();if(modo==='comparar')nivel=destino===1?0:1;
  modo='individual';zoom=1;simulacao={inicio:performance.now(),origem:nivel,destino};
  const quadro=agora=>{
    if(!simulacao||encerrado)return;
    const t=Math.min(1,(agora-simulacao.inicio)/10000);
    if(agora-ultimaTroca>85||t===1){nivel=THREE.MathUtils.lerp(simulacao.origem,simulacao.destino,t);montar();ultimaTroca=agora;}
    if(t<1)raf=requestAnimationFrame(quadro);else parar();
  };raf=requestAnimationFrame(quadro);
}
try{
  renderer=new THREE.WebGLRenderer({canvas:cv,antialias:false,preserveDrawingBuffer:true});renderer.setPixelRatio(1);renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.BasicShadowMap;
  cena=new THREE.Scene();cena.background=new THREE.Color(RAMPAS.salvia[2]);camera=new THREE.OrthographicCamera(-1,1,1,-1,.1,350);
  const rampa=new THREE.DataTexture(new Uint8Array([105,105,105,255,178,178,178,255,255,255,255,255,255]),3,1,THREE.RGBAFormat);rampa.minFilter=rampa.magFilter=THREE.NearestFilter;rampa.needsUpdate=true;
  material=new THREE.MeshToonMaterial({vertexColors:true,side:THREE.DoubleSide,gradientMap:rampa});
  pixel=criarMaterialPixel();aplicarEstiloCopa(material,direita,pixel.uniforms.uTexel);
  cena.add(new THREE.HemisphereLight(0xe4ecd2,0x6c7a52,1.25));const sol=new THREE.DirectionalLight(0xfff1d6,2.2);sol.position.set(-25,45,30);sol.castShadow=true;sol.shadow.mapSize.set(4096,4096);Object.assign(sol.shadow.camera,{left:-45,right:45,top:22,bottom:-22,near:.1,far:150});sol.shadow.bias=-.0003;sol.shadow.normalBias=.035;cena.add(sol,sol.target);
  solo=new THREE.Mesh(new THREE.PlaneGeometry(300,300),new THREE.MeshToonMaterial({color:RAMPAS.salvia[3],gradientMap:rampa}));solo.rotation.x=-Math.PI/2;solo.position.y=-.03;solo.receiveShadow=true;cena.add(solo);
  rt=new THREE.WebGLRenderTarget(1,1,{type:THREE.HalfFloatType,minFilter:THREE.NearestFilter,magFilter:THREE.NearestFilter,depthTexture:new THREE.DepthTexture(1,1)});tela=new THREE.Scene();tela.add(new THREE.Mesh(new THREE.PlaneGeometry(2,2),pixel));camTela=new THREE.OrthographicCamera(-1,1,1,-1,0,1);
  for(const e of ESTADOS_SENESCENCIA){const b=document.createElement('button');b.textContent=e.nome;b.dataset.valor=e.valor;b.setAttribute('aria-pressed','false');b.addEventListener('click',()=>{parar();zoom=1;individual(e.valor);});$('estagios').append(b);}
  $('comparar').onclick=()=>{parar();modo='comparar';zoom=1;montar();};$('especie').onchange=()=>{parar();carregarEspecie();};
  $('nivel').oninput=e=>{parar();individual(Number(e.target.value)/100);};$('secar').onclick=()=>animar(1);$('retomar').onclick=()=>animar(0);$('pausar').onclick=parar;
  $('esq').onclick=()=>{giro-=Math.PI/4;desenhar();};$('dir').onclick=()=>{giro+=Math.PI/4;desenhar();};$('mais').onclick=()=>{zoom=Math.min(2.2,zoom*1.2);desenhar();};$('menos').onclick=()=>{zoom=Math.max(.65,zoom/1.2);desenhar();};
  let inicio=null;cv.onpointerdown=e=>{cv.setPointerCapture(e.pointerId);inicio=[e.clientX,e.clientY];};cv.onpointermove=e=>{if(!inicio)return;giro+=(e.clientX-inicio[0])*.009;pitch=THREE.MathUtils.clamp(pitch+(e.clientY-inicio[1])*.2,15,70);inicio=[e.clientX,e.clientY];desenhar();};cv.onpointerup=cv.onpointercancel=()=>inicio=null;
  cv.addEventListener('wheel',e=>{e.preventDefault();zoom=THREE.MathUtils.clamp(zoom*(e.deltaY<0?1.1:1/1.1),.65,2.2);desenhar();},{passive:false});
  const ro=new ResizeObserver(desenhar);ro.observe(cv);carregarEspecie();
  addEventListener('pagehide',()=>{encerrado=true;parar();ro.disconnect();limpar();descartarSenescencia(anatomia);for(const g of variacao.estagios)g.dispose();cena.traverse(o=>{o.geometry?.dispose();o.material?.dispose();o.shadow?.dispose();});rampa.dispose();rt.dispose();pixel.dispose();renderer.dispose();});
}catch(e){$('estado').textContent='Não foi possível preparar a amostra: '+e.message;console.error(e);}
