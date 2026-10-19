import * as THREE from 'three';
import {RAMPAS} from './paleta.js';

const MAX_FOLHAS = 24;

/**
 * Lago em pixel art: quatro faixas de profundidade com bordas orgânicas, ondinhas
 * curtas alinhadas à tela (1 px de espessura), espuma que lambe a margem, anéis
 * lentos em volta das folhas e brilhos raros de sol. Tudo fixo no mundo.
 * `opcoes.direita`/`opcoes.texel` são os uniforms da câmera (direção da tela e
 * tamanho do pixel), para que os traços tenham sempre 1 px.
 */
export function criarLago(mundo,toon,opcoes={}) {
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
  const cor=i=>new THREE.Color(RAMPAS.agua[i]);
  const uFolhas={value:Array.from({length:MAX_FOLHAS},()=>new THREE.Vector3(0,0,-1))};
  const uniforms={
    uTime:{value:0},uBrilho:{value:1},
    uDireitaAgua:opcoes.direita??{value:new THREE.Vector2(1,0)},uTexelAgua:opcoes.texel??{value:.12},
    uTons:{value:[cor(1),cor(2),cor(3),cor(4),cor(5)]},uFolhas,
  };
  mat.onBeforeCompile=shader=>{
    Object.assign(shader.uniforms,uniforms);mat.userData.shader=shader;
    shader.vertexShader='attribute float aFundo; attribute float aMargem; varying float vFundo; varying float vMargem; varying vec2 vAgua;\n'+shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvFundo=aFundo;vMargem=aMargem;vAgua=position.xz;');
    shader.fragmentShader=`uniform float uTime,uBrilho,uTexelAgua;uniform vec2 uDireitaAgua;uniform vec3 uTons[5];uniform vec3 uFolhas[${MAX_FOLHAS}];
varying float vFundo;varying float vMargem;varying vec2 vAgua;
float hashAgua(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float ruidoAgua(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
  return mix(mix(hashAgua(i),hashAgua(i+vec2(1,0)),f.x),mix(hashAgua(i+vec2(0,1)),hashAgua(i+vec2(1,1)),f.x),f.y);}
`+shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
      vec2 p=vAgua;
      // Eixos da tela projetados no plano da água: traços horizontais na tela e 1 px de espessura.
      vec2 dirX=normalize(uDireitaAgua),dirY=vec2(dirX.y,-dirX.x);
      float tx=uTexelAgua,ty=uTexelAgua/.62;
      float sx=dot(p,dirX),sy=dot(p,dirY);
      // 1. Faixas de profundidade com bordas orgânicas (ruído lento, que respira devagar).
      float org=ruidoAgua(p*.11+vec2(uTime*.012,0.))*.65+ruidoAgua(p*.37-vec2(0.,uTime*.02))*.35;
      // Massas pictoricas submersas: duas escalas que deslizam quase imperceptivelmente.
      // A forma permanece quantizada pelas cinco cores da rampa, sem gradiente artificial.
      float sombra=ruidoAgua(p*.075+vec2(uTime*.004,-uTime*.003));
      float manchas=ruidoAgua(p*.21+vec2(-uTime*.009,uTime*.006));
      float fundo=vFundo+(org-.5)*.105+(sombra-.5)*.115+(manchas-.5)*.075;
      int faixa=fundo<.07?3:(fundo<.3?2:(fundo<.7?1:0));
      vec3 cor=uTons[faixa];
      // Reflexos fragmentados das copas: manchas maiores, silenciosas, sem linhas paralelas.
      // Nao simulam o ceu como espelho; sugerem a vegetacao refletida em agua calma.
      float copa=ruidoAgua(p*.105+vec2(.72,-.38));
      float reflexo=ruidoAgua(p*.32+vec2(uTime*.006,-uTime*.004));
      float espelho=step(.66,copa)*step(.48,reflexo)*smoothstep(.12,.42,vFundo);
      if(espelho>.5 && faixa<3)cor=uTons[max(faixa-1,0)];
      // 2. Ondinhas: traços curtos de 1 px (com uma cristinha menor acima), espalhados em
      //    linhas desencontradas; nascem, esticam e somem, derivando devagar com o vento.
      float linha=floor((sy+sin(sx*.12+uTime*.045)*ty*1.3)/(ty*12.));
      float deriva=uTime*.085*(hashAgua(vec2(linha,3.1))-.35);
      float ux=sx+deriva+hashAgua(vec2(linha,9.7))*4.;
      float cel=floor(ux/2.6);float sorte=hashAgua(vec2(cel,linha));
      float fase=fract(uTime*.07+sorte*5.3);
      float vida=sin(fase*3.1416);
      float meio=(cel+.5)*2.6+(hashAgua(vec2(linha,cel+.7))-.5)*.8;
      float comp=(.35+sorte*.6)*vida;
      float dy=sy-(linha+.5)*ty*8.;
      float tra=step(abs(ux-meio),comp)*step(abs(dy),ty*.5);
      float crista=step(abs(ux-meio-comp*.15),comp*.45)*step(abs(dy-ty),ty*.5);
      // Zonas de brisa e de calmaria: as ondinhas se agrupam, sem cobrir o lago por igual.
      float brisa=ruidoAgua(p*.06+vec2(uTime*.01,-uTime*.008));
      float onda=max(tra,crista)*step(1.12-brisa*.36,sorte)*step(.08,fundo);
      if(onda>.5)cor=uTons[min(faixa+1,4)];
      // 3. Anéis lentos em volta das vitórias-régias (arcos de 1 px que se afastam e somem).
      for(int i=0;i<${MAX_FOLHAS};i++){
        vec3 f=uFolhas[i];if(f.z<0.)continue;
        vec2 d=p-f.xy;float dist=length(vec2(dot(d,dirX),dot(d,dirY)))-f.z;
        if(dist<0.||dist>1.1)continue;
        float h=hashAgua(f.xy);
        float ciclo=uTime*.11+h*7.,raio=fract(ciclo)*1.1;
        // Só parte das folhas tem anel em cada ciclo, e o anel sai em arcos quebrados.
        float ativo=step(.3,hashAgua(f.xy+floor(ciclo)));
        float arco=step(.55,ruidoAgua(normalize(d)*2.6+h*9.+floor(ciclo)))*ativo;
        if(abs(dist-raio)<ty*.55&&arco>.5&&raio<1.1*(.55+h*.45))cor=uTons[min(faixa+1,4)];
      }
      // 4. Margem: linha clara que lambe a beira (avança e recua ao longo da costa) e espuma quebrada.
      float costa=ruidoAgua(p*.9)*.6+ruidoAgua(p*2.7)*.4;
      float lambida=.045+.022*sin(uTime*.9+dot(p,vec2(.21,.17))*2.+costa*3.);
      if(vMargem<.22&&vFundo<lambida&&vFundo>lambida-.012-tx*.05&&costa>.46)cor=uTons[3];
      float espuma=(1.-step(.018+costa*.01,vFundo))*step(.72,ruidoAgua(p*1.6+vec2(uTime*.035,0.)));
      if(espuma>.5)cor=uTons[4];
      // Lago em repouso: sem partículas luminosas ou piscadas aleatórias.
      // O movimento vem apenas das ondulações e dos reflexos cromáticos lentos.
      diffuseColor.rgb=cor;
    `).replace('#include <emissivemap_fragment>','#include <emissivemap_fragment>\ntotalEmissiveRadiance+=diffuseColor.rgb*.075*uBrilho;')
      // Alfa baixo: o pós-processamento quase não aplica o pontilhado Bayer na água,
      // e as faixas ficam chapadas como num tile desenhado à mão.
      .replace('#include <opaque_fragment>','#include <opaque_fragment>\ngl_FragColor.a=.05;');
  };
  mat.customProgramCacheKey=()=> 'lago-pictorico-5-sem-pisca';
  const mesh=new THREE.Mesh(g,mat);mesh.name='lago-superficie';mesh.receiveShadow=true;
  mesh.userData={tipo:'lago',profundidade:true,aneis,contorno:n,
    /** Recebe [{x,z,r}] das folhas flutuantes para desenhar os anéis em volta delas. */
    definirFolhas(lista){uFolhas.value.forEach((v,i)=>{const f=lista[i];if(f)v.set(f.x,f.z,f.r);else v.set(0,0,-1);});},
  };
  return mesh;
}
