import * as THREE from 'three';
import {RAMPAS} from './paleta.js';
import {criarRng} from './mundo.js';

/** Peças com cor por face, reunidas por articulação. */
function construtor() {
  const pos=[],cor=[];
  function forma(g,tom,p=[0,0,0],s=[1,1,1],r=null){
    g.scale(...s);if(r)g.rotateX(r);g.translate(...p);const n=g.index?g.toNonIndexed():g,a=n.attributes.position,c=new THREE.Color(tom);
    for(let i=0;i<a.count;i++){pos.push(a.getX(i),a.getY(i),a.getZ(i));cor.push(c.r,c.g,c.b);}n.dispose();g.dispose();
  }
  const bola=(p,s,tom)=>forma(new THREE.SphereGeometry(1,12,8),tom,p,s);
  function fechar(){const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setAttribute('color',new THREE.Float32BufferAttribute(cor,3));g.computeVertexNormals();g.computeBoundingSphere();return g;}
  return {forma,bola,fechar};
}

export function geometriasEsquilo() {
  const pelo=RAMPAS.outono[1],luz=RAMPAS.outono[2],creme=RAMPAS.terra[5],escuro=RAMPAS.tinta[0];
  let c=construtor();
  c.bola([0,.31,-.04],[.21,.27,.34],pelo);
  c.bola([0,.33,.13],[.165,.22,.16],luz);
  c.bola([0,.31,.22],[.115,.17,.055],creme);
  for(const lado of [-1,1])c.bola([lado*.16,.19,-.19],[.14,.19,.2],pelo);
  const corpo=c.fechar();c=construtor();
  c.bola([0,0,0],[.17,.17,.19],pelo);
  for(const lado of [-1,1]){
    c.bola([lado*.105,-.035,.12],[.09,.085,.095],luz);
    c.bola([lado*.04,-.05,.18],[.07,.055,.075],creme);
    c.bola([lado*.138,.055,.105],[.028,.04,.032],escuro);
    c.bola([lado*.15,.069,.121],[.01,.012,.01],RAMPAS.betula[0]);
    c.bola([lado*.11,.185,-.035],[.063,.13,.047],pelo);
    c.bola([lado*.11,.19,-.001],[.032,.08,.015],RAMPAS.flor[1]);
    // Tufos discretos na ponta das orelhas.
    c.forma(new THREE.ConeGeometry(.042,.1,5),RAMPAS.terra[2],[lado*.11,.3,-.035]);
    for(let k=0;k<2;k++)c.forma(new THREE.BoxGeometry(.11,.006,.006),RAMPAS.terra[2],[lado*.12,-.045+k*.025,.19]);
  }
  c.bola([0,-.025,.242],[.031,.023,.024],escuro);
  const cabeca=c.fechar();c=construtor();
  c.bola([0,-.085,.015],[.055,.115,.06],pelo);c.bola([0,-.18,.055],[.055,.04,.09],RAMPAS.terra[2]);
  for(let i=0;i<3;i++)c.forma(new THREE.BoxGeometry(.009,.008,.04),creme,[(i-1)*.025,-.18,.13]);
  const dianteira=c.fechar();c=construtor();
  c.bola([0,-.055,0],[.09,.11,.11],pelo);c.bola([0,-.16,.075],[.075,.045,.15],RAMPAS.terra[2]);
  const traseira=c.fechar();
  // Cauda contínua: larga, achatada de lado e recurvada acima do dorso.
  const curva=new THREE.CatmullRomCurve3([new THREE.Vector3(0,0,0),new THREE.Vector3(0,.18,-.23),new THREE.Vector3(0,.6,-.42),new THREE.Vector3(0,1.03,-.22),new THREE.Vector3(0,1.04,.13)]);
  const p=[],cores=[],idx=[],n=25,k=12;
  for(let i=0;i<=n;i++){
    const t=i/n,centro=curva.getPoint(t),d=curva.getTangent(t),normal=new THREE.Vector3(0,-d.z,d.y).normalize();
    const raio=.045+Math.sin(Math.PI*t)**.8*.245;
    for(let j=0;j<=k;j++){
      const a=j/k*Math.PI*2,tufo=1+Math.sin(i*2.8+j*2.3)*.055;
      const q=centro.clone().add(new THREE.Vector3(Math.cos(a)*raio*tufo,0,0)).addScaledVector(normal,Math.sin(a)*raio*.63*tufo);
      p.push(q.x,q.y,q.z);const C=new THREE.Color(Math.sin(a)>.3?luz:Math.cos(a)>.5?RAMPAS.terra[3]:pelo);cores.push(C.r,C.g,C.b);
      if(i<n&&j<k){const a=i*(k+1)+j,b=a+k+1;idx.push(a,b,a+1,a+1,b,b+1);}
    }
  }
  const cauda=new THREE.BufferGeometry();cauda.setAttribute('position',new THREE.Float32BufferAttribute(p,3));cauda.setAttribute('color',new THREE.Float32BufferAttribute(cores,3));cauda.setIndex(idx);cauda.computeVertexNormals();cauda.computeBoundingSphere();
  c=construtor();c.bola([0,0,0],[.06,.08,.06],luz);c.bola([0,.055,0],[.07,.035,.07],RAMPAS.terra[1]);c.forma(new THREE.CylinderGeometry(.012,.018,.04,5),RAMPAS.terra[2],[0,.1,0]);
  return {corpo,cabeca,dianteira,traseira,cauda,noz:c.fechar()};
}

