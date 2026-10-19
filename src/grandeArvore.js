/** Grande Árvore do balanço (árvore-marco do jardim; o usuário a chama de "sequoia"). Referência: imagem em pixel
 * art enviada pelo usuário — árvore ancestral de tronco maciço em placas, raízes em arco, vários braços, copa larga em
 * domo, cipós e um balanço num dos braços. Forma final e estágios aprovados em 18/10/2026 a partir de
 * propostas-arvores/sequoia-balanco. A adulta tem 18,3 m, a maior do jardim. */
import * as THREE from 'three';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import { juntar } from './arvoreProc.js';
import { criarRng, criarRuido } from './mundo.js';
import { RAMPAS as R } from './paleta.js';
const V=(x=0,y=0,z=0)=>new THREE.Vector3(x,y,z), CIMA=V(0,1,0), GRAUS=Math.PI/180;
function cor(g,hex){const c=new THREE.Color(hex),p=g.attributes.position,a=new Float32Array(p.count*3);for(let i=0;i<p.count;i++)c.toArray(a,i*3);g.setAttribute('color',new THREE.BufferAttribute(a,3));return g.index?g.toNonIndexed():g;}
function bola(c,r,hex,escala=[1,1,1],det=1){const g=new THREE.IcosahedronGeometry(r,det);g.scale(...escala);g.translate(c.x,c.y,c.z);return cor(g,hex);}
function tuboR(pontos,raio,n=20,lados=9){const curva=new THREE.CatmullRomCurve3(pontos.map(p=>p.clone()),false,'centripetal'),g=new THREE.TubeGeometry(curva,n,1,lados,false),p=g.attributes.position;for(let i=0;i<=n;i++){const c=curva.getPointAt(i/n);for(let j=0;j<=lados;j++){const idx=i*(lados+1)+j,k=raio(i/n,j/lados*Math.PI*2),v=V().fromBufferAttribute(p,idx).sub(c).multiplyScalar(k).add(c);p.setXYZ(idx,v.x,v.y,v.z);}}g.computeVertexNormals();return {g,curva};}
// Casca em placas arredondadas (como na referência): uma grade contínua de placas em volta e ao longo do galho,
// entortada por ruído; as fissuras entre placas são escuras e o meio das placas, claro. Cor única por face e função
// contínua: sem degradê, sem blocos desalinhados. 'perfil(t,a)' é o raio sem o relevo.
function casca(pontos,perfil,semente,opc={}){
 const ruido=criarRuido(semente),comp=new THREE.CatmullRomCurve3(pontos.map(p=>p.clone())).getLength(),rMed=perfil(.3,0),grosso=rMed>.3;
 const lados=opc.lados??(grosso?24:rMed>.12?12:7),n=Math.max(6,Math.ceil(comp/(opc.passo??(grosso?.16:.3)))),colunas=opc.colunas??(grosso?7:rMed>.12?4:3),passoPlaca=opc.altPlaca??(grosso?.9:.7);
 const placa=(t,a)=>{const s=t*comp,u=a*colunas/(Math.PI*2)+ruido(s*.4,Math.cos(a)*.6,2)*.35,w=s/passoPlaca+ruido(Math.cos(a)*1.3,Math.sin(a)*1.3+s*.2,2)*.4+(Math.floor(u)%2)*.5;const fu=Math.abs(u-Math.round(u)),fw=Math.abs(w-Math.round(w));return Math.min(fu*2.2,fw*2.6);};
 const amp=opc.amp??(grosso?.07:.04),raio=(t,a)=>perfil(t,a)*(1+amp*(Math.min(1,placa(t,a))-.5));
 const {g,curva}=tuboR(pontos,raio,n,lados),val=new Float32Array(g.attributes.position.count);
 for(let i=0;i<=n;i++)for(let j=0;j<=lados;j++)val[i*(lados+1)+j]=placa(i/n,j/lados*Math.PI*2);
 g.setAttribute('v',new THREE.BufferAttribute(val,1));
 const plano=g.toNonIndexed(),v3=plano.attributes.v,pintura=new Float32Array(plano.attributes.position.count*3),fissura=new THREE.Color(R.terra[1]),meio=new THREE.Color(R.terra[2]),claro=new THREE.Color(R.terra[3]);
 for(let k=0;k<v3.count/3;k++){const m=(v3.getX(k*3)+v3.getX(k*3+1)+v3.getX(k*3+2))/3,c=m<.22?fissura:m>.62?claro:meio;for(let v=0;v<3;v++)c.toArray(pintura,(k*3+v)*3);}
 plano.deleteAttribute('v');plano.setAttribute('color',new THREE.BufferAttribute(pintura,3));return {geo:plano,curva};
}
const galho=(pontos,r0,r1,semente,opc)=>casca(pontos,t=>r0+(r1-r0)*t,semente,opc);
function graveto(pontos,r0,r1,hex=R.terra[2],lados=5){const {g}=tuboR(pontos,t=>r0+(r1-r0)*t,8,lados);return cor(g,hex);}
// Tufo de folhagem, com o desenho de aglomerados do jardim (banda/esfera lidas por estiloCopa).
function tufo(c,r,semente,achatar=.62,hex=R.mata[3]){
 let g=new THREE.IcosahedronGeometry(1,2);g.deleteAttribute('normal');g.deleteAttribute('uv');g=mergeVertices(g);
 const p=g.attributes.position,esf=new Float32Array(p.count*3),banda=new Float32Array(p.count),ruido=criarRuido(semente);
 for(let i=0;i<p.count;i++){const x=p.getX(i),y=p.getY(i),z=p.getZ(i),k=r*(.8+ruido(x*2+3,y*2+z+7,2)*.34);esf.set([x,y,z],i*3);banda[i]=y;p.setXYZ(i,c.x+x*k*1.1,c.y+(y<0?y*.65:y)*k*achatar,c.z+z*k*1.05);}
 g.setAttribute('banda',new THREE.BufferAttribute(banda,1));g.setAttribute('esfera',new THREE.BufferAttribute(esf,3));g.setAttribute('raioCopa',new THREE.BufferAttribute(new Float32Array(p.count).fill(r),1));g.setAttribute('semCopa',new THREE.BufferAttribute(new Float32Array(p.count).fill((semente*.6180339)%1),1));g.computeVertexNormals();return cor(g,hex);
}
// Folha lobada (estágios iniciais).
function folha(c,tam,ang,giro,hex=R.mata[3]){const s=new THREE.Shape();s.moveTo(0,0);s.bezierCurveTo(-.55,.2,-.7,.9,-.3,1.3);s.bezierCurveTo(-.1,1.55,.1,1.55,.3,1.3);s.bezierCurveTo(.7,.9,.55,.2,0,0);const g=new THREE.ShapeGeometry(s,6);g.scale(tam*.7,tam,1);g.rotateZ(ang);g.rotateY(giro);g.translate(c.x,c.y,c.z);return cor(g,hex);}
// Raiz grossa: sai do tronco, sobe em arco e mergulha na terra mais longe.
function raiz(d,rIni,yIni,alc,alto,grossura,partes,rng,nova){
 const lado=V(-d.z,0,d.x),torce=(rng()-.5)*alc*.25,o=V(0,yIni,0).addScaledVector(d,rIni);
 const pts=[o,o.clone().addScaledVector(d,alc*.28).add(V(0,alto,0)),V(0,yIni*.8+alto*.6,0).addScaledVector(d,rIni+alc*.6).addScaledVector(lado,torce*.6),V(0,.15,0).addScaledVector(d,rIni+alc*.88).addScaledVector(lado,torce),V(0,-.45,0).addScaledVector(d,rIni+alc).addScaledVector(lado,torce*1.1)];
 partes.push(galho(pts,grossura,grossura*.45,nova(),{colunas:4,altPlaca:.6}).geo);
}
// Pedaço de raiz aflorando longe do tronco: um arco baixo que sai e volta para a terra.
function raizAflorando(c,d,comp,altura,r,partes,nova){const pts=[c.clone().add(V(0,-.35,0)),c.clone().addScaledVector(d,comp*.3).add(V(0,altura,0)),c.clone().addScaledVector(d,comp*.7).add(V(0,altura*.85,0)),c.clone().addScaledVector(d,comp).add(V(0,-.35,0))];partes.push(galho(pts,r,r*.8,nova(),{colunas:3,altPlaca:.5}).geo);}
// Cipó: pende de um ponto do galho, com leve curva; às vezes faz uma alça entre dois pontos (como na referência).
function cipo(p,comp,partes,rng){const d=V(rng()-.5,0,rng()-.5).normalize().multiplyScalar(.25);partes.push(graveto([p,p.clone().add(d).add(V(0,-comp*.4,0)),p.clone().add(d.clone().multiplyScalar(.4)).add(V(0,-comp*.75,0)),p.clone().add(V(0,-comp,0))],.05,.035,R.mata[1],5));}
function alcaCipo(a,b,fundo,partes){const m=a.clone().lerp(b,.5).add(V(0,-fundo,0));partes.push(graveto([a,a.clone().lerp(m,.55).add(V(0,-fundo*.15,0)),m,b.clone().lerp(m,.55).add(V(0,-fundo*.15,0)),b],.05,.05,R.mata[1],5));}
// O balanço: duas cordas presas ao galho por voltas, descendo até um assento de tábua; mancha de terra gasta embaixo.
function balanco(gl,t1,t2,ySeat,partes,estado){
 const a=gl.curva.getPointAt(t1),b=gl.curva.getPointAt(t2),eixo=b.clone().sub(a).setY(0).normalize(),giro=Math.atan2(eixo.z,eixo.x),assento=a.clone().lerp(b,.5).setY(ySeat),meio=Math.hypot(b.x-a.x,b.z-a.z)/2+.06;
 for(const p of [a,b]){
  const rG=.36,volta=new THREE.TorusGeometry(rG,.05,5,14);volta.rotateY(Math.PI/2-giro);for(let k=0;k<2;k++){const v=volta.clone();v.translate(p.x+eixo.x*(k-.5)*.1,p.y,p.z+eixo.z*(k-.5)*.1);partes.push(cor(v,R.terra[5]));}volta.dispose();
  const fimCorda=V(p.x,ySeat+.05,p.z);partes.push(cor(tuboR([p.clone().add(V(0,-rG*.9,0)),p.clone().lerp(fimCorda,.5),fimCorda],()=>.055,12,6).g,R.terra[5]));estado.cordas++;
  partes.push(bola(V(p.x,ySeat-.1,p.z),.07,R.terra[4],[1,.8,1],0));
 }
 const tabua=new THREE.BoxGeometry(meio*2+.2,.12,.48);tabua.rotateY(-giro);tabua.translate(assento.x,ySeat,assento.z);partes.push(cor(tabua,R.terra[3]));
 const borda=new THREE.BoxGeometry(meio*2+.22,.05,.5);borda.rotateY(-giro);borda.translate(assento.x,ySeat-.07,assento.z);partes.push(cor(borda,R.terra[1]));
 const gasto=new THREE.CircleGeometry(1,18);gasto.scale(.85,1.5,1);gasto.rotateX(-Math.PI/2);gasto.rotateY(-giro);gasto.translate(assento.x,.04,assento.z);partes.push(cor(gasto,R.terra[3]));
 estado.assento=true;
}
const TONS_CIMA=[R.mata[4],R.mata[4],R.mata[5],R.mata[3]],TONS_BAIXO=[R.mata[2],R.mata[3],R.mata[3]];
export function criarGrandeArvore(semente=SEMENTE_APROVADA){
 const rng=criarRng(semente),estagios=[],relatorio=[],nova=()=>Math.floor(rng()*1e6);
 for(let fase=0;fase<4;fase++){
  const partes=[],estado={galhos:0,tufos:0,cordas:0,assento:false,raizes:0,cipos:0};
  const tom=(y,yMin,yMax)=>{const u=(y-yMin)/Math.max(.01,yMax-yMin);return u>.55?TONS_CIMA[Math.floor(rng()*TONS_CIMA.length)]:TONS_BAIXO[Math.floor(rng()*TONS_BAIXO.length)];};
  if(fase===0){
   // Broto: caule curto com três folhas largas e lobadas.
   partes.push(bola(V(0,.02,0),.24,R.terra[2],[1,.2,1]));
   partes.push(graveto([V(0,0,0),V(.01,.14,0),V(0,.26,0)],.02,.014,R.mata[2]));
   for(let i=0;i<3;i++)partes.push(folha(V(0,.24,0),.16,(i-1)*.9,i*.6+.3,i===1?R.mata[4]:R.mata[3]));
  }
  // A adulta aprovada continua saindo da receita original, com a mesma sequência de sorteios. Muda e jovem
  // passaram a seguir a arquitetura da adulta (receita nova, abaixo): a receita original delas ainda roda, sem ser
  // desenhada, só para consumir os mesmos sorteios e manter a adulta idêntica.
  const receitaOriginal=(fase,partes,estado)=>{
  if(fase===1){
   // Muda: caule com a base já mais grossa, dois ramos e tufinhos de folhas.
   partes.push(bola(V(0,.02,0),.55,R.terra[2],[1,.15,1]));
   partes.push(graveto([V(0,0,0),V(.04,.6,0),V(-.02,1.2,.02)],.07,.035,R.terra[2],7));estado.galhos++;
   for(const [a,h] of [[.5,1.0],[3.4,1.25],[1.9,1.45]]){const d=V(Math.cos(a),0,Math.sin(a)),o=V(0,h*.75,0),f=o.clone().addScaledVector(d,.45).add(V(0,.3,0));partes.push(graveto([o,o.clone().lerp(f,.5).add(V(0,.05,0)),f],.025,.012,R.terra[2]));estado.galhos++;partes.push(tufo(f.clone().add(V(0,.08,0)),.22,nova(),.7,R.mata[3]));estado.tufos++;}
  }
  if(fase>=2){
   const adulto=fase===3,s=adulto?1:.32;
   partes.push(bola(V(0,.02,0),adulto?7.2:2.4,R.terra[2],[1,.05,1],2));
   // Tronco maciço, levemente inclinado e em S, que se alarga muito na base, onde nascem as raízes.
   const hT=adulto?8.4:2.6,rB=adulto?1.6:.42,rT=adulto?1.0:.24;
   const tPts=[V(0,0,0),V(.1*s,hT*.3,.05*s),V(-.15*s,hT*.6,-.1*s),V(.25*s,hT*.85,-.05*s),V(.35*s,hT,-.2*s)];
   const perfil=(t,a)=>{const base=rT+(rB-rT)*Math.pow(1-t,1.3),alarga=t<.18?1+.75*Math.pow(1-t/.18,2)*(.6+.4*Math.abs(Math.sin(a*3.5+.4))):1;return base*alarga;};
   const tronco=casca(tPts,perfil,nova());partes.push(tronco.geo);estado.galhos++;
   // Raízes em arco em volta da base, desiguais; e pedaços de raiz aflorando mais longe.
   const nR=adulto?8:5;
   for(let i=0;i<nR;i++){const a=(i*360/nR+(rng()-.5)*30)*GRAUS,d=V(Math.cos(a),0,Math.sin(a));raiz(d,rB*.95,(adulto?1.7:.5)*(.75+rng()*.5),(adulto?3.6:1.1)*(.75+rng()*.55),(adulto?.75:.22)*(.6+rng()*.7),(adulto?.6:.15)*(.75+rng()*.4),partes,rng,nova);estado.raizes++;}
   if(adulto)for(let i=0;i<4;i++){const a=(i*90+45+(rng()-.5)*40)*GRAUS,d=V(Math.cos(a),0,Math.sin(a)),c=V(0,0,0).addScaledVector(d,5.2+rng()*1.2),lado=V(-d.z,0,d.x);raizAflorando(c,lado.clone().addScaledVector(d,rng()-.3).normalize(),1.1+rng()*.8,.45+rng()*.3,.28,partes,nova);estado.raizes++;}
   // Braços: vários, grossos, que saem de alturas diferentes no alto do tronco e se abrem para os lados subindo.
   // O braço 0 é o do balanço: mais baixo, longo e quase horizontal, virado para a esquerda (de perfil e ao sol).
   const nB=adulto?7:3,pontas=[],bracos=[];let bracoBalanco=null;
   for(let i=0;i<nB;i++){
    const balanco0=adulto&&i===0,a=(balanco0?168:(i*360/(nB-(adulto?1:0))+40+(rng()-.5)*35))*GRAUS,d=V(Math.cos(a),0,Math.sin(a)),lado=V(-d.z,0,d.x);
    const t=balanco0?.68:(adulto?.78+.22*(i/(nB-1)):.75+.25*i/(nB-1)),o=tronco.curva.getPointAt(Math.min(1,t)).addScaledVector(d,perfil(t,a)*.5);
    const alc=balanco0?6.4:(adulto?5.8:1.7)*(.8+rng()*.4),sobe=balanco0?1.6:(adulto?2.6:1.4)*(.7+rng()*.5),rI=(adulto?(balanco0?.55:.6):.13)*(.8+rng()*.25);
    const pts=balanco0?[o,o.clone().addScaledVector(d,1.6).add(V(0,.35,0)),o.clone().addScaledVector(d,3.4).add(V(0,.5,0)).addScaledVector(lado,.3),o.clone().addScaledVector(d,5.0).add(V(0,.85,0)),o.clone().addScaledVector(d,alc).add(V(0,sobe,0))]
     :[o,o.clone().addScaledVector(d,alc*.3).addScaledVector(lado,(rng()-.5)*.8*s).add(V(0,sobe*.35,0)),o.clone().addScaledVector(d,alc*.65).addScaledVector(lado,(rng()-.5)*.8*s).add(V(0,sobe*.75,0)),o.clone().addScaledVector(d,alc).add(V(0,sobe,0))];
    const b=galho(pts,rI,rI*.4,nova());partes.push(b.geo);estado.galhos++;bracos.push({b,d,rI});if(balanco0)bracoBalanco=b;
    // Cada braço se divide em dois ou três ramos que levam a copa para fora e para cima.
    const nr=adulto?(rng()<.5?3:2):2,fim=pts[pts.length-1];
    for(let k=0;k<nr;k++){const d2=d.clone().applyAxisAngle(CIMA,(k-(nr-1)/2)*.75+(rng()-.5)*.3),ini=b.curva.getPointAt(.82+k*.06),f=ini.clone().addScaledVector(d2,(adulto?2.8:.8)*(.7+rng()*.5)).add(V(0,(adulto?1.1:.6)*(.6+rng()*.6),0));partes.push(galho([ini,ini.clone().lerp(f,.5).add(V(0,.25*s,0)),f],rI*.42,rI*.15,nova()).geo);estado.galhos++;pontas.push(f);}
    pontas.push(fim);
   }
   // Copa: um domo largo e coeso. Primeiro, grupos de tufos nas pontas dos ramos; depois, tufos sobre a superfície
   // do domo para fechar o topo, deixando poucos vãos por onde aparecem os galhos.
   const yTopo=adulto?17.2:5.4,rD=adulto?9.2:2.4,altD=adulto?3.2:1.6,centro=V(.3*s,yTopo-altD,-.2*s);
   for(const p of pontas){const r=(adulto?2.1:.75)*(.8+rng()*.35);partes.push(tufo(p.clone().add(V(0,r*.25,0)),r,nova(),.5,tom(p.y,centro.y-altD*.6,yTopo)));estado.tufos++;
    if(adulto)for(let k=0;k<2;k++){const a=rng()*Math.PI*2,q=p.clone().add(V(Math.cos(a)*r*.8,(rng()-.3)*r*.5,Math.sin(a)*r*.8));partes.push(tufo(q,r*(.65+rng()*.25),nova(),.5,tom(q.y,centro.y-altD*.6,yTopo)));estado.tufos++;}}
   const nD=adulto?30:9;
   for(let i=0;i<nD;i++){const u=(i+.5)/nD,ang=i*2.399963,el=Math.acos(1-u*(adulto?.72:.95)),x=Math.sin(el)*Math.cos(ang)*rD,z=Math.sin(el)*Math.sin(ang)*rD,y=Math.cos(el)*altD;const q=centro.clone().add(V(x*(.9+rng()*.2),y,z*(.9+rng()*.2))),r=(adulto?2.4:.8)*(.8+rng()*.3);partes.push(tufo(q,r,nova(),.5,tom(q.y,centro.y-altD*.6,yTopo)));estado.tufos++;}
   // Cipós pendurados dos braços, e uma alça como na referência.
   if(adulto){
    for(let i=1;i<bracos.length;i+=1){if(rng()<.35)continue;const {b}=bracos[i],p=b.curva.getPointAt(.35+rng()*.35);cipo(p.clone().add(V(0,-.3,0)),1.8+rng()*2.2,partes,rng);estado.cipos++;}
    const {b}=bracos[2];alcaCipo(b.curva.getPointAt(.3).add(V(0,-.35,0)),b.curva.getPointAt(.62).add(V(0,-.3,0)),1.6,partes);estado.cipos++;
    // O balanço, no braço baixo da esquerda, entre os outros braços.
    balanco(bracoBalanco,.3,.42,.65,partes,estado);
   }
  }
  };
  const receitaJovem=(fase,partes,estado)=>{
   const rngL=criarRng(semente*7+fase*131),novaL=()=>Math.floor(rngL()*1e6),tomL=(y,yMin,yMax)=>{const u=(y-yMin)/Math.max(.01,yMax-yMin);return u>.55?TONS_CIMA[Math.floor(rngL()*TONS_CIMA.length)]:TONS_BAIXO[Math.floor(rngL()*TONS_BAIXO.length)];};
  if(fase>=1){
   // Muda, jovem e adulta saem da MESMA receita, em escala k da adulta: o mesmo tronco em placas que se alarga na
   // base, as mesmas raízes em arco, os mesmos braços que se abrem para os lados e o mesmo domo coeso. Só mudam o
   // tamanho e a quantidade de raízes, braços e tufos; cipós, raízes aflorando e o balanço são só da adulta.
   const adulto=fase===3,k=[0,.15,.42,1][fase],s=k;
   const P={nR:[0,3,6,8][fase],nB:[0,3,5,7][fase],nr:[0,1,2,0][fase],nD:[0,7,18,30][fase],extra:[0,1,1,2][fase],tufo:[0,1.7,1.3,1][fase]};
   partes.push(bola(V(0,.02,0),7.2*k,R.terra[2],[1,.05,1],2));
   // Tronco maciço, levemente inclinado e em S, que se alarga muito na base, onde nascem as raízes.
   const hT=8.4*k,rB=1.6*k*(adulto?1:.85),rT=1.0*k*(adulto?1:.85);
   const tPts=[V(0,0,0),V(.1*s,hT*.3,.05*s),V(-.15*s,hT*.6,-.1*s),V(.25*s,hT*.85,-.05*s),V(.35*s,hT,-.2*s)];
   const perfil=(t,a)=>{const base=rT+(rB-rT)*Math.pow(1-t,1.3),alarga=t<.18?1+.75*Math.pow(1-t/.18,2)*(.6+.4*Math.abs(Math.sin(a*3.5+.4))):1;return base*alarga;};
   const placas={colunas:7,lados:adulto?24:16,altPlaca:Math.max(.22,.9*k*1.4),passo:Math.max(.05,.16*k*1.4),amp:.07};
   const tronco=casca(tPts,perfil,novaL(),placas);partes.push(tronco.geo);estado.galhos++;
   // Raízes em arco em volta da base, desiguais; e pedaços de raiz aflorando mais longe (só na adulta).
   for(let i=0;i<P.nR;i++){const a=(i*360/P.nR+(rngL()-.5)*30)*GRAUS,d=V(Math.cos(a),0,Math.sin(a));raiz(d,rB*.95,1.7*k*(.75+rngL()*.5),3.6*k*(.75+rngL()*.55),.75*k*(.6+rngL()*.7),.6*k*(.75+rngL()*.4),partes,rngL,novaL);estado.raizes++;}
   if(adulto)for(let i=0;i<4;i++){const a=(i*90+45+(rngL()-.5)*40)*GRAUS,d=V(Math.cos(a),0,Math.sin(a)),c=V(0,0,0).addScaledVector(d,5.2+rngL()*1.2),lado=V(-d.z,0,d.x);raizAflorando(c,lado.clone().addScaledVector(d,rngL()-.3).normalize(),1.1+rngL()*.8,.45+rngL()*.3,.28,partes,nova);estado.raizes++;}
   // Braços: vários, grossos, que saem de alturas diferentes no alto do tronco e se abrem para os lados subindo.
   // O braço 0 é o mais baixo, longo e quase horizontal, virado para a esquerda: na adulta é o do balanço.
   const pontas=[],bracos=[];let bracoBalanco=null;
   for(let i=0;i<P.nB;i++){
    const baixo=i===0,a=(baixo?168:(i*360/(P.nB-1)+40+(rngL()-.5)*35))*GRAUS,d=V(Math.cos(a),0,Math.sin(a)),lado=V(-d.z,0,d.x);
    const t=baixo?.68:.78+.22*(i/(P.nB-1)),o=tronco.curva.getPointAt(Math.min(1,t)).addScaledVector(d,perfil(t,a)*.5);
    const alc=(baixo?6.4:5.8*(.8+rngL()*.4))*k,sobe=(baixo?1.6:2.6*(.7+rngL()*.5))*k,rI=(baixo?.55:.6)*k*(.8+rngL()*.25);
    const pts=baixo?[o,o.clone().addScaledVector(d,1.6*k).add(V(0,.35*k,0)),o.clone().addScaledVector(d,3.4*k).add(V(0,.5*k,0)).addScaledVector(lado,.3*k),o.clone().addScaledVector(d,5.0*k).add(V(0,.85*k,0)),o.clone().addScaledVector(d,alc).add(V(0,sobe,0))]
     :[o,o.clone().addScaledVector(d,alc*.3).addScaledVector(lado,(rngL()-.5)*.8*s).add(V(0,sobe*.35,0)),o.clone().addScaledVector(d,alc*.65).addScaledVector(lado,(rngL()-.5)*.8*s).add(V(0,sobe*.75,0)),o.clone().addScaledVector(d,alc).add(V(0,sobe,0))];
    const b=galho(pts,rI,rI*.4,novaL(),{colunas:4,altPlaca:Math.max(.2,.7*k*1.4),passo:Math.max(.06,.3*k*1.4)});partes.push(b.geo);estado.galhos++;bracos.push({b,d,rI});if(baixo)bracoBalanco=b;
    // Cada braço se divide em ramos que levam a copa para fora e para cima.
    const nr=P.nr||(rngL()<.5?3:2),fim=pts[pts.length-1];
    for(let q=0;q<nr;q++){const d2=d.clone().applyAxisAngle(CIMA,(q-(nr-1)/2)*.75+(rngL()-.5)*.3),ini=b.curva.getPointAt(.82+q*.06),f=ini.clone().addScaledVector(d2,2.8*k*(.7+rngL()*.5)).add(V(0,1.1*k*(.6+rngL()*.6),0));partes.push(galho([ini,ini.clone().lerp(f,.5).add(V(0,.25*s,0)),f],rI*.42,rI*.15,novaL(),{colunas:3,altPlaca:Math.max(.2,.6*k*1.4),passo:Math.max(.06,.3*k*1.4)}).geo);estado.galhos++;pontas.push(f);}
    pontas.push(fim);
   }
   // Copa: um domo largo e coeso. Primeiro, grupos de tufos nas pontas dos ramos; depois, tufos sobre a superfície
   // do domo para fechar o topo, deixando poucos vãos por onde aparecem os galhos.
   const yTopo=17.2*k,rD=9.2*k,altD=3.2*k,centro=V(.3*s,yTopo-altD,-.2*s);
   for(const p of pontas){const r=2.1*k*P.tufo*(.8+rngL()*.35);partes.push(tufo(p.clone().add(V(0,r*.25,0)),r,novaL(),.5,tomL(p.y,centro.y-altD*.6,yTopo)));estado.tufos++;
    for(let q=0;q<P.extra;q++){const a=rngL()*Math.PI*2,c=p.clone().add(V(Math.cos(a)*r*.8,(rngL()-.3)*r*.5,Math.sin(a)*r*.8));partes.push(tufo(c,r*(.65+rngL()*.25),novaL(),.5,tomL(c.y,centro.y-altD*.6,yTopo)));estado.tufos++;}}
   for(let i=0;i<P.nD;i++){const u=(i+.5)/P.nD,ang=i*2.399963,el=Math.acos(1-u*.72),x=Math.sin(el)*Math.cos(ang)*rD,z=Math.sin(el)*Math.sin(ang)*rD,y=Math.cos(el)*altD;const c=centro.clone().add(V(x*(.9+rngL()*.2),y,z*(.9+rngL()*.2))),r=2.4*k*P.tufo*(.8+rngL()*.3);partes.push(tufo(c,r,novaL(),.5,tomL(c.y,centro.y-altD*.6,yTopo)));estado.tufos++;}
   // Cipós pendurados dos braços, e uma alça como na referência; e o balanço, no braço baixo da esquerda (só na adulta).
   if(adulto){
    for(let i=1;i<bracos.length;i+=1){if(rngL()<.35)continue;const {b}=bracos[i],p=b.curva.getPointAt(.35+rngL()*.35);cipo(p.clone().add(V(0,-.3,0)),1.8+rngL()*2.2,partes,rngL);estado.cipos++;}
    const {b}=bracos[2];alcaCipo(b.curva.getPointAt(.3).add(V(0,-.35,0)),b.curva.getPointAt(.62).add(V(0,-.3,0)),1.6,partes);estado.cipos++;
    balanco(bracoBalanco,.3,.42,.65,partes,estado);
   }
  }

  };
  if(fase===3)receitaOriginal(fase,partes,estado);
  else if(fase>=1){const lixo=[];receitaOriginal(fase,lixo,{galhos:0,tufos:0,cordas:0,assento:false,raizes:0,cipos:0});for(const g of lixo)g.dispose();receitaJovem(fase,partes,estado);}
  const geo=juntar(partes);geo.computeBoundingBox();
  geo.userData.proposta={fase,galhos:estado.galhos,tufos:estado.tufos,raizes:estado.raizes,cipos:estado.cipos,cordas:estado.cordas,assento:estado.assento,altura:+geo.boundingBox.max.y.toFixed(1)};estagios.push(geo);relatorio.push(geo.userData.proposta);for(const g of partes)g.dispose();
 }
 return {estagios,relatorio};
}

// Semente da forma aprovada: outra semente muda a árvore inteira.
const SEMENTE_APROVADA=1859;

/** Planta a adulta no local "grande-arvore" do plano mestre. É um marco fixo: não cresce com a barra de crescimento
 * nem entra no sorteio de espécies. Usa o material das árvores (estiloCopa), então a copa tem o mesmo desenho das outras. */
export function plantarGrandeArvore(m,material){
 const local=m.plano.locais.find(l=>l.id==='grande-arvore'),grupo=new THREE.Group();grupo.name='Grande Árvore do balanço';
 if(!local)return grupo;
 const {estagios}=criarGrandeArvore();for(let i=0;i<3;i++)estagios[i].dispose();
 const malha=new THREE.Mesh(estagios[3],material);malha.castShadow=malha.receiveShadow=true;
 // Assenta na terra pelo ponto mais baixo em volta do tronco, para as raízes não ficarem no ar.
 const base=Math.min(...[0,1,2,3,4,5].map(i=>m.altitude(local.x+Math.cos(i*1.047)*2,local.y+Math.sin(i*1.047)*2)));
 grupo.position.set(local.x,base-.05,local.y);grupo.rotation.y=local.giro??0;grupo.add(malha);
 grupo.userData.local=local;return grupo;
}
