/** Oliveira dos Nós (Bosque de Pediatria — Reumatologia). Referência: oliveira centenária do Mediterrâneo (Olea europaea) — tronco curto e largo de feixes torcidos em espiral, com vãos e nós grandes; braços retorcidos; copa arredondada verde-acinzentada e poucas azeitonas. Modelo aprovado. */
import * as THREE from 'three';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import { criarRng, criarRuido } from './mundo.js';
import { RAMPAS as R } from './paleta.js';
const V=(x=0,y=0,z=0)=>new THREE.Vector3(x,y,z), CIMA=V(0,1,0), GRAUS=Math.PI/180;
function cor(g,hex){const c=new THREE.Color(hex),p=g.attributes.position,a=new Float32Array(p.count*3);for(let i=0;i<p.count;i++)c.toArray(a,i*3);g.setAttribute('color',new THREE.BufferAttribute(a,3));return g.index?g.toNonIndexed():g;}
function bola(c,r,hex,escala=[1,1,1],det=1){const g=new THREE.IcosahedronGeometry(r,det);g.scale(...escala);g.translate(c.x,c.y,c.z);return cor(g,hex);}
function tuboR(pontos,raio,n=20,lados=9){const curva=new THREE.CatmullRomCurve3(pontos.map(p=>p.clone()),false,'centripetal'),g=new THREE.TubeGeometry(curva,n,1,lados,false),p=g.attributes.position;for(let i=0;i<=n;i++){const c=curva.getPointAt(i/n);for(let j=0;j<=lados;j++){const idx=i*(lados+1)+j,k=raio(i/n,j/lados*Math.PI*2),v=V().fromBufferAttribute(p,idx).sub(c).multiplyScalar(k).add(c);p.setXYZ(idx,v.x,v.y,v.z);}}g.computeVertexNormals();return {g,curva};}
// Lenho da oliveira: veios longos que acompanham a torção de cada feixe; cor única por face, tirada de uma função
// contínua (sem degradê nem blocos), em castanho com cristas claras.
function lenho(pontos,r0,r1,semente,sulcos=5){
 const ruido=criarRuido(semente),comp=new THREE.CatmullRomCurve3(pontos.map(p=>p.clone())).getLength(),grosso=r0>.12,lados=grosso?14:r0>.05?9:6,n=Math.max(6,Math.ceil(comp/(grosso?.1:.16)));
 const valor=(t,a)=>{const s=t*comp;return Math.sin(a*sulcos+s*.9+ruido(s*1.2+Math.cos(a)*.5,Math.sin(a)*.5,2)*1.8)+.25*ruido(s*3+Math.cos(a),Math.sin(a),1);};
 const raio=(t,a)=>(r0+(r1-r0)*t)*(1+(grosso?.1:.04)*Math.max(-1,Math.min(1,valor(t,a))));
 const {g,curva}=tuboR(pontos,raio,n,lados),val=new Float32Array(g.attributes.position.count);
 for(let i=0;i<=n;i++)for(let j=0;j<=lados;j++)val[i*(lados+1)+j]=valor(i/n,j/lados*Math.PI*2);
 g.setAttribute('casca',new THREE.BufferAttribute(val,1));
 const plano=g.toNonIndexed(),v3=plano.attributes.casca,pintura=new Float32Array(plano.attributes.position.count*3),sulco=new THREE.Color(R.terra[1]),meio=new THREE.Color(R.terra[2]),crista=new THREE.Color(R.terra[3]);
 for(let k=0;k<v3.count/3;k++){const m=(v3.getX(k*3)+v3.getX(k*3+1)+v3.getX(k*3+2))/3,c=m<-.3?sulco:m>.6?crista:meio;for(let v=0;v<3;v++)c.toArray(pintura,(k*3+v)*3);}
 plano.deleteAttribute('casca');plano.setAttribute('color',new THREE.BufferAttribute(pintura,3));return {geo:plano,curva,r0,r1};
}
function graveto(pontos,r0,r1,hex=R.terra[2]){const {g}=tuboR(pontos,t=>r0+(r1-r0)*t,6,5);return cor(g,hex);}
// Nó: calombo de lenho, um volume irregular meio enterrado no feixe, mais claro no alto.
function no(c,r,semente,partes){const ruido=criarRuido(semente);let g=new THREE.IcosahedronGeometry(r,2);const p=g.attributes.position;for(let i=0;i<p.count;i++){const x=p.getX(i),y=p.getY(i),z=p.getZ(i),k=.8+ruido(x*6/r,y*6/r+z*3/r,2)*.3;p.setXYZ(i,x*k*1.1,y*k*.85,z*k);}g.computeVertexNormals();g.translate(c.x,c.y,c.z);
 const a=new Float32Array(p.count*3),cl=new THREE.Color(R.terra[3]),md=new THREE.Color(R.terra[2]);for(let i=0;i<p.count;i++)(p.getY(i)>c.y+r*.25?cl:md).toArray(a,i*3);g.setAttribute("color",new THREE.BufferAttribute(a,3));partes.push(g.index?g.toNonIndexed():g);}
