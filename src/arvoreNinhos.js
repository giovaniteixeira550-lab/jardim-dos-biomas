/** Árvore dos Ninhos (Bosque de Pediatria — Puericultura, prevenção e vacinação): tronco curto e robusto que se abre em braços desiguais e plataformas de folhas em camadas; dois ninhos de gravetos com ovos claros pousados nas forquilhas e ocos na casca. Modelo aprovado. */
import * as THREE from 'three';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import { criarRng, criarRuido } from './mundo.js';
import { RAMPAS as R } from './paleta.js';
const V=(x=0,y=0,z=0)=>new THREE.Vector3(x,y,z), CIMA=V(0,1,0), FRENTE=V(0,0,1), GRAUS=Math.PI/180;
function cor(g,hex){const c=new THREE.Color(hex),p=g.attributes.position,a=new Float32Array(p.count*3);for(let i=0;i<p.count;i++)c.toArray(a,i*3);g.setAttribute('color',new THREE.BufferAttribute(a,3));return g.index?g.toNonIndexed():g;}
function bola(c,r,hex,escala=[1,1,1],det=1){const g=new THREE.IcosahedronGeometry(r,det);g.scale(...escala);g.translate(c.x,c.y,c.z);return cor(g,hex);}
function tubo(pontos,r0,r1,n=20,fechado=false,lados=9){const curva=new THREE.CatmullRomCurve3(pontos.map(p=>p.isVector3?p.clone():V(...p)),fechado),g=new THREE.TubeGeometry(curva,n,r0,lados,fechado),p=g.attributes.position;if(r1!==r0)for(let i=0;i<=n;i++){const c=curva.getPointAt(i/n),k=(r0+(r1-r0)*i/n)/r0;for(let j=0;j<=lados;j++){const idx=i*(lados+1)+j,v=V().fromBufferAttribute(p,idx).sub(c).multiplyScalar(k).add(c);p.setXYZ(idx,v.x,v.y,v.z);}}g.computeVertexNormals();return {g,curva};}
// Casca robusta e cinza-acastanhada, com faixas mais escuras que seguem o comprimento do galho.
function galho(pontos,r0,r1,semente,n=20){
 const {g,curva}=tubo(pontos,r0,r1,n),ruido=criarRuido(semente),p=g.attributes.position,a=new Float32Array(p.count*3),claro=new THREE.Color(R.terra[3]),medio=new THREE.Color(R.terra[2]),escuro=new THREE.Color(R.terra[1]);
 for(let i=0;i<p.count;i++){const v=ruido(p.getX(i)*4.2+p.getZ(i)*3.1,p.getY(i)*.9+p.getX(i)*.5,2);(v>.3?claro:v<-.26?escuro:medio).toArray(a,i*3);}
 g.setAttribute('color',new THREE.BufferAttribute(a,3));return {geo:g.toNonIndexed(),curva,r0,r1};
}
// Plataforma de folhagem: volume largo e achatado, com o desenho de aglomerados do jardim (banda/esfera lidas por estiloCopa).
function plataforma(c,r,semente,achatar=.34,hex=R.mata[3],alongar=1,giro=0){
 let g=new THREE.IcosahedronGeometry(1,2);g.deleteAttribute('normal');g.deleteAttribute('uv');g=mergeVertices(g);
 const p=g.attributes.position,esf=new Float32Array(p.count*3),banda=new Float32Array(p.count),ruido=criarRuido(semente),cg=Math.cos(giro),sg=Math.sin(giro);
 for(let i=0;i<p.count;i++){const x=p.getX(i),y=p.getY(i),z=p.getZ(i),k=r*(.84+ruido(x*1.6+3,y*1.6+z+7,2)*.3),bx=x*k*alongar,bz=z*k;esf.set([x,y,z],i*3);banda[i]=y;
  // A base da plataforma é mais reta que o topo, como uma camada de folhas pousada sobre os galhos.
  const yy=y<0?y*.55:y;p.setXYZ(i,c.x+bx*cg-bz*sg,c.y+yy*k*achatar,c.z+bx*sg+bz*cg);}
 g.setAttribute('banda',new THREE.BufferAttribute(banda,1));g.setAttribute('esfera',new THREE.BufferAttribute(esf,3));g.setAttribute('raioCopa',new THREE.BufferAttribute(new Float32Array(p.count).fill(r),1));g.setAttribute('semCopa',new THREE.BufferAttribute(new Float32Array(p.count).fill((semente*.6180339)%1),1));g.computeVertexNormals();return cor(g,hex);
}
// Folha larga e obovada, mais larga perto da ponta.
function folha(c,tam,ang,giro,hex=R.mata[3]){const s=new THREE.Shape();s.moveTo(0,0);s.bezierCurveTo(-.25,.2,-.62,.9,-.42,1.35);s.bezierCurveTo(-.25,1.62,.25,1.62,.42,1.35);s.bezierCurveTo(.62,.9,.25,.2,0,0);const g=new THREE.ShapeGeometry(s,6);g.scale(tam*.6,tam,1);g.rotateZ(ang);g.rotateY(giro);g.translate(c.x,c.y,c.z);return cor(g,hex);}
// Folha em concha: um gomo de esfera, côncavo para cima, como duas mãos em concha.
function concha(c,tam,giro,ergue,hex=R.mata[4]){const s=new THREE.Shape();s.moveTo(0,0);s.bezierCurveTo(-.5,.15,-.75,.85,-.45,1.25);s.bezierCurveTo(-.2,1.5,.2,1.5,.45,1.25);s.bezierCurveTo(.75,.85,.5,.15,0,0);const g=new THREE.ShapeGeometry(s,8);g.scale(tam*.75,tam,1);const p=g.attributes.position;for(let i=0;i<p.count;i++){const x=p.getX(i)/(tam*.55),y=p.getY(i)/tam;p.setZ(i,tam*(.42*x*x+.18*y*y));}g.computeVertexNormals();g.rotateX(-Math.PI/2+ergue);g.rotateY(giro);g.translate(c.x,c.y,c.z);return cor(g,hex);}
// Roseta de folhas na ponta de um ramo (como a amendoeira): folhas abertas em leque, uma ou outra avermelhada.
function roseta(p,dir,n,tam,partes,rng,vermelhas=0){const base=Math.atan2(dir.x,dir.z);for(let i=0;i<n;i++){const giro=base+(i/n)*Math.PI*2+(rng()-.5)*.5,hex=i<vermelhas?R.outono[1]:i%2?R.mata[3]:R.mata[4];partes.push(folha(p,tam*(.8+rng()*.35),1.15+(rng()-.5)*.35,giro,hex));}}
// Ponto e normal na superfície de um galho.
function naCasca(gl,t,ang,afasta=0){const c=gl.curva.getPointAt(t),eixo=gl.curva.getTangentAt(t),l1=V().crossVectors(eixo,Math.abs(eixo.y)>.9?V(1,0,0):CIMA).normalize(),l2=V().crossVectors(eixo,l1),n=l1.multiplyScalar(Math.cos(ang)).addScaledVector(l2,Math.sin(ang)).normalize(),r=gl.r0+(gl.r1-gl.r0)*t;return {p:c.addScaledVector(n,r+afasta),n};}
// Oco: cavidade escura e oval, com a borda de casca enrolada mais clara em volta.
function oco(gl,t,alvo,tam,partes){
 // Gira em volta do galho até a cavidade ficar virada para a direção pedida.
 let ang=0,melhor=-2;for(let i=0;i<32;i++){const a=i/32*Math.PI*2,k=naCasca(gl,t,a).n.dot(alvo);if(k>melhor){melhor=k;ang=a;}}
 const {p,n}=naCasca(gl,t,ang,tam*.06),q=new THREE.Quaternion().setFromUnitVectors(FRENTE,n);
 const fundo=new THREE.CircleGeometry(tam,14);fundo.scale(.72,1.15,1);fundo.applyQuaternion(q);fundo.translate(p.x,p.y,p.z);partes.push(cor(fundo,R.tinta[0]));
 const borda=new THREE.TorusGeometry(tam,tam*.3,6,16);borda.scale(.72,1.15,1);borda.applyQuaternion(q);const b=p.clone().addScaledVector(n,tam*.04);borda.translate(b.x,b.y,b.z);partes.push(cor(borda,R.terra[3]));
}
// Ninho vegetal: tigela de gravetos trançados em anéis irregulares, alguns fios soltos e ovos claros dentro.
function ninho(c,r,partes,rng,estado,ovos=3){
 const tigela=new THREE.SphereGeometry(r*.92,14,7,0,Math.PI*2,Math.PI*.5,Math.PI*.5);tigela.scale(1,.62,1);tigela.translate(c.x,c.y+r*.1,c.z);partes.push(cor(tigela,R.terra[1]));
 const tons=[R.terra[2],R.terra[3],R.terra[4],R.terra[2],R.terra[5]];
 for(let k=0;k<5;k++){
  const raio=r*(1.02-k*.05+(rng()-.5)*.06),y=c.y+r*(-.18+k*.07),pts=[];
  for(let i=0;i<12;i++){const a=i/12*Math.PI*2+k*.4,rr=raio*(.92+rng()*.16);pts.push(V(c.x+Math.cos(a)*rr,y+(rng()-.5)*r*.12,c.z+Math.sin(a)*rr));}
  partes.push(cor(tubo(pts,r*.09,r*.09,36,true,5).g,tons[k]));
 }
 // Gravetos soltos saindo da borda, em ângulos desencontrados.
 for(let i=0;i<7;i++){const a=rng()*Math.PI*2,d=V(Math.cos(a),0,Math.sin(a)),ini=c.clone().addScaledVector(d,r*.9).add(V(0,r*(.02+rng()*.12),0)),fim=ini.clone().addScaledVector(d,r*(.25+rng()*.35)).add(V((rng()-.5)*r*.3,(rng()-.3)*r*.3,(rng()-.5)*r*.3));partes.push(cor(tubo([ini,ini.clone().lerp(fim,.5).add(V(0,r*.04,0)),fim],r*.035,r*.02,4,false,4).g,i%2?R.terra[4]:R.terra[2]));}
 // Ovos claros, de tamanhos levemente diferentes, apoiados no fundo da tigela.
 for(let i=0;i<ovos;i++){const a=i/ovos*Math.PI*2+rng(),d=r*.32,o=V(c.x+Math.cos(a)*d,c.y+r*.2,c.z+Math.sin(a)*d),e=r*(.2+rng()*.04);partes.push(bola(o,e,i===1?R.betula[0]:R.agua[5],[1,.82,1.25].map((s,j)=>j===2?s:s),1));estado.ovos++;}
 estado.ninhos++;
}
// Verificação: conta os galhos cujo eixo passa por dentro da tigela do ninho (acima do fundo). Deve dar zero.
function atravessa(c,rN,ramos){
 const fundo=c.y-.47*rN,borda=c.y+.1*rN,prof=.57*rN;let n=0;
 for(const gl of ramos){let dentro=false;for(let i=0;i<=40&&!dentro;i++){const p=gl.curva.getPointAt(i/40);if(p.y<fundo+.04||p.y>borda)continue;const u=Math.min(1,(borda-p.y)/prof),raio=.92*rN*Math.sqrt(1-u*u);if(Math.hypot(p.x-c.x,p.z-c.z)<raio-.02)dentro=true;}if(dentro)n++;}
 return n;
}
export function criarArvoreNinhos(semente, juntar){
 const rng=criarRng(semente),estagios=[],relatorio=[],nova=()=>Math.floor(rng()*1e6);
 for(let fase=0;fase<4;fase++){
  const partes=[],estado={ninhos:0,ovos:0};let troncos=0,ocos=0,plataformas=0;
  if(fase===0){
   // Broto: duas folhas em concha, uma de frente para a outra, sobre um montinho de terra.
   partes.push(bola(V(0,.02,0),.22,R.terra[2],[1,.2,1]));
   partes.push(cor(tubo([V(0,0,0),V(.01,.08,0),V(0,.15,0)],.012,.009,6).g,R.mata[2]));
   partes.push(concha(V(0,.15,0),.22,1.85,.42,R.mata[4]),concha(V(0,.15,0),.19,1.85+Math.PI,.5,R.mata[3]),folha(V(0,.16,0),.06,0,1.2,R.mata[5]));
  }
  if(fase===1){
   // Muda: caule curto com bifurcação baixa; cada ponta abre uma pequena roseta de folhas largas.
   partes.push(bola(V(0,.02,0),.4,R.terra[2],[1,.15,1]));
   const base=galho([V(0,0,0),V(.01,.18,0),V(0,.34,0)],.06,.05,nova(),8);partes.push(base.geo);troncos++;
   for(const [ang,alc,h] of [[.4,.38,1.05],[3.6,.3,.85]]){const d=V(Math.cos(ang),0,Math.sin(ang)),fim=V(0,.32,0).addScaledVector(d,alc).add(V(0,h-.32,0)),gl=galho([V(0,.32,0),V(0,.32,0).addScaledVector(d,alc*.35).add(V(0,(h-.32)*.45,0)),fim],.045,.025,nova(),10);partes.push(gl.geo);troncos++;roseta(fim,d,6,.17,partes,rng,0);}
  }
  if(fase>=2){
   const adulto=fase===3,s=adulto?1:.55;
   partes.push(bola(V(0,.02,0),adulto?2.3:1.2,R.terra[2],[1,.08,1],2));
   // Tronco curto e robusto, levemente inclinado, com a base alargada em sapatas baixas e desiguais.
   const hF=adulto?1.7:1.05,F=V(.08*s,hF,-.04*s),tronco=galho([V(0,0,0),V(.03,hF*.4,0),V(-.02,hF*.75,.02),F],adulto?.36:.17,adulto?.26:.13,nova(),16);partes.push(tronco.geo);troncos++;
   for(let i=0;i<4;i++){const a=(i*90+25+(rng()-.5)*40)*GRAUS,d=V(Math.cos(a),0,Math.sin(a)),alc=(adulto?.62:.3)*(.7+rng()*.5);partes.push(galho([V(0,adulto?.42:.22,0).addScaledVector(d,adulto?.2:.1),V(0,adulto?.14:.07,0).addScaledVector(d,alc*.6),V(0,.01,0).addScaledVector(d,alc)],adulto?.15:.07,adulto?.05:.025,nova(),8).geo);}
   // Braços: um baixo e longo para a esquerda, um alto para trás e um médio para a direita, deixando a frente aberta. Ângulos em graus (90 = frente).
   const bracos=adulto?[{a:168,alc:1.55,h:.8,r:.19},{a:-75,alc:1.05,h:1.95,r:.2},{a:12,alc:1.5,h:1.3,r:.16,de:.7}]:[{a:165,alc:.75,h:.5,r:.1},{a:-40,alc:.55,h:1,r:.1}];
   const pontas=[],lista=[],ramos=[];
   for(const b of bracos){
    const a=(b.a+(rng()-.5)*12)*GRAUS,d=V(Math.cos(a),0,Math.sin(a)),ini=b.de?tronco.curva.getPointAt(b.de):F.clone(),fim=ini.clone().addScaledVector(d,b.alc).add(V(0,b.h,0)),lado=V(-d.z,0,d.x);
    const m=ini.clone().lerp(fim,.5).addScaledVector(lado,(rng()-.5)*.4*s).add(V(0,-.1*s,0)),pts=[ini];
    // Na adulta, os braços da forquilha saem primeiro para fora, baixos, e só depois sobem: o vão do meio fica livre para o ninho.
    if(adulto&&!b.de)pts.push(ini.clone().addScaledVector(d,.6).add(V(0,.06,0)));
    pts.push(m);
    // O braço do ninho da esquerda chega à ponta por baixo, como um poleiro que sustenta a tigela.
    if(adulto&&bracos.indexOf(b)===0)pts.push(fim.clone().addScaledVector(d,-.08).add(V(0,-.42,0)));
    pts.push(fim);
    const gl=galho(pts,b.r,b.r*.7,nova(),18);partes.push(gl.geo);troncos++;lista.push(gl);ramos.push(gl);pontas.push({p:fim,d,r:b.r*.7});
   }
   // Ocos: na frente do tronco e, na adulta, também no braço alto.
   oco(tronco,.42,V(.3,0,1).normalize(),adulto?.2:.1,partes);ocos++;
   if(adulto){oco(lista[1],.35,V(-.4,.3,1).normalize(),.13,partes);ocos++;}
   // Cada ponta se abre em ramos quase horizontais e longos, que levam as plataformas para fora;
   // assim as forquilhas ficam descobertas e os ninhos aparecem.
   const plats=[];
   pontas.forEach((pt,i)=>{
    const nR=adulto?(i===1?3:2):2,leque=adulto?(i===1?58:72):80;
    for(let k=0;k<nR;k++){
     const ang=Math.atan2(pt.d.z,pt.d.x)+((k-(nR-1)/2)*leque+(rng()-.5)*20)*GRAUS,d=V(Math.cos(ang),0,Math.sin(ang)),alc=(adulto?1.55:.7)*(.8+rng()*.4),sobe=(adulto?.3:.15)*(rng()-.3);
     if(d.z>.55){d.z=.55;d.normalize();}
     const fim=pt.p.clone().addScaledVector(d,alc).add(V(0,sobe,0)),m=pt.p.clone().lerp(fim,.5).add(V(0,.16*s,0));
     // Na ponta que leva o ninho, os ramos nascem um pouco abaixo e correm baixos até passar da borda da tigela.
     const comNinho=adulto&&i===0,ini=comNinho?pt.p.clone().add(V(0,-.16,0)):pt.p,pts=comNinho?[ini,ini.clone().addScaledVector(d,.5).add(V(0,-.02,0)),m,fim]:[pt.p,m,fim];
     const gl=galho(pts,pt.r*.62,pt.r*.3,nova(),12);partes.push(gl.geo);ramos.push(gl);
     // Um raminho secundário curto, para o galho não parecer um cabo reto até a folhagem.
     if(adulto){const t=.45+rng()*.2,o=gl.curva.getPointAt(t),lado=V(-d.z,0,d.x).multiplyScalar(rng()<.5?-1:1),f2=o.clone().addScaledVector(lado,.45).addScaledVector(d,.25).add(V(0,.12,0));partes.push(galho([o,o.clone().lerp(f2,.5).add(V(0,.06,0)),f2],pt.r*.25,pt.r*.12,nova(),6).geo);roseta(f2,lado,5,.22,partes,rng,rng()<.3?1:0);}
     plats.push({c:fim.clone().add(V(0,adulto?.18:.1,0)),d,ramo:i});
    }
   });
   // Plataforma = três ou quatro volumes achatados e sobrepostos em alturas desiguais, formando uma camada de borda irregular.
   for(const [i,pl] of plats.entries()){
    const r=(adulto?.78:.42)*(.85+rng()*.3),n=adulto?3+(rng()<.5?1:0):2,tons=pl.ramo===1?[R.mata[4],R.mata[3]]:[R.mata[3],R.mata[2]];
    for(let k=0;k<n;k++){const a=rng()*Math.PI*2,dd=k?r*(.55+rng()*.25):0,c=pl.c.clone().add(V(Math.cos(a)*dd,(rng()-.4)*r*.18,Math.sin(a)*dd)).addScaledVector(pl.d,k?r*.2:0);partes.push(plataforma(c,r*(k?.72+rng()*.2:1),nova(),adulto?.36:.42,tons[k%2],1.15+rng()*.25,-Math.atan2(pl.d.z,pl.d.x)+(rng()-.5)));}
    plataformas++;
    // Uma ou outra folha avermelhada na borda, como folha velha.
    if(adulto&&i%3===0)roseta(pl.c.clone().addScaledVector(pl.d,r*1.25).add(V(0,-.06,0)),pl.d,3,.26,partes,rng,1);
   }
   // Ninhos: assentados na forquilha do tronco e na do braço baixo da frente, onde não há plataforma por cima.
   if(adulto){
    // O fundo da tigela fica 0,47 × raio abaixo do centro: o ninho pousa exatamente na ponta do tronco ou do braço.
    for(const [c,rN,ovos] of [[F.clone().add(V(0,.47*.44,0)),.44,3],[pontas[0].p.clone().add(V(0,.47*.34,0)),.34,2]]){estado.atravessados=(estado.atravessados||0)+atravessa(c,rN,ramos);ninho(c,rN,partes,rng,estado,ovos);}
   }
  }
  const geo=juntar(partes);geo.computeBoundingBox();
  geo.userData.proposta={fase,troncos,ocos,plataformas,ninhos:estado.ninhos,ovos:estado.ovos,atravessados:estado.atravessados||0};estagios.push(geo);relatorio.push(geo.userData.proposta);for(const g of partes)g.dispose();
 }
 return {estagios,relatorio};
}
