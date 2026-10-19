import * as THREE from 'three';
import {criarRng} from './mundo.js';
import {RAMPAS} from './paleta.js';

export const TIPOS_BORBOLETA=['laranja','azul','amarela','lilas'];
const claro=RAMPAS.betula[0],escuro=RAMPAS.tinta[0];
const cores={laranja:[RAMPAS.outono[2],RAMPAS.outono[3]],azul:[RAMPAS.agua[3],RAMPAS.agua[4]],amarela:[RAMPAS.amarelo[1],RAMPAS.amarelo[2]],lilas:[RAMPAS.lilas[2],RAMPAS.flor[2]]};

/** Asas com duas regiões anatômicas, contorno, nervuras e manchas oculares. */
export function geometriaAsa(tipo) {
  const vertices=[],tons=[];
  function forma(pontos,cor,altura=0) {
    const s=new THREE.Shape();s.moveTo(...pontos[0]);for(const p of pontos.slice(1))s.lineTo(...p);s.closePath();
    let g=new THREE.ShapeGeometry(s);g=g.toNonIndexed();
    const p=g.attributes.position,c=new THREE.Color(cor);
    for(let i=0;i<p.count;i++){vertices.push(p.getX(i),altura,p.getY(i));tons.push(c.r,c.g,c.b);}
    g.dispose();
  }
  const frente=[[.035,.05],[.12,.37],[.43,.72],[.66,.78],[.83,.65],[.9,.44],[.85,.24],[.71,.08],[.36,-.02]];
  const tras=[[.04,-.015],[.36,.04],[.65,-.06],[.73,-.22],[.64,-.42],[.49,-.52],[.33,-.49],[.19,-.36],[.07,-.18]];
  for(const contorno of [frente,tras]){
    forma(contorno,escuro);
    forma(contorno.map(([x,z])=>[.06+(x-.06)*.83,z*.85]),cores[tipo][0],.002);
  }
  // Células largas, separadas por nervuras escuras, legíveis com poucos pixels.
  forma([[.11,.13],[.27,.41],[.44,.62],[.58,.64],[.49,.29]],cores[tipo][1],.004);
  forma([[.2,.1],[.53,.26],[.72,.5],[.73,.31],[.62,.15]],cores[tipo][1],.004);
  forma([[.13,-.1],[.28,-.29],[.45,-.38],[.53,-.3],[.43,-.1]],cores[tipo][1],.004);
  const veio=(a,b,l=.012)=>{
    const dx=b[0]-a[0],dz=b[1]-a[1],d=Math.hypot(dx,dz),x=-dz/d*l,z=dx/d*l;
    forma([[a[0]+x,a[1]+z],[b[0]+x,b[1]+z],[b[0]-x,b[1]-z],[a[0]-x,a[1]-z]],escuro,.006);
  };
  for(const p of [[.45,.67],[.71,.56],[.75,.29],[.58,.12],[.59,-.21],[.43,-.43]])veio([.075,.02],p);
  for(const [x,z] of [[.63,.7],[.77,.57],[.8,.41],[.73,.24],[.63,-.31],[.49,-.44],[.34,-.41]]){
    const r=.027;forma([[x-r,z-r],[x+r,z-r],[x+r,z+r],[x-r,z+r]],claro,.008);
  }
  // Olho na asa posterior: aro preto, centro de cor e ponto de luz.
  const olho=(x,z,r,c,h)=>forma(Array.from({length:10},(_,i)=>[x+Math.cos(i*Math.PI/5)*r,z+Math.sin(i*Math.PI/5)*r]),c,h);
  olho(.47,-.24,.085,escuro,.01);olho(.47,-.24,.049,tipo==='azul'?RAMPAS.lilas[2]:RAMPAS.agua[4],.012);olho(.46,-.22,.018,claro,.014);
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));g.setAttribute('color',new THREE.Float32BufferAttribute(tons,3));g.computeVertexNormals();g.computeBoundingSphere();return g;
}

