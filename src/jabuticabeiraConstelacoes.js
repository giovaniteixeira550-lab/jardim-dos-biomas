/** Jabuticabeira das Constelações (Bosque de Pediatria — Neurologia): seis troncos lisos, manchados e retorcidos abertos em vaso sob uma copa branca em cúpula; jabuticabas presas à casca em "constelações". À noite a copa ilumina troncos, frutos e o chão (atributo brilhoNoite, lido por estiloCopa.js). Modelo aprovado. */
import * as THREE from 'three';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import { criarRng, criarRuido } from './mundo.js';
import { RAMPAS as R } from './paleta.js';
const V=(x=0,y=0,z=0)=>new THREE.Vector3(x,y,z), CIMA=V(0,1,0), GRAUS=Math.PI/180;
function cor(g,hex){const c=new THREE.Color(hex),p=g.attributes.position,a=new Float32Array(p.count*3);for(let i=0;i<p.count;i++)c.toArray(a,i*3);g.setAttribute('color',new THREE.BufferAttribute(a,3));return g.index?g.toNonIndexed():g;}
function bola(c,r,hex,escala=[1,1,1],det=1){const g=new THREE.IcosahedronGeometry(r,det);g.scale(...escala);g.translate(c.x,c.y,c.z);return cor(g,hex);}
// Peça com luz própria: o atributo brilho (0–1) é lido pelo estilo compartilhado estiloCopa.js.
function acesa(g,brilho){g.userData.brilho=brilho;return g;}
// Luz noturna (atributo brilhoNoite, 0–1): só aparece quando a cena liga a noite. A copa é a fonte; troncos, frutos e o chão
// recebem a luz dela. Um número vale para a peça inteira; 'altura' cresce de baixo para cima; 'chao' cai do centro para a borda.
function noturna(g,modo){g.userData.noite=modo;return g;}
function tubo(pontos,r0,r1,n=20){const curva=new THREE.CatmullRomCurve3(pontos.map(p=>p.isVector3?p.clone():V(...p))),lados=9,g=new THREE.TubeGeometry(curva,n,r0,lados,false),p=g.attributes.position;for(let i=0;i<=n;i++){const c=curva.getPointAt(i/n),k=(r0+(r1-r0)*i/n)/r0;for(let j=0;j<=lados;j++){const idx=i*(lados+1)+j,v=V().fromBufferAttribute(p,idx).sub(c).multiplyScalar(k).add(c);p.setXYZ(idx,v.x,v.y,v.z);}}g.computeVertexNormals();return {g,curva};}
// Tronco liso e manchado: a casca da jabuticabeira descasca em placas claras e escuras.
function troncoManchado(pontos,r0,r1,semente){
 const {g,curva}=tubo(pontos,r0,r1,24),ruido=criarRuido(semente),p=g.attributes.position,a=new Float32Array(p.count*3),claro=new THREE.Color(R.terra[4]),medio=new THREE.Color(R.terra[3]),escuro=new THREE.Color(R.terra[2]);
 for(let i=0;i<p.count;i++){const n=ruido(p.getX(i)*2.4+p.getZ(i)*1.7,p.getY(i)*1.6,2);(n>.18?claro:n<-.22?escuro:medio).toArray(a,i*3);}
 g.setAttribute('color',new THREE.BufferAttribute(a,3));return {geo:g.toNonIndexed(),curva,r0,r1};
}
function ramo(pontos,r0,r1,hex=R.terra[3]){const {g}=tubo(pontos,r0,r1);return cor(g,hex);}
// Volume de folhagem miúda e densa, com o desenho de aglomerados do jardim (banda/esfera lidas por estiloCopa).
function copa(c,r,semente,achatar=.62,hex=R.mata[2]){
 let g=new THREE.IcosahedronGeometry(1,2);g.deleteAttribute('normal');g.deleteAttribute('uv');g=mergeVertices(g);
 const p=g.attributes.position,esf=new Float32Array(p.count*3),banda=new Float32Array(p.count),ruido=criarRuido(semente);
 for(let i=0;i<p.count;i++){const x=p.getX(i),y=p.getY(i),z=p.getZ(i),k=r*(.84+ruido(x*1.7+3,y*1.7+z+7,2)*.28);esf.set([x,y,z],i*3);banda[i]=y;p.setXYZ(i,c.x+x*k,c.y+y*k*achatar,c.z+z*k);}
 g.setAttribute('banda',new THREE.BufferAttribute(banda,1));g.setAttribute('esfera',new THREE.BufferAttribute(esf,3));g.setAttribute('raioCopa',new THREE.BufferAttribute(new Float32Array(p.count).fill(r),1));g.setAttribute('semCopa',new THREE.BufferAttribute(new Float32Array(p.count).fill((semente*.6180339)%1),1));g.computeVertexNormals();return cor(g,hex);
}
// Folha pequena e lanceolada, aos pares opostos; as novas são cor de bronze, como na jabuticabeira real.
function folha(c,tam,ang,giro,hex=R.mata[3]){const s=new THREE.Shape();s.moveTo(0,0);s.bezierCurveTo(-.42,.3,-.36,1.2,0,1.7);s.bezierCurveTo(.36,1.2,.42,.3,0,0);const g=new THREE.ShapeGeometry(s,5);g.scale(tam*.42,tam,1);g.rotateZ(ang);g.rotateY(giro);g.translate(c.x,c.y,c.z);return cor(g,hex);}
function paresDeFolhas(curva,n,tam,partes,inicio=.3,bronzeNoFim=true){for(let i=0;i<n;i++){const t=inicio+(1-inicio)*i/Math.max(1,n-1),p=curva.getPointAt(t),novo=bronzeNoFim&&i>=n-1,hex=novo?R.outono[1]:i%2?R.mata[3]:R.mata[4];for(const s of [-1,1])partes.push(folha(p,tam*(novo?.8:1),s*1.2,i*1.57,hex));}}
// Ponto na superfície de um tronco: curva, posição t (0–1) e ângulo em volta do eixo.
function naCasca(tr,t,ang,afasta=0){const c=tr.curva.getPointAt(t),eixo=tr.curva.getTangentAt(t),l1=V().crossVectors(eixo,Math.abs(eixo.y)>.9?V(1,0,0):CIMA).normalize(),l2=V().crossVectors(eixo,l1),n=l1.multiplyScalar(Math.cos(ang)).addScaledVector(l2,Math.sin(ang)),r=tr.r0+(tr.r1-tr.r0)*t;return {p:c.addScaledVector(n,r+afasta),n};}
// Constelação: grupo de jabuticabas grudadas na casca, umas maiores que as outras;
// algumas têm uma pinta clara que brilha de leve à noite, como estrela.
function constelacao(tr,t,ang,qtd,partes,rng,estado){
 for(let j=0;j<qtd;j++){
  const rb=.067+rng()*.03,tt=Math.min(.95,Math.max(.02,t+(rng()-.5)*.05)),aa=ang+(rng()-.5)*1.5,{p,n}=naCasca(tr,tt,aa,rb*.7);
  partes.push(noturna(bola(p,rb,j%3===0?R.noite[1]:R.lilas[0],[1,1,1],1),'altura'));estado.frutos++;
  if(rng()<.5){const s=p.clone().addScaledVector(n,rb*.7).addScaledVector(CIMA,rb*.3);partes.push(noturna(bola(s,rb*.38,R.luz[0],[1,1,1],0),1));estado.estrelas++;}
 }
}
// Flor da jabuticabeira: tufinho branco de estames, também preso à casca.
function flor(tr,t,ang,partes){const {p,n}=naCasca(tr,t,ang,.03);partes.push(noturna(bola(p,.06,R.betula[0],[1,1,1],0),'altura'),noturna(bola(p.clone().addScaledVector(n,.035),.026,R.amarelo[2],[1,1,1],0),'altura'));}
export function criarJabuticabeiraConstelacoes(semente, juntar){
 const rng=criarRng(semente),estagios=[],relatorio=[],nova=()=>Math.floor(rng()*1e6);
 for(let fase=0;fase<4;fase++){
  const partes=[],estado={frutos:0,estrelas:0};let troncos=0,copas=0,flores=0;
  if(fase===0){
   // Broto: caule curto com folhas pequenas aos pares; o par mais novo, no alto, cor de bronze.
   partes.push(bola(V(0,.02,0),.22,R.terra[2],[1,.18,1]));
   const caule=new THREE.CatmullRomCurve3([V(0,0,0),V(.01,.18,0),V(0,.36,0)]);partes.push(ramo([V(0,0,0),V(.01,.18,0),V(0,.36,0)],.02,.012,R.terra[2]));
   paresDeFolhas(caule,3,.13,partes,.35);
  }
  if(fase===1){
   // Muda: bifurcação baixa em dois caules, cada um com pares de folhas e a ponta em bronze.
   partes.push(bola(V(0,.02,0),.38,R.terra[2],[1,.15,1]));
   partes.push(ramo([V(0,0,0),V(0,.22,0)],.05,.04,R.terra[3]));
   for(const [dx,dz,h] of [[-.22,.05,1.25],[.2,-.06,1.05]]){const pts=[V(0,.2,0),V(dx*.5,.55,dz*.5),V(dx,h,dz)];partes.push(ramo(pts,.04,.018,R.terra[3]));troncos++;paresDeFolhas(new THREE.CatmullRomCurve3(pts),4,.15,partes,.3);}
  }
  if(fase>=2){
   const adulto=fase===3,n=adulto?6:3,hT=adulto?3.4:1.9,base=adulto?.35:.2;
   partes.push(noturna(bola(V(0,.02,0),adulto?1.9:1,R.terra[2],[1,.08,1],2),'chao'));
   // Troncos que nascem quase juntos e se abrem em leque, com curvas e inclinações desiguais.
   const lista=[],pontas=[];
   for(let i=0;i<n;i++){
    const a=(i*360/n+(rng()-.5)*30+15)*GRAUS,d=V(Math.cos(a),0,Math.sin(a)),abre=(adulto?2.3:.75)*(.75+rng()*.35),h=hT*(.8+rng()*.35),lado=V(-d.z,0,d.x),amp=(adulto?.38:.16)*(.7+rng()*.6),fase=rng()*Math.PI*2,voltas=1.3+rng()*.9;
    const pts=[];for(let k=0;k<=6;k++){const u=k/6,ab=abre*(1-Math.pow(1-u,1.6)),onda=Math.sin(u*Math.PI*voltas+fase)*amp*Math.min(1,u*3),vai=Math.cos(u*Math.PI*voltas*1.3+fase)*amp*.5*Math.min(1,u*3);pts.push(d.clone().multiplyScalar(.08+ab+vai).addScaledVector(lado,onda).add(V(0,k?base+h*u:0,0)));}
    const topoT=pts[6],tr=troncoManchado(pts,adulto?.16:.075,adulto?.085:.042,nova());partes.push(noturna(tr.geo,'altura'));troncos++;lista.push({...tr,d,lado,topo:topoT});
    // Cada tronco se divide em dois ramos que entram na copa.
    for(const s of [-1,1]){const fim=topoT.clone().addScaledVector(d,adulto?.25:.12).addScaledVector(lado,s*(adulto?.35:.16)).add(V(0,adulto?1:.45,0)),m1=topoT.clone().lerp(fim,.33).addScaledVector(lado,-s*(adulto?.22:.08)),m2=topoT.clone().lerp(fim,.66).addScaledVector(lado,s*(adulto?.2:.07)).addScaledVector(d,adulto?.12:.05);partes.push(noturna(ramo([topoT,m1,m2,fim],adulto?.08:.04,adulto?.035:.018),'altura'));pontas.push(fim);}
   }
   // Copa em cúpula erguida, de folhagem miúda e branca; começa acima dos troncos para que eles apareçam.
   const nv=adulto?15:4,yC=base+hT+(adulto?1.1:.5),Rc=adulto?2.6:.95;
   for(let i=0;i<nv;i++){
    const centro=i===0,a=(i*137.5+rng()*30)*GRAUS,dist=centro?0:Rc*(.3+rng()*.6),c=V(Math.cos(a)*dist,yC+(centro?.35:(rng()-.35)*.45)-dist*.1,Math.sin(a)*dist),r=(adulto?.98:.62)*(.85+rng()*.3);
    partes.push(noturna(copa(c,r,nova(),.52,c.y>yC+.3?R.luz[0]:dist>Rc*.85?R.pedra[4]:R.betula[0]),.8));copas++;
   }
   for(const p of pontas){const r=(adulto?.55:.32)*(.85+rng()*.3);partes.push(noturna(copa(p.clone().add(V(0,r*.2,0)),r,nova(),.6,R.betula[0]),.8));copas++;}
   if(!adulto){
    // Jovem: primeiras flores brancas presas à casca, em grupinhos.
    for(const tr of lista)for(let k=0;k<3;k++){const t=.25+rng()*.55,a=rng()*Math.PI*2;for(let j=0;j<3;j++){flor(tr,t+(rng()-.5)*.08,a+(rng()-.5)*1.2,partes);flores++;}}
   }else{
    // Adulta: constelações de frutos espalhadas pelos troncos, de tamanhos e alturas variados, mais densas embaixo.
    for(const tr of lista){const grupos=7+Math.floor(rng()*3);for(let k=0;k<grupos;k++){const t=.05+(k+rng())/grupos*.88;constelacao(tr,t,rng()*Math.PI*2,2+Math.floor(rng()*3),partes,rng,estado);}}
   }
  }
  const geo=juntar(partes);geo.computeBoundingBox();
  // Brilho por vértice, na mesma ordem em que juntar() concatena as peças.
  const brilho=new Float32Array(geo.attributes.position.count);let o=0;for(const g of partes){const k=g.attributes.position.count;if(g.userData.brilho)brilho.fill(g.userData.brilho,o,o+k);o+=k;}geo.setAttribute('brilho',new THREE.BufferAttribute(brilho,1));
  const noite=new Float32Array(geo.attributes.position.count),pos=geo.attributes.position,topoLuz=Math.max(.5,geo.boundingBox.max.y*.62),raioChao=Math.max(geo.boundingBox.max.x,-geo.boundingBox.min.x,geo.boundingBox.max.z,-geo.boundingBox.min.z)*.7;o=0;
  for(const g of partes){const k=g.attributes.position.count,m=g.userData.noite;if(typeof m==='number')noite.fill(m,o,o+k);else if(m==='altura')for(let i=o;i<o+k;i++)noite[i]=.15+.6*Math.min(1,Math.max(0,pos.getY(i)/topoLuz));else if(m==='chao')for(let i=o;i<o+k;i++)noite[i]=.1+.35*Math.max(0,1-Math.hypot(pos.getX(i),pos.getZ(i))/raioChao);o+=k;}
  if(fase<2)noite.fill(0);geo.setAttribute('brilhoNoite',new THREE.BufferAttribute(noite,1));
  geo.userData.proposta={fase,troncos,copas,flores,frutos:estado.frutos,estrelas:estado.estrelas};estagios.push(geo);relatorio.push(geo.userData.proposta);for(const g of partes)g.dispose();
 }
 return {estagios,relatorio};
}
