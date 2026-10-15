/** Vitrine das mesmas geometrias usadas no bosque e no viveiro. */
import * as THREE from "three";
import { construirVariacao } from "./arvoreProc.js";
import { ESPECIES } from "./especies.js";
import { RAMPAS } from "./paleta.js";
import { criarMaterialPixel } from "./pixel.js";

const $ = (id) => document.getElementById(id);
const descricoes = {
  folhosa: ["Duas folhas separadas anunciam o nascimento.", "Caule flexível, folhas grandes e primeiros ramos; ainda sem copa fechada.", "Tronco bifurcado, galhos aparentes e ilhas de folhagem. A árvore ganha sua estrutura.", "Copa consolidada, tronco sustentado por raízes aparentes e assinatura da espécie. Flores ou frutos completam as espécies que os possuem."],
  conifera: ["Agulhas abertas ao redor de um eixo, sem cone adulto.", "Primeiros braços espaçados e folhas nas pontas.", "Andares de ramos expostos, tufos nas extremidades e ponta em formação.", "Arquitetura característica: camadas, coluna ou candelabro, apoiada em raízes aparentes."],
  palmeira: ["Três folhas saem junto ao chão.", "Leque erguido, folhas largas e base curta: uma roseta, sem tronco alto.", "Tronco começa a se destacar, com anéis e folhas em arco.", "Tronco longo e curvo, frondes pendentes, raízes e cachos de cocos."],
  cogumelo: ["Botão fechado junto ao solo, ainda sem chapéu aberto.", "O pé aparece, mas o chapéu continua arredondado e fechado.", "Chapéu aberto, primeiras pintas e lamelas visíveis.", "Chapéu amplo, anel no pé e pequenos cogumelos ao redor: a conquista forma uma colônia."],
  moita: ["Duas folhas sobre um caule curto.", "Um eixo flexível com folhas isoladas.", "Ramos se abrem em várias direções, com espaços entre os tufos.", "Moita consolidada e ramificada; flores ou bagas nas variedades que as possuem."],
  garrafa: ["Duas folhas anunciam o nascimento.","Caule flexível, primeiros ramos e folhas separadas.","O tronco começa a engrossar; pequenos braços sustentam tufos afastados.","Tronco largo em garrafa, braços no alto e raízes aparentes: uma presença monumental."],
  bananeira: ["Folhas pequenas saem junto ao chão.","Duas folhas largas e erguidas envolvem uma base curta.","Pseudocaule emergente e folhas abertas em leque.","Folhas arqueadas, base robusta, cacho de bananas e coração roxo."],
  bambu: ["Brotos fechados surgem do chão.","Um colmo com nós e primeiras folhas.","Três colmos se separam, com braços de folhas.","Touceira consolidada de colmos e folhagem abundante."],
  cristal: ["Uma única ponta de cristal emerge da pedra.","Três pontas formam um núcleo próximo à base.","Braços de pedra elevam e separam os cristais.","Coroa radial de cristais, sustentada por tronco e raízes de pedra."],
};
let renderer, cena, camera, rt, material, pixel, tela, ro;
let geometrias = [], modelos = [], giro = 0, encerrado = false;

function liberarModelos() {
  for (const m of modelos) cena.remove(m);
  for (const g of geometrias) g.dispose();
  modelos = [];
  geometrias = [];
}

function desenhar() {
  if (encerrado) return;
  const c = $("comparacao").getBoundingClientRect();
  renderer.setSize(c.width, c.height, false);
  const w = Math.max(1, Math.floor(c.width / 2)), h = Math.max(1, Math.floor(c.height / 2));
  rt.setSize(w, h);
  const aspect = c.width / c.height;
  camera.left = -16;
  camera.right = 16;
  camera.top = 16 / aspect;
  camera.bottom = -16 / aspect;
  camera.updateProjectionMatrix();
  pixel.uniforms.uTam.value.set(w, h);
  pixel.uniforms.uTexel.value = 32 / w;
  renderer.setRenderTarget(rt);
  renderer.render(cena, camera);
  renderer.setRenderTarget(null);
  pixel.uniforms.tCor.value = rt.texture;
  pixel.uniforms.tProf.value = rt.depthTexture;
  pixel.uniforms.uNear.value = camera.near;
  pixel.uniforms.uFar.value = camera.far;
  renderer.render(tela, new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1));
}

function apresentar() {
  try {
    liberarModelos();
    const def = ESPECIES[$("especie").value];
    const v = construirVariacao(def, 1234);
    geometrias = v.estagios;
    const normalizar = $("normalizar").checked;
    const textos = descricoes[def.forma] ?? descricoes[["conica", "colunar", "araucaria"].includes(def.forma) ? "conifera" : "folhosa"];
    geometrias.forEach((geo, e) => {
      const m = new THREE.Mesh(geo, material);
      // Ajusta a altura ao mesmo alvo, limitando também a largura de folhas
      // abertas: uma roseta não deve invadir a coluna do estágio vizinho.
      const tamanho = geo.boundingBox.getSize(new THREE.Vector3());
      const escalaComparacao = Math.min(5 / v.alturas[e], 6.8 / Math.hypot(tamanho.x, tamanho.z));
      m.scale.setScalar(normalizar ? escalaComparacao : 5 / v.alturaAdulta);
      m.position.x = -12 + e * 8;
      m.rotation.y = giro;
      m.castShadow = m.receiveShadow = true;
      cena.add(m);
      modelos.push(m);
      $("etapa-" + e).textContent = textos[e];
    });
    $("estado").textContent = `${def.nome} · ${normalizar ? "escala de comparação: observe folhas, ramos, copa e base" : "tamanhos do jogo: do broto à adulta"}`;
    desenhar();
  } catch (e) {
    $("estado").textContent = `Não foi possível mostrar a evolução: ${e.message}`;
    console.error(e);
  }
}

