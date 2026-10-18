import * as THREE from 'three';
import {criarRecursosPoste, criarPosteDoce} from './postesDoces.js';
import {RAMPAS} from './paleta.js';
import {criarMaterialPixel} from './pixel.js';

try {
  const canvas=document.querySelector('canvas'), renderer=new THREE.WebGLRenderer({canvas,antialias:false});
  renderer.setPixelRatio(1);renderer.outputColorSpace=THREE.SRGBColorSpace;
  renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.BasicShadowMap;
  const scene=new THREE.Scene(), camera=new THREE.OrthographicCamera(-10,10,8,-8,.1,100);
  camera.position.set(12,11,20);camera.lookAt(-2,2.5,0);
  const grad=new THREE.DataTexture(new Uint8Array([105,105,105,255,178,178,178,255,255,255,255,255]),3,1);
  grad.minFilter=grad.magFilter=THREE.NearestFilter;grad.needsUpdate=true;
  const toon=p=>new THREE.MeshToonMaterial({gradientMap:grad,...p});
  const recursos=criarRecursosPoste(toon), poste=criarPosteDoce(recursos);
  scene.add(poste);
  const piso=new THREE.Mesh(new THREE.BoxGeometry(25,.25,22),toon({color:RAMPAS.salvia[1]}));piso.position.y=-.14;piso.receiveShadow=true;scene.add(piso);
  const trilha=new THREE.Mesh(new THREE.BoxGeometry(4,.05,22),toon({color:RAMPAS.terra[4]}));trilha.position.set(2.9,.015,0);trilha.receiveShadow=true;scene.add(trilha);
  const sol=new THREE.DirectionalLight(0xfff1d6,2);sol.position.set(-4,12,6);sol.castShadow=true;
  Object.assign(sol.shadow.camera,{left:-14,right:14,top:14,bottom:-14});sol.shadow.mapSize.set(1024,1024);sol.shadow.bias=-.001;
  const ceu=new THREE.HemisphereLight(0xe4ecd2,0x6c7a52,1.2);scene.add(sol,ceu);
  const pixel=criarMaterialPixel(), cena2=new THREE.Scene(), cam2=new THREE.OrthographicCamera(-1,1,1,-1,0,1);
  cena2.add(new THREE.Mesh(new THREE.PlaneGeometry(2,2),pixel));
  let rt, giro=0;
  function resize(){
    const w=innerWidth,h=innerHeight;renderer.setSize(w,h,false);const rh=Math.floor(h/2),rw=Math.floor(w/2);
    rt?.dispose();rt=new THREE.WebGLRenderTarget(rw,rh,{type:THREE.HalfFloatType,minFilter:THREE.NearestFilter,magFilter:THREE.NearestFilter,depthTexture:new THREE.DepthTexture(rw,rh)});
    camera.left=-6*w/h;camera.right=6*w/h;camera.top=6;camera.bottom=-6;camera.updateProjectionMatrix();
    pixel.uniforms.uTam.value.set(rw,rh);pixel.uniforms.uTexel.value=12/rh;
  }
  function hora(h){
    const noite=h==='noite', tarde=h==='entardecer',forca=noite?1:tarde?.65:0;
    sol.intensity=noite?.45:tarde?1.5:2.2;sol.color.set(noite?0x8fa8ff:tarde?0xffa060:0xfff1d6);
    ceu.intensity=noite?.4:tarde?.8:1.25;ceu.color.set(noite?0x3a4d80:tarde?0xffc89c:0xe4ecd2);
    scene.background=new THREE.Color(noite?RAMPAS.noite[0]:tarde?RAMPAS.terra[1]:RAMPAS.salvia[1]);
    poste.userData.luz.intensity=180*forca;recursos.vidro.emissiveIntensity=2*forca;
    document.querySelectorAll('[data-hora]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.hora===h)));
  }
  document.querySelectorAll('[data-hora]').forEach(b=>b.onclick=()=>hora(b.dataset.hora));
  document.querySelector('#girar').onclick=()=>{giro+=Math.PI/4;poste.rotation.y=giro;};
  addEventListener('resize',resize);resize();hora('noite');
  renderer.setAnimationLoop(()=>{
    renderer.setRenderTarget(rt);renderer.render(scene,camera);renderer.setRenderTarget(null);
    Object.assign(pixel.uniforms.tCor,{value:rt.texture});pixel.uniforms.tProf.value=rt.depthTexture;
    pixel.uniforms.uNear.value=camera.near;pixel.uniforms.uFar.value=camera.far;renderer.render(cena2,cam2);
  });
} catch(e){document.querySelector('#erro').hidden=false;document.querySelector('#erro').textContent=e.message;console.error(e);}