function geometriaCorpo() {
  const partes=[];
  function peca(g,c){const geo=g.index?g.toNonIndexed():g,col=new THREE.Color(c),a=new Float32Array(geo.attributes.position.count*3);for(let i=0;i<a.length;i+=3){a[i]=col.r;a[i+1]=col.g;a[i+2]=col.b;}geo.setAttribute('color',new THREE.BufferAttribute(a,3));partes.push(geo);}
  const corpo=new THREE.SphereGeometry(.06,8,6);corpo.scale(.8,.8,3.9);peca(corpo,escuro);
  const torax=new THREE.SphereGeometry(.075,8,6);torax.translate(0,0,.14);peca(torax,RAMPAS.terra[1]);
  const cabeca=new THREE.SphereGeometry(.06,8,6);cabeca.translate(0,0,.26);peca(cabeca,escuro);
  for(const lado of [-1,1]){
    const antena=new THREE.CatmullRomCurve3([new THREE.Vector3(lado*.025,.03,.29),new THREE.Vector3(lado*.07,.06,.43),new THREE.Vector3(lado*.14,.04,.49)]);
    peca(new THREE.TubeGeometry(antena,7,.01,4,false),escuro);
    const ponta=new THREE.SphereGeometry(.018,5,4);ponta.translate(lado*.14,.04,.49);peca(ponta,claro);
    for(let i=0;i<3;i++){
      const perna=new THREE.CatmullRomCurve3([new THREE.Vector3(lado*.03,-.02,.12-i*.075),new THREE.Vector3(lado*.1,-.1,.14-i*.09),new THREE.Vector3(lado*.16,-.12,.17-i*.1)]);
      peca(new THREE.TubeGeometry(perna,3,.008,3,false),RAMPAS.terra[1]);
    }
  }
  const pos=[],cor=[];for(const g of partes){pos.push(...g.attributes.position.array);cor.push(...g.attributes.color.array);g.dispose();}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setAttribute('color',new THREE.Float32BufferAttribute(cor,3));g.computeVertexNormals();g.computeBoundingSphere();return g;
}

/** Pousos na superfície visível das copas, transformados pela árvore real. */
export function pousosNasArvores(arvores) {
  const pousos=[],cache=new Map(),m=new THREE.Matrix4(),p=new THREE.Vector3();
  for(let i=0;i<arvores.length;i+=2){
    const ind=arvores[i];if(ind.indice<2)continue;
    const malha=ind.grupo.malhas[ind.indice],g=malha.geometry,lado=i%4;
    const chave=g.uuid+':'+lado;
    if(!cache.has(chave)){
      const a=g.attributes.position;let melhor=-Infinity,vertice=new THREE.Vector3();
      for(let j=0;j<a.count;j++){const x=a.getX(j),y=a.getY(j),z=a.getZ(j),score=y*.72+(Math.cos(lado*Math.PI/2)*x+Math.sin(lado*Math.PI/2)*z)*.7;if(score>melhor){melhor=score;vertice.set(x,y,z);}}
      cache.set(chave,vertice);
    }
    malha.getMatrixAt(ind.vaga,m);p.copy(cache.get(chave)).applyMatrix4(m);p.y+=.09;
    pousos.push({x:p.x,y:p.y,z:p.z,tipo:'folha'});
  }
  return pousos;
}