export function criarPopulacaoEsquilos(mundo) {
  const rng=criarRng(mundo.semente^0xe5c0110),arvores=mundo.objetos.filter(o=>o.tipo==='arvore'&&mundo.fatorLago(o.x,o.y)>1.3);
  if(!arvores.length)return [];
  arvores.sort((a,b)=>Math.hypot(a.x-211,a.y-95)-Math.hypot(b.x-211,b.y-95));
  const lares=[];
  for(const a of arvores)if(lares.every(b=>Math.hypot(a.x-b.x,a.y-b.y)>38)){lares.push(a);if(lares.length===9)break;}
  const pop=[];
  for(const [i,casa] of lares.entries()){
    const pontos=[];
    for(let k=0;k<120&&pontos.length<4;k++){
      const ang=rng()*Math.PI*2,r=4+rng()*5,x=casa.x+Math.cos(ang)*r,z=casa.y+Math.sin(ang)*r,h=mundo.altitude(x,z);
      if(mundo.fatorLago(x,z)<1.16||mundo.distTrilha(x,z)<2||mundo.declive(x,z)>.22)continue;
      if(pontos.some(p=>Math.hypot(p.x-x,p.z-z)<2))continue;
      const anterior=pontos.at(-1);
      if(anterior&&Array.from({length:21},(_,j)=>({x:anterior.x+(x-anterior.x)*j/20,z:anterior.z+(z-anterior.z)*j/20})).some(p=>mundo.fatorLago(p.x,p.z)<1.1||Math.abs(mundo.altitude(p.x,p.z)-h)>.45))continue;
      if(pontos.length===3){const p=pontos[0];if(Math.abs(p.y-h)>.45)continue;}
      pontos.push({x,y:h,z});
    }
    if(pontos.length<3)continue;
    pontos.sort((a,b)=>Math.atan2(a.z-casa.y,a.x-casa.x)-Math.atan2(b.z-casa.y,b.x-casa.x));
    const trechos=pontos.map((a,j)=>{const b=pontos[(j+1)%pontos.length];return {a,b,duracao:Math.max(2.4,Math.hypot(a.x-b.x,a.z-b.z)/(1.3+rng()*.8)),pausa:3+rng()*5};});
    pop.push({pontos,trechos,periodo:trechos.reduce((s,t)=>s+t.duracao+t.pausa,0),fase:rng(),escala:.94+rng()*.2,ritmo:8+rng()*3,id:i});
  }
  return pop;
}

export function estadoEsquilo(b,tempo) {
  let rel=((tempo+b.fase*b.periodo)%b.periodo+b.periodo)%b.periodo,trecho=b.trechos.at(-1);
  for(const t of b.trechos){if(rel<t.duracao+t.pausa){trecho=t;break;}rel-=t.duracao+t.pausa;}
  const t=Math.min(1,rel/trecho.duracao),parado=t===1,s=t*t*(3-2*t),dx=trecho.b.x-trecho.a.x,dz=trecho.b.z-trecho.a.z;
  const salto=parado?0:Math.max(0,Math.sin(t*Math.PI*3))**4*.38;
  const acao=parado?(rel-trecho.duracao<trecho.pausa*.65?'roendo':'atento'):'correndo';
  return {x:trecho.a.x+dx*s,z:trecho.a.z+dz*s,yaw:Math.atan2(dx,dz),salto,acao,passo:tempo*b.ritmo,parado};
}