try {
  renderer = new THREE.WebGLRenderer({ canvas: $("comparacao"), antialias: false });
  renderer.setPixelRatio(1);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.BasicShadowMap;
  cena = new THREE.Scene();
  cena.background = new THREE.Color(RAMPAS.salvia[2]);
  const rampa = new THREE.DataTexture(new Uint8Array([105,105,105,255,178,178,178,255,255,255,255,255]),3,1,THREE.RGBAFormat);
  rampa.minFilter = rampa.magFilter = THREE.NearestFilter;
  rampa.needsUpdate = true;
  material = new THREE.MeshToonMaterial({ vertexColors: true, side: THREE.DoubleSide, gradientMap: rampa });
  cena.add(new THREE.HemisphereLight(0xe4ecd2, 0x6c7a52, 1.25));
  const sol = new THREE.DirectionalLight(0xfff1d6, 2.2);
  sol.position.set(-12,25,18);
  sol.castShadow = true;
  sol.shadow.mapSize.set(1024,1024);
  sol.shadow.bias = -0.0006;
  sol.shadow.normalBias = 0.04;
  Object.assign(sol.shadow.camera,{left:-18,right:18,top:18,bottom:-18});
  cena.add(sol);
  const chao = new THREE.Mesh(new THREE.PlaneGeometry(40,24), new THREE.MeshToonMaterial({ color:RAMPAS.salvia[3], gradientMap:rampa }));
  chao.rotation.x = -Math.PI/2;
  chao.position.y = -0.04;
  chao.receiveShadow = true;
  cena.add(chao);
  camera = new THREE.OrthographicCamera(-12,12,6,-6,0.1,200);
  camera.position.set(0,18,25);
  camera.lookAt(0,2.4,0);
  rt = new THREE.WebGLRenderTarget(1,1,{type:THREE.HalfFloatType,minFilter:THREE.NearestFilter,magFilter:THREE.NearestFilter,depthTexture:new THREE.DepthTexture(1,1)});
  pixel = criarMaterialPixel();
  tela = new THREE.Scene();
  tela.add(new THREE.Mesh(new THREE.PlaneGeometry(2,2),pixel));
  for (const [id,def] of Object.entries(ESPECIES)) {
    const o = document.createElement("option");
    o.value=id; o.textContent=def.nome; $("especie").append(o);
  }
  // Links do catálogo abrem diretamente a espécie solicitada.
  const solicitada=new URLSearchParams(window.location.search).get("especie");
  if(solicitada&&Object.hasOwn(ESPECIES,solicitada))$("especie").value=solicitada;
  $("especie").addEventListener("change",apresentar);
  $("normalizar").addEventListener("change",apresentar);
  $("girar").addEventListener("click",()=>{giro+=Math.PI/4; for(const m of modelos)m.rotation.y=giro; desenhar();});
  ro = new ResizeObserver(desenhar);
  ro.observe($("comparacao"));
  apresentar();
  window.addEventListener("pagehide",()=>{
    encerrado=true; ro.disconnect(); liberarModelos();
    cena.traverse(o=>{o.geometry?.dispose();o.material?.dispose();o.shadow?.dispose();});
    rampa.dispose(); rt.dispose(); pixel.dispose(); tela.children[0].geometry.dispose(); renderer.dispose();
  });
  window.addEventListener("pageshow",e=>{if(e.persisted)window.location.reload();});
} catch (e) { $("estado").textContent=`Não foi possível abrir a comparação: ${e.message}`; console.error(e); }

$("verificar").addEventListener("click", async () => {
  $("verificar").disabled=true;
  const resultados=[];
  try {
    for (const [id,def] of Object.entries(ESPECIES)) {
      const a=construirVariacao(def,1234), b=construirVariacao(def,1234);
      try {
        const assinaturas=[];
        a.estagios.forEach((g,e)=>{
          const p=g.attributes.position.array, q=b.estagios[e].attributes.position.array;
          if(p.length!==q.length || !p.every((v,i)=>Number.isFinite(v)&&v===q[i]))throw new Error(`${id}: geometria inválida ou semente instável`);
          const h=g.boundingBox.max.y;
          if(!(h>0) || (e>0 && h<=a.alturas[e-1]))throw new Error(`${id}: altura não progride`);
          // Distribuição espacial normalizada: independe de escala e contagem de vértices.
          const bins=new Array(16).fill(0);
          for(let i=0;i<p.length;i+=3){
            const y=Math.min(3,Math.max(0,Math.floor(p[i+1]/h*4)));
            const raio=Math.min(3,Math.floor(Math.hypot(p[i],p[i+2])/h*8));
            bins[y*4+raio]++;
          }
          assinaturas.push(bins.map(v=>v/(p.length/3)));
        });
        for(let e=1;e<4;e++) {
          const diferenca=assinaturas[e].reduce((s,v,i)=>s+Math.abs(v-assinaturas[e-1][i]),0);
          if(diferenca<0.08)throw new Error(`${id}: etapas ${e-1}/${e} continuam semelhantes com tamanho removido`);
        }
        resultados.push(`PASSOU — ${def.nome}: quatro formas, altura progressiva, mesma semente.`);
      } finally { for(const g of [...a.estagios,...b.estagios])g.dispose(); }
      $("resultado").textContent=resultados.join("\n");
      await new Promise(resolve=>setTimeout(resolve,0));
    }
    $("resultado").textContent+=`\nTodas as ${resultados.length} espécies passaram. A qualidade visual é conferida separadamente na vitrine.`;
  } catch(e) { $("resultado").textContent+=`\nFALHOU — ${e.message}`; console.error(e); }
  finally { $("verificar").disabled=false; }
});