export function criarPopulacaoBorboletas(mundo,folhas=[]) {
  const rng=criarRng(mundo.semente^0xb07b01),flores=mundo.objetos.filter(o=>o.tipo==='flor'&&mundo.fatorLago(o.x,o.y)>1.12);
  if(!flores.length)return [];
  const hero=flores.reduce((a,b)=>Math.hypot(a.x-211,a.y-98)<Math.hypot(b.x-211,b.y-98)?a:b),grupos=[hero];
  for(let i=0;i<600&&grupos.length<38;i++){
    const f=flores[Math.floor(rng()*flores.length)];if(grupos.every(g=>Math.hypot(g.x-f.x,g.y-f.y)>12))grupos.push(f);
  }
  const pousos=[...flores.map(f=>({x:f.x,y:mundo.altitude(f.x,f.y)+.5,z:f.y,tipo:'flor'})),...folhas];
  for(const o of mundo.objetos)if(['pedra','toco','tronco'].includes(o.tipo))pousos.push({x:o.x,y:mundo.altitude(o.x,o.y)+(o.tipo==='pedra'?.55:o.tipo==='toco'?.8:.45),z:o.y,tipo:o.tipo});
  pousos.push({x:236.15,y:12.18,z:146.6,tipo:'guarda-corpo'},{x:238,y:14.64,z:146.6,tipo:'telhado'},{x:239.15,y:8.8,z:152,tipo:'corrimao'});
  const individuos=[];
  grupos.forEach((f,g)=>{
    const proximos=pousos.filter(p=>Math.hypot(p.x-f.x,p.z-f.y)<43);
    for(let i=0;i<(g===0?8:3);i++){
      const rota=[{x:f.x,y:mundo.altitude(f.x,f.y)+.5,z:f.y,tipo:'flor',pausa:2+rng()*4}];
      for(let k=1;k<6;k++){
        const anterior=rota.at(-1),opcoes=proximos.filter(p=>Math.hypot(p.x-anterior.x,p.z-anterior.z)>7&&!rota.some(r=>Math.hypot(r.x-p.x,r.z-p.z)<2)&&(k%2===0||p.tipo!=='flor'));
        const outras=proximos.filter(p=>Math.hypot(p.x-anterior.x,p.z-anterior.z)>7);
        const altos=opcoes.filter(p=>['folha','telhado','corrimao','guarda-corpo'].includes(p.tipo));
        const lista=(k===1||k===5)&&altos.length?altos:opcoes.length?opcoes:outras;
        let ponto=lista.length?{...lista[Math.floor(rng()*lista.length)]}:{x:f.x+Math.cos(k)*12,z:f.y+Math.sin(k)*12,y:mundo.altitude(f.x,f.y)+4,tipo:'ar'};
        if(k===2||k===4){ponto={x:THREE.MathUtils.clamp((ponto.x+anterior.x)/2,2,mundo.largura-2),z:THREE.MathUtils.clamp((ponto.z+anterior.z)/2,2,mundo.altura-2),y:0,tipo:'ar'};ponto.y=mundo.altitude(ponto.x,ponto.z)+3+rng()*5;}
        ponto.pausa=ponto.tipo==='ar'?0:2.5+rng()*7.5;rota.push(ponto);
      }
      const trechos=rota.map((a,j)=>{const b=rota[(j+1)%rota.length],dist=Math.hypot(b.x-a.x,b.y-a.y,b.z-a.z),velocidade=.9+rng()*2.3;return {a,b,duracao:Math.max(5,dist/velocidade),pausa:b.pausa,altura:2.2+rng()*4.6,curva:(rng()<.5?-1:1)*(1.2+rng()*3.5)};});
      const periodo=trechos.reduce((s,t)=>s+t.duracao+t.pausa,0);
      individuos.push({tipo:TIPOS_BORBOLETA[(i+g)%4],a:rota[0],rota,trechos,periodo,fase:rng(),tamanho:.43+rng()*.14,ritmo:3.4+rng()*3,grupo:g});
    }
  });
  return individuos;
}

/** Passeio com seis destinos: voos altos, mudanças de ritmo e repousos individuais. */
export function estadoBorboleta(b,tempo) {
  let rel=((tempo+b.fase*b.periodo)%b.periodo+b.periodo)%b.periodo,trecho=b.trechos.at(-1);
  for(const v of b.trechos){if(rel<v.duracao+v.pausa){trecho=v;break;}rel-=v.duracao+v.pausa;}
  const {a,b:d}=trecho,pousada=rel>=trecho.duracao,t=Math.min(1,rel/trecho.duracao),dx=d.x-a.x,dz=d.z-a.z,L=Math.hypot(dx,dz)||1;
  const s=t*t*(3-2*t),arco=Math.sin(Math.PI*t)**2,lado=trecho.curva;
  const x=a.x+dx*s-dz/L*lado*arco,z=a.z+dz*s+dx/L*lado*arco;
  const y=a.y+(d.y-a.y)*s+arco*trecho.altura+(pousada?0:Math.sin(tempo*3+b.fase*20)*.12*arco);
  const rumo=(t)=>Math.atan2(dx*6*t*(1-t)-dz/L*lado*Math.PI*Math.sin(Math.PI*t*2),dz*6*t*(1-t)+dx/L*lado*Math.PI*Math.sin(Math.PI*t*2));
  let yaw=rumo(THREE.MathUtils.clamp(t,.001,.999));
  if(pousada)yaw+=Math.sin((rel-trecho.duracao)*.4+b.fase*10)*.18;
  const fechada=1.15+Math.sin(tempo*1.5+b.fase*8)*.2,batida=.14+(Math.sin(tempo*b.ritmo*Math.PI*2+Math.sin(tempo*.6)*.8+b.fase*30)+1)*.54;
  const voo=THREE.MathUtils.smoothstep(t,0,.09)*(1-THREE.MathUtils.smoothstep(t,.92,1));
  const asa=pousada?fechada:THREE.MathUtils.lerp(fechada,batida,voo);
  return {x,y,z,yaw,asa,pousada,inclinacao:pousada?0:Math.sin(Math.PI*t*2)*.25,progresso:t,pouso:d.tipo};
}

