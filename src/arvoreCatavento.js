/** Cataventos vegetais: folhas volumétricas curvadas, sem movimento de vento. */
import * as THREE from 'three';
import { criarRng } from './mundo.js';
import { RAMPAS as R } from './paleta.js';
const V=(x=0,y=0,z=0)=>new THREE.Vector3(x,y,z);
// Cada lâmina conserva sua família de cor na dobra, nervura e no avesso.
const CORES_FOLHAS=[
 [R.vermelho[0],R.vermelho[1],R.vermelho[2]],
 [R.amarelo[0],R.amarelo[1],R.amarelo[2]],
 [R.agua[1],R.agua[2],R.agua[3]],
 [R.mata[2],R.mata[4],R.mata[5]],
];
function pintar(g,hex){const c=new THREE.Color(hex),p=g.attributes.position,a=new Float32Array(p.count*3);for(let i=0;i<p.count;i++)c.toArray(a,i*3);g.setAttribute('color',new THREE.BufferAttribute(a,3));return g.index?g.toNonIndexed():g;}
function ramo(pontos,r0,r1,hex=R.terra[2]){const curva=new THREE.CatmullRomCurve3(pontos),n=16,l=8,g=new THREE.TubeGeometry(curva,n,r0,l,false),p=g.attributes.position;for(let i=0;i<=n;i++){const c=curva.getPointAt(i/n),f=THREE.MathUtils.lerp(r0,r1,i/n)/r0;for(let j=0;j<=l;j++){const k=i*(l+1)+j,v=V().fromBufferAttribute(p,k).sub(c).multiplyScalar(f).add(c);p.setXYZ(k,v.x,v.y,v.z);}}g.computeVertexNormals();return pintar(g,hex);}
function bola(c,r,hex,escala=[1,1,1]){const g=new THREE.IcosahedronGeometry(r,1);g.scale(...escala);g.translate(c.x,c.y,c.z);return pintar(g,hex);}

