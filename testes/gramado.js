import * as THREE from 'three';
import {criarMaterialPixel} from '../src/pixel.js';
import {RAMPAS,PALETA} from '../src/paleta.js';
import {criarMaterialRelevo} from '../src/solo.js';
const $=id=>document.getElementById(id),N=64;
const exigir=(c,t)=>{if(!c)throw Error(t);};
$('executar').onclick=()=>{
  const recursos=[],renderer=new THREE.WebGLRenderer({antialias:false});
  $('resultados').replaceChildren();$('estado').textContent='Conferindo os pixels…';
  try{
    renderer.setSize(N,N,false);renderer.toneMapping=THREE.NoToneMapping;
    const entrada=new THREE.WebGLRenderTarget(N,N,{type:THREE.HalfFloatType,minFilter:THREE.NearestFilter,magFilter:THREE.NearestFilter,depthTexture:new THREE.DepthTexture(N,N)});
    const saida=new THREE.WebGLRenderTarget(N,N,{depthBuffer:false});recursos.push(entrada,saida);
    const cor=new THREE.Color(RAMPAS.salvia[3]).lerp(new THREE.Color(RAMPAS.salvia[4]),.5);
    const origem=new THREE.ShaderMaterial({uniforms:{cor:{value:cor},marca:{value:1}},vertexShader:'void main(){gl_Position=vec4(position.xy,0.,1.);}',fragmentShader:'uniform vec3 cor;uniform float marca;void main(){gl_FragColor=vec4(cor,marca);}'});
    const geo=new THREE.PlaneGeometry(2,2),cena=new THREE.Scene(),tela=new THREE.Scene(),camera=new THREE.OrthographicCamera(-1,1,1,-1,0,1),pixel=criarMaterialPixel();recursos.push(origem,geo,pixel);
    cena.add(new THREE.Mesh(geo,origem));tela.add(new THREE.Mesh(geo,pixel));
    pixel.uniforms.uTam.value.set(N,N);pixel.uniforms.tCor.value=entrada.texture;pixel.uniforms.tProf.value=entrada.depthTexture;
    const cores=[];
    for(const [id,marca] of [['antes',1],['depois',.75]]){
      origem.uniforms.marca.value=marca;renderer.setRenderTarget(entrada);renderer.render(cena,camera);renderer.setRenderTarget(saida);renderer.render(tela,camera);
      const p=new Uint8Array(N*N*4);renderer.readRenderTargetPixels(saida,0,0,N,N,p);
      const imagem=new ImageData(new Uint8ClampedArray(p),N,N);$(id).getContext('2d').putImageData(imagem,0,0);
      const distintas=new Set();for(let i=0;i<p.length;i+=4){distintas.add(`${p[i]},${p[i+1]},${p[i+2]}`);exigir(p[i+3]===255,'Saída transparente');}
      cores.push(distintas);
    }
    exigir(cores[0].size>1,'A referência não reproduziu o Bayer');exigir(cores[1].size===1,'O gramado ainda apresenta quadriculado');
    const permitidas=new Set(PALETA.map(c=>[1,3,5].map(k=>parseInt(c.slice(k,k+2),16)).join(',')));
    for(const c of [...cores[0],...cores[1]])exigir(permitidas.has(c),'Cor fora da paleta');
    exigir(pixel.uniforms.uContorno.value===1&&pixel.uniforms.uQuant.value===1,'Quantização ou contorno desligados');
    // Confere também as marcas emitidas pelo material REAL do terreno, para
    // não testar somente uma entrada artificial do pós-processamento.
    const plano=new THREE.PlaneGeometry(2,2);plano.rotateX(-Math.PI/2);
    const qtd=plano.attributes.position.count;
    const campo=(nome,tam,valor)=>plano.setAttribute(nome,new THREE.Float32BufferAttribute(new Float32Array(qtd*tam).fill(valor),tam));
    campo('color',3,1);campo('aRocha',1,1);campo('aGrama',1,1);campo('aTrilha',1,1);campo('aLimitesSolo',2,0);campo('aAgua',1,99);campo('aSoloParede',1,0);campo('aSoloUV',2,0);plano.setAttribute('aNormalSombra',plano.attributes.normal.clone());
    const solo=criarMaterialRelevo(p=>new THREE.MeshToonMaterial(p)),real=new THREE.Scene(),cam=new THREE.OrthographicCamera(-1,1,1,-1,.1,20),alvo=new THREE.WebGLRenderTarget(16,16);
    cam.position.set(0,8,0);cam.up.set(0,0,-1);cam.lookAt(0,0,0);real.add(new THREE.Mesh(plano,solo),new THREE.AmbientLight(0xffffff,1));recursos.push(plano,solo,alvo);
    for(const [nome,trilha,parede,alpha] of [['gramado',1,0,191],['ombro de grama',.73,0,191],['trilha de terra',.1,0,255],['paredão',1,1,46]]){
      plano.attributes.aTrilha.array.fill(trilha);plano.attributes.aTrilha.needsUpdate=true;plano.attributes.aSoloParede.array.fill(parede);plano.attributes.aSoloParede.needsUpdate=true;
      renderer.setRenderTarget(alvo);renderer.clear();renderer.render(real,cam);
      const p=new Uint8Array(16*16*4);renderer.readRenderTargetPixels(alvo,0,0,16,16,p);
      exigir(Math.abs(p[(8*16+8)*4+3]-alpha)<=1,'Marca incorreta: '+nome);
    }
    $('resultados').innerHTML='<li>PASSOU — gramado sem grade Bayer; outros materiais mantêm o efeito.</li><li>PASSOU — saída opaca, somente cores da paleta, contorno e quantização ativos.</li><li>PASSOU — material real marca gramado e ombro da trilha.</li><li>PASSOU — material real preserva trilha de terra e paredão.</li>';
    $('estado').textContent='6 verificações passaram.';
  }catch(e){$('estado').textContent='FALHOU — '+e.message;console.error(e);}
  finally{renderer.setRenderTarget(null);for(const r of recursos)r.dispose();renderer.dispose();}
};
