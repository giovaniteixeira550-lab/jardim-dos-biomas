/** Estilo de folhagem compartilhado: anatomia 3D da v0.16 do Claude. */
export function estiloCopa(sh, direita, texel) {
  sh.uniforms.uTexelC = texel;
  sh.vertexShader = sh.vertexShader
    .replace(
      "#include <common>",
      `#include <common>
      attribute float banda; attribute vec3 esfera; attribute float raioCopa; attribute float semCopa; attribute float brilho;
      varying float vBrilho; varying float vBanda; varying vec3 vEsf; varying float vRaioC; varying float vSemC; varying vec3 vLeste; varying vec3 vNorte;`,
    )
    .replace(
      "#include <begin_vertex>",
      `#include <begin_vertex>
      vBanda = banda; vEsf = esfera; vRaioC = raioCopa; vSemC = semCopa; vBrilho = brilho;
      // Eixos tangentes da esfera (leste/norte), levados para o espaço da câmera como a normal.
      vec3 dE = normalize(esfera + vec3(1e-5));
      vec3 le = normalize(cross(vec3(0.0, 1.0, 0.0), dE) + vec3(1e-4, 0.0, 0.0));
      vec3 no = cross(dE, le);
      mat3 mi = mat3(1.0);
      #ifdef USE_INSTANCING
        mi = mat3(instanceMatrix);
      #endif
      vLeste = normalize(normalMatrix * (mi * le));
      vNorte = normalize(normalMatrix * (mi * no));`,
    );
  sh.fragmentShader = sh.fragmentShader
    .replace(
      "#include <common>",
      `#include <common>
      varying float vBanda; varying vec3 vEsf; varying float vRaioC; varying float vSemC; varying vec3 vLeste; varying vec3 vNorte; varying float vBrilho;
      uniform float uTexelC;`,
    )
    .replace(
      "#include <color_fragment>",
      `#include <color_fragment>
      if (vBanda > -2.0) {
        if (vBanda > 0.5) diffuseColor.rgb *= vec3(1.12, 1.18, 1.04); // topo iluminado
        else if (vBanda < -0.38) diffuseColor.rgb *= 0.64;            // base na sombra
      }`,
    )
    .replace(
      "#include <normal_fragment_maps>",
      `#include <normal_fragment_maps>
      if (vBanda > -2.0 && length(vEsf) > 0.5 && uTexelC < 0.16) {
        // Aglomerados = células orgânicas (Voronoi 3D) sobre a superfície do volume:
        // sem linhas nem polos; cada célula é um domo iluminado pelo sol.
        vec3 d = normalize(vEsf);
        float S = clamp(vRaioC * 0.42, 0.5, 1.05);          // tamanho do aglomerado (m)
        vec3 q = d * vRaioC / S + vSemC * 17.0;
        vec3 ip = floor(q), fp = fract(q);
        float d1 = 8.0, d2 = 8.0;
        vec3 m1 = vec3(0.0);
        for (int x = -1; x <= 1; x++)
          for (int y = -1; y <= 1; y++)
            for (int z = -1; z <= 1; z++) {
              vec3 g = vec3(float(x), float(y), float(z));
              vec3 h = ip + g;
              vec3 o = fract(sin(vec3(dot(h, vec3(127.1, 311.7, 74.7)), dot(h, vec3(269.5, 183.3, 246.1)), dot(h, vec3(113.5, 271.9, 124.6)))) * 43758.5453);
              vec3 rr = g + o - fp;
              float dd = dot(rr, rr);
              if (dd < d1) { d2 = d1; d1 = dd; m1 = rr; } else if (dd < d2) { d2 = dd; }
            }
        float borda = sqrt(d2) - sqrt(d1);
        // Do centro do aglomerado para este ponto, na tangente da esfera.
        vec3 off = -m1;
        off -= d * dot(off, d);
        vec3 le = normalize(cross(vec3(0.0, 1.0, 0.0), d) + vec3(1e-4, 0.0, 0.0));
        vec3 no = cross(d, le);
        float fy = dot(off, no);
        if (borda < 0.18 && fy < -0.05) {
          diffuseColor.rgb *= 0.62; // sombra só EMBAIXO de cada tufo (a borda de cima fica clara)
        } else {
          // Domo: a normal inclina do centro para fora → lado do sol claro, lado oposto escuro.
          normal = normalize(normal * 0.55 + (vLeste * dot(off, le) + vNorte * fy) * 2.0);
        }
      }`,
    )
    .replace(
      "#include <opaque_fragment>",
      `// Luz própria (atributo brilho, 0–1; vale 0 em geometrias sem ele): a peça soma a sua cor à luz recebida
      // e continua acesa na sombra e à noite. Hoje só a Araucária dos Cometas (luas e copa) usa.
      outgoingLight = mix(outgoingLight, diffuseColor.rgb, clamp(vBrilho, 0.0, 1.0));
      #include <opaque_fragment>`,
    );
}

export function aplicarEstiloCopa(material, direita, texel) {
  material.onBeforeCompile = (shader) => estiloCopa(shader, direita, texel);
  material.customProgramCacheKey = () => "copa-celulas-compartilhada-v16";
  return material;
}
