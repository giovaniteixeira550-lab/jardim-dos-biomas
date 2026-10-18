/** Costuras contínuas no terreno real; conserva alturas e os corredores de acesso. */
import * as THREE from 'three';
import { RAMPAS } from './paleta.js';

export const PIXEL_TERRA = .145;

export function refinarBordasTerreno(original, mundo) {
  const atributos=Object.entries(original.attributes);
  const dados=Object.fromEntries(atributos.map(([nome,a])=>[nome,Array.from(a.array)]));
  const pos=dados.position, indices=[], cache=new Map(), grafos=new Map();
  const cortes=[];
  for(let k=1;k<=3;k++)cortes.push((k-1)*mundo.DEGRAU+.16,k*mundo.DEGRAU-.20,k*mundo.DEGRAU-.08);
  cortes.sort((a,b)=>a-b);
  const y=i=>pos[i*3+1];
  const intersecao=(a,b,h)=>{
    if(Math.abs(y(a)-h)<1e-8)return a;
    if(Math.abs(y(b)-h)<1e-8)return b;
    const chave=`${Math.min(a,b)}:${Math.max(a,b)}:${h}`;
    if(cache.has(chave))return cache.get(chave);
    const t=(h-y(a))/(y(b)-y(a)),novo=pos.length/3;
    for(const [nome,atributo] of atributos){
      const destino=dados[nome],n=atributo.itemSize;
      for(let j=0;j<n;j++)destino.push(destino[a*n+j]+(destino[b*n+j]-destino[a*n+j])*t);
    }
    pos[novo*3+1]=h;cache.set(chave,novo);return novo;
  };
  const ligar=(h,a,b)=>{
    if(a===b)return;
    if(!grafos.has(h))grafos.set(h,new Map());
    const grafo=grafos.get(h);
    for(const [i,j] of [[a,b],[b,a]]){
      if(!grafo.has(i))grafo.set(i,new Set());grafo.get(i).add(j);
    }
  };
  const emitir=poligono=>{
    for(let i=1;i<poligono.length-1;i++){
      const tri=[poligono[0],poligono[i],poligono[i+1]];
      if(new Set(tri).size===3)indices.push(...tri);
    }
  };
  const indice=original.index.array;
  for(let i=0;i<indice.length;i+=3){
    let poligono=[indice[i],indice[i+1],indice[i+2]];
    const minimo=Math.min(...poligono.map(y)),maximo=Math.max(...poligono.map(y));
    for(const h of cortes){
      if(h<=minimo+1e-8||h>=maximo-1e-8)continue;
      const baixo=[],alto=[],cruzamentos=[];
      for(let j=0;j<poligono.length;j++){
        const a=poligono[j],b=poligono[(j+1)%poligono.length],da=y(a)-h,db=y(b)-h;
        if(da<=0)baixo.push(a);if(da>=0)alto.push(a);
        if(da*db<0){const v=intersecao(a,b,h);baixo.push(v);alto.push(v);cruzamentos.push(v);}
        else if(Math.abs(da)<1e-8)cruzamentos.push(a);
      }
      const unicos=[...new Set(cruzamentos)];
      if(unicos.length===2)ligar(h,...unicos);
      emitir(baixo);poligono=alto;
    }
    emitir(poligono);
  }
  const livre=(x,z)=>{
    if(mundo.distTrilha(x,z)<mundo.trilha.largura/2+3)return false;
    const largura=mundo.larguraRiacho(x,z);
    if(mundo.distRiacho(x,z)<largura/2+3||mundo.fatorLago(x,z)<1.12)return false;
    return !mundo.plano.locais.some(l=>Math.abs(x-l.x)<l.largura/2+1.5&&Math.abs(z-l.y)<l.profundidade/2+1.5);
  };
  // Suaviza apenas os vértices novos das costuras. A mesma posição pertence
  // ao tampo e à parede: não há tampas avulsas, sobreposição ou fenda entre eles.
  const anteriores=new Map();
  for(const grafo of grafos.values())for(const [i,vizinhos] of grafo){
    if(vizinhos.size!==2||!livre(pos[i*3],pos[i*3+2]))continue;
    const [a,b]=[...vizinhos];
    const dx=(pos[a*3]+pos[b*3]-2*pos[i*3])*.30;
    const dz=(pos[a*3+2]+pos[b*3+2]-2*pos[i*3+2])*.30;
    const ganho=Math.min(1,.10/Math.max(1e-8,Math.hypot(dx,dz)));
    anteriores.set(i,[pos[i*3],pos[i*3+2],dx*ganho,dz*ganho]);
  }
  for(const [i,[x,z,dx,dz]] of anteriores){pos[i*3]=x+dx;pos[i*3+2]=z+dz;}
  // Uma costura não pode inverter triângulos muito pequenos do chão. Reverte
  // localmente qualquer deslocamento que altere a orientação da malha.
  let revertidos=0;
  for(let rodada=0;rodada<8;rodada++){
    let alterou=false;
    for(let i=0;i<indices.length;i+=3){
      const [a,b,c]=indices.slice(i,i+3).map(v=>v*3);
      const area=(pos[b+2]-pos[a+2])*(pos[c]-pos[a])-(pos[b]-pos[a])*(pos[c+2]-pos[a+2]);
      if(area>1e-12)continue;
      for(const j of [a/3,b/3,c/3])if(anteriores.has(j)){
        const [x,z]=anteriores.get(j);pos[j*3]=x;pos[j*3+2]=z;anteriores.delete(j);revertidos++;alterou=true;
      }
    }
    if(!alterou)break;
  }
  const geometria=new THREE.BufferGeometry();
  for(const [nome,a] of atributos)geometria.setAttribute(nome,new THREE.Float32BufferAttribute(dados[nome],a.itemSize));
  geometria.setIndex(indices);
  const segmentos=[],celulas=new Map(),cadeias=[];
  let curva=0;
  for(let k=1;k<=3;k++){
    const h=k*mundo.DEGRAU-.20,grafo=grafos.get(h);
    if(!grafo)continue;
    const usadas=new Set(),chave=(a,b)=>`${Math.min(a,b)}:${Math.max(a,b)}`;
    for(const origem of grafo.keys())for(const vizinho of grafo.get(origem)){
      if(usadas.has(chave(origem,vizinho)))continue;
      const cadeia=[origem];let a=origem,b=vizinho;
      while(b!==undefined&&!usadas.has(chave(a,b))){
        usadas.add(chave(a,b));cadeia.push(b);
        const proximo=[...(grafo.get(b)??[])].find(c=>!usadas.has(chave(b,c)));
        a=b;b=proximo;
      }
      let s=0;const faixa=[];
      for(let i=1;i<cadeia.length;i++){
        const p=cadeia[i-1]*3,q=cadeia[i]*3,dx=pos[q]-pos[p],dz=pos[q+2]-pos[p+2],tam=Math.hypot(dx,dz);
        if(tam<1e-8)continue;
        const trecho={x:pos[p],z:pos[p+2],dx,dz,tam,s,k,curva};s+=tam;faixa.push(trecho);
      }
      const rep=Math.max(1,Math.round(s/(96*PIXEL_TERRA)));
      cadeias.push({k,periodo:rep*96*PIXEL_TERRA,pontos:cadeia.map(i=>({x:pos[i*3],z:pos[i*3+2]})),comprimento:s});
      for(const trecho of faixa){
        trecho.perimetro=s;trecho.escala=rep*96*PIXEL_TERRA/s;segmentos.push(trecho);
        const x0=Math.floor(Math.min(trecho.x,trecho.x+trecho.dx)/4),x1=Math.floor(Math.max(trecho.x,trecho.x+trecho.dx)/4);
        const z0=Math.floor(Math.min(trecho.z,trecho.z+trecho.dz)/4),z1=Math.floor(Math.max(trecho.z,trecho.z+trecho.dz)/4);
        for(let x=x0;x<=x1;x++)for(let z=z0;z<=z1;z++){
          const key=`${k}:${x}:${z}`;if(!celulas.has(key))celulas.set(key,[]);celulas.get(key).push(trecho);
        }
      }
      curva++;
    }
  }
  geometria.userData.acabamento={verticesNovos:pos.length/3-original.attributes.position.count,costuras:grafos.size,deslocados:anteriores.size,revertidos,limiteDeslocamento:.10,segmentos:segmentos.length};
  geometria.userData.contornos={celulas,degrau:mundo.DEGRAU,cadeias};
  return geometria;
}

