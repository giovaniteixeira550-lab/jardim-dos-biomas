import * as THREE from 'three';
import {criarRng} from './mundo.js';
import {juntar} from './arvoreProc.js';
import {RAMPAS} from './paleta.js';

export const ESTADOS_SENESCENCIA=[
  {nome:'Vigorosa',valor:0,texto:'Copa cheia e cores vivas. O porte adulto permanece como referência.'},
  {nome:'Perda de vigor',valor:.28,texto:'Verdes mais opacos, oliva e ocre em regiões diferentes da copa. As folhas ainda permanecem.'},
  {nome:'Copa rala',valor:.52,texto:'Alguns ramos perdem os tufos maiores; abrem-se vazios e aparecem os ramos que sustentam a copa.'},
  {nome:'Últimas folhas',valor:.78,texto:'Pequenos grupos de folhas castanhas ficam nas pontas. A ramificação passa a definir a silhueta.'},
  {nome:'Seca',valor:1,texto:'Tronco, raízes e galhos expostos. A árvore mantém sua estrutura e pode recuperar a copa.'},
];

function recortar(base,indices){
  const g=new THREE.BufferGeometry();
  for(const [nome,a] of Object.entries(base.attributes)){
    const arr=new Float32Array(indices.length*a.itemSize);
    indices.forEach((i,j)=>{for(let k=0;k<a.itemSize;k++)arr[j*a.itemSize+k]=a.array[i*a.itemSize+k];});
    g.setAttribute(nome,new THREE.BufferAttribute(arr,a.itemSize));
  }
  g.computeBoundingBox();g.computeBoundingSphere();return g;
}

function corGeometria(g,hex){
  const p=g.attributes.position,c=new THREE.Color(hex),arr=new Float32Array(p.count*3);
  for(let i=0;i<p.count;i++){const f=.86+Math.min(1,p.getY(i)/12)*.15;arr.set([c.r*f,c.g*f,c.b*f],i*3);}
  g.setAttribute('color',new THREE.BufferAttribute(arr,3));return g;
}

function ramo(a,b,r0,r1,rng){
  const meio=a.clone().lerp(b,.5).add(new THREE.Vector3((rng()-.5)*.14,.08,(rng()-.5)*.14));
  const curva=new THREE.CatmullRomCurve3([a,meio,b]);
  const g=new THREE.TubeGeometry(curva,6,1,6,false),p=g.attributes.position,uv=g.attributes.uv;
  for(let i=0;i<p.count;i++){
    const t=uv.getX(i),centro=curva.getPointAt(t),v=new THREE.Vector3().fromBufferAttribute(p,i).sub(centro).multiplyScalar(THREE.MathUtils.lerp(r0,r1,t)).add(centro);p.setXYZ(i,v.x,v.y,v.z);
  }
  g.computeVertexNormals();return corGeometria(g.toNonIndexed(),RAMPAS.terra[1]);
}

/** Folha tridimensional dobrada na nervura; borda lobada no carvalho. */
function folha(origem,direcao,comprimento,carvalho,rng){
  const d=direcao.clone().normalize(),n=new THREE.Vector3(-d.z,0,d.x).normalize(),vertices=[],cores=[];
  const perfil=carvalho?[0,.42,.29,.53,.35,.49,.31,.23,0]:[0,.26,.43,.5,.46,.35,.23,.11,0];
  const vert=(i,lado)=>origem.clone().addScaledVector(d,i/8*comprimento).addScaledVector(n,lado*perfil[i]*comprimento*.48).add(new THREE.Vector3(0,lado===0?Math.sin(i/8*Math.PI)*.035:0,0));
  const tintas=[RAMPAS.salvia[2],RAMPAS.mata[3],RAMPAS.mata[2]],c=new THREE.Color(tintas[Math.floor(rng()*tintas.length)]);
  for(let i=0;i<8;i++)for(const lado of [-1,1]){
    const a=vert(i,0),b=vert(i,lado),d=vert(i+1,lado),e=vert(i+1,0);
    for(const v of [a,b,d,a,d,e]){vertices.push(...v.toArray());const f=lado===1?.88:1;cores.push(c.r*f,c.g*f,c.b*f);}
  }
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));g.setAttribute('color',new THREE.Float32BufferAttribute(cores,3));g.computeVertexNormals();g.computeBoundingSphere();return g;
}

