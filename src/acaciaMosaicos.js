/** Acácia dos Mosaicos (Bosque de Pediatria — Hematologia e oncologia). Referência de arquitetura: acácia-guarda-chuva da savana (Vachellia tortilis) — tronco curto que se divide em troncos finos abertos em leque, sob uma copa única, larga e achatada como guarda-sol, feita de placas encaixadas em laranja, âmbar e amarelo (o mosaico). Vagens segmentadas como contas de colar, da Vachellia nilotica. Modelo aprovado. */
import * as THREE from 'three';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import { criarRng, criarRuido } from './mundo.js';
import { RAMPAS as R } from './paleta.js';
const V=(x=0,y=0,z=0)=>new THREE.Vector3(x,y,z), CIMA=V(0,1,0), GRAUS=Math.PI/180;
function cor(g,hex){const c=new THREE.Color(hex),p=g.attributes.position,a=new Float32Array(p.count*3);for(let i=0;i<p.count;i++)c.toArray(a,i*3);g.setAttribute('color',new THREE.BufferAttribute(a,3));return g.index?g.toNonIndexed():g;}
function bola(c,r,hex,escala=[1,1,1],det=1){const g=new THREE.IcosahedronGeometry(r,det);g.scale(...escala);g.translate(c.x,c.y,c.z);return cor(g,hex);}
function tuboR(pontos,raio,n=20,lados=9){const curva=new THREE.CatmullRomCurve3(pontos.map(p=>p.clone()),false,'centripetal'),g=new THREE.TubeGeometry(curva,n,1,lados,false),p=g.attributes.position;for(let i=0;i<=n;i++){const c=curva.getPointAt(i/n);for(let j=0;j<=lados;j++){const idx=i*(lados+1)+j,k=raio(i/n,j/lados*Math.PI*2),v=V().fromBufferAttribute(p,idx).sub(c).multiplyScalar(k).add(c);p.setXYZ(idx,v.x,v.y,v.z);}}g.computeVertexNormals();return {g,curva};}
// Casca castanha e áspera da acácia: sulcos finos e contínuos ao longo do galho, cor única por face
// (sem degradê, que vira mancha na quantização do pixel).
function galho(pontos,r0,r1,semente){
 const ruido=criarRuido(semente),comp=new THREE.CatmullRomCurve3(pontos.map(p=>p.clone())).getLength(),lados=r0>.1?14:r0>.05?8:6,n=Math.max(6,Math.ceil(comp/(r0>.12?.12:.18))),K=r0>.12?6:4;
 const valor=(t,a)=>{const s=t*comp;return Math.sin(a*K+ruido(s*1.4+Math.cos(a)*.5,Math.sin(a)*.5,2)*2)+.25*ruido(s*3+Math.cos(a),Math.sin(a),1);};
 const raio=(t,a)=>(r0+(r1-r0)*t)*(1+(r0>.1?.09:.04)*Math.max(-1,Math.min(1,valor(t,a))));
 const {g,curva}=tuboR(pontos,raio,n,lados),val=new Float32Array(g.attributes.position.count);
 for(let i=0;i<=n;i++)for(let j=0;j<=lados;j++)val[i*(lados+1)+j]=valor(i/n,j/lados*Math.PI*2);
 g.setAttribute('casca',new THREE.BufferAttribute(val,1));
 const plano=g.toNonIndexed(),v3=plano.attributes.casca,pintura=new Float32Array(plano.attributes.position.count*3),sulco=new THREE.Color(R.terra[1]),meio=new THREE.Color(R.terra[2]),crista=new THREE.Color(R.terra[3]);
 for(let k=0;k<v3.count/3;k++){const m=(v3.getX(k*3)+v3.getX(k*3+1)+v3.getX(k*3+2))/3,c=m<-.3?sulco:m>.6?crista:meio;for(let v=0;v<3;v++)c.toArray(pintura,(k*3+v)*3);}
 plano.deleteAttribute('casca');plano.setAttribute('color',new THREE.BufferAttribute(pintura,3));return {geo:plano,curva,r0,r1};
}
function graveto(pontos,r0,r1,hex=R.pedra[1]){const {g}=tuboR(pontos,t=>r0+(r1-r0)*t,6,5);return cor(g,hex);}
// Placa do mosaico: volume baixo e achatado, com o desenho de aglomerados do jardim (banda/esfera lidas por estiloCopa).
function placa(c,r,semente,achatar,hex,giro){
 let g=new THREE.IcosahedronGeometry(1,2);g.deleteAttribute('normal');g.deleteAttribute('uv');g=mergeVertices(g);
 const p=g.attributes.position,esf=new Float32Array(p.count*3),banda=new Float32Array(p.count),ruido=criarRuido(semente),cg=Math.cos(giro),sg=Math.sin(giro);
 for(let i=0;i<p.count;i++){const x=p.getX(i),y=p.getY(i),z=p.getZ(i),k=r*(.82+ruido(x*2+3,y*2+z+7,2)*.3),bx=x*k*1.2,bz=z*k*.9;esf.set([x,y,z],i*3);banda[i]=y;p.setXYZ(i,c.x+bx*cg-bz*sg,c.y+(y<0?y*.45:y)*k*achatar,c.z+bx*sg+bz*cg);}
 g.setAttribute('banda',new THREE.BufferAttribute(banda,1));g.setAttribute('esfera',new THREE.BufferAttribute(esf,3));g.setAttribute('raioCopa',new THREE.BufferAttribute(new Float32Array(p.count).fill(r),1));g.setAttribute('semCopa',new THREE.BufferAttribute(new Float32Array(p.count).fill((semente*.6180339)%1),1));g.computeVertexNormals();return cor(g,hex);
}
// Folha composta da acácia: ráquis com pares de folíolos miúdos.
function folhaComposta(base,dir,comp,partes,hex=R.outono[3]){
 const lado=V().crossVectors(dir,CIMA).normalize(),fim=base.clone().addScaledVector(dir,comp);
 partes.push(graveto([base,base.clone().lerp(fim,.5).add(V(0,comp*.06,0)),fim],.007,.004,R.outono[1]));
 const pares=6;for(let i=0;i<pares;i++){const t=.2+.75*i/(pares-1),p=base.clone().lerp(fim,t).add(V(0,comp*.06*Math.sin(Math.PI*t),0)),tam=comp*.1;
  for(const s of [-1,1]){const g=new THREE.CircleGeometry(tam,5);g.scale(1,.5,1);g.rotateX(-Math.PI/2+.2);const q=new THREE.Quaternion().setFromUnitVectors(V(1,0,0),lado.clone().multiplyScalar(s).add(dir.clone().multiplyScalar(.3)).normalize());g.applyQuaternion(q);const c=p.clone().addScaledVector(lado,s*tam*.85);g.translate(c.x,c.y,c.z);partes.push(cor(g,i%2?hex:R.amarelo[1]));}}
}
// Leque: várias folhas compostas abertas em meia-roda a partir de um ponto.
function leque(base,dir,n,comp,partes,rng){const ang0=Math.atan2(dir.z,dir.x);for(let i=0;i<n;i++){const a=ang0+(i/(n-1)-.5)*1.6+(rng()-.5)*.2,d=V(Math.cos(a),.12,Math.sin(a)).normalize();folhaComposta(base,d,comp*(.85+rng()*.3),partes,i%2?R.outono[3]:R.outono[2]);}}
// Vagem segmentada como colar de contas: gomos achatados alternando com estrangulamentos, numa curva suave pendente.
function vagem(pendura,comp,giro,partes,rng,estado){
 const n=5+Math.floor(rng()*3),curva=(rng()-.5)*.6,tons=[R.terra[2],R.terra[1],R.outono[0]],tom=tons[Math.floor(rng()*3)],locais=[];
 const pts=[];for(let i=0;i<=n;i++){const t=i/n;pts.push(V(Math.sin(t*1.2)*curva*comp,-t*comp,0));}
 const c=new THREE.CatmullRomCurve3(pts);
 locais.push(cor(tuboR([V(0,.1,0),V(0,.05,0),V(0,0,0)],()=>.012,3,5).g,R.pedra[1]));
 for(let i=0;i<n;i++){const p=c.getPointAt((i+.5)/n),r=comp/n*.55;locais.push(bola(p,r,tom,[1.15,1,.55],1));}
 locais.push(cor(tuboR(pts,()=>comp/n*.18,n*3,5).g,R.terra[2]));
 const m=new THREE.Matrix4().makeRotationY(giro);for(const g of locais){g.applyMatrix4(m);g.translate(pendura.x,pendura.y-.1,pendura.z);partes.push(g);}
 estado.vagens++;estado.gomos+=n;
}
export function criarAcaciaMosaicos(semente, juntar){
 const rng=criarRng(semente),estagios=[],relatorio=[],nova=()=>Math.floor(rng()*1e6),ruido=criarRuido(semente+7);
 for(let fase=0;fase<4;fase++){
  const partes=[],estado={vagens:0,gomos:0};let troncos=0,placas=0;
  if(fase===0){
   // Broto: o primeiro par de folhas compostas, abertas para os lados sobre um caule curto.
   partes.push(bola(V(0,.02,0),.22,R.terra[2],[1,.2,1]));
   partes.push(graveto([V(0,0,0),V(.01,.1,0),V(0,.18,0)],.012,.009,R.outono[2]));
   folhaComposta(V(0,.18,0),V(1,.25,.15).normalize(),.26,partes,R.outono[3]);folhaComposta(V(0,.18,0),V(-1,.25,-.15).normalize(),.24,partes,R.amarelo[1]);
  }
  if(fase===1){
   // Muda: eixo fino com dois leques laterais de folhas compostas, em alturas diferentes, e um pequeno no alto.
   partes.push(bola(V(0,.02,0),.4,R.terra[2],[1,.15,1]));
   const eixo=[V(0,0,0),V(.03,.5,0),V(-.02,.95,.02),V(0,1.2,0)];partes.push(graveto(eixo,.035,.018,R.pedra[1]));troncos++;
   for(const [y,a,alc] of [[.55,.3,.32],[.85,3.5,.28]]){const d=V(Math.cos(a),0,Math.sin(a)),o=V(.02,y,0),f=o.clone().addScaledVector(d,alc).add(V(0,.06,0));partes.push(graveto([o,o.clone().lerp(f,.5).add(V(0,.04,0)),f],.016,.01,R.pedra[1]));leque(f,d,5,.26,partes,rng);}
   leque(V(0,1.2,0),V(0,0,1),4,.2,partes,rng);
  }
  if(fase>=2){
   const adulto=fase===3,s=adulto?1:.48;
   partes.push(bola(V(0,.02,0),adulto?2.4:1.2,R.terra[2],[1,.08,1],2));
   // Tronco curto que logo se divide; os troncos finos sobem inclinados, abertos em leque, com curvas suaves.
   const base=adulto?.55:.3,r0=adulto?.32:.13;
   partes.push(galho([V(0,0,0),V(.02,base*.5,0),V(0,base,.01)],r0,r0*.85,nova()).geo);troncos++;
   const nT=adulto?4:2,topos=[];
   for(let i=0;i<nT;i++){
    const a=(i*360/nT+30+(rng()-.5)*40)*GRAUS,d=V(Math.cos(a),0,Math.sin(a)),alc=(adulto?2.1:.8)*(.75+rng()*.5),h=(adulto?3.3:1.6)*(.85+rng()*.3),lado=V(-d.z,0,d.x),o=V(0,base,0).addScaledVector(d,r0*.4);
    const pts=[o,o.clone().addScaledVector(d,alc*.3).addScaledVector(lado,(rng()-.5)*.25*s).add(V(0,h*.35,0)),o.clone().addScaledVector(d,alc*.7).addScaledVector(lado,(rng()-.5)*.3*s).add(V(0,h*.72,0)),o.clone().addScaledVector(d,alc).add(V(0,h,0))];
    partes.push(galho(pts,r0*.62,r0*.36,nova()).geo);troncos++;topos.push({p:pts[3],d});
   }
   // Topo da copa: guarda-sol largo, fino e assimétrico (mais comprido para um lado), levemente abaulado no centro.
   const yC=Math.max(...topos.map(t=>t.p.y))+(adulto?.35:.2),Rx=(adulto?4.1:1.9),Rz=(adulto?3.1:1.5),giroC=rng()*Math.PI,cg=Math.cos(giroC),sg=Math.sin(giroC);
   const dentro=(x,z)=>{const u=(x*cg+z*sg)/Rx,w=(-x*sg+z*cg)/Rz,a=Math.atan2(w,u),borda=1+.18*ruido(Math.cos(a)*1.5,Math.sin(a)*1.5,2);return Math.hypot(u,w)/borda;};
   // Galhos quase horizontais irradiam do alto de cada tronco até perto da borda, logo abaixo da copa.
   for(const t of topos){const nG=adulto?4:2;for(let k=0;k<nG;k++){const a=Math.atan2(t.d.z,t.d.x)+((k-(nG-1)/2)*.75+(rng()-.5)*.4),d=V(Math.cos(a),0,Math.sin(a));let alc=adulto?2.4:1.1;for(let q=0;q<20&&dentro(t.p.x+d.x*alc,t.p.z+d.z*alc)>.85;q++)alc*=.9;
     const fim=t.p.clone().addScaledVector(d,alc).setY(yC-.18),m=t.p.clone().lerp(fim,.45).add(V(0,.05,0));partes.push(galho([t.p,m,fim],r0*.3,r0*.12,nova()).geo);
     // Raminhos finos que sobem até a copa.
     for(let j=0;j<(adulto?3:1);j++){const o=t.p.clone().lerp(fim,.35+j*.22),f2=o.clone().add(V((rng()-.5)*.5,yC-o.y-.08,(rng()-.5)*.5));partes.push(graveto([o,o.clone().lerp(f2,.5).add(V((rng()-.5)*.15,0,(rng()-.5)*.15)),f2],r0*.08,r0*.04,R.pedra[1]));}}}
   // O mosaico: placas pequenas encaixadas numa grade irregular dentro do contorno, em amarelos e laranjas que mudam por manchas.
   const tons=[R.outono[2],R.outono[3],R.amarelo[1],R.outono[3],R.outono[2]],passo=adulto?.7:.5,cel=[];
   for(let x=-Rx-.5;x<=Rx+.5;x+=passo)for(let z=-Rx-.5;z<=Rx+.5;z+=passo*.87){const xx=x+((Math.round(z/(passo*.87))%2)?passo/2:0)+(rng()-.5)*passo*.35,zz=z+(rng()-.5)*passo*.35,d=dentro(xx,zz);if(d>1)continue;cel.push([xx,zz,d]);}
   for(const [x,z,d] of cel){
    const y=yC+(1-d*d)*(adulto?.16:.1)-(d>.8?(d-.8)*.6:0)+(rng()-.5)*.06,r=passo*(.62+rng()*.18),mancha=ruido(x*.35+4,z*.35+9,2),ti=Math.max(0,Math.min(4,Math.floor((mancha+1)*2.5+(rng()-.5)*1.2)));
    partes.push(placa(V(x,y,z),r,nova(),.24,tons[ti],rng()*Math.PI));placas++;
   }
   // Vagens segmentadas: poucas, penduradas sob a borda da copa, em grupinhos.
   if(adulto){
    for(let g=0;g<5;g++){const a=g/5*Math.PI*2+rng()*.8,uR=.97+rng()*.08,x0=Math.cos(a)*Rx*uR,z0=Math.sin(a)*Rz*uR,x=x0*cg-z0*sg,z=x0*sg+z0*cg;for(let k=0;k<2+(rng()<.5?1:0);k++){vagem(V(x+(rng()-.5)*.4,yC-.2,z+(rng()-.5)*.4),.42+rng()*.14,rng()*Math.PI,partes,rng,estado);}}
   }
  }
  const geo=juntar(partes);geo.computeBoundingBox();
  geo.userData.proposta={fase,troncos,placas,vagens:estado.vagens,gomos:estado.gomos};estagios.push(geo);relatorio.push(geo.userData.proposta);for(const g of partes)g.dispose();
 }
 return {estagios,relatorio};
}
