/** Barrancos naturais: terra em massas contínuas, sem fiadas de alvenaria. */
import * as THREE from "three";
import { RAMPAS } from "./paleta.js";

export function criarMaterialRelevo(toon, opcoes = {}) {
  const mat = toon({ vertexColors: true });
  const direita = opcoes.direita ?? { value: new THREE.Vector2(1, 0) };
  const texel = opcoes.texel ?? { value: 0.1 };
  mat.name = "terra-estratificada";
  mat.userData.relevo = { versao: 2, referencia: "mundo", desenho: "terra-estratificada", altura: "local" };
  mat.userData.gramado = { direita, texel };
  mat.onBeforeCompile = (sh) => {
    const cores = {
      uTerraFunda: RAMPAS.terra[1], uTerraSombra: RAMPAS.terra[2],
      uTerra: RAMPAS.terra[3], uTerraClara: RAMPAS.terra[4],
      uRocha: RAMPAS.pedra[2], uRochaLuz: RAMPAS.pedra[3],
      uMusgo: RAMPAS.mata[2], uGramaBorda: RAMPAS.salvia[3],
      uTufo: RAMPAS.mata[2], uTufoLuz: RAMPAS.mata[5],
    };
    for (const [nome, cor] of Object.entries(cores)) sh.uniforms[nome] = { value: new THREE.Color(cor) };
    sh.uniforms.uDireita = direita;
    sh.uniforms.uTexel = texel;
    sh.vertexShader = `attribute float aRocha;
      attribute float aGrama;
      attribute vec2 aLimitesSolo;
      varying float vRocha;
      varying float vGrama;
      varying vec2 vLimitesSolo;
      varying vec3 vSoloMundo;
      varying vec3 vSoloNormal;
    ` + sh.vertexShader.replace("#include <worldpos_vertex>", `#include <worldpos_vertex>
      vRocha = aRocha; vGrama = aGrama; vLimitesSolo = aLimitesSolo;
      vSoloMundo = (modelMatrix * vec4(transformed, 1.0)).xyz;
      vSoloNormal = normalize(mat3(modelMatrix) * objectNormal);
    `);
    sh.fragmentShader = `uniform vec3 uTerraFunda; uniform vec3 uTerraSombra;
      uniform vec3 uTerra; uniform vec3 uTerraClara;
      uniform vec3 uRocha; uniform vec3 uRochaLuz;
      uniform vec3 uMusgo; uniform vec3 uGramaBorda;
      uniform vec2 uDireita; uniform float uTexel;
      uniform vec3 uTufo; uniform vec3 uTufoLuz;
      varying float vRocha; varying float vGrama;
      varying vec2 vLimitesSolo;
      varying vec3 vSoloMundo; varying vec3 vSoloNormal;
      float soloHash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float ruidoSolo(vec2 p) {
        vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
        return mix(mix(soloHash(i), soloHash(i + vec2(1.0, 0.0)), f.x), mix(soloHash(i + vec2(0.0, 1.0)), soloHash(i + vec2(1.0, 1.0)), f.x), f.y);
      }
      // Ruído volumétrico: nenhuma costura entre as faces de um barranco curvo.
      float veioSolo(vec3 p) {
        float h = floor(p.y), f = fract(p.y); f = f * f * (3.0 - 2.0 * f);
        return mix(ruidoSolo(p.xz + vec2(h * 17.1, h * 7.3)), ruidoSolo(p.xz + vec2((h + 1.0) * 17.1, (h + 1.0) * 7.3)), f);
      }
    ` + sh.fragmentShader.replace("#include <color_fragment>", `#include <color_fragment>
      vec3 normalSolo = normalize(vSoloNormal);
      if (normalSolo.y < 0.72 && vRocha > 0.15) {
        vec3 p = floor(vSoloMundo / 0.13) * 0.13;
        float profundidade = max(0.0, vLimitesSolo.x - vSoloMundo.y);
        float acimaPe = max(0.0, vSoloMundo.y - vLimitesSolo.y);
        float massa = veioSolo(p * vec3(0.25, 0.48, 0.25));
        float dobra = ruidoSolo(p.xz * 0.13) * 1.5 + ruidoSolo(p.xz * 0.47) * 0.28;
        float veio = sin(p.y * 2.6 + dobra * 2.1);
        vec3 terra = massa < 0.32 ? uTerraSombra : uTerra;
        // Estratos incompletos: larguras e continuidade diferentes, sem uma grade.
        if (veio > 0.61 && massa > 0.39) terra = mix(uTerra, uTerraClara, 0.55);
        else if (veio < -0.82 && massa < 0.56) terra = uTerraSombra;
        // Afloramentos isolados: a maior parte da face continua sendo terra.
        float rocha = veioSolo(p * vec3(0.42, 0.7, 0.42) + vec3(21.0, 8.0, 3.0));
        if (rocha > 0.73 && profundidade > 0.75) {
          terra = rocha > 0.83 ? uRochaLuz : mix(uRocha, uTerraSombra, 0.28);
          if (veio < -0.5) terra = uTerraSombra;
        }
        // Crosta calculada pelo TOPO LOCAL, inclusive nos recortes de água/estrada.
        float crosta = 0.34 + ruidoSolo(p.xz * 1.2) * 0.3;
        if (profundidade < crosta) terra = uTerraFunda;
        if (profundidade < 0.12 + ruidoSolo(p.xz * 1.9) * 0.17) terra = massa > 0.4 ? uGramaBorda : uMusgo;
        // Pequenos filetes de raízes sob a borda, nunca colunas de altura inteira.
        float raiz = ruidoSolo(vec2(p.x + p.z * 0.7, 2.0) * 2.8);
        if (raiz > 0.75 && profundidade > 0.24 && profundidade < 1.05 && rocha < 0.72) terra = uTerraFunda;
        if (acimaPe < 0.24 && profundidade > 1.5) terra = mix(terra, uTerraFunda, 0.55);
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
    `);
  };
  mat.customProgramCacheKey = () => "solo-estratificado-local-2";
  return mat;
}
