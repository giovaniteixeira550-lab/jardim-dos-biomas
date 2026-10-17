/** Mangue das Pontes (Bosque de Pediatria — Cardiologia e nefrologia): tronco suspenso sobre raízes-escora em arco, como pontes sobre a lama, dois troncos reunidos, copa baixa e larga, raízes aéreas e propágulos pendentes. Modelo aprovado. */
import * as THREE from 'three';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import { criarRng, criarRuido } from './mundo.js';
import { RAMPAS as R } from './paleta.js';
// Casca avermelhada, como a do mangue-vermelho; raízes um tom mais escuras e úmidas na base.
const V=(x=0,y=0,z=0)=>new THREE.Vector3(x,y,z), CIMA=V(0,1,0), casca=R.terra[2], raizCor=R.terra[1], GRAUS=Math.PI/180;
function cor(g,hex){const c=new THREE.Color(hex),p=g.attributes.position,a=new Float32Array(p.count*3);for(let i=0;i<p.count;i++)c.toArray(a,i*3);g.setAttribute('color',new THREE.BufferAttribute(a,3));return g.index?g.toNonIndexed():g;}
function bola(c,r,hex,escala=[1,1,1]){const g=new THREE.IcosahedronGeometry(r,1);g.scale(...escala);g.translate(c.x,c.y,c.z);return cor(g,hex);}
function ramo(pontos,r0,r1,hex=casca,n=20){const curva=new THREE.CatmullRomCurve3(pontos.map(p=>p.isVector3?p.clone():V(...p))),lados=8,g=new THREE.TubeGeometry(curva,n,r0,lados,false),p=g.attributes.position;for(let i=0;i<=n;i++){const c=curva.getPointAt(i/n),k=(r0+(r1-r0)*i/n)/r0;for(let j=0;j<=lados;j++){const idx=i*(lados+1)+j,v=V().fromBufferAttribute(p,idx).sub(c).multiplyScalar(k).add(c);p.setXYZ(idx,v.x,v.y,v.z);}}g.computeVertexNormals();return cor(g,hex);}
// Volume de folhagem com o desenho de aglomerados do jardim (banda/esfera lidas por estiloCopa).
function copa(c,r,semente,achatar=.7,hex=R.mata[3]){
 let g=new THREE.IcosahedronGeometry(1,2);g.deleteAttribute('normal');g.deleteAttribute('uv');g=mergeVertices(g);
 const p=g.attributes.position,esf=new Float32Array(p.count*3),banda=new Float32Array(p.count),ruido=criarRuido(semente);
 for(let i=0;i<p.count;i++){const x=p.getX(i),y=p.getY(i),z=p.getZ(i),k=r*(.82+ruido(x*1.7+3,y*1.7+z+7,2)*.3);esf.set([x,y,z],i*3);banda[i]=y;p.setXYZ(i,c.x+x*k,c.y+y*k*achatar,c.z+z*k);}
 g.setAttribute('banda',new THREE.BufferAttribute(banda,1));g.setAttribute('esfera',new THREE.BufferAttribute(esf,3));g.setAttribute('raioCopa',new THREE.BufferAttribute(new Float32Array(p.count).fill(r),1));g.setAttribute('semCopa',new THREE.BufferAttribute(new Float32Array(p.count).fill((semente*.6180339)%1),1));g.computeVertexNormals();return cor(g,hex);
}
// Folha elíptica, grossa e lustrosa (mangue-vermelho), com ponta curta.
function folha(c,tam,ang,giro,hex=R.mata[4]){const s=new THREE.Shape();s.moveTo(0,0);s.bezierCurveTo(-.55,.25,-.6,1.1,0,1.55);s.bezierCurveTo(.6,1.1,.55,.25,0,0);const g=new THREE.ShapeGeometry(s,6);g.scale(tam*.55,tam,1);g.rotateZ(ang);g.rotateY(giro);g.translate(c.x,c.y,c.z);return cor(g,hex);}
// Propágulo: a "semente-lança" que germina ainda presa à árvore; verde, afinando até a ponta castanha, com cálice no alto.
function propagulo(topo,comp,partes){
 const g=new THREE.CylinderGeometry(comp*.07,comp*.03,comp,6,4);g.translate(topo.x,topo.y-comp/2-.06,topo.z);
 const p=g.attributes.position,a=new Float32Array(p.count*3),ca=new THREE.Color(R.mata[4]),cb=new THREE.Color(R.terra[1]),k=new THREE.Color();
 for(let i=0;i<p.count;i++){const t=(topo.y-.06-p.getY(i))/comp;k.copy(ca).lerp(cb,t>.82?1:0).toArray(a,i*3);}g.setAttribute('color',new THREE.BufferAttribute(a,3));
 partes.push(g.toNonIndexed(),bola(topo.clone().add(V(0,-.04,0)),comp*.075,R.salvia[1],[1,.8,1]));
}
// Raiz-escora: sai do tronco, sobe um pouco, faz o arco e desce quase na vertical até a lama, onde se alarga.
function raizArco(inicio,dir,alcance,altura,r0,partes,rng){
 const lado=V(-dir.z,0,dir.x),torce=(rng()-.5)*.25*alcance,pico=inicio.y+altura;
 const pts=[inicio.clone(),inicio.clone().addScaledVector(dir,alcance*.22).add(V(0,altura*.9,0)),V().addScaledVector(dir,alcance*.55).addScaledVector(lado,torce*.5).add(V(0,pico,0)),V().addScaledVector(dir,alcance*.85).addScaledVector(lado,torce*.85).add(V(0,pico*.62,0)),V().addScaledVector(dir,alcance).addScaledVector(lado,torce).add(V(0,-.02,0))];
 partes.push(ramo(pts,r0,r0*.75,raizCor,28));
 const pe=pts[4];partes.push(bola(pe.clone().add(V(0,.02,0)),r0*1.7,raizCor,[1.3,.45,1.3]));
 return {curva:new THREE.CatmullRomCurve3(pts),pe};
}
function tronco(y0,y1,rBase,rMeio,rTopo){const perfil=[],n=14;for(let j=0;j<=n;j++){const u=j/n,r=u<.25?rBase+(rMeio-rBase)*(u/.25):rMeio+(rTopo-rMeio)*((u-.25)/.75);perfil.push(new THREE.Vector2(r,y0+u*(y1-y0)));}perfil.unshift(new THREE.Vector2(0,y0));perfil.push(new THREE.Vector2(0,y1));return cor(new THREE.LatheGeometry(perfil,12),casca);}
function lama(r,partes){partes.push(bola(V(0,.015,0),r,R.terra[1],[1,.06,1]),bola(V(r*.25,.03,-r*.15),r*.45,R.agua[0],[1,.04,.8]));}
export function criarManguePontes(semente, juntar){
 const rng=criarRng(semente),estagios=[],relatorio=[],nova=()=>Math.floor(rng()*1e6);
 for(let fase=0;fase<4;fase++){
  const partes=[];let raizes=0,troncos=0,copas=0,propagulos=0;
  if(fase===0){
   // Propágulo cravado na lama, já abrindo o primeiro par de folhas no alto.
   lama(.28,partes);
   const g=new THREE.CylinderGeometry(.022,.032,.42,6,1);g.translate(0,.17,0);partes.push(cor(g,R.mata[2]));
   partes.push(bola(V(0,.39,0),.03,R.salvia[1]),folha(V(0,.4,0),.17,.85,.3),folha(V(0,.4,0),.17,-.85,.3),folha(V(0,.42,0),.1,0,1.8,R.mata[5]));
  }
  if(fase===1){
   // Muda: caule fino com a base já alargada e três pares de folhas; a primeira raiz começa a sair.
   lama(.45,partes);
   partes.push(tronco(0,1.25,.07,.045,.028));troncos=1;
   [[.55,.24,.2],[.85,.22,1.6],[1.1,.2,.7]].forEach(([y,t,g],i)=>{partes.push(folha(V(0,y,0),t,1.1,g,i%2?R.mata[3]:R.mata[4]),folha(V(0,y,0),t,-1.1,g,i%2?R.mata[3]:R.mata[4]));});
   partes.push(folha(V(0,1.25,0),.16,0,.4,R.mata[5]));
   const r=raizArco(V(.04,.22,.02),V(1,0,.25).normalize(),.32,.08,.016,partes,rng);raizes=1;
  }
  if(fase>=2){
   const adulto=fase===3,h=adulto?5.1:2.7,y0=adulto?.7:.35,R0=adulto?2.6:1.25;
   lama(adulto?3.1:1.55,partes);
   // Tronco suspenso: começa acima da lama e se apoia nas raízes; mais largo onde elas nascem.
   partes.push(tronco(y0,h,adulto?.14:.07,adulto?.3:.14,adulto?.19:.08));troncos++;
   // Raízes-escora em volta, com ângulos e alcances desiguais; as da frente são mais baixas para o tronco aparecer.
   const n=adulto?9:5,raizesFeitas=[];
   for(let i=0;i<n;i++){
    const a=(i*360/n+(rng()-.5)*24+20)*GRAUS,dir=V(Math.cos(a),0,Math.sin(a)),frente=Math.max(0,dir.z),y=y0+(adulto?.25+rng()*1.1:.08+rng()*.4)*(1-frente*.5);
    const ini=dir.clone().multiplyScalar(adulto?.22:.1).add(V(0,y,0)),alc=R0*(.65+rng()*.4),alt=(adulto?.45+rng()*.5:.18+rng()*.22)*(1-frente*.35);
    const r=raizArco(ini,dir,alc,alt,adulto?.12:.055,partes,rng);raizes++;raizesFeitas.push({r,dir,alc});
    // Algumas raízes se ramificam no meio do arco e abrem um segundo vão, mais baixo.
    if(adulto&&rng()<.45){const p=r.curva.getPointAt(.45),d2=dir.clone().applyAxisAngle(CIMA,(rng()<.5?-1:1)*(18+rng()*14)*GRAUS);raizArco(p,d2,alc*(.35+rng()*.2),.15+rng()*.2,.075,partes,rng).pe;raizes++;}
   }
   // Troncos reunidos: um segundo tronco inclinado sai da base comum e se junta à copa.
   const galhos=[];
   if(adulto){
    const a2=(200+rng()*40)*GRAUS,d2=V(Math.cos(a2),0,Math.sin(a2));
    partes.push(ramo([V(0,1.3,0),d2.clone().multiplyScalar(.45).add(V(0,2.6,0)),d2.clone().multiplyScalar(1.15).add(V(0,4.2,0))],.17,.1));troncos++;
    galhos.push(d2.clone().multiplyScalar(1.15).add(V(0,4.2,0)));
   }
   galhos.push(V(0,h,0));
   // Copa recortada: vários volumes desiguais sobre ramos visíveis, mais escuros por baixo, sem fechar num globo.
   const nv=adulto?13:4,topoC=h+(adulto?.55:.35);
   for(let i=0;i<nv;i++){
    const centro=i===0,a=(i*137.5+rng()*25)*GRAUS,dist=centro?0:(adulto?.9+rng()*2.1:.6+rng()*.4),c=V(Math.cos(a)*dist,topoC+(centro?.2:(rng()-.4)*(adulto?.7:.3))-dist*.22,Math.sin(a)*dist),r=(adulto?.95+rng()*.5:.5+rng()*.15)*(centro?1.05:1);
    const base=galhos[i%galhos.length];
    if(!centro)partes.push(ramo([base,base.clone().lerp(c,.5).add(V(0,.25,0)),c.clone().add(V(0,-r*.3,0))],adulto?.09:.04,adulto?.04:.02));
    const tom=centro?R.mata[3]:c.y>topoC+.2?R.mata[4]:dist>(adulto?2.2:.8)?R.mata[2]:R.mata[3];partes.push(copa(c,r,nova(),.58,tom));copas++;
    // Propágulos pendentes: só sob alguns volumes, em pequenos grupos de comprimentos diferentes.
    if(adulto&&!centro&&dist>1.3&&rng()<.7){const q=2+Math.floor(rng()*2);for(let j=0;j<q;j++){const ang=rng()*Math.PI*2,off=r*(.25+rng()*.45),t=c.clone().add(V(Math.cos(ang)*off,-r*.5+rng()*.08,Math.sin(ang)*off));partes.push(ramo([t.clone().add(V(0,.18,0)),t],.012,.01,R.salvia[1],4));propagulo(t,.5+rng()*.3,partes);propagulos++;}}
   }
   // Raízes aéreas: duas ou três descem retas de ramos laterais até a lama, como cordas, criando outras "pontes".
   if(adulto)for(let i=0;i<2;i++){const a=(60+i*115+rng()*20)*GRAUS,d=V(Math.cos(a),0,Math.sin(a)),topo=d.clone().multiplyScalar(1.6+rng()*.6).add(V(0,topoC-.9,0)),chao=topo.clone().add(V((rng()-.5)*.2,0,(rng()-.5)*.2));chao.y=-.02;partes.push(ramo([topo,topo.clone().lerp(chao,.5).add(V(.05,0,0)),chao],.045,.06,raizCor,10),bola(chao.clone().add(V(0,.02,0)),.06,raizCor,[1.3,.4,1.3]));raizes++;}
  }
  const geo=juntar(partes);geo.computeBoundingBox();geo.userData.proposta={fase,raizes,troncos,copas,frutos:propagulos};estagios.push(geo);relatorio.push(geo.userData.proposta);for(const g of partes)g.dispose();
 }
 return {estagios,relatorio};
}