// Tufo de folhagem verde-acinzentada, com o desenho de aglomerados do jardim (banda/esfera lidas por estiloCopa).
function tufo(c,r,semente,achatar=.72,hex=R.salvia[2]){
 let g=new THREE.IcosahedronGeometry(1,2);g.deleteAttribute('normal');g.deleteAttribute('uv');g=mergeVertices(g);
 const p=g.attributes.position,esf=new Float32Array(p.count*3),banda=new Float32Array(p.count),ruido=criarRuido(semente);
 for(let i=0;i<p.count;i++){const x=p.getX(i),y=p.getY(i),z=p.getZ(i),k=r*(.8+ruido(x*2+3,y*2+z+7,2)*.36);esf.set([x,y,z],i*3);banda[i]=y;p.setXYZ(i,c.x+x*k,c.y+y*k*achatar,c.z+z*k);}
 g.setAttribute('banda',new THREE.BufferAttribute(banda,1));g.setAttribute('esfera',new THREE.BufferAttribute(esf,3));g.setAttribute('raioCopa',new THREE.BufferAttribute(new Float32Array(p.count).fill(r),1));g.setAttribute('semCopa',new THREE.BufferAttribute(new Float32Array(p.count).fill((semente*.6180339)%1),1));g.computeVertexNormals();return cor(g,hex);
}
// Folha da oliveira: estreita e comprida, verde-acinzentada em cima e prateada no verso.
function folha(c,tam,ang,giro,hex=R.salvia[2]){const s=new THREE.Shape();s.moveTo(0,0);s.bezierCurveTo(-.2,.3,-.2,1.3,0,1.9);s.bezierCurveTo(.2,1.3,.2,.3,0,0);const g=new THREE.ShapeGeometry(s,5);g.scale(tam*.5,tam,1);g.rotateZ(ang);g.rotateY(giro);g.translate(c.x,c.y,c.z);return cor(g,hex);}
function paresDeFolhas(curva,n,tam,partes,inicio=.3){for(let i=0;i<n;i++){const t=inicio+(1-inicio)*i/Math.max(1,n-1),p=curva.getPointAt(t);for(const s of [-1,1])partes.push(folha(p,tam,s*1.05,i*1.57,s<0?R.salvia[2]:R.salvia[4]));}}
// Azeitona: pequena e oval, verde ou roxa, com um pedúnculo curto.
function azeitona(p,partes,rng,estado){const roxa=rng()<.45,o=p.clone().add(V(0,-.09,0));partes.push(graveto([p,p.clone().lerp(o,.5),o],.008,.006,R.mata[1]),bola(o.clone().add(V(0,-.05,0)),.055,roxa?R.lilas[0]:R.mata[4],[1,1.3,1],1));estado.azeitonas++;}
// Feixes do tronco: hélices em volta de um eixo comum, com o raio da hélice diminuindo para cima; ao se afastarem
// entre si deixam vãos (os ocos), e no alto se juntam e se abrem nos braços.
function feixes(n,hT,rBase,rFeixe,voltas,partes,rng,nova,estado){
 const lista=[];for(let k=0;k<n;k++){const f0=k/n*Math.PI*2+(rng()-.5)*.4,pts=[];for(let i=0;i<=8;i++){const u=i/8,a=f0+u*voltas*Math.PI*2,rr=rBase*(1-.42*u)*(.9+.2*Math.sin(u*5+k)),y=u*hT;pts.push(V(Math.cos(a)*rr,y,Math.sin(a)*rr));}
  const f=lenho(pts,rFeixe*(1.1+rng()*.25),rFeixe*.7,nova(),4);partes.push(f.geo);lista.push(f);estado.feixes++;}
 return lista;
}
export function criarOliveiraNos(semente, juntar){
 const rng=criarRng(semente),estagios=[],relatorio=[],nova=()=>Math.floor(rng()*1e6);
 for(let fase=0;fase<4;fase++){
  const partes=[],estado={feixes:0,nos:0,azeitonas:0};let tufos=0;
  if(fase===0){
   // Broto: folhas estreitas aos pares, verde-acinzentadas em cima e prateadas no verso.
   partes.push(bola(V(0,.02,0),.22,R.terra[2],[1,.2,1]));
   const pts=[V(0,0,0),V(.01,.12,0),V(0,.24,0)];partes.push(graveto(pts,.014,.01,R.salvia[1]));paresDeFolhas(new THREE.CatmullRomCurve3(pts),2,.13,partes,.55);
  }
  if(fase===1){
   // Muda: caule fino com o primeiro nó, um calombo a meia altura, e pares de folhas estreitas.
   partes.push(bola(V(0,.02,0),.4,R.terra[2],[1,.15,1]));
   const pts=[V(0,0,0),V(.03,.35,0),V(-.04,.7,.02),V(.02,1.1,0)];partes.push(graveto(pts,.04,.02,R.terra[2]));estado.feixes++;
   no(V(.03,.42,0),.065,nova(),partes);estado.nos++;
   paresDeFolhas(new THREE.CatmullRomCurve3(pts),5,.16,partes,.45);
  }
  if(fase>=2){
   const adulto=fase===3,s=adulto?1:.5;
   partes.push(bola(V(0,.02,0),adulto?2.4:1.2,R.terra[2],[1,.08,1],2));
   // Tronco: feixes torcidos em espiral (dois na jovem, que começa a torcer; quatro na adulta, larga e entrelaçada).
   const hT=adulto?1.35:.95,lista=feixes(adulto?4:2,hT,adulto?.5:.12,adulto?.25:.09,adulto?.6:.3,partes,rng,nova,estado);
   // Nós: calombos grandes na base e nos encontros dos feixes; menores mais acima.
   const nN=adulto?7:2;for(let i=0;i<nN;i++){const f=lista[i%lista.length],t=i<3?.05+rng()*.15:.3+rng()*.55,c=f.curva.getPointAt(t),fora=V(c.x,0,c.z).normalize();no(c.clone().addScaledVector(fora,f.r0*.55),(adulto?.17:.07)*(i<3?1.2:.8)*(.8+rng()*.4),nova(),partes);estado.nos++;}
   // Braços grossos e retorcidos saem do alto dos feixes, inclinados para fora e torcendo.
   const topo=V(0,hT,0),nB=adulto?4:3,pontas=[],braços=[],rTopo=adulto?.3:.07;
   for(let i=0;i<nB;i++){const a=(i*360/nB+25+(rng()-.5)*40)*GRAUS,d=V(Math.cos(a),0,Math.sin(a)),lado=V(-d.z,0,d.x),alc=(adulto?1.6:.75)*(.8+rng()*.4),h=(adulto?1.7:.9)*(.8+rng()*.4),o=topo.clone().addScaledVector(d,rTopo);
    const pts=[o,o.clone().addScaledVector(d,alc*.3).addScaledVector(lado,.25*s).add(V(0,h*.35,0)),o.clone().addScaledVector(d,alc*.65).addScaledVector(lado,-.2*s).add(V(0,h*.7,0)),o.clone().addScaledVector(d,alc).add(V(0,h,0))];
    const b=lenho(pts,(adulto?.22:.08),(adulto?.1:.04),nova(),5);partes.push(b.geo);pontas.push({p:pts[3],d,r:adulto?.1:.04});braços.push(b);
    if(adulto&&rng()<.6){no(b.curva.getPointAt(.4+rng()*.2),.11,nova(),partes);estado.nos++;}
    // Dois ou três ramos de cada braço levam a folhagem para fora.
    const nr=adulto?3:2;for(let k=0;k<nr;k++){const d2=d.clone().applyAxisAngle(CIMA,(k-(nr-1)/2)*.9+(rng()-.5)*.3),ini=b.curva.getPointAt(.7+k*.1),f=ini.clone().addScaledVector(d2,(adulto?.9:.4)*(.7+rng()*.5)).add(V(0,(adulto?.45:.2)*(.5+rng()),0));partes.push(lenho([ini,ini.clone().lerp(f,.5).add(V(0,.08*s,0)),f],adulto?.06:.025,adulto?.03:.012,nova(),3).geo);pontas.push({p:f,d:d2,r:.03});}
   }
   // Copa arredondada e irregular: tufos verde-acinzentados em volta das pontas, os de baixo mais prateados.
   const yMed=pontas.reduce((m,p)=>m+p.p.y,0)/pontas.length,grupos=[];
   const tonsCopa=[R.salvia[1],R.salvia[2],R.salvia[2],R.mata[2]];
   for(const pt of pontas){const r=(adulto?.5:.3)*(.8+rng()*.4),c=pt.p.clone().add(V(0,r*.15,0));grupos.push({c,r});const baixo=c.y<yMed;
    partes.push(tufo(c,r,nova(),.62,baixo?R.salvia[3]:tonsCopa[Math.floor(rng()*4)]));tufos++;
    if(adulto)for(let k=0;k<2;k++){const a=rng()*Math.PI*2;partes.push(tufo(c.clone().add(V(Math.cos(a)*r*.75,(rng()-.6)*r*.4,Math.sin(a)*r*.75)),r*(.65+rng()*.2),nova(),.6,rng()<.5?R.salvia[3]:tonsCopa[Math.floor(rng()*4)]));tufos++;}}
   // Tufos ao longo do fim de cada braço preenchem os vãos: a copa da oliveira é cheia e arredondada, não em bolas soltas.
   if(adulto)for(const b of braços)for(const t of [.62,.82]){const p=b.curva.getPointAt(t),a=rng()*Math.PI*2,r=.48*(.8+rng()*.4);partes.push(tufo(p.clone().add(V(Math.cos(a)*.3,r*.35,Math.sin(a)*.3)),r,nova(),.62,rng()<.4?R.salvia[3]:tonsCopa[Math.floor(rng()*4)]));tufos++;}
   // Azeitonas: poucas, presas aos ramos sob a borda dos tufos.
   if(adulto){let n=0;for(const gr of grupos){if(rng()<.45)continue;const q=1+(rng()<.5?1:0);for(let k=0;k<q&&n<14;k++,n++){const a=rng()*Math.PI*2;azeitona(gr.c.clone().add(V(Math.cos(a)*gr.r*.8,-gr.r*.45,Math.sin(a)*gr.r*.8)),partes,rng,estado);}}}
  }
  const geo=juntar(partes);geo.computeBoundingBox();
  geo.userData.proposta={fase,feixes:estado.feixes,nos:estado.nos,copas:tufos,azeitonas:estado.azeitonas};estagios.push(geo);relatorio.push(geo.userData.proposta);for(const g of partes)g.dispose();
 }
 return {estagios,relatorio};
}
