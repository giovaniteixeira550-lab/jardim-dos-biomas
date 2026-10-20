/**
 * Roda da fogueira no quintal da casa: lugar de acampamento para juntar os amigos.
 * Fogueira em anel de pedras com lenha em pirâmide, chamas em camadas que tremulam,
 * brasas, faíscas e fumaça; tripé com chaleira; assentos em roda (troncos deitados,
 * tocos, banco de tábua com manta), violão encostado, espetos de marshmallow, pilha
 * de lenha e varal de lâmpadas coloridas que acende ao anoitecer. A roda fica aberta
 * para o lado da casa, de onde chega um caminho de pedras. Tudo sai da semente.
 */
import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {RAMPAS as R} from './paleta.js';
import {criarRng} from './mundo.js';

// Escala do conjunto: as árvores do jardim têm 6–15 m; em tamanho real, a roda sumia na clareira.
const E=1.35;
const V=(x,y,z)=>new THREE.Vector3(x,y,z),CIMA=V(0,1,0);

export function criarFogueira(m,toon){
 const local=m.plano.locais.find(l=>l.id==='fogueira');
 const grupo=new THREE.Group();grupo.name='Roda da fogueira';
 if(!local)return grupo;
 const rng=criarRng(m.semente^0xf0e1),entre=(a,b)=>a+(b-a)*rng();
 const base=m.altitude(local.x,local.y);
 grupo.position.set(local.x,base,local.y);grupo.scale.setScalar(E);
 const casa=m.plano.locais.find(l=>l.id==='casa-madeira');
 // Lado aberto da roda: na direção da casa, por onde chega o caminho.
 const aCasa=casa?Math.atan2(casa.y-(casa.recuo??0)-local.y,casa.x-local.x):0;

 // Peças estáticas: unidas por cor numa só malha com cores por vértice.
 const partes=[];
 const pintar=(g,tom)=>{
  const geo=g.index?g.toNonIndexed():g,c=new THREE.Color(tom),n=geo.attributes.position.count,cores=new Float32Array(n*3);
  for(let i=0;i<n;i++){cores[i*3]=c.r;cores[i*3+1]=c.g;cores[i*3+2]=c.b;}
  geo.setAttribute('color',new THREE.BufferAttribute(cores,3));
  for(const nome of Object.keys(geo.attributes))if(!['position','normal','color'].includes(nome))geo.deleteAttribute(nome);
  partes.push(geo);return geo;
 };
 const cilindro=(a,b,r0,r1,tom,lados=7)=>{
  const A=a.clone(),B=b.clone(),d=B.clone().sub(A),g=new THREE.CylinderGeometry(r1,r0,d.length(),lados,1);
  g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(CIMA,d.clone().normalize()));
  g.translate(...A.add(B).multiplyScalar(.5).toArray());return pintar(g,tom);
 };
 const caixa=(p,tam,tom,giro=0,incl=0)=>{const g=new THREE.BoxGeometry(...tam);g.rotateZ(incl);g.rotateY(giro);g.translate(p.x,p.y,p.z);return pintar(g,tom);};
 const pedra=(p,r,tom,ach=.62)=>{const g=new THREE.DodecahedronGeometry(r,0);g.scale(entre(.85,1.2),ach*entre(.8,1.15),entre(.85,1.2));g.rotateY(rng()*6.28);g.translate(p.x,p.y+r*ach*.55,p.z);return pintar(g,tom);};
 const noAnel=(a,r,y=0)=>V(Math.cos(a)*r,y,Math.sin(a)*r);

 // Chão de terra batida, de borda irregular, com manchas mais escuras de pisoteio.
 {
  const n=30,pts=[],ruidoBorda=Array.from({length:6},()=>[rng()*6.28,entre(.12,.3)]);
  for(let i=0;i<n;i++){const a=i/n*Math.PI*2,r=3.95+ruidoBorda.reduce((s,[f,amp],k)=>s+Math.sin(a*(k+2)+f)*amp,0);pts.push(new THREE.Vector2(Math.cos(a)*r,Math.sin(a)*r));}
  const g=new THREE.ShapeGeometry(new THREE.Shape(pts));g.rotateX(-Math.PI/2);g.translate(0,.025,0);pintar(g,R.terra[3]);
  for(let i=0;i<7;i++){const a=rng()*6.28,r=entre(1.6,3.2),s=new THREE.CircleGeometry(entre(.35,.7),7);s.rotateX(-Math.PI/2);s.scale(1,1,entre(.5,.9));s.rotateY(rng()*6.28);const p=noAnel(a,r,.035);s.translate(p.x,p.y,p.z);pintar(s,i%3?R.terra[2]:R.terra[4]);}
  for(let i=0;i<14;i++){const a=rng()*6.28,r=entre(1.4,3.7);pedra(noAnel(a,r,.02),entre(.04,.09),rng()>.5?R.pedra[3]:R.pedra[2],.5);}
 }

 // Fogueira: cinzas, anel de pedras de tamanhos diferentes e lenha em pirâmide.
 {
  const cinza=new THREE.CircleGeometry(.86,10);cinza.rotateX(-Math.PI/2);cinza.translate(0,.05,0);pintar(cinza,R.pedra[1]);
  const meio=new THREE.CircleGeometry(.5,8);meio.rotateX(-Math.PI/2);meio.translate(0,.06,0);pintar(meio,R.tinta[1]);
  const nP=13;
  for(let i=0;i<nP;i++){const a=i/nP*Math.PI*2+entre(-.1,.1);pedra(noAnel(a,entre(.95,1.05)),entre(.18,.3),[R.pedra[2],R.pedra[3],R.pedra[1],R.pedra[2]][i%4]);}
  const nL=6,topo=V(entre(-.05,.05),1.0,entre(-.05,.05));
  for(let i=0;i<nL;i++){
   const a=i/nL*Math.PI*2+entre(-.2,.2),pe=noAnel(a,entre(.6,.72),.05),meioL=pe.clone().lerp(topo,.45);
   cilindro(pe,meioL,.085,.075,R.tinta[1],6);cilindro(meioL,pe.clone().lerp(topo,.92),.075,.05,i%2?R.terra[1]:R.terra[0],6);
  }
  for(const a of [entre(0,1),entre(1.6,2.6)]){const d=noAnel(a,.62);cilindro(d.clone().setY(.12),d.clone().multiplyScalar(-1).setY(.12),.08,.08,R.terra[1],6);}
 }

 // Tripé de galhos sobre o fogo, com chaleira de ferro pendurada.
 {
  const alto=V(0,2.15,0);
  for(let i=0;i<3;i++){const a=aCasa+.9+i*2.1+entre(-.15,.15);cilindro(noAnel(a,1.35,0),alto.clone().add(noAnel(a,.1)),.045,.035,R.terra[2],5);}
  cilindro(V(0,2.12,0),V(0,1.62,0),.012,.012,R.tinta[0],4);
  const ch=new THREE.SphereGeometry(.24,8,5);ch.scale(1,.8,1);ch.translate(0,1.42,0);pintar(ch,R.tinta[1]);
  cilindro(V(0,1.58,0),V(0,1.64,0),.13,.1,R.tinta[0],8);
  cilindro(V(.18,1.4,0),V(.36,1.55,0),.035,.025,R.tinta[1],5);
  const alca=new THREE.TorusGeometry(.2,.012,4,10,Math.PI);alca.translate(0,1.6,0);pintar(alca,R.tinta[0]);
 }

 // Assentos em roda, com o lado da casa livre. Ângulos desencontrados, peças variadas.
 const assentos=[
  {tipo:'tronco',da:1.15,r:2.75,comp:2.1},
  {tipo:'toco',da:1.95,r:2.55},
  {tipo:'banco',da:2.65,r:2.8},
  {tipo:'toco',da:3.3,r:2.6,caneca:true},
  {tipo:'tronco',da:4.05,r:2.7,comp:1.8,violao:true},
  {tipo:'toco',da:4.8,r:2.5,baixo:true},
 ];
 for(const s of assentos){
  const a=aCasa+s.da+entre(-.06,.06),c=noAnel(a,s.r),tan=V(-Math.sin(a),0,Math.cos(a)),rad=V(Math.cos(a),0,Math.sin(a));
  if(s.tipo==='tronco'){
   const meia=tan.clone().multiplyScalar(s.comp/2),y=.3,A=c.clone().sub(meia).setY(y),B=c.clone().add(meia).setY(y);
   cilindro(A,B,.31,.29,R.terra[1],9);
   // Topo achatado onde se senta e anéis claros nas pontas serradas.
   caixa(c.clone().setY(.56),[s.comp*.86,.06,.3],R.terra[2],-a+Math.PI/2);
   for(const [P,d] of [[A,-1],[B,1]]){const anel=new THREE.CircleGeometry(.29,9);anel.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(V(0,0,1),tan.clone().multiplyScalar(d)));anel.translate(...P.clone().addScaledVector(tan,d*.012).toArray());pintar(anel,R.terra[4]);
    const miolo=new THREE.CircleGeometry(.12,7);miolo.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(V(0,0,1),tan.clone().multiplyScalar(d)));miolo.translate(...P.clone().addScaledVector(tan,d*.02).toArray());pintar(miolo,R.terra[3]);}
   // Um toco de galho quebrado e musgo de um lado.
   cilindro(c.clone().addScaledVector(tan,s.comp*.22).setY(.45),c.clone().addScaledVector(tan,s.comp*.3).addScaledVector(rad,.25).setY(.72),.07,.04,R.terra[1],5);
   const musgo=new THREE.SphereGeometry(.2,6,3,0,6.28,0,1.3);musgo.scale(1.6,.35,1);musgo.rotateY(-a);musgo.translate(...c.clone().addScaledVector(tan,-s.comp*.25).addScaledVector(rad,.18).setY(.5).toArray());pintar(musgo,R.mata[3]);
   if(s.violao){
    // Violão encostado no tronco, de frente para o fogo.
    const p=c.clone().addScaledVector(rad,-.42).addScaledVector(tan,s.comp*.18),q=new THREE.Quaternion().setFromUnitVectors(CIMA,V(0,1,0).addScaledVector(rad,.45).normalize());
    const parte=(g,tom,dy)=>{g.translate(0,dy,0);g.rotateY(-a+Math.PI/2);g.applyQuaternion(q);g.translate(p.x,.05,p.z);pintar(g,tom);};
    const corpo=new THREE.CylinderGeometry(.27,.27,.12,10);corpo.rotateX(Math.PI/2);parte(corpo,R.outono[2],.3);
    const cintura=new THREE.CylinderGeometry(.21,.21,.121,10);cintura.rotateX(Math.PI/2);parte(cintura,R.outono[2],.62);
    const boca=new THREE.CircleGeometry(.07,8);boca.translate(0,0,.062);parte(boca,R.tinta[0],.52);
    const ponte=new THREE.BoxGeometry(.16,.03,.02);ponte.translate(0,0,.065);parte(ponte,R.tinta[1],.26);
    parte(new THREE.BoxGeometry(.07,.62,.05),R.terra[1],1.05);
    parte(new THREE.BoxGeometry(.11,.17,.05),R.terra[0],1.43);
   }
  }else if(s.tipo==='toco'){
   const h=s.baixo?.32:entre(.42,.5),r=entre(.26,.33);
   cilindro(c.clone().setY(0),c.clone().setY(h),r*1.12,r,R.terra[2],9);
   const topo=new THREE.CircleGeometry(r*.98,9);topo.rotateX(-Math.PI/2);topo.translate(c.x,h+.004,c.z);pintar(topo,R.terra[4]);
   const anel=new THREE.RingGeometry(r*.35,r*.45,9);anel.rotateX(-Math.PI/2);anel.translate(c.x,h+.008,c.z);pintar(anel,R.terra[3]);
   for(let k=0;k<3;k++){const ra=rng()*6.28,d=V(Math.cos(ra),0,Math.sin(ra));cilindro(c.clone().addScaledVector(d,r*.8).setY(.08),c.clone().addScaledVector(d,r*1.5).setY(0),.08,.04,R.terra[1],5);}
   if(s.caneca){const p=c.clone().addScaledVector(tan,.08).setY(h);cilindro(p,p.clone().setY(h+.17),.075,.075,R.agua[4],8);const asa=new THREE.TorusGeometry(.05,.013,4,8);asa.rotateY(-a);asa.translate(...p.clone().addScaledVector(tan,.09).setY(h+.09).toArray());pintar(asa,R.agua[4]);const cafe=new THREE.CircleGeometry(.06,8);cafe.rotateX(-Math.PI/2);cafe.translate(p.x,h+.165,p.z);pintar(cafe,R.terra[0]);}
  }else if(s.tipo==='banco'){
   // Tábua grossa sobre dois tocos baixos, com uma manta xadrez dobrada.
   for(const d of [-.62,.62]){const p=c.clone().addScaledVector(tan,d);cilindro(p.clone().setY(0),p.clone().setY(.38),.2,.18,R.terra[1],7);}
   caixa(c.clone().setY(.44),[1.75,.1,.44],R.terra[3],-a+Math.PI/2);
   caixa(c.clone().setY(.4),[1.75,.03,.44],R.terra[2],-a+Math.PI/2);
   const pm=c.clone().addScaledVector(tan,.35).setY(.52);
   caixa(pm,[.62,.07,.42],R.vermelho[1],-a+Math.PI/2+.12);
   for(const off of [-.18,.02,.2])caixa(pm.clone().addScaledVector(tan,off).setY(.558),[.07,.012,.43],R.vermelho[2],-a+Math.PI/2+.12);
   caixa(pm.clone().setY(.562),[.6,.012,.06],R.outono[3],-a+Math.PI/2+.12);
   caixa(pm.clone().addScaledVector(rad,-.22).setY(.36),[.6,.28,.03],R.vermelho[1],-a+Math.PI/2+.12);
  }
 }

 // Espetos de marshmallow apoiados numa pedra, com as pontas sobre o fogo.
 for(const [da,cor] of [[2.25,R.betula[0]],[2.45,R.outono[4]]]){
  const a=aCasa+da,pe=noAnel(a,2.05,.02),ponta=noAnel(a+.08,.95,.62);
  cilindro(pe,ponta,.018,.012,R.terra[2],4);
  const mm=new THREE.CylinderGeometry(.06,.06,.11,6);mm.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(CIMA,ponta.clone().sub(pe).normalize()));mm.translate(...ponta.toArray());pintar(mm,cor);
 }
 pedra(noAnel(aCasa+2.35,1.55),.17,R.pedra[2]);

 // Pilha de lenha ao lado da roda, perto do caminho.
 {
  const a=aCasa-1.05,c=noAnel(a,3.25),tan=V(-Math.sin(a),0,Math.cos(a)),rad=V(Math.cos(a),0,Math.sin(a));
  const fila=[[-.27,.12],[0,.12],[.27,.12],[-.14,.34],[.14,.34],[0,.56]];
  for(const [o,y] of fila){const r=entre(.1,.13),p=c.clone().addScaledVector(tan,o).setY(y),meia=rad.clone().multiplyScalar(entre(.42,.55));
   cilindro(p.clone().sub(meia),p.clone().add(meia),r,r,rng()>.5?R.terra[1]:R.terra[2],7);
   const ponta=new THREE.CircleGeometry(r*.95,7);ponta.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(V(0,0,1),rad));ponta.translate(...p.clone().add(meia).addScaledVector(rad,.01).toArray());pintar(ponta,R.terra[4]);}
  const machado=c.clone().addScaledVector(tan,.75).setY(0);
  cilindro(machado,machado.clone().add(V(.08,.62,.05)),.025,.022,R.terra[3],5);
  caixa(machado.clone().add(V(.09,.66,.06)),[.22,.12,.03],R.pedra[3],-a,.1);
 }

 // Caminho de pedras chatas até a varanda da casa.
 if(casa){
  const ini=noAnel(aCasa,3.7),fim=V(casa.x-7.4-local.x,0,casa.y-(casa.recuo??0)+6.4-local.y).divideScalar(E),meioC=ini.clone().lerp(fim,.5).add(V(-1.3,0,.6));
  const curva=new THREE.QuadraticBezierCurve3(ini,meioC,fim);
  const nPedras=Math.round(curva.getLength()*E/1.05);
  for(let i=0;i<=nPedras;i++){const p=curva.getPointAt(i/nPedras).add(V(entre(-.18,.18),0,entre(-.18,.18))),y=(m.altitude(local.x+p.x*E,local.y+p.z*E)-base)/E;
   const g=new THREE.CylinderGeometry(entre(.26,.36),entre(.28,.38),.07,7);g.scale(1,1,entre(.7,1));g.rotateY(rng()*6.28);g.translate(p.x,y+.035,p.z);pintar(g,i%2?R.pedra[3]:R.pedra[4]);}
 }

 // Postes do varal de luzes (o lado da casa fica sem fio).
 const postes=[];
 for(const da of [.75,2.2,3.55,5.0]){const a=aCasa+da+entre(-.12,.12),p=noAnel(a,entre(3.55,3.85));postes.push(p.clone().setY(2.75));
  cilindro(p.clone().setY(0),p.clone().setY(2.85),.075,.06,R.terra[1],6);
  pedra(p,.16,R.pedra[2]);
  caixa(p.clone().setY(2.7),[.32,.05,.05],R.terra[1],-a);}
 const fios=[];
 for(let i=0;i<postes.length-1;i++){const A=postes[i],B=postes[i+1],seg=14,pts=[];
  for(let k=0;k<=seg;k++){const t=k/seg,p=A.clone().lerp(B,t);p.y-=Math.sin(Math.PI*t)*.55;pts.push(p);}
  for(let k=0;k<seg;k++)cilindro(pts[k],pts[k+1],.012,.012,R.tinta[0],3);
  fios.push(pts);}

 const estatica=new THREE.Mesh(mergeGeometries(partes,false),toon({vertexColors:true}));
 estatica.name='fogueira-pecas';estatica.castShadow=estatica.receiveShadow=true;grupo.add(estatica);
 for(const g of partes)g.dispose();

 // Lâmpadas do varal: penduradas ao longo do fio, em quatro cores que alternam.
 const coresLampada=[R.amarelo[2],R.outono[3],R.flor[2],R.agua[4]];
 const matsLampada=coresLampada.map(c=>new THREE.MeshBasicMaterial({color:c}));
 const geoLamp=new THREE.IcosahedronGeometry(.075,0),lotesLamp=coresLampada.map(()=>[]);
 let nL=0;
 for(const pts of fios)for(let k=1;k<pts.length-1;k+=1){const p=pts[k];const g=geoLamp.clone();g.scale(1,1.25,1);g.translate(p.x,p.y-.09,p.z);lotesLamp[nL++%4].push(g);}
 const lampadas=lotesLamp.map((l,i)=>{const malha=new THREE.Mesh(mergeGeometries(l,false),matsLampada[i]);malha.name='lampadas-varal';grupo.add(malha);for(const g of l)g.dispose();return malha;});

 // Brasas: pedacinhos que pulsam no meio das cinzas.
 const matBrasa=new THREE.MeshBasicMaterial({color:R.outono[2]});
 const brasas=[];
 for(let i=0;i<16;i++){const a=rng()*6.28,r=entre(.1,.62),g=new THREE.BoxGeometry(entre(.06,.11),.04,entre(.05,.09));g.rotateY(rng()*6.28);g.translate(Math.cos(a)*r,.08,Math.sin(a)*r);brasas.push(g);}
 const malhaBrasas=new THREE.Mesh(mergeGeometries(brasas,false),matBrasa);malhaBrasas.name='brasas';grupo.add(malhaBrasas);for(const g of brasas)g.dispose();

 // Chamas em três camadas (vermelho por fora, laranja, amarelo no miolo) e línguas soltas.
 const chamas=[];
 const camadas=[
  {cor:R.vermelho[2],r:.5,h:1.25,n:1,off:0},{cor:R.outono[3],r:.36,h:1.05,n:1,off:0},{cor:R.amarelo[2],r:.2,h:.7,n:1,off:0},
  {cor:R.outono[3],r:.16,h:.75,n:4,off:.32},{cor:R.vermelho[2],r:.13,h:.6,n:3,off:.42},{cor:R.amarelo[2],r:.09,h:.45,n:3,off:.22},
 ];
 for(const c of camadas)for(let i=0;i<c.n;i++){
  const g=new THREE.ConeGeometry(c.r,c.h,5,2);g.translate(0,c.h/2,0);
  // Cone torcido: a ponta sai do eixo, como uma língua de fogo.
  const pos=g.attributes.position;for(let k=0;k<pos.count;k++){const y=pos.getY(k)/c.h;pos.setX(k,pos.getX(k)+Math.sin(y*2.4+i)*c.r*.35*y);}
  g.computeVertexNormals();
  const ch=new THREE.Mesh(g,new THREE.MeshBasicMaterial({color:c.cor}));
  const a=rng()*6.28;ch.position.set(Math.cos(a)*c.off,.12,Math.sin(a)*c.off);ch.rotation.y=rng()*6.28;
  ch.userData={fase:rng()*20,vel:entre(5,9),h:1,base:ch.position.clone()};ch.name='chama';grupo.add(ch);chamas.push(ch);
 }

 // Faíscas e fumaça: sobem girando e somem; não gravam profundidade (sem contorno).
 const faiscas=[],geoF=new THREE.BoxGeometry(.05,.05,.05);
 for(let i=0;i<18;i++){const f=new THREE.Mesh(geoF,new THREE.MeshBasicMaterial({color:i%3?R.amarelo[2]:R.outono[3],transparent:true,depthWrite:false}));f.renderOrder=4;f.userData={fase:rng(),giro:rng()*6.28,dur:entre(1.6,2.8),r:entre(.1,.45)};grupo.add(f);faiscas.push(f);}
 const fumaca=[],geoFum=new THREE.IcosahedronGeometry(1,0);
 for(let i=0;i<7;i++){const n=new THREE.Mesh(geoFum,new THREE.MeshBasicMaterial({color:R.pedra[3],transparent:true,opacity:0,depthWrite:false}));n.renderOrder=3;n.userData={fase:i/7};grupo.add(n);fumaca.push(n);}

 // Luz quente da fogueira: tremula e ilumina o chão, os troncos e quem estiver em volta.
 const luz=new THREE.PointLight(R.outono[4],0,11,2);luz.position.set(0,1.3,0);grupo.add(luz);
 const luzVaral=new THREE.PointLight(R.amarelo[2],0,10,2);luzVaral.position.set(0,2.6,0);grupo.add(luzVaral);
 let intensidade=8,fumacaForca=.3;

 grupo.userData.animar=t=>{
  for(const ch of chamas){const u=ch.userData,s=.82+.18*Math.sin(t*u.vel+u.fase)+.1*Math.sin(t*u.vel*2.3+u.fase*1.7);
   ch.scale.set(1-(s-1)*.4,s,1-(s-1)*.4);ch.rotation.y+=.02;ch.position.x=u.base.x+Math.sin(t*3.1+u.fase)*.03;ch.position.z=u.base.z+Math.cos(t*2.7+u.fase)*.03;}
  const pulso=.5+.5*Math.sin(t*2.2)*Math.sin(t*3.7+1);
  matBrasa.color.set(pulso>.55?R.outono[3]:R.outono[2]);
  for(const f of faiscas){const u=f.userData,vida=((t/u.dur)+u.fase)%1;
   f.position.set(Math.cos(u.giro+vida*4)*u.r*(1+vida),1+vida*3.2,Math.sin(u.giro+vida*4)*u.r*(1+vida));
   f.material.opacity=vida<.85?1:(1-vida)/.15;f.rotation.set(vida*6,vida*4,0);}
  for(const n of fumaca){const vida=(t/7+n.userData.fase)%1,r=.25+vida*.9;
   n.position.set(Math.sin(vida*5+n.userData.fase*9)*.3+vida*.8,1.9+vida*4.5,Math.cos(vida*4)*.25);
   n.scale.set(r,r*.8,r);n.material.opacity=Math.sin(Math.PI*vida)*fumacaForca;}
  luz.intensity=intensidade*(.85+.15*Math.sin(t*9.3)*Math.sin(t*5.1+2));
 };
 grupo.userData.aplicarHora=hora=>{
  const noite=hora==='noite',acesa=noite||hora==='entardecer';
  intensidade=noite?80:acesa?36:6;luzVaral.intensity=noite?22:acesa?10:0;
  // De dia as lâmpadas ficam apagadas: vidro em tons de terra e pedra.
  const apagadas=[R.terra[4],R.pedra[3],R.pedra[4],R.pedra[3]];
  matsLampada.forEach((mat,i)=>mat.color.set(acesa?coresLampada[i]:apagadas[i]));
  fumacaForca=noite?.14:.3;for(const n of fumaca)n.material.color.set(noite?R.noite[2]:R.pedra[3]);
 };
 grupo.userData.aplicarHora('dia');
 return grupo;
}
