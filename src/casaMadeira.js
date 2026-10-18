/** Primeira cabana do jardim: madeira, telhas verdes e varanda voltada à ponte. */
import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {RAMPAS as R} from './paleta.js';

/** Telha cerâmica em arco, com espessura e bordas próprias. */
function telhaCurva(comprimento,largura,altura){
 const pontos=[],indices=[],n=6;
 for(const baixo of [false,true])for(const x of [-comprimento/2,comprimento/2])for(let i=0;i<=n;i++){
  const a=-Math.PI/2+i/n*Math.PI;
  pontos.push(x,Math.cos(a)*altura-(baixo?.065:0),Math.sin(a)*largura/2);
 }
 const faixa=n+1,camada=faixa*2;
 const quad=(a,b,c,d)=>indices.push(a,b,c,a,c,d);
 for(let i=0;i<n;i++){
  quad(i,i+1,faixa+i+1,faixa+i);
  quad(camada+i,camada+faixa+i,camada+faixa+i+1,camada+i+1);
  quad(i,camada+i,camada+i+1,i+1);
  quad(faixa+i,faixa+i+1,camada+faixa+i+1,camada+faixa+i);
 }
 quad(0,faixa,camada+faixa,camada);
 quad(n,camada+n,camada+faixa+n,faixa+n);
 const geo=new THREE.BufferGeometry();
 geo.setAttribute('position',new THREE.Float32BufferAttribute(pontos,3));
 geo.setAttribute('uv',new THREE.Float32BufferAttribute(new Float32Array(pontos.length/3*2),2));
 geo.setIndex(indices);geo.computeVertexNormals();
 return geo;
}

