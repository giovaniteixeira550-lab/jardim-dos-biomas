/** Folhas em bandeja, nervuras e flores modeladas em volume, na paleta do jardim. */
import * as THREE from 'three';
import {criarRng} from './mundo.js';
import {RAMPAS as R} from './paleta.js';

export const ALTURA_FOLHA = -.485;

/** Conserva os cinco sorteios por folha da v0.42, para não mover as taboas.
 * A procura local usa outra semente, afasta folhas sobrepostas e testa a borda
 * inteira sob a água, inclusive a flor. Não modifica terreno ou plantio.
 */
export function disporVitoriasRegias(m, rng=criarRng(m.semente^0x1e1a)) {
  const folhas=[],L=m.lago;
  for(let i=0;i<16;i++) {
    const a=rng()*6.28,d=L.raio(a)*(.62+.28*rng());
    const x=L.cx+Math.cos(a)*L.rx*d,z=L.cy+Math.sin(a)*L.ry*d;
    const r=1.5+.6*rng(); rng(); const giro=rng()*6.28;
    const flor=i%3===0;
    const segura=(px,pz)=>{
      if(folhas.some(f=>Math.hypot(f.x-px,f.z-pz)<f.r+r+.45))return false;
      // A boca do escorregador permanece livre, inclusive para quem cai na água.
      if(Math.hypot(px-210,pz-115)<r+2.4)return false;
      for(let k=0;k<32;k++) {
        const t=k/32*Math.PI*2,rr=flor?r*1.05+.85:r*1.08;
        if(m.altitude(px+Math.cos(t)*rr,pz+Math.sin(t)*rr)>-.65)return false;
      }
      return m.altitude(px,pz)<-.7;
    };
    let ponto=null;
    for(let k=0;k<420;k++) {
      const ang=giro+k*2.399963229728653,dist=k===0?0:.36*Math.sqrt(k);
      const px=x+Math.cos(ang)*dist,pz=z+Math.sin(ang)*dist;
      if(segura(px,pz)){ponto={x:px,z:pz};break;}
    }
    // Só omite uma folha se não houver água suficiente no entorno para sustentá-la.
    if(ponto)folhas.push({...ponto,r,giro,flor,semente:(m.semente^0x731a)+i*977,y:ALTURA_FOLHA});
  }
  return folhas;
}

