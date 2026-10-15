/** Paredões desenhados: massas angulares grandes, fendas seletivas e poucos tons. */
import * as THREE from "three";
import { RAMPAS } from "./paleta.js";

export function criarMaterialRelevo(toon, opcoes = {}) {
  const mat = toon({ vertexColors: true });
  const direita = opcoes.direita ?? { value: new THREE.Vector2(1, 0) };
  const texel = opcoes.texel ?? { value: 0.1 };
  mat.name = "paredao-facetas-pixel";
  mat.userData.relevo = { versao: 3, referencia: "mundo", desenho: "facetas-pixel", altura: "local" };
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
      // Células volumétricas grandes e deslocadas: as quebras passam pelas
      // quinas sem depender do eixo da parede ou da orientação da câmera.
      void facetaSolo(vec3 p, out vec3 deslocamento, out float borda, out float tinta) {
        vec3 q = p / vec3(2.8, 2.65, 2.8);
        vec3 ip = floor(q), fp = fract(q), melhor = vec3(0.0), chave = vec3(0.0);
        float d1 = 20.0, d2 = 20.0;
        for (int x = -1; x <= 1; x++) for (int y = -1; y <= 1; y++) for (int z = -1; z <= 1; z++) {
          vec3 g = vec3(float(x), float(y), float(z)), h = ip + g;
          vec3 sorte = fract(sin(vec3(dot(h, vec3(127.1, 311.7, 74.7)), dot(h, vec3(269.5, 183.3, 246.1)), dot(h, vec3(113.5, 271.9, 124.6)))) * 43758.5453);
          vec3 r = g + 0.15 + sorte * 0.7 - fp;
          float d = dot(r, r);
          if (d < d1) { d2 = d1; d1 = d; melhor = r; chave = h; }
          else if (d < d2) d2 = d;
        }
        deslocamento = -melhor;
        borda = sqrt(d2) - sqrt(d1);
        tinta = soloHash(chave.xy + chave.z * vec2(13.1, 37.7));
      }
    ` + sh.fragmentShader.replace("#include <color_fragment>", `#include <color_fragment>
      vec3 normalSolo = normalize(vSoloNormal);
      if (normalSolo.y < 0.72 && vRocha > 0.15) {
        vec3 p = floor(vSoloMundo / 0.15) * 0.15;
        float profundidade = max(0.0, vLimitesSolo.x - vSoloMundo.y);
        float acimaPe = max(0.0, vSoloMundo.y - vLimitesSolo.y);
        vec3 face; float encaixe, tinta;
        facetaSolo(p, face, encaixe, tinta);
        // Cada massa tem face principal, quebra iluminada e recuo escuro.
        // Os limites diagonais desenham volume; nada forma uma fiada horizontal.
        float quina = face.y * 0.9 + face.x * 0.58 - face.z * 0.44;
        vec3 terra = tinta > 0.9 ? uTerraClara : uTerra;
        if (quina > 0.3) terra = uTerraClara;
        else if (quina < -0.22) terra = uTerraSombra;
        if (tinta < 0.075 && profundidade > 0.8) terra = quina > 0.2 ? uRochaLuz : uRocha;
        // Fendas curtas e desencontradas, sem contornar todas as células.
        if (encaixe < 0.05 && (face.y < -0.05 || tinta > 0.7)) terra = uTerraSombra;
        if (encaixe < 0.022 && face.y < -0.17 && tinta > 0.55) terra = uTerraFunda;
        else if (encaixe < 0.08 && face.y > 0.15 && tinta > 0.5) terra = uTerraClara;
        // Topo local: faixa verde recortada e sombra estreita sob a grama.
        float recorte = soloHash(floor(p.xz / 1.3));
        float capa = 0.16 + floor(recorte * 3.0) * 0.065;
        if (profundidade < capa + 0.14) terra = uTerraFunda;
        if (profundidade < capa) terra = recorte > 0.62 ? uMusgo : uGramaBorda;
        if (profundidade < 0.6 && tinta > 0.91 && face.y > 0.0) terra = uMusgo;
        if (acimaPe < 0.18 && profundidade > 1.5) terra = uTerraFunda;
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
    `).replace("#include <opaque_fragment>", `#include <opaque_fragment>
      // O alvo intermediário usa alfa como força de pontilhado. Continua
      // sendo uma parede opaca: só o pós-processamento lê esta marca.
      if (normalize(vSoloNormal).y < 0.72 && vRocha > 0.15) gl_FragColor.a = 0.18;
    `);
  };
  mat.customProgramCacheKey = () => "solo-facetas-graficas-3-limpo";
  return mat;
}
