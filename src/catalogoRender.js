/** Um único contexto gráfico gera as miniaturas reais de todas as espécies. */
import * as THREE from "three";
import { construirVariacao } from "./arvoreProc.js";
import { criarMaterialPixel } from "./pixel.js";
import { RAMPAS } from "./paleta.js";
import { aplicarEstiloCopa } from "./estiloCopa.js";

export function criarRenderizadorCatalogo() {
  const canvas=document.createElement("canvas");
  const renderer=new THREE.WebGLRenderer({canvas,antialias:false,preserveDrawingBuffer:true});
  renderer.setPixelRatio(1); renderer.setSize(320,240,false);
  renderer.toneMapping=THREE.ACESFilmicToneMapping;
  renderer.shadowMap.enabled=true; renderer.shadowMap.type=THREE.BasicShadowMap;
  const cena=new THREE.Scene(); cena.background=new THREE.Color(RAMPAS.salvia[2]);
  const camera=new THREE.OrthographicCamera(-1,1,1,-1,0.1,500);
  const rampa=new THREE.DataTexture(new Uint8Array([105,105,105,255,178,178,178,255,255,255,255,255]),3,1,THREE.RGBAFormat);
  rampa.minFilter=rampa.magFilter=THREE.NearestFilter; rampa.needsUpdate=true;
  const material=new THREE.MeshToonMaterial({vertexColors:true,side:THREE.DoubleSide,gradientMap:rampa});
  const soloMat=new THREE.MeshToonMaterial({color:RAMPAS.salvia[3],gradientMap:rampa});
  cena.add(new THREE.HemisphereLight(0xe4ecd2,0x6c7a52,1.25));
  const sol=new THREE.DirectionalLight(0xfff1d6,2.2); sol.castShadow=true;
  sol.shadow.mapSize.set(512,512); sol.shadow.bias=-0.0006;
  cena.add(sol,sol.target);
  const rt=new THREE.WebGLRenderTarget(160,120,{type:THREE.HalfFloatType,minFilter:THREE.NearestFilter,magFilter:THREE.NearestFilter,depthTexture:new THREE.DepthTexture(160,120)});
  const pixel=criarMaterialPixel(), tela=new THREE.Scene();
  const direitaCopa={value:new THREE.Vector2(1,0)}, eixoDireitaCopa=new THREE.Vector3();
  aplicarEstiloCopa(material,direitaCopa,pixel.uniforms.uTexel);
  const quad=new THREE.PlaneGeometry(2,2); tela.add(new THREE.Mesh(quad,pixel));
  const camTela=new THREE.OrthographicCamera(-1,1,1,-1,0,1);
  let encerrado=false;
  return {
    imagem(def,estagio) {
      if(encerrado)throw new Error("Renderizador do catálogo encerrado.");
      const v=construirVariacao(def,1234), geo=v.estagios[estagio];
      const centro=geo.boundingBox.getCenter(new THREE.Vector3());
      const raio=geo.boundingSphere.radius;
      const margem=Math.max(0.35,raio*1.18);
      const arvore=new THREE.Mesh(geo,material);
      arvore.position.copy(centro).multiplyScalar(-1); arvore.castShadow=arvore.receiveShadow=true;
      const soloGeo=new THREE.PlaneGeometry(margem*8,margem*8);
      const solo=new THREE.Mesh(soloGeo,soloMat); solo.rotation.x=-Math.PI/2;
      solo.position.y=geo.boundingBox.min.y-centro.y-0.02; solo.receiveShadow=true;
      cena.add(arvore,solo);
      try {
        camera.left=-margem*4/3; camera.right=margem*4/3;
        camera.top=margem; camera.bottom=-margem;
        camera.position.set(margem*2.3,margem*2.5,margem*3.1); camera.lookAt(0,0,0);
        camera.updateProjectionMatrix();
        eixoDireitaCopa.set(1,0,0).applyQuaternion(camera.quaternion);
        direitaCopa.value.set(eixoDireitaCopa.x,eixoDireitaCopa.z).normalize();
        pixel.uniforms.uTexel.value=margem*2/120;
        sol.position.set(-margem*3,margem*5,margem*3);
        const sc=sol.shadow.camera;
        sc.left=sc.bottom=-margem*2; sc.right=sc.top=margem*2;
        sc.near=0.1; sc.far=margem*12; sc.updateProjectionMatrix();
        sol.shadow.normalBias=Math.max(0.005,raio*0.004);
        renderer.setRenderTarget(rt); renderer.render(cena,camera); renderer.setRenderTarget(null);
        pixel.uniforms.uTam.value.set(160,120); pixel.uniforms.uTexel.value=margem*2/120;
        pixel.uniforms.uNear.value=camera.near; pixel.uniforms.uFar.value=camera.far;
        pixel.uniforms.tCor.value=rt.texture; pixel.uniforms.tProf.value=rt.depthTexture;
        renderer.render(tela,camTela);
        return canvas.toDataURL("image/png");
      } finally {
        cena.remove(arvore,solo); soloGeo.dispose();
        for(const g of v.estagios)g.dispose();
      }
    },
    dispose() {
      if(encerrado)return; encerrado=true;
      sol.shadow.dispose(); material.dispose(); soloMat.dispose(); rampa.dispose();
      rt.dispose(); pixel.dispose(); quad.dispose(); renderer.dispose();
    },
  };
}