export function criarVitoriaRegia(f,toon) {
  const pos=[],cores=[],rng=criarRng(f.semente),N=48;
  const cor=c=>new THREE.Color(c);
  const tri=(a,b,c,tom)=>{
    pos.push(...a,...b,...c);
    for(const p of [a,b,c]){const t=typeof tom==='function'?tom(p):cor(tom);cores.push(t.r,t.g,t.b);}
  };
  const quad=(a,b,c,d,tom)=>{tri(a,b,c,tom);tri(a,c,d,tom);};
  const raio=t=>f.r*(1+.009*Math.sin(t*5+f.giro)+.006*Math.sin(t*9));
  const polar=(t,r,y)=>[Math.cos(t)*raio(t)*r,y,Math.sin(t)*raio(t)*r];
  // Cor contínua no espaço da folha: evita setores que pareçam fatias de pizza.
  const fase=rng()*6.28;
  const verde=cor(R.mata[4]),suave=cor(R.salvia[3]);
  const tom=p=>verde.clone().lerp(suave,.12+.12*(Math.sin(p[0]*1.8+fase)*Math.cos(p[2]*1.4+fase)+1)/2);
  for(let k=0;k<N;k++) {
    const a=k/N*Math.PI*2,b=(k+1)/N*Math.PI*2;
    const aneis=[[0,0],[.26,.008],[.62,.014],[.94,.018]];
    for(let j=1;j<aneis.length;j++){
      const [r0,y0]=aneis[j-1],[r1,y1]=aneis[j];
      if(r0===0)tri([0,0,0],polar(b,r1,y1),polar(a,r1,y1),tom);
      else quad(polar(a,r0,y0),polar(b,r0,y0),polar(b,r1,y1),polar(a,r1,y1),tom);
    }
    // Parede contínua: verde por dentro, vinho discreto na face exterior e lábio claro.
    const borda=[[.94,.018],[.975,.08],[1.005,.30],[1.02,.34],[1.035,.31],[1.035,.025],[1.03,-.025]];
    for(let j=1;j<borda.length;j++) {
      const [r0,y0]=borda[j-1],[r1,y1]=borda[j];
      const t=j===3?R.mata[5]:j===6?R.flor[0]:j>=4?R.mata[2]:R.mata[3];
      quad(polar(a,r0,y0),polar(b,r0,y0),polar(b,r1,y1),polar(a,r1,y1),t);
    }
  }
  // Nervuras finas em relevo: tronco radial e ramificações menores.
  const fita=(a,b,largura,tom)=>{
    const dx=b[0]-a[0],dz=b[2]-a[2],l=Math.hypot(dx,dz),x=-dz/l*largura/2,z=dx/l*largura/2;
    quad([a[0]+x,a[1],a[2]+z],[b[0]+x,b[1],b[2]+z],[b[0]-x,b[1],b[2]-z],[a[0]-x,a[1],a[2]-z],tom);
  };
  for(let k=0;k<12;k++) {
    const a=k/12*Math.PI*2+f.giro,curva=.025*Math.sin(k*2.3+fase);
    const pontos=[polar(a,.07,.012),polar(a+curva,.34,.023),polar(a-curva,.64,.024),polar(a,.9+.035*Math.sin(k),.025)];
    for(let j=1;j<pontos.length;j++)fita(pontos[j-1],pontos[j],.045,R.mata[5]);
    for(const r of [.4,.65])for(const s of [-1,1])fita(polar(a,r,.026),polar(a+s*.12,r+.18,.027),.026,R.salvia[4]);
  }
  if(f.flor) {
    // Flor junto à borda: sépalas verdes, três coroas de pétalas côncavas e miolo dourado.
    const t=f.giro+1.3,cx=Math.cos(t)*f.r*1.05,cz=Math.sin(t)*f.r*1.05;
    const petala=(ang,largura,comprimento,base,ponta,tom)=>{
      const ponto=(d,l,y)=>[cx+(Math.cos(ang)*d-Math.sin(ang)*l)*1.15,y,cz+(Math.sin(ang)*d+Math.cos(ang)*l)*1.15];
      const v=[ponto(.055,0,base),ponto(comprimento*.5,-largura*.5,base+.055),ponto(comprimento,0,ponta),ponto(comprimento*.5,largura*.5,base+.055),ponto(comprimento*.55,0,base+.12)];
      tri(v[0],v[1],v[4],tom);tri(v[1],v[2],v[4],tom);tri(v[2],v[3],v[4],tom);tri(v[3],v[0],v[4],tom);
    };
    for(let k=0;k<6;k++)petala(k/6*Math.PI*2,.25,.61,.04,.22,R.mata[2]);
    for(let camada=0;camada<3;camada++)for(let k=0;k<12;k++){
      const rosa=(f.semente%2)===0;
      const tom=camada===0?(rosa?R.flor[2]:R.flor[3]):camada===1?(rosa?R.flor[3]:R.betula[0]):R.luz[0];
      petala(k/12*Math.PI*2+camada*.26,.25-camada*.035,.66-camada*.135,.16+camada*.08,.29+camada*.14,tom);
    }
    for(let k=0;k<12;k++) {
      const a=k/12*Math.PI*2,b=(k+1)/12*Math.PI*2;
      tri([cx,.42,cz],[cx+Math.cos(b)*.14,.39,cz+Math.sin(b)*.14],[cx+Math.cos(a)*.14,.39,cz+Math.sin(a)*.14],R.amarelo[2]);
    }
  }
  const geo=new THREE.BufferGeometry();
  geo.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));
  geo.setAttribute('color',new THREE.Float32BufferAttribute(cores,3));geo.computeVertexNormals();
  const folha=new THREE.Mesh(geo,toon({vertexColors:true,side:THREE.DoubleSide}));
  folha.name='vitoria-regia';folha.position.set(f.x,ALTURA_FOLHA,f.z);
  folha.castShadow=folha.receiveShadow=true;folha.userData.raio=f.r;folha.userData.flor=f.flor;
  return folha;
}
