/** Araucária dos Cometas (Bosque de Pediatria — Endocrinologia, genética e metabolismo): candelabro de copa azul-escura como um céu noturno, com estrelas, uma lua cheia no centro e luas pendentes de luz própria (atributo brilho). Modelo aprovado. */
import * as THREE from 'three';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import { criarRng, criarRuido } from './mundo.js';
import { RAMPAS as R } from './paleta.js';
const V=(x=0,y=0,z=0)=>new THREE.Vector3(x,y,z), casca=R.terra[2], CIMA=V(0,1,0), GRAUS=Math.PI/180;
function cor(g,hex){const c=new THREE.Color(hex),p=g.attributes.position,a=new Float32Array(p.count*3);for(let i=0;i<p.count;i++)c.toArray(a,i*3);g.setAttribute('color',new THREE.BufferAttribute(a,3));return g.index?g.toNonIndexed():g;}
function bola(c,r,hex,escala=[1,1,1]){const g=new THREE.IcosahedronGeometry(r,1);g.scale(...escala);g.translate(c.x,c.y,c.z);return cor(g,hex);}
function ramo(pontos,r0,r1,hex=casca){const curva=new THREE.CatmullRomCurve3(pontos.map(p=>p.isVector3?p.clone():V(...p))),n=20,lados=8,g=new THREE.TubeGeometry(curva,n,r0,lados,false),p=g.attributes.position;for(let i=0;i<=n;i++){const c=curva.getPointAt(i/n),k=(r0+(r1-r0)*i/n)/r0;for(let j=0;j<=lados;j++){const idx=i*(lados+1)+j,v=V().fromBufferAttribute(p,idx).sub(c).multiplyScalar(k).add(c);p.setXYZ(idx,v.x,v.y,v.z);}}g.computeVertexNormals();return cor(g,hex);}
// Tufo de folhagem alongado (a "grimpa" da araucária): começa em c e cresce na direção dir.
// A banda segue a altura real depois de girar, para o topo do tufo receber a luz do sol.
function tufo(c,dir,comp,raio,semente,hex=R.mata[2]){
 let g=new THREE.IcosahedronGeometry(1,2);g.deleteAttribute('normal');g.deleteAttribute('uv');g=mergeVertices(g);
 const p=g.attributes.position,esf=new Float32Array(p.count*3),banda=new Float32Array(p.count),ruido=criarRuido(semente),giro=new THREE.Quaternion().setFromUnitVectors(CIMA,dir.clone().normalize()),u=V(),centro=c.clone().addScaledVector(dir.clone().normalize(),comp*.5);
 for(let i=0;i<p.count;i++){u.set(p.getX(i),p.getY(i),p.getZ(i));const k=.85+ruido(u.x*1.9+3,u.y*1.9+u.z+7,2)*.3,v=V(u.x*raio*k,u.y*comp*.5*k,u.z*raio*k).applyQuaternion(giro).add(centro),d=u.clone().applyQuaternion(giro);esf.set([d.x,d.y,d.z],i*3);banda[i]=d.y;p.setXYZ(i,v.x,v.y,v.z);}
 g.setAttribute('banda',new THREE.BufferAttribute(banda,1));g.setAttribute('esfera',new THREE.BufferAttribute(esf,3));g.setAttribute('raioCopa',new THREE.BufferAttribute(new Float32Array(p.count).fill(Math.max(raio,comp*.35)),1));g.setAttribute('semCopa',new THREE.BufferAttribute(new Float32Array(p.count).fill((semente*.6180339)%1),1));g.computeVertexNormals();return cor(g,hex);
}
// Agulha rígida e estreita, em dois planos cruzados para ter volume de qualquer ângulo.
function agulha(base,dir,comp,hex=R.mata[3]){
 const d=dir.clone().normalize(),l1=Math.abs(d.y)>.9?V(1,0,0):V().crossVectors(d,CIMA).normalize(),l2=V().crossVectors(d,l1).normalize(),pos=[],w=comp*.1,ponta=base.clone().addScaledVector(d,comp),meio=base.clone().addScaledVector(d,comp*.3);
 for(const l of [l1,l2])pos.push(...base.toArray(),...meio.clone().addScaledVector(l,w).toArray(),...ponta.toArray(),...base.toArray(),...ponta.toArray(),...meio.clone().addScaledVector(l,-w).toArray());
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.computeVertexNormals();return cor(g,hex);
}
// Escova de agulhas ao longo de um ramo: cada agulha aponta para fora e para a frente, como na araucária jovem.
function escova(curva,n,comp,partes,inicio=.15){
 for(let i=0;i<n;i++){const t=inicio+(1-inicio)*i/Math.max(1,n-1),p=curva.getPointAt(t),eixo=curva.getTangentAt(t),l1=Math.abs(eixo.y)>.9?V(1,0,0):V().crossVectors(eixo,CIMA).normalize(),l2=V().crossVectors(eixo,l1).normalize();
  for(let k=0;k<4;k++){const a=k*Math.PI/2+i*.7,dir=l1.clone().multiplyScalar(Math.cos(a)).addScaledVector(l2,Math.sin(a)).addScaledVector(eixo,.9);partes.push(agulha(p,dir,comp*(1-.35*t),k%2?R.agua[2]:R.agua[3]));}}
}
// Pinhão: semente alongada, castanho-avermelhada, com a ponta clara.
function pinhao(c,dir,comp,partes){const d=dir.clone().normalize(),g=new THREE.IcosahedronGeometry(1,2);g.scale(comp*.2,comp*.5,comp*.2);g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(CIMA,d));g.translate(c.x,c.y,c.z);partes.push(cor(g,R.vermelho[0]),bola(c.clone().addScaledVector(d,comp*.45),comp*.1,R.terra[4]));}
// Peça que emite luz própria: o atributo brilho (0–1) é lido pelo material, que a mantém acesa mesmo na sombra.
function acesa(g,brilho){g.userData.brilho=brilho;return g;}
// Lua: esfera clara com algumas crateras rasas em outro tom, para ler como lua mesmo acesa.
// Emite luz própria pelo material; não cria uma luz real por fruto, para não pesar na floresta.
function lua(c,r,partes,semente){
 const rr=criarRng(semente),g=new THREE.IcosahedronGeometry(r,2);g.translate(c.x,c.y,c.z);partes.push(acesa(cor(g,R.luz[0]),1));
 for(let i=0;i<5;i++){const z=rr()*2-1,a=rr()*Math.PI*2,d=V(Math.sqrt(1-z*z)*Math.cos(a),z,Math.sqrt(1-z*z)*Math.sin(a)),t=r*(.2+rr()*.18),k=new THREE.SphereGeometry(1,10,4);k.scale(t,t,r*.05);k.lookAt(d);const p=c.clone().addScaledVector(d,r*.985);k.translate(p.x,p.y,p.z);partes.push(acesa(cor(k,i%2?R.terra[5]:R.terra[4]),.95));}
 return c;
}
// Almofada de folhagem: tufo achatado e centrado em c; empilhadas formam a grimpa em camadas.
// Tem um brilho próprio fraco: à noite a copa aparece como um céu escuro em volta das luas.
function almofada(c,dir,espessura,raio,semente,hex){const d=dir.clone().normalize();return acesa(tufo(c.clone().addScaledVector(d,-espessura/2),d,espessura,raio,semente,hex),.18);}
function tronco(h,r0,r1){const perfil=[];for(let j=0;j<=14;j++){const u=j/14,r=r0+(r1-r0)*u+r0*.45*Math.exp(-u/.05);perfil.push(new THREE.Vector2(r,u*h));}perfil.push(new THREE.Vector2(0,h));return cor(new THREE.LatheGeometry(perfil,12),casca);}
export function criarAraucariaCometas(semente, juntar){
 const rng=criarRng(semente),estagios=[],relatorio=[],nova=()=>Math.floor(rng()*1e6);
 for(let fase=0;fase<4;fase++){
  const partes=[],focos=[];let galhos=0,andares=0,tufos=0,agulhas=0,luas=0;
  if(fase===0){
   // Pinhão meio enterrado de onde sai a plântula, com duas rosetas de agulhas.
   partes.push(bola(V(0,.02,0),.22,R.terra[2],[1,.18,1]));pinhao(V(.12,.05,.03),V(1,.3,.25),.24,partes);
   const caule=new THREE.CatmullRomCurve3([V(0,0,0),V(.01,.2,0),V(0,.38,0)]);partes.push(ramo([V(0,0,0),V(.01,.2,0),V(0,.38,0)],.025,.016,R.mata[2]));
   const n0=partes.length;
   for(const [y,n,comp,sobe] of [[.26,6,.2,.35],[.38,5,.16,1.1]])for(let i=0;i<n;i++){const a=i*2*Math.PI/n+y*4;partes.push(agulha(V(0,y,0),V(Math.cos(a),sobe,Math.sin(a)),comp,i%2?R.agua[2]:R.agua[3]));}
   partes.push(agulha(V(0,.38,0),CIMA,.12,R.agua[3]));agulhas=partes.length-n0;andares=1;
  }
  if(fase===1){
   // Muda: caule reto e três andares compactos de quatro ramos com escovas de agulhas.
   partes.push(ramo([V(0,0,0),V(.02,.7,0),V(0,1.45,0)],.055,.02,R.terra[2]));
   const n0=partes.length;
   [[.55,.55],[.88,.42],[1.18,.3]].forEach(([y,L],k)=>{for(let i=0;i<4;i++){const a=(i*90+k*45)*GRAUS,d=V(Math.cos(a),0,Math.sin(a)),pts=[V(0,y,0),d.clone().multiplyScalar(L*.55).add(V(0,y+.02,0)),d.clone().multiplyScalar(L).add(V(0,y+.1,0))];partes.push(ramo(pts,.022,.01,R.terra[2]));galhos++;escova(new THREE.CatmullRomCurve3(pts),5,.13,partes);}andares++;});
   escova(new THREE.CatmullRomCurve3([V(0,1.2,0),V(0,1.35,0),V(0,1.5,0)]),3,.11,partes,0);partes.push(agulha(V(0,1.45,0),CIMA,.14,R.agua[3]));
   agulhas=partes.length-n0-galhos;
  }
  if(fase===2){
   // Jovem: silhueta cônica de andares; ramos quase horizontais com a ponta erguida e tufos ao longo deles.
   const h=5.6;partes.push(tronco(h,.2,.06));const n=6;
   for(let k=0;k<n;k++){
    const u=k/(n-1),y=1.2+u*3.75,L=2.3*(1-u)+.5,quant=k<4?5:4;andares++;
    for(let i=0;i<quant;i++){
     const a=(i*360/quant+k*37+rng()*8)*GRAUS,d=V(Math.cos(a),0,Math.sin(a)),pts=[V(0,y,0),d.clone().multiplyScalar(L*.5).add(V(0,y-.08,0)),d.clone().multiplyScalar(L).add(V(0,y+.15,0))];
     partes.push(ramo(pts,.07*(1-u*.5),.025,casca));galhos++;
     const curva=new THREE.CatmullRomCurve3(pts),ini=curva.getPointAt(.42),fim=curva.getPointAt(1);
     partes.push(tufo(ini,fim.clone().sub(ini),fim.distanceTo(ini)+.25,.21*(1-u*.3),nova(),k%2?R.noite[2]:R.noite[3]));tufos++;
     partes.push(tufo(fim.clone().add(V(0,-.08,0)),d.clone().multiplyScalar(.4).add(V(0,1,0)),.6,.17,nova(),R.noite[3]));tufos++;
    }
   }
   partes.push(tufo(V(0,h-.35,0),CIMA,.95,.24,nova(),R.noite[3]));tufos++;
  }
  if(fase===3){
   // Adulta: fuste alto e limpo, com cicatrizes dos andares que caíram; três andares irregulares de pernadas em candelabro.
   // Cada pernada termina numa grimpa de almofadas achatadas em camadas, azul-escuras como um céu noturno.
   // As luas fazem o contraponto: a folhagem sobe e as luas pendem; uma lua cheia descansa no centro côncavo da copa.
   const h=10.2,topo=11.9;partes.push(tronco(h,.42,.17));
   for(const y of [3.2,4.6,5.9,7.1]){const g=new THREE.TorusGeometry(.33-y*.017,.035,4,12);g.rotateX(Math.PI/2);g.translate(0,y,0);partes.push(cor(g,R.terra[1]));}
   const verticilos=[{y:8.1,L:5.2,n:6,g:0},{y:9.05,L:3.9,n:6,g:30},{y:9.9,L:2.5,n:5,g:12}],pontas=[];
   // Estrelas: poucos pontos de luz sobre algumas almofadas, para a copa lembrar um pedaço de céu.
   const estrelas=(c,dir,raio,esp)=>{if(rng()>.45)return;const d=dir.clone().normalize(),l1=V().crossVectors(d,V(.3,0,1)).normalize(),l2=V().crossVectors(d,l1);for(let i=0,n=1+Math.floor(rng()*2);i<n;i++){const a=rng()*Math.PI*2,q=raio*(.2+rng()*.45),p=c.clone().addScaledVector(d,esp*.5).addScaledVector(l1,Math.cos(a)*q).addScaledVector(l2,Math.sin(a)*q);partes.push(acesa(bola(p,.055,R.luz[0]),1));}};
   for(const [k,v] of verticilos.entries()){
    andares++;let faltas=0;
    for(let i=0;i<v.n;i++){
     if(k<2&&faltas===0&&rng()<.14){faltas++;continue;}
     const a=(i*360/v.n+v.g+(rng()-.5)*28)*GRAUS,d=V(Math.cos(a),0,Math.sin(a)),lado=V(-d.z,0,d.x),L=v.L*(.82+rng()*.3),y0=v.y+(rng()-.5)*.3,subida=topo-y0-.9+(rng()-.5)*.8,desvio=(rng()-.5)*.4*L,ceda=(rng()-.3)*.3;
     const rt=.17+(h-y0)*.05,pts=[d.clone().multiplyScalar(rt*.6).add(V(0,y0-.15,0)),d.clone().multiplyScalar(L*.45).addScaledVector(lado,desvio*.3).add(V(0,y0+subida*.12-ceda,0)),d.clone().multiplyScalar(L*.82).addScaledVector(lado,desvio*.7).add(V(0,y0+subida*.45-ceda*.5,0)),d.clone().multiplyScalar(L).addScaledVector(lado,desvio).add(V(0,y0+subida,0))];
     partes.push(ramo(pts,.16-k*.03,.06,casca));galhos++;
     const curva=new THREE.CatmullRomCurve3(pts),fim=curva.getPointAt(1),e=(1-k*.15)*(.85+rng()*.3);
     // Grimpa em camadas: almofada principal na ponta, outra mais baixa e para o lado, e às vezes uma menor por cima.
     const dirP=d.clone().multiplyScalar(.3).addScaledVector(lado,(rng()-.5)*.3).add(CIMA),cP=fim.clone().addScaledVector(CIMA,.12);
     partes.push(almofada(cP,dirP,.95*e,1.15*e,nova(),R.noite[2]));tufos++;estrelas(cP,dirP,1.15*e,.95*e);
     const sinal=rng()<.5?-1:1,cB=curva.getPointAt(.8).addScaledVector(lado,sinal*.25).addScaledVector(CIMA,-.05);
     partes.push(almofada(cB,d.clone().multiplyScalar(.5).add(CIMA),.75*e,.9*e,nova(),R.noite[1]));tufos++;
     // Almofada interna, ao longo da pernada: une a grimpa ao miolo e evita o ar de cogumelo.
     const cI=curva.getPointAt(.6).addScaledVector(CIMA,.1);partes.push(almofada(cI,d.clone().multiplyScalar(.2).add(CIMA),.6*e,.75*e,nova(),R.noite[1]));tufos++;
     if(rng()<.6){const cT=fim.clone().addScaledVector(CIMA,.7*e).addScaledVector(d,-.15).addScaledVector(lado,(rng()-.5)*.3);partes.push(almofada(cT,CIMA,.65*e,.75*e,nova(),R.noite[3]));tufos++;estrelas(cT,CIMA,.75*e,.65*e);}
     pontas.push({k,a,d,fim,e});
    }
   }
   // Lua cheia no centro côncavo da copa, aninhada num berço de almofadas: acende o miolo de dentro para fora.
   const centro=V(0,h+.8,0);focos.push({c:lua(centro,.8,partes,nova()),alcance:4});luas++;
   for(let j=0;j<4;j++){const a=(j*90+rng()*30)*GRAUS,o=V(Math.cos(a),0,Math.sin(a));partes.push(almofada(o.clone().multiplyScalar(.75).add(V(0,h+.2,0)),o.clone().multiplyScalar(.6).add(CIMA),.45,.6,nova(),R.noite[2]));tufos++;}
   // Luas pendentes: penduradas sob algumas grimpas dos andares de baixo e do meio, bem espaçadas e em alturas diferentes.
   const escolhidas=[];
   for(const p of pontas.filter(p=>p.k<2).map(p=>({p,o:rng()})).sort((x,y)=>x.o-y.o).map(x=>x.p)){
    if(escolhidas.length>=5||escolhidas.some(q=>Math.abs(Math.atan2(Math.sin(q.a-p.a),Math.cos(q.a-p.a)))<55*GRAUS))continue;escolhidas.push(p);
    const r=.3+rng()*.22,haste=.5+rng()*.8,ancora=p.fim.clone().addScaledVector(p.d,.15).addScaledVector(CIMA,-.1),fim=ancora.clone().addScaledVector(CIMA,-haste).addScaledVector(p.d,.12);
    partes.push(ramo([ancora,ancora.clone().lerp(fim,.5).addScaledVector(p.d,.06),fim],.035,.022,casca));
    focos.push({c:lua(fim.clone().addScaledVector(CIMA,-r*.95),r,partes,nova()),alcance:1.6+r*1.6});luas++;
   }
  }
  const geo=juntar(partes);geo.computeBoundingBox();
  // Brilho por vértice, na mesma ordem em que juntar() concatena as peças.
  const brilho=new Float32Array(geo.attributes.position.count);let o=0;for(const g of partes){const n=g.attributes.position.count;if(g.userData.brilho)brilho.fill(g.userData.brilho,o,o+n);o+=n;}geo.setAttribute('brilho',new THREE.BufferAttribute(brilho,1));
  // A luz das luas transborda: ramos e almofadas vizinhos ficam num azul mais claro e aceso, com queda suave até o alcance de cada lua.
  if(focos.length){const p=geo.attributes.position,c=geo.attributes.color,quente=new THREE.Color(R.noite[3]),k=new THREE.Color(),v=V();for(let i=0;i<p.count;i++){if(brilho[i]>.5)continue;v.fromBufferAttribute(p,i);let f=0;for(const foco of focos)f=Math.max(f,1-v.distanceTo(foco.c)/foco.alcance);if(f<=0)continue;f=Math.pow(f,1.6);k.fromBufferAttribute(c,i).lerp(quente,f*.8);c.setXYZ(i,k.r,k.g,k.b);brilho[i]=Math.max(brilho[i],f*.8);}}geo.userData.proposta={fase,galhos,andares,tufos,agulhas,frutos:luas};estagios.push(geo);relatorio.push(geo.userData.proposta);for(const g of partes)g.dispose();
 }
 return {estagios,relatorio};
}