export function criarCasaMadeira(m,toon){
 const local=m.plano.locais.find(l=>l.id==='casa-madeira');
 const casa=new THREE.Group();casa.name='Casa de madeira — primeira versão';
 if(!local)return casa;
 const origem={x:local.x,y:local.y-(local.recuo??0)};
 const base=Math.max(...[-5.5,5.5].flatMap(x=>[-3.8,5.7].map(z=>m.altitude(origem.x+x,origem.y+z))));
 casa.position.set(origem.x,base,origem.y);
 const mats={
  madeira:toon({color:R.terra[3]}),clara:toon({color:R.terra[4]}),escura:toon({color:R.terra[1]}),
  telha:toon({color:R.mata[2]}),telhaLuz:toon({color:R.mata[3]}),pedra:toon({color:R.pedra[2]}),
  pedraLuz:toon({color:R.pedra[3]}),metal:toon({color:R.tinta[0]}),
  vidro:toon({color:R.agua[3],emissive:R.luz[0],emissiveIntensity:0}),
  lampada:toon({color:R.luz[0],emissive:R.outono[4],emissiveIntensity:.2}),
 };
 // As peças pequenas são unidas por material: tábuas e telhas não viram
 // centenas de chamadas de desenho nem novos mapas de sombra.
 const lotes=new Map(),matriz=new THREE.Matrix4(),rotacao=new THREE.Quaternion();
 const juntar=(geo,mat,x,y,z,rx=0,ry=0,rz=0)=>{
  rotacao.setFromEuler(new THREE.Euler(rx,ry,rz));
  matriz.compose(new THREE.Vector3(x,y,z),rotacao,new THREE.Vector3(1,1,1));
  geo.applyMatrix4(matriz);
  if(!lotes.has(mat))lotes.set(mat,[]);
  lotes.get(mat).push(geo);
 };
 const b=(x,y,z,sx,sy,sz,mat=mats.madeira,rx=0,ry=0,rz=0)=>juntar(new THREE.BoxGeometry(sx,sy,sz),mat,x,y,z,rx,ry,rz);
 const viga=(a,c,largura,profundidade,mat=mats.escura)=>{
  const inicio=new THREE.Vector3(...a),fim=new THREE.Vector3(...c),direcao=fim.clone().sub(inicio);
  const geo=new THREE.BoxGeometry(largura,direcao.length(),profundidade);
  const q=new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),direcao.normalize());
  geo.applyQuaternion(q);geo.translate(...inicio.add(fim).multiplyScalar(.5).toArray());
  if(!lotes.has(mat))lotes.set(mat,[]);lotes.get(mat).push(geo);
 };
 // Pedra sob o piso, com pés independentes até o chão verdadeiro.
 for(const x of [-4.8,0,4.8])for(const z of [-3.2,3.1,5.25]){
  const chao=m.altitude(origem.x+x,origem.y+z)-base,h=.63-chao;
  b(x,chao+h/2,z,.85,h,.8,mats.pedra);
  b(x,.50,z,.97,.18,.91,mats.pedraLuz);
 }
 b(0,.64,0,11,.25,7.8,mats.escura);
 // Varanda de tábuas, com escadinha direcionada à cabeceira da ponte.
 for(let i=0;i<24;i++)b(-5.3+i*.46,.79,4.76,.42,.18,2.15,i%4===0?mats.clara:mats.madeira);
 b(0,.63,5.73,11.2,.30,.27,mats.escura);
 for(let i=0;i<3;i++){
  const z=5.94+i*.43,h=.65-i*.21;
  b(-2,h/2,z,3.1,h,.46,mats.escura);
  b(-2,h+.035,z,3.2,.1,.44,mats.clara);
 }
 for(const [x,z] of [[-2.3,7.10],[-2.65,7.68]]){
  const h=m.altitude(origem.x+x,origem.y+z)-base;
  b(x,h+.045,z,1.55,.10,.61,mats.pedraLuz);
 }
 // Faixas horizontais contornam aberturas reais para porta e janelas.
 const parede=(eixo,fixo,comprimento,aberturas)=>{
  for(let i=0;i<11;i++){
   const y=.94+i*.345;
   let intervalos=[[-comprimento/2,comprimento/2]];
   for(const a of aberturas)if(y+.16>a.y0&&y-.16<a.y1){
    intervalos=intervalos.flatMap(([u,v])=>v<=a.a||u>=a.b?[[u,v]]:[[u,Math.max(u,a.a)],[Math.min(v,a.b),v]].filter(([u,v])=>v-u>.01));
   }
   for(const [u,v] of intervalos){
    const c=(u+v)/2,mat=i%4===0?mats.clara:mats.madeira;
    if(eixo==='x')b(c,y,fixo,v-u,.32,.22,mat);else b(fixo,y,c,.22,.32,v-u,mat);
   }
  }
 };
 parede('x',3.8,10.8,[{a:-3,b:-1,y0:.75,y1:3.85},{a:1.25,b:3.5,y0:1.75,y1:3.4}]);
 parede('x',-3.8,10.8,[]);
 parede('z',5.4,7.6,[{a:-1.25,b:1.25,y0:1.75,y1:3.4}]);
 parede('z',-5.4,7.6,[{a:-1.25,b:1.25,y0:1.75,y1:3.4}]);
 for(const x of [-5.38,5.38])for(const z of [-3.8,3.8])b(x,2.68,z,.34,4.1,.34,mats.escura);
 for(const z of [-3.8,3.8])b(0,4.65,z,11.1,.32,.35,mats.escura);
 // Empenas fechadas por tábuas que acompanham o triângulo do telhado.
 for(let i=0;i<8;i++){
  const y=4.88+i*.31,largura=(7.55-y)/.48*2;
  for(const z of [-3.81,3.81])b(0,y,z,largura,.29,.19,i%3===0?mats.clara:mats.madeira);
 }
 // Porta almofadada, ferragens e travessa em diagonal.
 for(let i=0;i<5;i++)b(-2.81+i*.40,2.27,3.88,.37,2.98,.15,i%2?mats.escura:mats.madeira);
 for(const x of [-3.09,-.91])b(x,2.35,4,.18,3.3,.23,mats.clara);
 b(-2,3.96,4,2.4,.22,.25,mats.escura);
 for(const y of [1.35,3.05])b(-2,y,4.02,1.85,.15,.12,mats.escura);
 viga([-2.83,1.45,4.03],[-1.17,2.96,4.03],.10,.10,mats.clara);
 b(-1.3,2.28,4.14,.12,.19,.13,mats.metal);
 const janela=(x,z,giro)=>{
  const colocar=(u,y,v,sx,sy,sz,mat)=>{
   const px=x+u*Math.cos(giro)+v*Math.sin(giro),pz=z-u*Math.sin(giro)+v*Math.cos(giro);
   b(px,y,pz,sx,sy,sz,mat,0,giro);
  };
  colocar(0,2.58,0,2.18,1.58,.12,mats.vidro);
  for(const u of [-1.17,1.17])colocar(u,2.58,.09,.18,1.92,.23,mats.escura);
  for(const y of [1.65,3.51])colocar(0,y,.12,2.55,.18,.32,mats.clara);
  colocar(0,2.58,.15,.10,1.7,.13,mats.clara);
  colocar(0,2.58,.15,2.25,.10,.13,mats.clara);
  colocar(0,1.55,.27,2.7,.18,.62,mats.escura);
  for(const u of [-1.61,1.61]){
   colocar(u,2.57,.02,.65,1.85,.16,mats.madeira);
   for(const y of [1.94,3.18])colocar(u,y,.13,.65,.12,.10,mats.escura);
  }
 };
 janela(2.4,3.96,0);janela(5.55,0,Math.PI/2);janela(-5.55,0,-Math.PI/2);
 // Pequeno óculo na empena da frente.
 juntar(new THREE.CylinderGeometry(.60,.60,.20,12),mats.escura,0,5.76,3.98,Math.PI/2);
 juntar(new THREE.CylinderGeometry(.42,.42,.22,12),mats.vidro,0,5.76,4.02,Math.PI/2);
 b(0,5.76,4.16,.10,.83,.10,mats.clara);b(0,5.76,4.16,.83,.10,.10,mats.clara);
 // Duas águas: canais curvos, fiadas sobrepostas e bordas que projetam sombra.
 const inclinacao=Math.atan(.48),meiaLargura=6.3;
 for(const lado of [-1,1]){
  const angulo=-lado*inclinacao;
  b(lado*3.15,6.04,0,meiaLargura/Math.cos(inclinacao),.20,9.5,mats.escura,0,0,angulo);
  for(let i=0;i<8;i++)for(let j=0;j<14;j++){
   const x=(i+.5)*meiaLargura/8,z=-4.50+j*.69;
   // A fiada inclina um pouco menos que a água: sua ponta fica acima da
   // fiada seguinte, criando um encaixe real, sem superfícies coincidentes.
   juntar(telhaCurva(1.10,.66,.22),mats.telha,lado*x,7.55-x*.48+.16,z,0,0,-lado*(inclinacao-.075));
  }
  for(const z of [-4.77,4.77])viga([0,7.68,z],[lado*6.4,4.60,z],.22,.26,mats.escura);
 }
 for(let j=0;j<13;j++)juntar(telhaCurva(.84,.58,.30),mats.telhaLuz,0,7.75,-4.65+j*.76,.04,Math.PI/2);
 for(const x of [-6.35,6.35])b(x,4.58,0,.25,.30,9.8,mats.escura);
 // Cobertura baixa da varanda e mãos-francesas de madeira.
 b(0,3.98,4.96,11.7,.20,2.75,mats.telha,Math.atan(.15));
 for(let i=0;i<16;i++)for(let j=0;j<3;j++){
  const z=3.95+j*.94;
  juntar(telhaCurva(1.12,.68,.18),mats.telha,-5.48+i*.73,4.05-(z-4.96)*.15,z,0,Math.PI/2,Math.atan(.15)-.06);
 }
 for(const x of [-5,5]){
  b(x,2.24,5.65,.30,2.95,.30,mats.escura);
  viga([x,2.85,5.65],[x+(x<0?1.0:-1.0),3.75,5.65],.20,.20,mats.clara);
 }
 b(0,3.76,5.73,10.4,.25,.30,mats.escura);
 // Guarda-corpos baixos deixam a entrada da escada desimpedida.
 for(const [a,c] of [[-5,-3.7],[-.3,5]]){
  b((a+c)/2,1.65,5.65,c-a,.17,.17,mats.clara);
  for(let x=a;x<=c;x+=.65)b(x,1.22,5.65,.11,.8,.11,mats.escura);
 }
 // Chaminé de pedra com fiadas e coroamento.
 b(3.7,5.95,-1.7,1.15,.8,1.13,mats.pedra);
 for(let i=0;i<6;i++)b(3.7,6.35+i*.36,-1.7,1.15,.33,1.13,i%2?mats.pedra:mats.pedraLuz);
 b(3.7,8.48,-1.7,1.45,.21,1.43,mats.pedra);
 b(3.7,8.61,-1.7,.82,.08,.80,mats.metal);
 // Lanterna na varanda, luz quente discreta ao anoitecer.
 b(-3.9,2.95,4.10,.40,.62,.38,mats.lampada);
 for(const y of [2.6,3.29])b(-3.9,y,4.10,.56,.12,.50,mats.metal);
 b(-3.9,3.5,3.99,.10,.40,.24,mats.metal);
 const luz=new THREE.PointLight(R.luz[0],0,15,2);luz.position.set(-3.9,2.9,4.6);casa.add(luz);
 for(const [mat,geometrias] of lotes){
  const geo=mergeGeometries(geometrias,false);
  for(const g of geometrias)g.dispose();
  const malha=new THREE.Mesh(geo,mat);malha.castShadow=malha.receiveShadow=true;casa.add(malha);
 }
 // Volutas facetadas: sobem, se expandem e se dissipam, somente à noite.
 const fumaca=new THREE.Group();fumaca.name='Fumaça noturna da chaminé';fumaca.visible=false;casa.add(fumaca);
 const geoFumaca=new THREE.IcosahedronGeometry(1,1),volutas=[];
 for(let i=0;i<9;i++){
  const mat=new THREE.MeshBasicMaterial({color:R.pedra[3],transparent:true,opacity:0,depthWrite:false});
  const nuvem=new THREE.Mesh(geoFumaca,mat);nuvem.renderOrder=3;fumaca.add(nuvem);volutas.push(nuvem);
 }
 casa.userData.animar=t=>{
  if(!fumaca.visible)return;
  for(let i=0;i<volutas.length;i++){
   const vida=(t/8+i/volutas.length)%1,nuvem=volutas[i],fase=vida*Math.PI*2+i*.7;
   const raio=.24+vida*.82;
   nuvem.position.set(3.7-vida*1.8+Math.sin(fase)*vida*.28,8.74+vida*6.4,-1.7+vida*.8+Math.cos(fase)*vida*.22);
   nuvem.scale.set(raio,raio*.8,raio*.9);nuvem.rotation.y=i+vida*.8;
   nuvem.material.opacity=Math.sin(Math.PI*vida)*.36;
  }
 };
 casa.userData.aplicarHora=hora=>{
  const noite=hora==='noite',acesa=noite||hora==='entardecer';
  mats.vidro.color.set(acesa?R.outono[4]:R.agua[3]);mats.vidro.emissiveIntensity=acesa?.75:0;
  mats.lampada.emissiveIntensity=acesa?1.1:.12;luz.intensity=noite?45:acesa?20:0;
  fumaca.visible=noite;
 };
 return casa;
}
