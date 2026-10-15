/**
 * Copas DESENHADAS (estilo das referências de pixel art): faixas nítidas pela
 * altura dentro de cada volume de folhagem (atributo "banda" do gerador):
 * topo com brilho, base na sombra. Fixas no mundo (não dependem da câmera),
 * somadas ao toon do sol. Fatores fortes para sobreviver à paleta.
 */
export function estiloCopa(sh, direita, texel) {
  // Escamas de folhas: aglomerados em fileiras desencontradas, medidos na horizontal
  // da tela (direita da câmera) e na vertical do mundo — ficam parados ao arrastar o mapa.
  sh.uniforms.uDireitaC = direita;
  sh.uniforms.uTexelC = texel;
  sh.vertexShader = sh.vertexShader
    .replace("#include <common>", "#include <common>\nattribute float banda;\nvarying float vBanda;\nvarying vec3 vMundoC;")
    .replace(
      "#include <begin_vertex>",
      `#include <begin_vertex>
      vBanda = banda;
      vec4 mc = vec4(transformed, 1.0);
      #ifdef USE_INSTANCING
        mc = instanceMatrix * mc;
      #endif
      vMundoC = (modelMatrix * mc).xyz;`,
    );
  sh.fragmentShader = sh.fragmentShader
    .replace("#include <common>", "#include <common>\nvarying float vBanda;\nvarying vec3 vMundoC;\nuniform vec2 uDireitaC;\nuniform float uTexelC;")
    .replace(
      "#include <color_fragment>",
      `#include <color_fragment>
      if (vBanda > -2.0) {
        if (vBanda > 0.5) diffuseColor.rgb *= vec3(1.12, 1.18, 1.04); // topo iluminado (mais verde-amarelo que branco)
        else if (vBanda < -0.38) diffuseColor.rgb *= 0.64; // base na sombra
        // Escama: cada aglomerado é um meio-círculo com arco escuro embaixo e brilho em cima.
        if (uTexelC < 0.13) {
          vec2 cima = vec2(uDireitaC.y, -uDireitaC.x);
          float u = dot(vMundoC.xz, uDireitaC) / 1.0;
          float v = (vMundoC.y + dot(vMundoC.xz, cima) * 0.62) / 0.7;
          float linha = floor(v);
          u += mod(linha, 2.0) * 0.5; // fileiras desencontradas, como telhas
          float hc = fract(sin(dot(vec2(floor(u), linha), vec2(12.9898, 78.233))) * 43758.5453); // sorteio por aglomerado
          vec2 f = vec2(fract(u) - 0.5, fract(v));
          float d = length(vec2(f.x, (f.y - 0.62) * 1.25));
          if (hc > 0.18 && d > 0.46 && d < 0.62 && f.y < 0.62) diffuseColor.rgb *= 0.7;          // sombra sob o aglomerado
          else if (hc > 0.55 && d < 0.2 && f.y > 0.66 && vBanda > -0.38) diffuseColor.rgb *= 1.16; // brilho no alto do aglomerado
        }
      }`,
    );
}

/** Aplica a mesma pintura de folhas do bosque, compartilhando os uniformes. */
export function aplicarEstiloCopa(material, direita, texel) {
  material.onBeforeCompile = (shader) => estiloCopa(shader, direita, texel);
  material.customProgramCacheKey = () => "copa-escamas-compartilhada-v15";
  return material;
}