/** Guarda a anatomia original. Só o adaptador de folhosas redonda/oval está habilitado. */
export function prepararSenescencia(base,semente=1234){
  const dados=base.userData.arvore;
  if(!['Carvalho','Freixo'].includes(dados?.especie))throw new Error('A primeira amostra está preparada para Carvalho e Freixo. As outras espécies precisam de adaptação própria.');
  if(!dados?.copas?.length||!dados.estrutura?.troncos?.length)throw new Error('Esta espécie ainda precisa de um adaptador próprio para a senescência.');
  const rng=criarRng(semente^0x5eae5c),grupos=new Map(),madeira=[];
  const b=base.attributes.banda,s=base.attributes.semCopa,r=base.attributes.raioCopa;
  for(let i=0;i<base.attributes.position.count;i+=3){
    if(b.getX(i)>-2&&r.getX(i)>0){const chave=s.getX(i).toFixed(7);if(!grupos.has(chave))grupos.set(chave,[]);grupos.get(chave).push(i,i+1,i+2);}
    else madeira.push(i,i+1,i+2);
  }
  const copas=[...grupos.values()].map((ids,i)=>({geo:recortar(base,ids),...dados.copas[i],limiar:.31+rng()*.16,matiz:rng()}));
  const tronco=dados.estrutura.troncos[0],topo=new THREE.Vector3(tronco.curva[0],tronco.altura,tronco.curva[1]);
  const partes=[],ramificacoes=[],folhas=[],H=base.boundingBox.max.y,carvalho=dados.especie==='Carvalho';
  for(const [i,copa] of copas.entries()){
    const primeiro=partes.length;
    const c=copa.centro,r=copa.raio,galhos=dados.estrutura.galhos.filter(g=>g.fim.y>H*.3);
    const original=galhos.sort((a,b)=>a.fim.distanceTo(c)-b.fim.distanceTo(c))[0];
    const origem=original&&original.fim.distanceTo(c)<r*1.3?original.fim:topo;
    const hub=c.clone().add(new THREE.Vector3(0,-r*.17,0));
    partes.push(ramo(origem,hub,H*.009,H*.005,rng));
    const fase=rng()*Math.PI*2;
    for(let j=0;j<4;j++){
      const ang=fase+j*Math.PI*.5,dir=new THREE.Vector3(Math.cos(ang),.2+rng()*.45,Math.sin(ang));
      const meio=c.clone().addScaledVector(dir,r*.52);
      partes.push(ramo(hub,meio,H*.005,H*.0027,rng));
      for(const lado of [-1,1]){
        const a=ang+lado*.46,ponta=c.clone().add(new THREE.Vector3(Math.cos(a)*r*.86,r*(.18+rng()*.53),Math.sin(a)*r*.86));
        partes.push(ramo(meio,ponta,H*.0028,H*.0008,rng));
        for(let k=0;k<2;k++){
          const direcao=new THREE.Vector3(Math.cos(a+k*1.8),-.15-rng()*.35,Math.sin(a+k*1.8)),origemFolha=ponta.clone().lerp(meio,k*.09);
          folhas.push({geo:folha(origemFolha,direcao,H*(.055+rng()*.023),carvalho,rng),origem:origemFolha,copa:i,limiar:rng(),matiz:rng()});
        }
      }
    }
    ramificacoes.push(juntar(partes.slice(primeiro)));
  }
  const ramificacao=juntar(partes);for(const g of partes)g.dispose();
  return {base,madeira:recortar(base,madeira),copas,folhas,ramificacao,ramificacoes,semente,altura:H,especie:dados.especie};
}

function tingir(g,valor,foliar,matiz=0){
  const c=g.attributes.color,atual=new THREE.Color(),alvo=new THREE.Color();
  if(foliar){
    const oliva=new THREE.Color(RAMPAS.salvia[0]).lerp(new THREE.Color(RAMPAS.amarelo[0]),.32).lerp(new THREE.Color(RAMPAS.terra[3]),.22+matiz*.08);
    const seca=new THREE.Color(matiz>.55?RAMPAS.terra[3]:RAMPAS.outono[1]);
    alvo.copy(oliva).lerp(seca,THREE.MathUtils.smoothstep(valor,.3,.95));
  }else alvo.set(RAMPAS.pedra[2]).lerp(new THREE.Color(RAMPAS.terra[2]),.45);
  const mistura=foliar?THREE.MathUtils.smoothstep(valor,0,.27)*.94:THREE.MathUtils.smoothstep(valor,.42,1)*.65;
  for(let i=0;i<c.count;i++){atual.fromBufferAttribute(c,i).lerp(alvo,mistura);c.setXYZ(i,atual.r,atual.g,atual.b);}
  return g;
}

export function construirSenescencia(anatomia,valor){
  if(!Number.isFinite(valor))throw new Error('O avanço visual da senescência precisa ser um número.');
  const v=THREE.MathUtils.clamp(valor,0,1),partes=[tingir(anatomia.madeira.clone(),v,false)];
  const presentes=new Set();let folhas=0;
  anatomia.copas.forEach((c,i)=>{if(v<c.limiar){partes.push(tingir(c.geo.clone(),v,true,c.matiz));presentes.add(i);}else partes.push(tingir(anatomia.ramificacoes[i].clone(),v,false));});
  const retencao=1-THREE.MathUtils.smoothstep(v,.35,1);
  if(v<1)for(const f of anatomia.folhas)if(!presentes.has(f.copa)&&f.limiar<retencao){partes.push(tingir(f.geo.clone(),v,true,f.matiz));folhas++;}
  const geo=juntar(partes);for(const p of partes)p.dispose();
  geo.userData.senescencia={valor:v,volumes:presentes.size,folhas,semFolhas:presentes.size===0&&folhas===0,especie:anatomia.especie,alturaOriginal:anatomia.altura};return geo;
}

export function descartarSenescencia(a){a.madeira.dispose();a.ramificacao.dispose();for(const r of a.ramificacoes)r.dispose();for(const c of a.copas)c.geo.dispose();for(const f of a.folhas)f.geo.dispose();}
