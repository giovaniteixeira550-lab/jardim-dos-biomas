/** Paineira dos Abraços (Bosque de Pediatria): tronco em garrafa, braços sob uma copa em arco, folha digitada e frutos com paina. Modelo aprovado na proposta 02. */
import * as THREE from 'three';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import { criarRng, criarRuido } from './mundo.js';
import { distribuirEnfeites } from './ornamentos.js';
import { RAMPAS as R } from './paleta.js';
const V=(x=0,y=0,z=0)=>new THREE.Vector3(x,y,z), casca=R.salvia[2];
function cor(g,hex){const c=new THREE.Color(hex),p=g.attributes.position,a=new Float32Array(p.count*3);for(let i=0;i<p.count;i++)c.toArray(a,i*3);g.setAttribute('color',new THREE.BufferAttribute(a,3));return g.index?g.toNonIndexed():g;}
function bola(c,r,hex,escala=[1,1,1]){const g=new THREE.IcosahedronGeometry(r,1);g.scale(...escala);g.translate(c.x,c.y,c.z);return cor(g,hex);}
function ramo(pontos,r0,r1,hex=casca){const curva=new THREE.CatmullRomCurve3(pontos.map(p=>p.isVector3?p.clone():V(...p))),n=20,lados=8,g=new THREE.TubeGeometry(curva,n,r0,lados,false),p=g.attributes.position;for(let i=0;i<=n;i++){const c=curva.getPointAt(i/n),k=(r0+(r1-r0)*i/n)/r0;for(let j=0;j<=lados;j++){const idx=i*(lados+1)+j,v=V().fromBufferAttribute(p,idx).sub(c).multiplyScalar(k).add(c);p.setXYZ(idx,v.x,v.y,v.z);}}g.computeVertexNormals();return cor(g,hex);}
function copa(c,r,semente,achatar=.78){
 let g=new THREE.IcosahedronGeometry(1,2);g.deleteAttribute('normal');g.deleteAttribute('uv');g=mergeVertices(g);
 const p=g.attributes.position,esf=new Float32Array(p.count*3),banda=new Float32Array(p.count),ruido=criarRuido(semente);
 for(let i=0;i<p.count;i++){const x=p.getX(i),y=p.getY(i),z=p.getZ(i),k=r*(.85+ruido(x*1.7+3,y*1.7+z+7,2)*.25);esf.set([x,y,z],i*3);banda[i]=y;p.setXYZ(i,c.x+x*k,c.y+y*k*achatar,c.z+z*k);}
 g.setAttribute('banda',new THREE.BufferAttribute(banda,1));g.setAttribute('esfera',new THREE.BufferAttribute(esf,3));g.setAttribute('raioCopa',new THREE.BufferAttribute(new Float32Array(p.count).fill(r),1));g.setAttribute('semCopa',new THREE.BufferAttribute(new Float32Array(p.count).fill((semente*.6180339)%1),1));g.computeVertexNormals();g=cor(g,R.mata[4]);g.userData.copa={centro:c.clone(),raio:r,achatar,cor:R.mata[4]};return g;
}
function lamina(c,tamanho,angulo,hex){const s=new THREE.Shape();s.moveTo(0,0);s.bezierCurveTo(-.7,.3,-.8,1,0,1.3);s.bezierCurveTo(.8,1,.7,.3,0,0);const g=new THREE.ShapeGeometry(s,6);g.scale(tamanho*.62,tamanho,1);g.rotateZ(angulo);g.rotateY(.5);g.translate(c.x,c.y,c.z);return cor(g,hex);}
// Cotilédone arredondado do broto.
function cotiledone(c,tamanho,angulo){const s=new THREE.Shape();s.moveTo(0,0);s.bezierCurveTo(-.9,.2,-.9,1.1,0,1.1);s.bezierCurveTo(.9,1.1,.9,.2,0,0);const g=new THREE.ShapeGeometry(s,6);g.scale(tamanho,tamanho,1);g.rotateZ(angulo);g.rotateY(.5);g.translate(c.x,c.y,c.z);return cor(g,R.mata[5]);}
// Folha digitada da paineira: cinco folíolos em leque na ponta do pecíolo.
function folhaDigitada(c,tamanho,angulo,partes){for(let k=-2;k<=2;k++)partes.push(lamina(c,tamanho*(1-.16*Math.abs(k)),angulo+k*.5,k%2?R.mata[4]:R.mata[5]));}
// Fruto preso à copa: o pedúnculo nasce dentro do lobo e sai pela borda de baixo, sem fio solto no ar.
// Fechado: cápsula verde alongada. Aberto: cápsula castanha com cinco valvas curvadas e uma bola de paina.
function fruto(origem,apoio,aberto,partes){
 partes.push(ramo([origem,origem.clone().lerp(apoio,.6).add(V(0,.05,0)),apoio],.07,.045));
 if(!aberto){
  const g=new THREE.IcosahedronGeometry(1,2);g.scale(.26,.6,.26);g.translate(apoio.x,apoio.y-.52,apoio.z);partes.push(cor(g,R.salvia[4]));
  partes.push(bola(apoio.clone().add(V(0,-.06,0)),.1,R.salvia[1]));
  const ponta=new THREE.ConeGeometry(.08,.22,6);ponta.rotateX(Math.PI);ponta.translate(apoio.x,apoio.y-1.18,apoio.z);partes.push(cor(ponta,R.salvia[3]));
  return;
 }
 // Base da cápsula ainda fechada junto ao pedúnculo.
 const base=apoio.clone().add(V(0,-.26,0)),g=new THREE.IcosahedronGeometry(1,2);g.scale(.26,.3,.26);g.translate(base.x,base.y,base.z);partes.push(cor(g,R.terra[2]));
 // Cinco valvas abertas, curvadas para fora como pétalas secas.
 for(let i=0;i<5;i++){const a=i*Math.PI*2/5+.3,d=V(Math.cos(a),0,Math.sin(a));partes.push(ramo([base.clone().add(V(0,-.12,0)),base.clone().addScaledVector(d,.32).add(V(0,-.42,0)),base.clone().addScaledVector(d,.58).add(V(0,-.5,0))],.09,.03,i%2?R.terra[1]:R.terra[2]));}
 // Paina: uma bola fofa e grande, mais larga que a cápsula, saindo da abertura.
 const centro=base.clone().add(V(0,-.72,0));
 partes.push(bola(centro,.5,R.betula[0],[1,.92,1]));
 for(let i=0;i<7;i++){const a=i*2.39996,y=(i%3-1)*.2;partes.push(bola(centro.clone().add(V(Math.cos(a)*.34,y,Math.sin(a)*.4)),.25+.04*(i%2),R.betula[0]));}
}
function flor(p,r,partes){const normal=p.centro.clone().sub(p.apoio).normalize(),q=new THREE.Quaternion().setFromUnitVectors(V(0,0,1),normal),centro=p.apoio.clone().addScaledVector(normal,.03);for(let i=0;i<5;i++){const a=i*Math.PI*2/5,c=V(Math.cos(a)*r*.7,Math.sin(a)*r*.7,0),g=new THREE.IcosahedronGeometry(r,1);g.scale(.55,.85,.2);g.rotateZ(a-Math.PI/2);g.translate(c.x,c.y,c.z);g.applyQuaternion(q);g.translate(centro.x,centro.y,centro.z);partes.push(cor(g,i%2?R.flor[2]:R.flor[3]));}partes.push(bola(centro.clone().addScaledVector(normal,r*.15),r*.24,R.amarelo[2]));}
// Tronco em garrafa: base alargada, barriga no terço inferior e afinamento até os braços.
function tronco(h,r0,barriga){const perfil=[];for(let j=0;j<=18;j++){const u=j/18,r=r0*((.62+barriga*Math.exp(-(((u-.36)/.24)**2)))*(1-.42*u)+.32*Math.exp(-u/.07));perfil.push(new THREE.Vector2(r,u*h));}return cor(new THREE.LatheGeometry(perfil,16),casca);}
export function criarPaineiraAbracos(semente, juntar){
 const rng=criarRng(semente),estagios=[],relatorio=[];
 for(let fase=0;fase<4;fase++){
  const partes=[],folhas=[],apoiosFrutos=[];let flores=0,bracos=0,raizes=0;
  if(fase===0){partes.push(bola(V(0,.035,0),.28,R.terra[2],[1,.25,1]),ramo([[0,0,0],[0,.36,0]],.026,.018),cotiledone(V(0,.24,0),.2,1.05),cotiledone(V(0,.26,0),.2,-1.05));folhaDigitada(V(0,.36,0),.22,0,partes);}
  if(fase===1){partes.push(ramo([[0,0,0],[.04,.55,0],[0,1.05,0]],.075,.035));for(const s of [-1,1]){partes.push(ramo([[0,.65,0],[s*.22,1.05,0],[s*.42,1.38,.04]],.035,.012));bracos++;folhaDigitada(V(s*.42,1.38,.04),.3,s*.55,partes);folhaDigitada(V(s*.2,.98,.05),.24,s*1.1,partes);}folhaDigitada(V(0,1.05,0),.22,0,partes);}
  if(fase>=2){
   const adulto=fase===3,h=adulto?4.1:2.3,escala=adulto?1:.58,topo=h*.84;
   partes.push(tronco(h,adulto?.9:.3,adulto?.75:.45));
   for(const sinal of [-1,1]){
    const z=sinal===1?-.18:.15;
    // Braço aberto e curvo: passa abaixo das copas para continuar visível no adulto.
    const braco=[V(0,topo,0),V(sinal*.9*escala,h+.25*escala,z),V(sinal*2*escala,h+1.05*escala,z),V(sinal*2.85*escala,h+2*escala,z)];
    partes.push(ramo(braco,adulto?.42:.13,adulto?.13:.04));bracos++;
    if(adulto){
     // Dois lobos de copa por braço, deixando um vão no centro: o "abraço".
     // Os lobos internos se inclinam para o centro e quase se tocam no alto: a copa forma um arco sobre o vão.
     // Os lobos se espalham também em profundidade, para a copa não virar uma parede vista de lado.
     const lobos=[[sinal*2.9,h+2.85,.95,1.35],[sinal*2.75,h+2.95,-.95,1.35],[sinal*4.15,h+2.3,sinal*.75,1.1],[sinal*1.85,h+3.75,-sinal*.75,1.1],[sinal*.75,h+4.35,0,.95]];
     for(const [x,y,zz,r] of lobos){partes.push(ramo([braco[2],V((braco[2].x+x)/2,(braco[2].y+y)/2-.2,zz),V(x,y-.4,zz)],.16,.04));const g=copa(V(x,y,zz),r,Math.floor(rng()*1e6));partes.push(g);folhas.push(g);}
     // Frutos nascem dentro dos lobos e aparecem logo abaixo da borda das folhas; um aberto e um fechado por lado.
     apoiosFrutos.push({origem:V(sinal*4.15,h+2.05,sinal*.75),apoio:V(sinal*4.3,h+1.4,sinal*.8),aberto:sinal<0});
     apoiosFrutos.push({origem:V(sinal*2.9,h+2.45,1),apoio:V(sinal*3.05,h+1.75,1.1),aberto:sinal>0});
    }else{
     for(const [x,y] of [[sinal*1.7,h+1.95],[sinal*.95,h+2.2]]){const ponta=V(x,y,z);partes.push(ramo([braco[2],ponta],.05,.025));const g=copa(ponta.clone().add(V(0,.3,0)),.8,Math.floor(rng()*1e6));partes.push(g);folhas.push(g);}
    }
   }
   if(adulto){
    // Sapopemas baixas: raízes largas que se espalham a partir da base.
    for(let i=0;i<5;i++){const a=i*2.39996+.3,c=Math.cos(a),s=Math.sin(a);partes.push(ramo([[c*.7,.45,s*.7],[c*1.35,.14,s*1.35],[c*2.1,.03,s*2.1]],.32,.04));raizes++;}
   }
   // Flores abertas sobre a parte de cima dos lobos, voltadas para o céu, como na florada da paineira.
   const candidatos=distribuirEnfeites(folhas,[],{tipo:'flor',raio:adulto?.3:.16,quantidade:adulto?80:16},rng);
   const voltadas=candidatos.filter(p=>p.centro.clone().sub(p.apoio).normalize().y>.5);
   const escolhidos=(voltadas.length>=(adulto?14:4)?voltadas:candidatos).slice(0,adulto?14:4);
   for(const p of escolhidos)flor(p,adulto?.32:.16,partes);flores=escolhidos.length;
   for(const f of apoiosFrutos)fruto(f.origem,f.apoio,f.aberto,partes);
  }
  const geo=juntar(partes);geo.computeBoundingBox();geo.userData.proposta={fase,bracos,raizes,flores,frutos:apoiosFrutos.length,copas:folhas.length};estagios.push(geo);relatorio.push(geo.userData.proposta);for(const g of partes)g.dispose();
 }
 return {estagios,relatorio};
}
