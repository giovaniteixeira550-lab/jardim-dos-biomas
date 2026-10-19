import * as THREE from 'three';
import {RAMPAS} from './paleta.js';

/** Lago desenhado em faixas de profundidade e ondulações largas, fixas no mundo. */
export function criarLago(mundo,toon) {
  const L=mundo.lago,n=L.contorno.length,aneis=40,pos=[L.cx,-.55,L.cy],prof=[],margem=[],indices=[];
  const amostra=(x,z)=>{
    let d=Infinity;for(let i=0;i<n;i++) {const a=L.contorno[i],b=L.contorno[(i+1)%n],dx=b.x-a.x,dz=b.y-a.y,t=THREE.MathUtils.clamp(((x-a.x)*dx+(z-a.y)*dz)/(dx*dx+dz*dz),0,1);d=Math.min(d,Math.hypot(x-a.x-dx*t,z-a.y-dz*t));}
    margem.push(d);prof.push(THREE.MathUtils.clamp((-.55-mundo.altitude(x,z))/1.85,0,1));
  };
  amostra(L.cx,L.cy);
  for(let r=1;r<=aneis;r++)for(const p of L.contorno) {const x=L.cx+(p.x-L.cx)*r/aneis,z=L.cy+(p.y-L.cy)*r/aneis;pos.push(x,-.55,z);amostra(x,z);}
  for(let i=0;i<n;i++)indices.push(0,1+(i+1)%n,1+i);
  for(let r=1;r<aneis;r++)for(let i=0;i<n;i++){const a=1+(r-1)*n+i,b=1+(r-1)*n+(i+1)%n,c=a+n,d=b+n;indices.push(a,b,c,b,d,c);}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setAttribute('aFundo',new THREE.Float32BufferAttribute(prof,1));g.setAttribute('aMargem',new THREE.Float32BufferAttribute(margem,1));g.setIndex(indices);g.computeVertexNormals();g.computeBoundingSphere();
  const mat=toon({color:RAMPAS.agua[3],side:THREE.DoubleSide,polygonOffset:true,polygonOffsetFactor:0,polygonOffsetUnits:-2});
  mat.name='lago-profundidade-ondas';mat.userData.profundidade=true;
  mat.onBeforeCompile=shader=>{
    Object.assign(shader.uniforms,{uTime:{value:0},uBrilho:{value:1},uFundo:{value:new THREE.Color(RAMPAS.agua[2])},uMedio:{value:new THREE.Color(RAMPAS.agua[3]).lerp(new THREE.Color(RAMPAS.agua[2]),.35)},uRaso:{value:new THREE.Color(RAMPAS.agua[3])},uReflexo:{value:new THREE.Color(RAMPAS.agua[4])},uEspuma:{value:new THREE.Color(RAMPAS.agua[5])}});mat.userData.shader=shader;
    shader.vertexShader='attribute float aFundo; attribute float aMargem; varying float vFundo; varying float vMargem; varying vec2 vAgua;\n'+shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvFundo=aFundo;vMargem=aMargem;vAgua=position.xz;');
    shader.fragmentShader='uniform float uTime;uniform float uBrilho;uniform vec3 uFundo,uMedio,uRaso,uReflexo,uEspuma;varying float vFundo;varying float vMargem;varying vec2 vAgua;\nfloat hashAgua(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}\n'+shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
      vec2 p=floor(vAgua/.18)*.18;
      float mancha=sin(p.x*.19+p.y*.13)+sin(p.y*.23-p.x*.09)*.45;
      float fundo=vFundo+mancha*.13;
      vec3 cor=mix(uRaso,uMedio,step(.28,fundo));cor=mix(cor,uFundo,step(.83,fundo));
      // Reflexos fragmentados: poucas pinceladas compridas, sem chuvisco branco.
      vec2 cel=floor(p/vec2(5.8,4.2));float sorte=hashAgua(cel);
      vec2 q=fract(p/vec2(5.8,4.2));
      float fase=fract(uTime*.055+sorte),pulso=step(.12,fase)*(1.-step(.64,fase));
      float arco=abs(q.y-(.28+sorte*.35+sin(uTime*.18+sorte*6.28)*.035)-pow(q.x-.5,2.)*.24);
      float reflexo=(1.-step(.028,arco))*step(.22,q.x)*(1.-step(.73+sorte*.15,q.x))*step(.63,sorte)*pulso;
      float manchaLuz=step(.94,sin(p.x*.085+p.y*.057+uTime*.07)*sin(p.y*.061-p.x*.04));
      cor=mix(cor,uReflexo,reflexo*.45*uBrilho+manchaLuz*.13);
      // Faixa rasa acompanha a costa real; pequenas ondas se abrem só em alguns trechos.
      float costa=(1.-step(.34,vMargem))*step(.1,vMargem)*step(.05,sin(p.x*.38+p.y*.25));
      float onda=abs(fract(vMargem*.36-uTime*.055)-.48);
      float margem=(1.-step(.018,onda))*(1.-step(2.3,vMargem))*step(.58,hashAgua(floor(p/2.4)));
      cor=mix(cor,uReflexo,costa*.38+margem*.3);
      // Raso junto à margem VISÍVEL (pela profundidade real, não pelo contorno, que fica sob a terra):
      // faixa mais clara de largura irregular e uma linha de espuma quebrada que cintila devagar.
      float rn=sin(p.x*.93+p.y*.61)*.5+sin(p.y*1.37-p.x*.42)*.5;
      cor=mix(cor,uReflexo,(1.-step(.085+rn*.035,vFundo))*.55);
      float rasoMedio=(1.-step(.17+rn*.05,vFundo))*step(.085+rn*.035,vFundo);
      cor=mix(cor,uRaso,rasoMedio*.6);
      float pedaco=hashAgua(floor(p/vec2(.72,.54)));
      float cintila=step(.25,fract(uTime*.12+pedaco));
      float espuma=(1.-step(.026+rn*.01,vFundo))*step(.28,pedaco)*cintila;
      cor=mix(cor,uEspuma,espuma*.85);
      diffuseColor.rgb=cor;
    `).replace('#include <emissivemap_fragment>','#include <emissivemap_fragment>\ntotalEmissiveRadiance+=diffuseColor.rgb*.075*uBrilho;');
  };
  mat.customProgramCacheKey=()=> 'lago-faixas-ondas-2-raso';
  const mesh=new THREE.Mesh(g,mat);mesh.name='lago-superficie';mesh.receiveShadow=true;mesh.userData={tipo:'lago',profundidade:true,aneis,contorno:n};return mesh;
}
