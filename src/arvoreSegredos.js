/** Árvore dos Segredos (Bosque de Pediatria — Infectologia). Referência: barbatimão (Stryphnodendron adstringens), árvore do cerrado — tronco baixo, grosso e tortuoso de casca sulcada, galhos em zigue-zague, copa larga e rala de tufos com folhas compostas e vagens grossas; as vagens abertas mostram sementes claras que acendem de leve à noite (atributo brilhoNoite). Modelo aprovado. */
import * as THREE from 'three';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import { criarRng, criarRuido } from './mundo.js';
import { RAMPAS as R } from './paleta.js';
const V=(x=0,y=0,z=0)=>new THREE.Vector3(x,y,z), CIMA=V(0,1,0), GRAUS=Math.PI/180;
function cor(g,hex){const c=new THREE.Color(hex),p=g.attributes.position,a=new Float32Array(p.count*3);for(let i=0;i<p.count;i++)c.toArray(a,i*3);g.setAttribute('color',new THREE.BufferAttribute(a,3));return g.index?g.toNonIndexed():g;}
function bola(c,r,hex,escala=[1,1,1],det=1){const g=new THREE.IcosahedronGeometry(r,det);g.scale(...escala);g.translate(c.x,c.y,c.z);return cor(g,hex);}
// Luz noturna (atributo brilhoNoite, lido por estiloCopa.js): só as sementes das vagens abertas acendem de leve à noite.
function noturna(g,v){g.userData.noite=v;return g;}
// Tubo com raio dado por uma função de (t, ângulo): permite casca com placas em relevo.
function tuboR(pontos,raio,n=20,lados=9){const curva=new THREE.CatmullRomCurve3(pontos.map(p=>p.clone()),false,'centripetal'),g=new THREE.TubeGeometry(curva,n,1,lados,false),p=g.attributes.position;for(let i=0;i<=n;i++){const c=curva.getPointAt(i/n);for(let j=0;j<=lados;j++){const idx=i*(lados+1)+j,k=raio(i/n,j/lados*Math.PI*2),v=V().fromBufferAttribute(p,idx).sub(c).multiplyScalar(k).add(c);p.setXYZ(idx,v.x,v.y,v.z);}}g.computeVertexNormals();return {g,curva};}
// Casca suberosa do cerrado: sulcos longitudinais que ondulam e acompanham as curvas do galho, com cristas em leve
// relevo. Tudo sai de uma função contínua (sem blocos nem anéis desalinhados). Cada face tem uma cor só, tirada da
// média da função nos seus vértices: os sulcos ficam nítidos no pixel, sem degradê. Fissura em marrom escuro, não preto.
function galhoSuberoso(pontos,r0,r1,semente,n=24,lados=12){
 const ruido=criarRuido(semente),grosso=r0>.18,comp=new THREE.CatmullRomCurve3(pontos.map(p=>p.clone())).getLength();
 lados=grosso?18:r0>.08?12:8;n=Math.max(n,Math.ceil(comp/(grosso?.11:.14)));
 const K=grosso?7:r0>.08?5:3;
 // Valor da casca em (t, ângulo): seno em volta do galho (os sulcos), entortado por ruído ao longo do comprimento.
 const valor=(t,a)=>{const s=t*comp;return Math.sin(a*K+ruido(s*1.1+Math.cos(a)*.6,Math.sin(a)*.6,2)*2.2)+.3*ruido(s*2.6+Math.cos(a),Math.sin(a)*1.3,1);};
 const amp=grosso?.11:.06,raio=(t,a)=>(r0+(r1-r0)*Math.pow(t,.8))*(1+amp*Math.max(-1,Math.min(1,valor(t,a))));
 const {g,curva}=tuboR(pontos,raio,n,lados),val=new Float32Array(g.attributes.position.count);
 for(let i=0;i<=n;i++)for(let j=0;j<=lados;j++)val[i*(lados+1)+j]=valor(i/n,j/lados*Math.PI*2);
 g.setAttribute('casca',new THREE.BufferAttribute(val,1));
 const plano=g.toNonIndexed(),v3=plano.attributes.casca,pintura=new Float32Array(plano.attributes.position.count*3);
 const sulco=new THREE.Color(R.terra[1]),meio=new THREE.Color(R.terra[2]),crista=new THREE.Color(grosso?R.terra[3]:R.terra[2]);
 for(let k=0;k<v3.count/3;k++){const m=(v3.getX(k*3)+v3.getX(k*3+1)+v3.getX(k*3+2))/3,c=m<-.3?sulco:m>.6?crista:meio;for(let v=0;v<3;v++)c.toArray(pintura,(k*3+v)*3);}
 plano.deleteAttribute('casca');plano.setAttribute('color',new THREE.BufferAttribute(pintura,3));return {geo:plano,curva,r0,r1};
}
// Galho fino e liso (pontas novas), quase sem placas.
function graveto(pontos,r0,r1,hex=R.terra[1]){const {g}=tuboR(pontos,t=>r0+(r1-r0)*t,8,6);return cor(g,hex);}
// Tufo de folhagem: volume baixo e irregular, com o desenho de aglomerados do jardim (banda/esfera lidas por estiloCopa).
function tufo(c,r,semente,achatar=.55,hex=R.mata[2]){
 let g=new THREE.IcosahedronGeometry(1,2);g.deleteAttribute('normal');g.deleteAttribute('uv');g=mergeVertices(g);
 const p=g.attributes.position,esf=new Float32Array(p.count*3),banda=new Float32Array(p.count),ruido=criarRuido(semente);
 for(let i=0;i<p.count;i++){const x=p.getX(i),y=p.getY(i),z=p.getZ(i),k=r*(.74+ruido(x*2.2+3,y*2.2+z+7,2)*.5);esf.set([x,y,z],i*3);banda[i]=y;p.setXYZ(i,c.x+x*k*1.15,c.y+(y<0?y*.6:y)*k*achatar,c.z+z*k);}
 g.setAttribute('banda',new THREE.BufferAttribute(banda,1));g.setAttribute('esfera',new THREE.BufferAttribute(esf,3));g.setAttribute('raioCopa',new THREE.BufferAttribute(new Float32Array(p.count).fill(r),1));g.setAttribute('semCopa',new THREE.BufferAttribute(new Float32Array(p.count).fill((semente*.6180339)%1),1));g.computeVertexNormals();return cor(g,hex);
}
// Folha composta (como a do barbatimão): ráquis com pares de folíolos pequenos e arredondados.
function folhaComposta(base,dir,comp,partes,rng,hex=R.mata[3]){
 const lado=V().crossVectors(dir,CIMA).normalize(),fim=base.clone().addScaledVector(dir,comp).add(V(0,-comp*.15,0));
 partes.push(graveto([base,base.clone().lerp(fim,.5).add(V(0,comp*.05,0)),fim],.008,.005,R.mata[1]));
 const pares=5;for(let i=0;i<pares;i++){const t=.25+.7*i/(pares-1),p=base.clone().lerp(fim,t).add(V(0,comp*.05*Math.sin(Math.PI*t),0)),tam=comp*(.13-.03*t);
  for(const s of [-1,1]){const g=new THREE.CircleGeometry(tam,6);g.scale(1,.62,1);g.rotateX(-Math.PI/2+.25);const q=new THREE.Quaternion().setFromUnitVectors(V(1,0,0),lado.clone().multiplyScalar(s).add(dir.clone().multiplyScalar(.35)).normalize());g.applyQuaternion(q);const c=p.clone().addScaledVector(lado,s*tam*.9);g.translate(c.x,c.y,c.z);partes.push(cor(g,i%2?hex:R.mata[2]));}}
}
// Folha dobrada ao meio pela nervura, as duas metades em V, como um livro entreaberto (broto).
function folhaDobrada(c,tam,giro,abre,hex=R.mata[3],hex2=R.mata[4]){const partes=[];for(const s of [-1,1]){const f=new THREE.Shape();f.moveTo(0,0);f.bezierCurveTo(s*.42,.25,s*.46,1.1,0,1.7);f.lineTo(0,0);const g=new THREE.ShapeGeometry(f,6);g.scale(tam*.55,tam,1);g.rotateY(s*abre);g.rotateX(-.35);g.rotateY(giro);g.translate(c.x,c.y,c.z);partes.push(cor(g,s<0?hex:hex2));}return partes;}
// Vagem grossa e levemente curva (barbatimão: 10–15 cm numa árvore de 4–6 m; aqui um pouco maior para ser legível).
function arcoVagem(comp,curva,lado){const pts=[],n=6,Ra=comp/curva;for(let i=0;i<=n;i++){const th=i/n*curva;pts.push(V(lado*Ra*(1-Math.cos(th)),-Ra*Math.sin(th),0));}return pts;}
function vagem(pendura,comp,giro,inclina,aberta,partes,rng,estado){
 const curva=.6+rng()*.6,lado=rng()<.5?-1:1,pts=arcoVagem(comp,curva,lado),rMax=comp*.14,raio=t=>rMax*(.3+.7*Math.pow(Math.sin(Math.PI*Math.min(1,t*1.05)),.5));
 const tom=aberta?R.terra[1]:rng()<.6?R.terra[0]:R.outono[0],locais=[];
 if(!aberta){const {g}=tuboR(pts,t=>raio(t),10,7);g.scale(1,1,.6);locais.push(cor(g,tom));estado.fechadas++;}
 else{
  const curvaC=new THREE.CatmullRomCurve3(pts.map(p=>p.clone()));
  for(const s of [-1,1]){const {g}=tuboR(pts,t=>raio(t),10,7);g.scale(1,1,.3);g.translate(0,0,s*rMax*.6);const a=pts[0],b=pts[pts.length-1],eixo=b.clone().sub(a).normalize(),q=new THREE.Quaternion().setFromAxisAngle(eixo,s*.9);g.translate(-a.x,-a.y,-a.z);g.applyQuaternion(q);g.translate(a.x,a.y,a.z);locais.push(cor(g,s<0?tom:R.terra[3]));}
  const nS=3+Math.floor(rng()*2);for(let i=0;i<nS;i++){const p=curvaC.getPointAt(.25+.5*i/(nS-1));locais.push(noturna(bola(p,rMax*.62,i%2?R.betula[0]:R.luz[0],[1,1,1],1),.7));estado.perolas++;}
  estado.abertas++;
 }
 locais.push(graveto([V(0,.12,0),V(lado*.015,.06,0),V(0,0,0)],.012,.01,R.terra[1]));
 const m=new THREE.Matrix4().makeRotationY(giro).multiply(new THREE.Matrix4().makeRotationZ(inclina));
 for(const g of locais){g.applyMatrix4(m);g.translate(pendura.x,pendura.y-.12,pendura.z);partes.push(g);}
}
// Gira uma direção em volta de um eixo horizontal aleatório e limita a inclinação: é o que cria o zigue-zague dos galhos do cerrado.
function desviar(dir,ang,rng,yMin=.05,yMax=.75){const eixo=V(rng()-.5,(rng()-.5)*.4,rng()-.5).normalize(),d=dir.clone().applyAxisAngle(eixo,ang);d.y=Math.min(yMax,Math.max(yMin,d.y));return d.normalize();}
// Galho em zigue-zague: vários segmentos curtos, cada um mudando de direção num nó; ao fim, divide-se em dois ou três.
function ramificar(ini,dir,comp,r,nivel,maxNivel,ctx){
 const {rng,partes,pontas}=ctx,nos=nivel===0?3:2,pts=[ini.clone()];let d=dir.clone(),p=ini.clone();
 for(let i=0;i<nos;i++){d=desviar(d,(28+rng()*30)*GRAUS,rng,nivel===0?.38:.14,nivel===0?.9:.6);p=p.clone().addScaledVector(d,comp/nos*(.8+rng()*.4));pts.push(p);}
 const rFim=r*.62,gl=r>.05?galhoSuberoso(pts,r,rFim,ctx.nova(),10+nos*4,r>.12?12:8):{geo:graveto(pts,r,rFim)};partes.push(gl.geo);ctx.galhos++;
 if(nivel>=maxNivel){pontas.push({p,d,r:rFim});return;}
 const filhos=rng()<.3?3:2;
 for(let k=0;k<filhos;k++){const nd=desviar(d,(32+rng()*30)*GRAUS,rng,.15,.6);nd.applyAxisAngle(CIMA,(k-(filhos-1)/2)*(.9+rng()*.5));ramificar(p,nd,comp*(.62+rng()*.18),rFim*(.8-k*.08),nivel+1,maxNivel,ctx);}
 // Às vezes um galho curto e torto sai do meio do segmento, como nas árvores do cerrado.
 if(nivel===0&&rng()<.5){const m=pts[2],nd=desviar(d,(60+rng()*30)*GRAUS,rng,.2,.5);ramificar(m,nd,comp*.45,r*.5,maxNivel,maxNivel,ctx);}
}
export function criarArvoreSegredos(semente, juntar){
 const rng=criarRng(semente),estagios=[],relatorio=[],nova=()=>Math.floor(rng()*1e6);
 for(let fase=0;fase<4;fase++){
  const partes=[],estado={fechadas:0,abertas:0,perolas:0};let tufos=0;const ctx={rng,partes,nova,pontas:[],galhos:0};
  if(fase===0){
   // Broto: uma folha dobrada ao meio, ainda fechada como um livro, e outra menor começando a aparecer.
   partes.push(bola(V(0,.02,0),.22,R.terra[1],[1,.2,1]));
   partes.push(graveto([V(0,0,0),V(.02,.1,0),V(-.01,.2,0)],.013,.011,R.mata[2]));
   partes.push(...folhaDobrada(V(-.01,.2,0),.2,.4,.45),...folhaDobrada(V(0,.15,0),.1,2.6,.6,R.mata[2],R.mata[3]));
  }
  if(fase===1){
   // Muda: caule fino e torto, com nós em zigue-zague e as primeiras folhas compostas no alto.
   partes.push(bola(V(0,.02,0),.4,R.terra[1],[1,.15,1]));
   const pts=[V(0,0,0),V(.06,.35,.02),V(-.08,.68,-.03),V(.05,1.0,.04),V(.01,1.18,0)];partes.push(graveto(pts,.04,.02,R.terra[2]));ctx.galhos++;
   for(let i=0;i<5;i++){const a=i*1.3+.4,d=V(Math.cos(a),.35,Math.sin(a)).normalize();folhaComposta(pts[3+(i>2?1:0)].clone(),d,.32,partes,rng);}
   partes.push(...folhaDobrada(pts[4],.1,1.2,.5));
  }
  if(fase>=2){
   const adulto=fase===3;
   partes.push(bola(V(0,.02,0),adulto?2.6:1.3,R.terra[1],[1,.08,1],2));
   // Tronco baixo e grosso, inclinado e torto, com a base alargada; logo se abre em três ou quatro galhos principais.
   const hT=adulto?1.7:.95,r0=adulto?.45:.16,incl=V(.55,0,-.3).normalize(),tPts=[V(0,0,0),V(0,hT*.3,0).addScaledVector(incl,.12),V(0,hT*.62,0).addScaledVector(incl,-.05).add(V(-.1,0,.08)),V(0,hT,0).addScaledVector(incl,.22)];
   const tronco=galhoSuberoso(tPts,r0,r0*.72,nova(),18,adulto?14:10);partes.push(tronco.geo);ctx.galhos++;
   for(let i=0;i<4;i++){const a=(i*90+15+(rng()-.5)*40)*GRAUS,d=V(Math.cos(a),0,Math.sin(a));partes.push(galhoSuberoso([V(0,r0*.9,0).addScaledVector(d,r0*.35),V(0,r0*.3,0).addScaledVector(d,r0*1.1),V(0,.01,0).addScaledVector(d,r0*1.6)],r0*.45,r0*.12,nova(),6,8).geo);}
   const topo=tPts[3],nP=adulto?4:3;
   for(let i=0;i<nP;i++){const a=(i*360/nP+20+(rng()-.5)*50)*GRAUS,d=V(Math.cos(a),.95+rng()*.45,Math.sin(a)).normalize();ramificar(topo.clone().add(V(0,-.05*i,0)),d,(adulto?1.7:.85)*(.8+rng()*.4),r0*.62*(i===0?1:.82),0,adulto?2:1,ctx);}
   // Copa larga e aberta: um tufo baixo em cada ponta, com folhas compostas saindo da borda; vãos entre os tufos deixam ver os galhos.
   const grupos=[];
   for(const [i,pt] of ctx.pontas.entries()){
    const r=(adulto?.44:.32)*(.75+rng()*.5),c=pt.p.clone().add(V(0,r*.2,0));grupos.push({c,r});
    partes.push(tufo(c,r,nova(),.5,i%3===0?R.mata[1]:i%3===1?R.mata[2]:R.mata[3]));tufos++;
    if(adulto&&rng()<.35){const a=rng()*Math.PI*2;partes.push(tufo(c.clone().add(V(Math.cos(a)*r*.7,-r*.12,Math.sin(a)*r*.7)),r*.65,nova(),.5,R.mata[2]));tufos++;}
    for(let k=0;k<(adulto?3:2);k++){const a=rng()*Math.PI*2,d=V(Math.cos(a),.1,Math.sin(a)).normalize();folhaComposta(c.clone().addScaledVector(d,r*.7),d,adulto?.42:.3,partes,rng,k%2?R.mata[3]:R.mata[2]);}
   }
   // Vagens: pequenas e grossas, em cachinhos de duas ou três sob alguns tufos; cerca de um terço aberta.
   if(adulto){
    let n=0;for(const [i,gr] of grupos.entries()){if(i%2)continue;const q=2+(rng()<.4?1:0);for(let k=0;k<q;k++){const a=rng()*Math.PI*2,p=gr.c.clone().add(V(Math.cos(a)*gr.r*.55,-gr.r*.35,Math.sin(a)*gr.r*.55));vagem(p,.34+rng()*.1,a+Math.PI/2+(rng()-.5),(rng()-.5)*.5,(n++%3)===1,partes,rng,estado);}}
   }
  }
  const geo=juntar(partes);geo.computeBoundingBox();
  const noite=new Float32Array(geo.attributes.position.count);let o=0;for(const g of partes){const k=g.attributes.position.count;if(g.userData.noite)noite.fill(g.userData.noite,o,o+k);o+=k;}geo.setAttribute('brilhoNoite',new THREE.BufferAttribute(noite,1));
  geo.userData.proposta={fase,galhos:ctx.galhos,copas:tufos,fechadas:estado.fechadas,abertas:estado.abertas,perolas:estado.perolas};estagios.push(geo);relatorio.push(geo.userData.proposta);for(const g of partes)g.dispose();
 }
 return {estagios,relatorio};
}
