/** Solo estilizado: massas amplas e transições contínuas entre terra e grama. */
import * as THREE from "three";
import { RAMPAS } from "./paleta.js";
import { criarTexturaTerra } from './texturaTerra.js';
import { PIXEL_TERRA } from './acabamentoTerreno.js';

export function criarMaterialRelevo(toon, opcoes = {}) {
  const mat = toon({ vertexColors: true });
  mat.defaultAttributeValues = { ...(mat.defaultAttributeValues ?? {}), aTrilha: [1], aNormalSombra: [0,1,0], aSoloParede: [0], aSoloUV: [0,0], aAgua: [99] };
  const direita = opcoes.direita ?? { value: new THREE.Vector2(1, 0) };
  const texel = opcoes.texel ?? { value: 0.1 };
  mat.name = "paredao-natural-pixel";
  mat.userData.relevo = { versao: 6, referencia: "mundo", desenho: "terra-pixel-aprovada", altura: "local" };
  const texturaTerra=criarTexturaTerra();
  mat.userData.texturaTerra=texturaTerra;
  mat.addEventListener('dispose',()=>texturaTerra.dispose());
  mat.userData.gramado = { direita, texel };
  mat.onBeforeCompile = (sh) => {
    const cores = {
      uTerraFunda: RAMPAS.terra[1], uTerraSombra: RAMPAS.terra[2],
      uTerra: RAMPAS.terra[3], uTerraClara: RAMPAS.terra[4],
      uRocha: RAMPAS.pedra[2], uRochaLuz: RAMPAS.pedra[3],
      uMusgo: RAMPAS.mata[2], uGramaBorda: RAMPAS.salvia[3],
      uTufo: RAMPAS.mata[2], uTufoLuz: RAMPAS.mata[5],
      uTerraGasta: RAMPAS.terra[5], uCapimTrilha: RAMPAS.salvia[3],
    };
    for (const [nome, cor] of Object.entries(cores)) sh.uniforms[nome] = { value: new THREE.Color(cor) };
    sh.uniforms.uDireita = direita;
    sh.uniforms.uTexel = texel;
    sh.uniforms.uTerraPixel={value:texturaTerra};
    const sombrasSolo = THREE.ShaderChunk.shadowmap_vertex.replace(/vec3 shadowWorldNormal = [^;]+;/, 'vec3 shadowWorldNormal = normalize(mat3(modelMatrix) * aNormalSombra);') + `
      #if defined(USE_SHADOWMAP) && NUM_DIR_LIGHT_SHADOWS > 0
      #pragma unroll_loop_start
      for ( int i = 0; i < NUM_DIR_LIGHT_SHADOWS; i ++ ) {
        // Compensa a auto-oclusão em faces quase verticais. O ajuste
        // pertence só às paredes; a projeção no chão plano não muda.
        vDirectionalShadowCoord[ i ].z -= 0.004 * aSoloParede * vDirectionalShadowCoord[ i ].w;
      }
      #pragma unroll_loop_end
      #endif
    `;
    sh.vertexShader = `attribute vec3 aNormalSombra;
      attribute float aSoloParede;
      attribute vec2 aSoloUV;
      attribute float aRocha;
      attribute float aGrama;
      attribute float aTrilha;
      attribute vec2 aLimitesSolo;
      attribute float aAgua;
      varying float vAgua;
      varying float vRocha;
      varying float vGrama;
      varying float vTrilha;
      varying vec2 vLimitesSolo;
      varying vec3 vSoloMundo;
      varying vec3 vSoloNormal;
      varying vec2 vSoloUV;
      varying float vSoloParede;
    ` + sh.vertexShader.replace('#include <shadowmap_vertex>', sombrasSolo).replace("#include <worldpos_vertex>", `#include <worldpos_vertex>
      vAgua = aAgua; vRocha = aRocha; vGrama = aGrama; vTrilha = aTrilha; vLimitesSolo = aLimitesSolo;
      vSoloMundo = (modelMatrix * vec4(transformed, 1.0)).xyz;
      vSoloNormal = normalize(mat3(modelMatrix) * objectNormal);
      vSoloUV=aSoloUV; vSoloParede=aSoloParede;
    `);
    sh.fragmentShader = `uniform vec3 uTerraFunda; uniform vec3 uTerraSombra;
      uniform vec3 uTerra; uniform vec3 uTerraClara;
      uniform vec3 uRocha; uniform vec3 uRochaLuz;
      uniform vec3 uMusgo; uniform vec3 uGramaBorda;
      uniform vec2 uDireita; uniform float uTexel;
      uniform vec3 uTufo; uniform vec3 uTufoLuz;
      uniform vec3 uTerraGasta; uniform vec3 uCapimTrilha;
      varying float vRocha; varying float vGrama;
      varying float vTrilha; varying float vAgua;
      varying vec2 vLimitesSolo;
      varying vec3 vSoloMundo; varying vec3 vSoloNormal;
      varying vec2 vSoloUV; varying float vSoloParede;
      uniform sampler2D uTerraPixel;
      float soloHash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float ruidoSolo(vec2 p) {
        vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
        return mix(mix(soloHash(i), soloHash(i + vec2(1.0, 0.0)), f.x), mix(soloHash(i + vec2(0.0, 1.0)), soloHash(i + vec2(1.0, 1.0)), f.x), f.y);
      }
    ` + sh.fragmentShader.replace("#include <color_fragment>", `#include <color_fragment>
      vec3 normalSolo = normalize(vSoloNormal);
      if ((vSoloParede>.5 || normalSolo.y < 0.72) && vRocha > 0.15) {
        vec3 p = vSoloMundo;
        float profundidade = max(0.0, vLimitesSolo.x - vSoloMundo.y);
        float acimaPe = max(0.0, vSoloMundo.y - vLimitesSolo.y);
        // O mesmo azulejo autoral da amostra aprovada, seguindo o contorno.
        // Cada texel mantém a escala relativa ao barranco real de 4,5 m.
        float topo=vSoloParede>.5?vSoloUV.y:vLimitesSolo.x;
        float d=max(0.,topo-p.y);
        vec2 coord=vSoloParede>.5?vec2(vSoloUV.x,d):vec2(p.x+p.z,profundidade);
        vec2 pixel=floor(coord/${PIXEL_TERRA.toFixed(3)});
        vec3 terra=texture2D(uTerraPixel,(pixel+.5)/vec2(96.,64.)).rgb;
        if(d>3.51 && mod(pixel.x+floor(pixel.y/3.),5.)<2.)terra=min(terra,uTerra);
        float recorte=.145+floor(ruidoSolo(vec2(floor(pixel.x/3.)*.7,2.))*3.)*.0725;
        if(d<recorte+.11)terra=uTerraFunda;
        if(d<recorte)terra=uGramaBorda;
        if(d<.055)terra=uGramaBorda;
        diffuseColor.rgb = terra;
      } else if (vTrilha < 0.74 && normalSolo.y > 0.72) {
        // Grão preso ao chão: as manchas, pedras e recortes não giram com a câmera.
        vec2 p = floor(vSoloMundo.xz / 0.09) * 0.09;
        float macro = ruidoSolo(p / 3.6);
        float recorte = (ruidoSolo(p / 1.1) - 0.5) * 0.085 + (macro - 0.5) * 0.08;
        float borda = vTrilha - 0.54 - recorte;
        vec3 terra = uTerraClara;
        if (macro < 0.27 && ruidoSolo(p / 1.2) > 0.48) terra = mix(uTerra, uTerraClara, 0.55);
        // Áreas de solo compactado e abrasão larga, em vez de ruído por toda a faixa.
        float gasto = ruidoSolo(p / vec2(1.7, 2.5));
        if (gasto > 0.78 && vTrilha < 0.42) terra = mix(uTerraClara, uTerraGasta, 0.7);
        float grao = soloHash(floor(p / 0.28));
        if (grao > 0.95) terra = uTerra;
        // Pedrinhas angulosas raras, pequenas e espaçadas, com uma face iluminada.
        vec2 cel = floor(p / 1.25), f = fract(p / 1.25);
        float h = soloHash(cel);
        vec2 centro = vec2(0.25 + fract(h * 7.7) * 0.5, 0.25 + fract(h * 17.1) * 0.5);
        vec2 pedra = f - centro;
        if (h > 0.88 && abs(pedra.x) + abs(pedra.y) * 1.4 < 0.09 && borda < -0.02)
          terra = pedra.y > 0.0 ? uTerraGasta : uTerra;
        // Ombro terroso entrecortado por capim, sem contorno paralelo de asfalto.
        if (borda > 0.0) {
          terra = uTerra;
          float invasao = ruidoSolo(p / 0.48);
          if (borda > 0.075 || invasao > 0.46 - borda * 2.5)
            terra = macro > 0.5 ? uCapimTrilha : uGramaBorda;
        }
        diffuseColor.rgb = terra;
      } else if (vGrama > 0.5) {
        // Preserva o gramado desenhado do Claude: manchas e tufinhos em V.
        vec2 p = vSoloMundo.xz;
        float n = ruidoSolo(p / 9.0) * 0.7 + ruidoSolo(p / 3.1) * 0.3;
        vec3 grama = diffuseColor.rgb * (n < 0.36 ? 0.8 : (n > 0.66 ? 1.16 : 1.0));
        if (uTexel < 0.2) {
          vec2 cel = floor(p / 1.1); float h = soloHash(cel);
          if (h > 0.55) {
            vec2 o = (cel + 0.25 + vec2(fract(h * 7.3), fract(h * 13.1)) * 0.5) * 1.1;
            vec2 cima = vec2(uDireita.y, -uDireita.x), d = p - o;
            float ax = dot(d, uDireita), ay = dot(d, cima) / 0.62;
            float esp = max(0.05, uTexel * 0.75);
            float folhas = step(0.0, ay) * step(ay, 0.38) * max(step(abs(ax + ay * 0.5), esp), max(step(abs(ax - ay * 0.5), esp), step(abs(ax), esp) * step(ay, 0.48)));
            if (folhas > 0.5) grama = h > 0.9 ? uTufoLuz : uTufo;
          }
        }
        diffuseColor.rgb = grama;
      }
      // Margem natural do lago e do riacho, desenhada por pixel a partir da distância à linha d'água: a borda é
      // entortada por dois ruídos (enseadas e pontas), então a largura varia e não há degraus da grade.
      // Paredes do terreno rentes à água (foz do riacho, barrancos do lago) também recebem a margem.
      if ((vAgua < 3.6 && vSoloParede < .5 && normalSolo.y > .2 || vAgua < 1.4) && vTrilha > .7) {
        vec2 p = floor(vSoloMundo.xz / 0.09) * 0.09;
        float a = ruidoSolo(p / 1.3), b = ruidoSolo(p / 4.6 + 7.3), c = ruidoSolo(p / .5 + 2.1);
        float d = vAgua + (a - .5) * .45 + (b - .5) * .8;
        vec3 base = diffuseColor.rgb, cor = base;
        // Grama úmida: mais escura e mais verde perto da água, em manchas.
        if (d < 1.15 + b * 1.5) cor = mix(base, uMusgo, .5) * .9;
        // Faixa de beira: lama escura na maior parte; areia clara com pedrinhas nas enseadas.
        float praia = .26 + b * .62;
        if (d < praia) {
          bool areia = b > .58;
          cor = areia ? uTerraClara : uTerraSombra;
          if (!areia && c > .64) cor = uTerra;
          if (areia && c < .22) cor = uTerra;
          vec2 cel = floor(p / .5), fp = fract(p / .5); float h = soloHash(cel + 3.1);
          vec2 q = fp - vec2(.28 + fract(h * 7.3) * .44, .28 + fract(h * 13.7) * .44);
          if (h > (areia ? .55 : .8) && abs(q.x) + abs(q.y) * 1.35 < .17) cor = q.y > 0. ? uRochaLuz : uRocha;
          // Capim invadindo a beira, em tufos irregulares.
          if (d > praia - .14 && c > .5) cor = mix(base, uMusgo, .55) * .86;
        }
        // Linha molhada rente à água.
        if (d < .06) cor = uTerraFunda;
        diffuseColor.rgb = cor;
      }
    `).replace("#include <opaque_fragment>", `#include <opaque_fragment>
      // O alvo intermediário usa alfa como força de pontilhado. Continua
      // sendo uma parede opaca: só o pós-processamento lê esta marca.
      if ((vSoloParede>.5 || normalize(vSoloNormal).y < 0.72) && vRocha > 0.15) gl_FragColor.a = 0.18;
    `);
  };
  mat.customProgramCacheKey = () => "solo-terra-pixel-aprovada-6-margens";
  return mat;
}