/** Uma lâmina fechada: curvatura, nervura e espessura existem em 3D. */
function folha(raio,angulo,tons,fechada=false){
 const n=12,m=6,pos=[],cores=[],indices=[],baixo=new THREE.Color(tons[0]),base=new THREE.Color(tons[1]),clara=new THREE.Color(tons[2]);
 const ponto=(u,v)=>{const a=angulo+(fechada?1.1:.85)*u,dist=raio*(.06+.94*u),largura=raio*.46*Math.pow(Math.sin(Math.PI*u),.8);return V(Math.cos(a)*dist-Math.sin(a)*largura*v,raio*(.12*Math.sin(Math.PI*u)+.20*v*v*Math.sin(Math.PI*u)+(fechada?.9:.12)*u*u),Math.sin(a)*dist+Math.cos(a)*largura*v);};
 for(let lado=0;lado<2;lado++)for(let i=0;i<=n;i++)for(let j=0;j<=m;j++){const u=i/n,v=j/m*2-1,p=ponto(u,v);p.y-=lado*raio*.035;pos.push(...p.toArray());const c=lado?baixo.clone().lerp(base,.25):v<0?base.clone():clara.clone();cores.push(...c.toArray());}
 const camada=(n+1)*(m+1),idx=(i,j)=>i*(m+1)+j;
 for(let i=0;i<n;i++)for(let j=0;j<m;j++){const a=idx(i,j),b=idx(i+1,j),c=idx(i+1,j+1),d=idx(i,j+1);indices.push(a,c,b,a,d,c,a+camada,b+camada,c+camada,a+camada,c+camada,d+camada);}
 const borda=[];for(let i=0;i<=n;i++)borda.push(idx(i,0));for(let j=1;j<=m;j++)borda.push(idx(n,j));for(let i=n-1;i>=0;i--)borda.push(idx(i,m));for(let j=m-1;j>0;j--)borda.push(idx(0,j));for(let i=0;i<borda.length;i++){const a=borda[i],b=borda[(i+1)%borda.length];indices.push(a,b,a+camada,b,b+camada,a+camada);}
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setAttribute('color',new THREE.Float32BufferAttribute(cores,3));g.setIndex(indices);g.computeVertexNormals();
 // Nervura acompanha o centro curvo da lâmina, em vez de um desenho projetado.
 const nervura=[];for(let i=0;i<=7;i++)nervura.push(ponto(i/7,0).add(V(0,raio*.02,0)));
 return [g.toNonIndexed(),ramo(nervura,raio*.014,raio*.005,tons[2])];
}
function leque(centro,raio,normal,rotacao,quantidade,ordem,partes,rng){
 const q=new THREE.Quaternion().setFromUnitVectors(V(0,1,0),normal.clone().normalize());
 for(let i=0;i<quantidade;i++){const tons=CORES_FOLHAS[(i+ordem)%CORES_FOLHAS.length];for(const g of folha(raio*(.94+rng()*.12),rotacao+i*Math.PI*2/quantidade,tons)){g.applyQuaternion(q);g.translate(centro.x,centro.y,centro.z);partes.push(g);}}
 partes.push(bola(centro,.11*raio,R.salvia[3],[1,.55,1]));
}
export function criarCatavento(semente, juntar){
 const rng=criarRng(semente),estagios=[],relatorio=[];
 for(let fase=0;fase<4;fase++){
  const partes=[];let leques=0,folhas=0,ramificacoes=0;
  if(fase===0){partes.push(bola(V(0,.035,0),.23,R.terra[2],[1,.35,1]),ramo([V(),V(0,.16,0),V(.02,.3,0)],.022,.012));for(const g of folha(.4,1,CORES_FOLHAS[1],true)){g.translate(.02,.3,0);partes.push(g);}folhas=1;}
  if(fase===1){partes.push(ramo([V(),V(.03,.55,0),V(0,1.22,0)],.055,.025));const centros=[V(-.25,.78,.1),V(.25,1.32,-.1)];for(let i=0;i<2;i++){const c=centros[i];partes.push(ramo([V(0,c.y-.25,0),c],.025,.012));leque(c,.48,V(i?-.25:.35,.8,.35),i*.9,3,i,partes,rng);leques++;folhas+=3;ramificacoes++;}}
  if(fase>=2){
   const adulta=fase===3,H=adulta?5.4:3.3;
   partes.push(ramo([V(),V(-.08,H*.32,0),V(.16,H*.68,-.1),V(0,H,0)],adulta?.3:.14,adulta?.1:.04));
   const pontos=adulta?[
    {c:V(-2.6,3.6,1),base:2,r:1.35,t:.65},
    {c:V(2.5,4.1,1.15),base:2.6,r:1.5,t:.45},
    {c:V(-2.1,5.2,-.9),base:3.4,r:1.45,t:.8},
    {c:V(1.9,5.8,-1.1),base:4,r:1.4,t:.6},
    {c:V(-.3,6.7,-.1),base:5.1,r:1.5,t:.35},
    {c:V(.1,3.1,-2.1),base:1.9,r:1.15,t:.5},
    {c:V(-.8,4.5,1.9),base:3.1,r:1.2,t:.7},
   ]:[{c:V(-1.3,2.9,.4),base:1.7,r:.95,t:.6},{c:V(1.3,3.55,-.1),base:2.4,r:1.05,t:.45},{c:V(0,4.4,-.1),base:3.1,r:1,t:.4}];
   for(let i=0;i<pontos.length;i++){const {c,base,r,t}=pontos[i],a=i*2.39996+.3,normal=V(Math.cos(a)*Math.sin(t),Math.cos(t),Math.sin(a)*Math.sin(t));partes.push(ramo([V(.05,base,0),V(c.x*.55,base+.35,c.z*.55),c],adulta?.105:.055,.025));leque(c,r,normal,a,4,i%4,partes,rng);leques++;folhas+=4;ramificacoes++;}
   if(adulta)for(let i=0;i<4;i++){const a=i*2.39996;partes.push(ramo([V(0,.12,0),V(Math.cos(a)*.5,.12,Math.sin(a)*.5),V(Math.cos(a)*.85,.02,Math.sin(a)*.85)],.11,.015));}
  }
  const geo=juntar(partes);geo.userData.proposta={fase,leques,folhas,ramificacoes};estagios.push(geo);relatorio.push(geo.userData.proposta);for(const g of partes)g.dispose();
 }
 return{estagios,relatorio};
}