/** Remate único ligado à curva, em vez de uma caixa em cada célula da grade. */
export function criarCapaContinua(mundo,contornos,toon,materialParede){
  const grupo=new THREE.Group();grupo.name='bordas-barrancos';
  const topo=[],frente=[],cores=[],uv=[],limites=[];
  const verde=new THREE.Color(RAMPAS.salvia[4]);
  const suave=(a,b,x)=>{const t=Math.max(0,Math.min(1,(x-a)/(b-a)));return t*t*(3-2*t);};
  const fator=(x,z)=>{
    const trilha=suave(mundo.trilha.largura/2+1.4,mundo.trilha.largura/2+2.8,mundo.distTrilha(x,z));
    const rio=suave(mundo.larguraRiacho(x,z)/2+1.4,mundo.larguraRiacho(x,z)/2+2.8,mundo.distRiacho(x,z));
    let livre=trilha*rio*suave(1.08,1.14,mundo.fatorLago(x,z));
    for(const l of mundo.plano.locais){
      if(l.tipo==='paisagem')continue;
      const dx=Math.abs(x-l.x)-l.largura/2,dz=Math.abs(z-l.y)-l.profundidade/2;
      livre*=suave(.4,1.5,Math.max(dx,dz));
    }
    return livre;
  };
  let trechos=0;
  for(const cadeia of contornos.cadeias){
    if(cadeia.comprimento<3)continue;
    const brutos=cadeia.pontos,fechada=Math.hypot(brutos[0].x-brutos.at(-1).x,brutos[0].z-brutos.at(-1).z)<1e-5;
    // A interseção de uma curva com a grade produz segmentos de tamanhos
    // diferentes. Reamostra por distância antes de suavizar: um aglomerado
    // de vértices curtos não pode puxar a borda e recriar dentes.
    const acumulada=[0];
    for(let i=1;i<brutos.length;i++)acumulada.push(acumulada.at(-1)+Math.hypot(brutos[i].x-brutos[i-1].x,brutos[i].z-brutos[i-1].z));
    const total=acumulada.at(-1),quantidade=Math.max(3,Math.ceil(total/.30));
    let segmento=1;
    const amostras=Array.from({length:quantidade+(fechada?0:1)},(_,i)=>{
      const s=i/quantidade*total;
      while(segmento<brutos.length-1&&acumulada[segmento]<s)segmento++;
      const a=brutos[segmento-1],b=brutos[segmento],t=(s-acumulada[segmento-1])/Math.max(1e-9,acumulada[segmento]-acumulada[segmento-1]);
      return {x:a.x+(b.x-a.x)*t,z:a.z+(b.z-a.z)*t};
    });
    const pontos=amostras.map((p,i)=>{
      let x=0,z=0,peso=0;
      for(let j=-4;j<=4;j++){
        const k=fechada?(i+j+amostras.length)%amostras.length:Math.max(0,Math.min(amostras.length-1,i+j));
        const w=5-Math.abs(j);x+=amostras[k].x*w;z+=amostras[k].z*w;peso+=w;
      }
      return {x:x/peso,z:z/peso};
    });
    if(fechada)pontos.push({...pontos[0]});
    const n=pontos.length;
    let s=0;
    const perfis=pontos.map((p,i)=>{
      if(i)s+=Math.hypot(p.x-pontos[i-1].x,p.z-pontos[i-1].z);
      const a=pontos[i?i-1:(fechada?n-2:0)],b=pontos[i<n-1?i+1:(fechada?1:n-1)];
      let nx=b.z-a.z,nz=a.x-b.x,tam=Math.hypot(nx,nz);nx/=tam||1;nz/=tam||1;
      if(mundo.altitude(p.x+nx*.9,p.z+nz*.9)>mundo.altitude(p.x-nx*.9,p.z-nz*.9)){nx=-nx;nz=-nz;}
      const f=fator(p.x,p.z);
      const inicio={x:p.x-nx*.85*f,z:p.z-nz*.85*f};
      const h=mundo.altitude(inicio.x,inicio.z)+.025;
      const local=mundo.altitude(p.x,p.z);
      const v=(d,dh)=>[p.x+nx*d*f,local+(h+dh-local)*f,p.z+nz*d*f];
      return {a:[inicio.x,mundo.altitude(inicio.x,inicio.z)+.012*f,inicio.z],b:v(-.12,0),c:v(.30,-.045),d:v(.18,-.32),f,u:s/cadeia.comprimento*cadeia.periodo,topo:cadeia.k*mundo.DEGRAU};
    });
    const tri=(destino,a,b,c)=>destino.push(...a,...b,...c);
    for(let i=1;i<n;i++){
      const a=perfis[i-1],b=perfis[i];if(a.f<.001&&b.f<.001)continue;
      // A direção do percurso pode mudar entre curvas. A ordem da face
      // superior é determinada pela geometria, não pelo sentido da cadeia.
      const nx=(b.a[2]-a.a[2])*(a.c[0]-a.a[0])-(b.a[0]-a.a[0])*(a.c[2]-a.a[2]);
      const quad=(destino,p,q,r,s)=>{
        if(nx>0){tri(destino,p,q,r);tri(destino,p,r,s);}
        else{tri(destino,p,s,r);tri(destino,p,r,q);}
      };
      quad(topo,a.a,b.a,b.b,a.b);quad(topo,a.b,b.b,b.c,a.c);
      const ordem=nx>0?[[a.c,a],[b.c,b],[b.d,b],[a.d,a]]:[[a.c,a],[a.d,a],[b.d,b],[b.c,b]];
      for(const j of [0,1,2,0,2,3]){
        const [p,d]=ordem[j];frente.push(...p);cores.push(verde.r,verde.g,verde.b);uv.push(d.u,d.topo);limites.push(d.topo,d.topo-mundo.DEGRAU);
      }
      trechos++;
    }
  }
  const malha=(pos,material,nome)=>{
    const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.computeVertexNormals();
    const m=new THREE.Mesh(g,material);m.name=nome;m.receiveShadow=true;grupo.add(m);return m;
  };
  malha(topo,toon({color:verde,side:THREE.DoubleSide}),'capa-grama-continua');
  const saia=malha(frente,materialParede,'capa-terra-continua');
  const g=saia.geometry,n=g.attributes.position.count;
  g.setAttribute('color',new THREE.Float32BufferAttribute(cores,3));g.setAttribute('aSoloUV',new THREE.Float32BufferAttribute(uv,2));g.setAttribute('aLimitesSolo',new THREE.Float32BufferAttribute(limites,2));
  for(const [nome,valor] of [['aRocha',1],['aTrilha',1],['aGrama',0],['aSoloParede',1]])g.setAttribute(nome,new THREE.Float32BufferAttribute(new Float32Array(n).fill(valor),1));
  g.setAttribute('aNormalSombra',g.attributes.normal);
  grupo.userData={estilo:'capa-continua',trechos,alteraAltura:false};
  return grupo;
}

