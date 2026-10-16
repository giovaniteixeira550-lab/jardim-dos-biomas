/** Salgueiro das Canções (Bosque de Pediatria): pernadas em arco, ramos pendentes com folhas caindo sobre a cúpula, passagem pela frente e vagens-sino douradas. Modelo aprovado. */
import * as THREE from 'three';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import { criarRng, criarRuido } from './mundo.js';
import { RAMPAS as R } from './paleta.js';
const V=(x=0,y=0,z=0)=>new THREE.Vector3(x,y,z), casca=R.terra[2], GRAUS=Math.PI/180;
function cor(g,hex){const c=new THREE.Color(hex),p=g.attributes.position,a=new Float32Array(p.count*3);for(let i=0;i<p.count;i++)c.toArray(a,i*3);g.setAttribute('color',new THREE.BufferAttribute(a,3));return g.index?g.toNonIndexed():g;}
function bola(c,r,hex,escala=[1,1,1]){const g=new THREE.IcosahedronGeometry(r,1);g.scale(...escala);g.translate(c.x,c.y,c.z);return cor(g,hex);}
function ramo(pontos,r0,r1,hex=casca){const curva=new THREE.CatmullRomCurve3(pontos.map(p=>p.isVector3?p.clone():V(...p))),n=20,lados=8,g=new THREE.TubeGeometry(curva,n,r0,lados,false),p=g.attributes.position;for(let i=0;i<=n;i++){const c=curva.getPointAt(i/n),k=(r0+(r1-r0)*i/n)/r0;for(let j=0;j<=lados;j++){const idx=i*(lados+1)+j,v=V().fromBufferAttribute(p,idx).sub(c).multiplyScalar(k).add(c);p.setXYZ(idx,v.x,v.y,v.z);}}g.computeVertexNormals();return cor(g,hex);}
// Volume de folhagem; com achatar > 1 vira uma cortina pendente, mais alta que larga, e afinar estreita a ponta de baixo.
function copa(c,r,semente,achatar=.78,hex=R.mata[4],afinar=0){
 let g=new THREE.IcosahedronGeometry(1,2);g.deleteAttribute('normal');g.deleteAttribute('uv');g=mergeVertices(g);
 const p=g.attributes.position,esf=new Float32Array(p.count*3),banda=new Float32Array(p.count),ruido=criarRuido(semente);
 for(let i=0;i<p.count;i++){const x=p.getX(i),y=p.getY(i),z=p.getZ(i),k=r*(.85+ruido(x*1.7+3,y*1.7+z+7,2)*.25);esf.set([x,y,z],i*3);banda[i]=y;const f=1-afinar*Math.max(0,-y);p.setXYZ(i,c.x+x*k*f,c.y+y*k*achatar,c.z+z*k*f);}
 g.setAttribute('banda',new THREE.BufferAttribute(banda,1));g.setAttribute('esfera',new THREE.BufferAttribute(esf,3));g.setAttribute('raioCopa',new THREE.BufferAttribute(new Float32Array(p.count).fill(r),1));g.setAttribute('semCopa',new THREE.BufferAttribute(new Float32Array(p.count).fill((semente*.6180339)%1),1));g.computeVertexNormals();g=cor(g,hex);g.userData.copa={centro:c.clone(),raio:r,achatar,cor:hex};return g;
}
// Folha estreita e alongada; aos pares ao longo dos raminhos.
function folha(c,tamanho,angulo,giro=.5,hex=R.mata[5]){const s=new THREE.Shape();s.moveTo(0,0);s.bezierCurveTo(-.5,.4,-.4,1.2,0,1.6);s.bezierCurveTo(.4,1.2,.5,.4,0,0);const g=new THREE.ShapeGeometry(s,6);g.scale(tamanho*.32,tamanho,1);g.rotateZ(angulo);g.rotateY(giro);g.translate(c.x,c.y,c.z);return cor(g,hex);}
function paresDeFolhas(curva,n,tamanho,partes,inicio=.25){for(let i=0;i<n;i++){const t=inicio+(1-inicio)*i/Math.max(1,n-1),p=curva.getPointAt(t),giro=i*1.1;for(const s of [-1,1])partes.push(folha(p,tamanho,s*2.3,giro,i%2?R.mata[4]:R.mata[5]));}}
// Vagem em forma de sino: coroa arredondada com alça, cintura reta, boca alargada com aba grossa e badalo; dourada.
function sino(apoio,haste,partes){
 const e=2,fim=apoio.clone().add(V(0,-haste,0));partes.push(ramo([apoio,apoio.clone().lerp(fim,.5).add(V(.03,0,0)),fim],.05,.035));
 // Alça no topo, onde o pedúnculo se prende.
 const alca=new THREE.TorusGeometry(.06*e,.022*e,5,10);alca.translate(fim.x,fim.y-.03*e,fim.z);partes.push(cor(alca,R.amarelo[0]));
 const topo=fim.clone().add(V(0,-.08*e,0));
 const perfil=[[0,0],[.1,-.01],[.17,-.05],[.21,-.12],[.22,-.22],[.225,-.32],[.24,-.41],[.28,-.49],[.34,-.55],[.38,-.58]].map(([r,y])=>new THREE.Vector2(r*e,y*e));
 const g=new THREE.LatheGeometry(perfil,16);g.translate(topo.x,topo.y,topo.z);partes.push(cor(g,R.amarelo[1]));
 // Faixa decorativa na cintura e aba grossa e clara na boca.
 const faixa=new THREE.TorusGeometry(.228*e,.012*e,4,16);faixa.rotateX(Math.PI/2);faixa.translate(topo.x,topo.y-.3*e,topo.z);partes.push(cor(faixa,R.amarelo[0]));
 const aba=new THREE.TorusGeometry(.375*e,.03*e,5,16);aba.rotateX(Math.PI/2);aba.translate(topo.x,topo.y-.58*e,topo.z);partes.push(cor(aba,R.amarelo[2]));
 partes.push(ramo([topo.clone().add(V(0,-.04*e,0)),topo.clone().add(V(0,-.5*e,0))],.018,.018,R.terra[1]),bola(topo.clone().add(V(0,-.56*e,0)),.07*e,R.terra[1]));
}
// Ramo pendente: raminho fino e folhas estreitas aos pares, apontando para fora e para baixo; mais claras na ponta.
function fita(curva,largura,lado,hexA,hexB,segs=16){
 const pos=[],cores=[],ca=new THREE.Color(hexA),cb=new THREE.Color(hexB),c=new THREE.Color(),baixo=V(0,-1,0);
 const tri=(vs,t)=>{for(const v of vs)pos.push(v.x,v.y,v.z);c.copy(ca).lerp(cb,t);for(let k=0;k<vs.length;k++)cores.push(c.r,c.g,c.b);};
 for(let i=0;i<segs;i++){
  const t0=i/segs,t1=(i+1)/segs,p0=curva.getPointAt(t0),p1=curva.getPointAt(t1),w=.035;
  tri([p0.clone().addScaledVector(lado,-w),p1.clone().addScaledVector(lado,-w),p0.clone().addScaledVector(lado,w),p0.clone().addScaledVector(lado,w),p1.clone().addScaledVector(lado,-w),p1.clone().addScaledVector(lado,w)],t0*.6);
  if(t0<.12)continue;
  // Um par de folhas por segmento: losango estreito preso ao raminho.
  const tam=largura*(1.25-.45*t0),eixo=p1.clone().sub(p0).normalize();
  for(const sinal of [-1,1]){const dir=lado.clone().multiplyScalar(sinal*.75).addScaledVector(eixo,.55).addScaledVector(baixo,.25).normalize(),ponta=p0.clone().addScaledVector(dir,tam),meio=p0.clone().addScaledVector(dir,tam*.5),abre=eixo.clone().multiplyScalar(tam*.16);
   tri([p0,meio.clone().add(abre),ponta,p0,ponta,meio.clone().sub(abre)],t0);}
 }
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setAttribute('color',new THREE.Float32BufferAttribute(cores,3));g.computeVertexNormals();return g;
}
function tronco(h,r0){const perfil=[];for(let j=0;j<=12;j++){const u=j/12,r=r0*((1-.4*u)+.35*Math.exp(-u/.08));perfil.push(new THREE.Vector2(r,u*h));}return cor(new THREE.LatheGeometry(perfil,12),casca);}
export function criarSalgueiroCancoes(semente, juntar){
 const rng=criarRng(semente),estagios=[],relatorio=[],nova=()=>Math.floor(rng()*1e6);
 for(let fase=0;fase<4;fase++){
  const partes=[];let galhos=0,cortinas=0,copas=0,vagens=0;
  if(fase===0){
   partes.push(bola(V(0,.035,0),.28,R.terra[2],[1,.25,1]),ramo([[0,0,0],[0,.32,0]],.024,.016,R.mata[2]));
   partes.push(folha(V(0,.3,0),.32,.55),folha(V(0,.3,0),.32,-.55),folha(V(0,.32,0),.18,0,1.4,R.mata[4]));
  }
  if(fase===1){
   const caule=new THREE.CatmullRomCurve3([V(0,0,0),V(.04,.6,0),V(0,1.15,0)]);partes.push(ramo([V(0,0,0),V(.04,.6,0),V(0,1.15,0)],.06,.025));
   // Primeiro ramo arqueado: sobe, faz a curva e começa a pender.
   const pontos=[V(.02,.75,0),V(.35,1.05,.05),V(.65,1.05,.08),V(.85,.75,.1)],arco=new THREE.CatmullRomCurve3(pontos);partes.push(ramo(pontos,.03,.012));galhos=1;
   paresDeFolhas(caule,3,.24,partes,.45);paresDeFolhas(arco,4,.22,partes,.3);partes.push(folha(V(0,1.15,0),.24,0,.9,R.mata[4]));
  }
  if(fase>=2){
   const adulto=fase===3,h=adulto?3:1.8,raio=adulto?3:1.6,elev=adulto?1.9:1.05;
   partes.push(tronco(h,adulto?.42:.16));
   // Pernadas que sobem e se abrem em arco; nenhuma aponta para a frente, onde fica a passagem.
   const angulos=(adulto?[150,210,270,330,30]:[150,270,30]).map(a=>a*GRAUS),pontas=[];
   for(const a of angulos){
    const d=V(Math.cos(a),0,Math.sin(a)),p=k=>d.clone().multiplyScalar(k);
    const pontos=[V(0,h*.9,0),p(raio*.27).add(V(0,h+elev*.55,0)),p(raio*.67).add(V(0,h+elev,0)),p(raio).add(V(0,h+elev*.85,0))];
    partes.push(ramo(pontos,adulto?.2:.07,adulto?.05:.025));galhos++;pontas.push({d,pontos});
   }
   // Cúpula baixa e larga: só o miolo da copa; o volume visível vem dos ramos que caem por cima dela.
   const topo=h+elev+(adulto?.9:.5),bordaY=h+elev*.8,R0=raio*1.05,altura=r=>topo-(r/R0)**2*(topo-bordaY);
   partes.push(copa(V(0,topo-(adulto?.75:.4),0),adulto?1.7:.85,nova(),.5,R.mata[3]));copas++;
   for(const a of angulos){const d=V(Math.cos(a),0,Math.sin(a));partes.push(copa(d.multiplyScalar(raio*.6).add(V(0,altura(raio*.6)-(adulto?.6:.3),0)),adulto?1.3:.6,nova(),.5,R.mata[3]));copas++;}
   // Ramos pendentes: nascem no alto, passam por cima da cúpula e caem quase na vertical.
   const n=adulto?84:20,abertura=adulto?[62,118]:[0,0];
   for(let i=0;i<n;i++){
    const g=adulto?i*360/n+rng()*3:i*360/n+rng()*6;if(g>abertura[0]&&g<abertura[1])continue;
    const a=g*GRAUS,d=V(Math.cos(a),0,Math.sin(a)),lado=V(-d.z,0,d.x),interno=adulto&&i%3===1;
    const s0=.25+rng()*.35,rB=R0*(interno?.88:1)+rng()*.25,fundo=adulto?(interno?2.4:.7+rng()*.9):bordaY-.6-rng()*.5;
    const pts=[d.clone().multiplyScalar(R0*s0).add(V(0,altura(R0*s0)+.08,0)),d.clone().multiplyScalar(R0*(s0+.95)/2).add(V(0,altura(R0*(s0+.95)/2)+.12,0)),d.clone().multiplyScalar(rB).add(V(0,bordaY+.1,0)),d.clone().multiplyScalar(rB+.12).add(V(0,(bordaY+fundo)/2,0)),d.clone().multiplyScalar(rB+.1).add(V(0,fundo,0))];
    const curva=new THREE.CatmullRomCurve3(pts),largura=(adulto?.34:.24)*(.85+rng()*.3),[c1,c2]=interno?[R.mata[2],R.mata[3]]:i%2?[R.mata[3],R.mata[5]]:[R.mata[4],R.mata[5]];
    partes.push(fita(curva,largura,lado,c1,c2),fita(curva,largura*.85,d,c1,c2));cortinas++;
   }
   // Vagens-sino: penduradas de um ramo curto voltado para a passagem e de uma pernada vizinha.
   if(adulto){
    const frente=[V(0,h*.9,0),V(0,h+.9,.75),V(0,h+1.25,1.6),V(0,h+1.1,2.2)];partes.push(ramo(frente,.11,.04));galhos++;
    const arco=new THREE.CatmullRomCurve3(frente);
    for(const [ap,haste] of [[arco.getPointAt(.9),.3],[pontas[4].pontos[1].clone().lerp(pontas[4].pontos[2],.3),.55],[pontas[0].pontos[1].clone().lerp(pontas[0].pontos[2],.45),.4]]){sino(ap,haste,partes);vagens++;}
   }
  }
  const geo=juntar(partes);geo.computeBoundingBox();geo.userData.proposta={fase,galhos,cortinas,copas,frutos:vagens};estagios.push(geo);relatorio.push(geo.userData.proposta);for(const g of partes)g.dispose();
 }
 return {estagios,relatorio};
}