export function escalaVisivelBorboleta(tamanho,alturaCamera,alturaTela) {
  const pixels=tamanho*1.8*alturaTela/alturaCamera;
  return THREE.MathUtils.smoothstep(pixels,12,19)*(1-THREE.MathUtils.smoothstep(alturaCamera,50,65));
}

export function criarBorboletas(mundo,toon,arvores=[]) {
  const grupo=new THREE.Group();grupo.name='borboletas-do-jardim';
  const individuos=criarPopulacaoBorboletas(mundo,pousosNasArvores(arvores)),material=toon({vertexColors:true,side:THREE.DoubleSide});
  const corpo=new THREE.InstancedMesh(geometriaCorpo(),material,16);corpo.frustumCulled=false;corpo.instanceMatrix.setUsage(THREE.DynamicDrawUsage);grupo.add(corpo);
  const asas=new Map();
  for(const tipo of TIPOS_BORBOLETA){
    const g=geometriaAsa(tipo),malhas=[-1,1].map(()=>{const m=new THREE.InstancedMesh(g,material,16);m.frustumCulled=false;m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);grupo.add(m);return m;});asas.set(tipo,malhas);
  }
  const d=new THREE.Object3D(),q=new THREE.Quaternion(),giro=new THREE.Quaternion(),eixo=new THREE.Vector3(0,0,1),base=new THREE.Matrix4(),M=new THREE.Matrix4();
  const frustum=new THREE.Frustum(),proj=new THREE.Matrix4(),p=new THREE.Vector3();
  let visiveis=0;
  function atualizar(tempo,camera,alturaCamera,alturaTela,hora,alvo) {
    for(const m of grupo.children)m.count=0;
    if(hora==='noite'||escalaVisivelBorboleta(.57,alturaCamera,alturaTela)===0){grupo.visible=false;visiveis=0;return;}
    grupo.visible=true;camera.updateMatrixWorld();proj.multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse);frustum.setFromProjectionMatrix(proj);
    const candidatos=[];
    for(const b of individuos){
      const escala=escalaVisivelBorboleta(b.tamanho,alturaCamera,alturaTela);if(!escala)continue;
      const estado=estadoBorboleta(b,tempo);estado.y=Math.max(estado.y,mundo.altitude(estado.x,estado.z)+.45);p.set(estado.x,estado.y,estado.z);if(!frustum.containsPoint(p))continue;
      candidatos.push({b,estado,escala,dist:Math.hypot(estado.x-alvo.x,estado.z-alvo.z)});
    }
    candidatos.sort((a,b)=>a.dist-b.dist);
    for(const {b,estado:s,escala} of candidatos.slice(0,16)) {
      const tamanho=b.tamanho*escala;
      d.position.set(s.x,s.y,s.z);d.rotation.set(Math.sin(tempo*2+b.fase)*.045,s.yaw,s.inclinacao);d.scale.setScalar(tamanho);d.updateMatrix();base.copy(d.matrix);q.copy(d.quaternion);
      corpo.setMatrixAt(corpo.count++,base);
      for(const [i,lado] of [-1,1].entries()){
        d.quaternion.copy(q).multiply(giro.setFromAxisAngle(eixo,lado*s.asa));d.scale.set(tamanho*lado,tamanho,tamanho);d.updateMatrix();M.copy(d.matrix);
        const m=asas.get(b.tipo)[i];m.setMatrixAt(m.count++,M);
      }
    }
    visiveis=corpo.count;for(const m of grupo.children)m.instanceMatrix.needsUpdate=true;
  }
  for(const m of grupo.children){m.count=0;m.receiveShadow=true;}
  grupo.userData={individuos,atualizar,get visiveis(){return visiveis;},foco:individuos[0]?.a};
  return grupo;
}