export function aplicarCoordenadasParede(geometria, contornos) {
  const pos=geometria.getAttribute('position'),uv=new Float32Array(pos.count*2);
  let semContorno=0;
  for(let i=0;i<pos.count;i+=3){
    const pontos=[];
    for(let j=0;j<3;j++){
      const x=pos.getX(i+j),y=pos.getY(i+j),z=pos.getZ(i+j);
      const k=Math.max(1,Math.min(3,Math.ceil((y-.08)/contornos.degrau)));
      let melhor=null,d2=Infinity,tMelhor=0;
      for(let dx=-1;dx<=1;dx++)for(let dz=-1;dz<=1;dz++)for(const a of contornos.celulas.get(`${k}:${Math.floor(x/4)+dx}:${Math.floor(z/4)+dz}`)??[]){
        const t=Math.max(0,Math.min(1,((x-a.x)*a.dx+(z-a.z)*a.dz)/(a.tam*a.tam)));
        const dist=(x-a.x-a.dx*t)**2+(z-a.z-a.dz*t)**2;
        if(dist<d2){melhor=a;d2=dist;tMelhor=t;}
      }
      if(melhor)pontos.push({u:(melhor.s+melhor.tam*tMelhor)*melhor.escala,topo:k*contornos.degrau,curva:melhor.curva,periodo:melhor.perimetro*melhor.escala});
      else{semContorno++;pontos.push({u:x+z,topo:k*contornos.degrau,curva:-1,periodo:Infinity});}
    }
    if(pontos.every(p=>p.curva===pontos[0].curva)){
      const periodo=pontos[0].periodo,lo=Math.min(...pontos.map(p=>p.u)),hi=Math.max(...pontos.map(p=>p.u));
      if(hi-lo>periodo/2)for(const p of pontos)if(p.u<periodo/2)p.u+=periodo;
    }
    for(let j=0;j<3;j++)uv.set([pontos[j].u,pontos[j].topo],(i+j)*2);
  }
  geometria.setAttribute('aSoloUV',new THREE.BufferAttribute(uv,2));
  geometria.userData.coordenadasTerra={pixel:PIXEL_TERRA,semContorno};
}