export function criarEsquilos(mundo,toon) {
  const grupo=new THREE.Group();grupo.name='esquilos-do-bosque';
  const pop=criarPopulacaoEsquilos(mundo),geos=geometriasEsquilo(),mat=toon({vertexColors:true,side:THREE.DoubleSide});
  function malha(nome){const m=new THREE.Mesh(geos[nome],mat);m.castShadow=m.receiveShadow=true;return m;}
  const bichos=pop.map(b=>{
    const raiz=new THREE.Group(),tronco=malha('corpo'),cabeca=malha('cabeca'),cauda=malha('cauda'),noz=malha('noz'),pernas=[];
    cabeca.position.set(0,.53,.27);cauda.position.set(0,.18,-.29);noz.position.set(0,.41,.42);raiz.add(tronco,cabeca,cauda,noz);
    for(const tras of [false,true])for(const lado of [-1,1]){const m=malha(tras?'traseira':'dianteira');m.position.set(lado*(tras?.19:.14),tras?.18:.4,tras?-.19:.19);raiz.add(m);pernas.push({m,tras,lado});}
    grupo.add(raiz);return {b,raiz,tronco,cabeca,cauda,noz,pernas};
  });
  const proj=new THREE.Matrix4(),frustum=new THREE.Frustum(),p=new THREE.Vector3();let visiveis=0;
  function atualizar(tempo,camera,alturaCamera,hora,alvo) {
    visiveis=0;grupo.visible=alturaCamera<85&&hora!=='noite';if(!grupo.visible)return;
    camera.updateMatrixWorld();proj.multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse);frustum.setFromProjectionMatrix(proj);
    const ordenados=bichos.map(r=>({r,e:estadoEsquilo(r.b,tempo)})).sort((a,b)=>Math.hypot(a.e.x-alvo.x,a.e.z-alvo.z)-Math.hypot(b.e.x-alvo.x,b.e.z-alvo.z));
    for(const {r,e} of ordenados){
      const h=mundo.altitude(e.x,e.z),perto=frustum.containsPoint(p.set(e.x,h+.5,e.z));r.raiz.visible=perto&&visiveis<4;if(!r.raiz.visible)continue;visiveis++;
      const s=r.b.escala*(1-THREE.MathUtils.smoothstep(alturaCamera,65,85));r.raiz.scale.setScalar(s);r.raiz.position.set(e.x,h+e.salto+.04,e.z);r.raiz.rotation.set(0,e.yaw,0);
      const correndo=e.acao==='correndo',roendo=e.acao==='roendo';
      r.tronco.rotation.x=correndo?.12:0;r.tronco.position.y=correndo?Math.sin(e.passo*2)*.025:0;
      r.cabeca.position.y=correndo?.45:.53;r.cabeca.rotation.set(roendo?.08+Math.sin(tempo*16)*.035:correndo?.08:Math.sin(tempo*.8)*.1,correndo?Math.sin(tempo*1.5)*.04:Math.sin(tempo*.7+r.b.id)*.26,0);
      r.cauda.rotation.set(correndo?-.25+Math.sin(e.passo)*.12:.06+Math.sin(tempo*1.8+r.b.id)*.06,Math.sin(tempo*1.2)*.12,Math.sin(tempo*2+r.b.id)*.1);
      r.noz.visible=roendo;r.noz.position.y=.42+Math.sin(tempo*16)*.009;
      for(const {m,tras,lado} of r.pernas){
        m.rotation.x=correndo?Math.sin(e.passo+(tras?Math.PI:0)+lado*.4)*.8:tras?0:-1.05+Math.sin(tempo*16)*.045;
        m.position.y=tras?.18:correndo?.4:.48;m.rotation.z=tras?0:roendo?-lado*.22:0;
      }
    }
  }
  grupo.userData={populacao:pop,atualizar,get visiveis(){return visiveis;},foco:pop[0]?{x:pop[0].pontos.reduce((s,p)=>s+p.x,0)/pop[0].pontos.length,z:pop[0].pontos.reduce((s,p)=>s+p.z,0)/pop[0].pontos.length}:null};return grupo;
}
