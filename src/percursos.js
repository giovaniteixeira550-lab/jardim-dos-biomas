/** Percursos compartilhados pelo chão, pelas escadas, pontes e água. */
import {alturaTabuleiro} from "./perfilPonte.js";
const limitar = (v,a,b) => Math.max(a,Math.min(b,v));
const misturar = (a,b,t) => a+(b-a)*t;
const suave = (a,b,x) => {const t=limitar((x-a)/(b-a),0,1);return t*t*(3-2*t);};
const distancia = (a,b) => Math.hypot(b.x-a.x,b.y-a.y);

function medir(pontos) {
  let s=0;
  return pontos.map((p,i)=>({...p,s:i?(s+=distancia(pontos[i-1],p)):0}));
}
function projetar(x,y,pontos,candidatos=null) {
  let melhor=null;
  const indices=candidatos??Array.from({length:pontos.length-1},(_,i)=>i);
  for(const i of indices) {
    const a=pontos[i],b=pontos[i+1],dx=b.x-a.x,dy=b.y-a.y,l2=dx*dx+dy*dy;
    if(l2<1e-8)continue; // uma cortina vertical não é uma superfície de leito
    const t=limitar(((x-a.x)*dx+(y-a.y)*dy)/l2,0,1);
    const d2=(x-a.x-dx*t)**2+(y-a.y-dy*t)**2;
    if(!melhor||d2<melhor.d2-1e-9)melhor={i,t,d2,d:Math.sqrt(d2),s:misturar(a.s,b.s,t),dx:dx/Math.sqrt(l2),dy:dy/Math.sqrt(l2),agua:misturar(a.agua??0,b.agua??0,t),largura:misturar(a.largura??3.2,b.largura??3.2,t)};
  }
  return melhor;
}
function indiceEspacial(pontos,raio) {
  const tam=8,indice=new Map();
  for(let i=0;i<pontos.length-1;i++) {
    const a=pontos[i],b=pontos[i+1];
    if(distancia(a,b)<1e-6)continue;
    for(let y=Math.floor((Math.min(a.y,b.y)-raio)/tam);y<=Math.floor((Math.max(a.y,b.y)+raio)/tam);y++)
      for(let x=Math.floor((Math.min(a.x,b.x)-raio)/tam);x<=Math.floor((Math.max(a.x,b.x)+raio)/tam);x++) {
        const k=`${x},${y}`;
        if(!indice.has(k))indice.set(k,[]);
        indice.get(k).push(i);
      }
  }
  return (x,y)=>indice.get(`${Math.floor(x/tam)},${Math.floor(y/tam)}`)??[];
}
function amostraEm(pontos,s) {
  let a=0,b=pontos.length-1;
  while(b-a>1){const m=(a+b)>>1;if(pontos[m].s<=s)a=m;else b=m;}
  const p=pontos[a],q=pontos[b],t=limitar((s-p.s)/(q.s-p.s||1),0,1);
  return {...p,x:misturar(p.x,q.x,t),y:misturar(p.y,q.y,t),s,h:misturar(p.h,q.h,t)};
}

export function organizarPercursos({trilha,riacho,lago,fatorLago,altitude,grade:G,alturas:H,DEGRAU,plano}) {
  const eixo=medir(trilha.pontos), comprimento=eixo.at(-1).s;
  const amostras=[];
  for(let s=0;s<comprimento;s+=0.5) {
    const p=amostraEm(eixo,s);amostras.push({...p,hBase:altitude(p.x,p.y),h:altitude(p.x,p.y)});
  }
  const fim=eixo.at(-1);amostras.push({...fim,hBase:altitude(fim.x,fim.y),h:altitude(fim.x,fim.y)});
  trilha.amostras=amostras;
  const bruto=medir(riacho.pontos);
  let nivel=Infinity;
  for(const p of bruto) {
    const patamar=Math.round(p.h0/DEGRAU);
    nivel=Math.max(-0.55,Math.min(nivel,patamar>0?patamar*DEGRAU-0.5:-0.55));
    p.agua=nivel;
    p.largura=riacho.largura;
    for(const id of ["poco-alto","poco-baixo"]) {
      const poco=plano?.locais.find(l=>l.id===id);
      if(poco)p.largura+=3.2*Math.exp(-((p.x-poco.x)**2+(p.y-poco.y)**2)/32);
    }
  }
  bruto.at(-1).agua=-0.55;

  // Interseções verdadeiras: a direção e os acessos pertencem à trilha.
  const pontes=[];
  for(let i=0;i<eixo.length-1;i++)for(let j=0;j<bruto.length-1;j++) {
    const a=eixo[i],b=eixo[i+1],p=bruto[j],q=bruto[j+1];
    const ux=b.x-a.x,uy=b.y-a.y,vx=q.x-p.x,vy=q.y-p.y,det=ux*vy-uy*vx;
    if(Math.abs(det)<1e-8)continue;
    const t=((p.x-a.x)*vy-(p.y-a.y)*vx)/det,u=((p.x-a.x)*uy-(p.y-a.y)*ux)/det;
    if(t<0||t>1||u<0||u>1)continue;
    const s=misturar(a.s,b.s,t),sRio=misturar(p.s,q.s,u);
    if(pontes.some(ponte=>Math.abs(ponte.s-s)<5))continue;
    const len=Math.hypot(ux,uy),dx=ux/len,dy=uy/len;
    const seno=Math.abs(det)/(len*Math.hypot(vx,vy));
    const vao=Math.max(7,(Math.max(p.largura,q.largura)+2.8)/Math.max(0.2,seno));
    pontes.push({x:a.x+ux*t,y:a.y+uy*t,dx,dy,s,sRio,comprimento:vao,arqueamento:plano?.arqueamentoPonte??0,largura:trilha.largura,s0:s-vao/2,s1:s+vao/2});
    // Uma ponte nunca nasce no meio de uma cortina: conserva um patamar de água.
    const entrada=bruto.findLast(r=>r.s<sRio-4)??bruto[0];
    for(const r of bruto)if(r.s>=sRio-4&&r.s<=sRio+4)r.agua=entrada.agua;
  }
  // Reaplica a descida depois dos patamares de travessia.
  nivel=Infinity;
  for(const p of bruto){nivel=Math.min(nivel,p.agua);p.agua=nivel;}

  // Pisos horizontais e cortinas realmente verticais compartilham os vértices.
  const curso=[bruto[0]];
  for(let i=1;i<bruto.length;i++) {
    const a=bruto[i-1],b=bruto[i];
    if(a.agua-b.agua>0.05) {
      const borda={x:(a.x+b.x)/2,y:(a.y+b.y)/2,s:(a.s+b.s)/2,largura:(a.largura+b.largura)/2};
      curso.push({...borda,agua:a.agua,h0:a.h0},{...borda,agua:b.agua,h0:b.h0});
    }
    curso.push(b);
  }
  riacho.pontos=curso;
  const quedas=[];
  for(let i=1;i<curso.length;i++)if(distancia(curso[i-1],curso[i])<1e-6&&curso[i-1].agua>curso[i].agua+0.05) {
    const p=curso[i],a=curso[Math.max(0,i-2)],b=curso[Math.min(curso.length-1,i+1)],l=distancia(a,b)||1;
    quedas.push({...p,numero:quedas.length+1,superior:curso[i-1].agua,dx:(b.x-a.x)/l,dy:(b.y-a.y)/l});
  }
  riacho.quedas=quedas;
  const candidatos=indiceEspacial(curso,Math.max(...curso.map(p=>p.largura))/2+2);
  const projetarRio=(x,y)=>projetar(x,y,curso,candidatos(x,y));
  const distRiacho=(x,y)=>projetarRio(x,y)?.d??Infinity;
  const larguraRiacho=(x,y)=>projetarRio(x,y)?.largura??riacho.largura;

  // Maiorante com inclinação limitada: os acessos sobem antes do paredão,
  // sempre ao longo do caminho. Não dependem da orientação do gradiente.
  for(const ponte of pontes) {
    ponte.h=Math.ceil(Math.max(amostraEm(amostras,ponte.s0).h,amostraEm(amostras,ponte.s1).h,(projetarRio(ponte.x,ponte.y)?.agua??0)+0.9)/0.25)*0.25;
  }
  for(let rodada=0;rodada<3;rodada++) {
    for(const p of amostras)for(const ponte of pontes)if(p.s>=ponte.s0-1.5&&p.s<=ponte.s1+1.5)p.h=ponte.h;
    for(let i=1;i<amostras.length;i++)amostras[i].h=Math.max(amostras[i].h,amostras[i-1].h-0.5*(amostras[i].s-amostras[i-1].s));
    for(let i=amostras.length-2;i>=0;i--)amostras[i].h=Math.max(amostras[i].h,amostras[i+1].h-0.5*(amostras[i+1].s-amostras[i].s));
    for(const ponte of pontes)ponte.h=Math.ceil(Math.max(ponte.h,...amostras.filter(p=>p.s>=ponte.s0-1.5&&p.s<=ponte.s1+1.5).map(p=>p.h))/0.25-1e-6)*0.25;
  }
  for(const p of amostras) {
    p.h=Math.round(p.h/0.25)*0.25;
    p.ponte=pontes.find(ponte=>p.s>=ponte.s0&&p.s<=ponte.s1)??null;
    if(p.ponte)p.h=p.ponte.h;
  }
  for(let i=0;i<amostras.length;i++) {
    const patamar=pontes.some(p=>amostras[i].s>=p.s0-1.5&&amostras[i].s<=p.s1+1.5);
    amostras[i].escada=!patamar&&amostras.slice(Math.max(0,i-2),Math.min(amostras.length,i+3)).some(p=>Math.abs(p.h-amostras[i].h)>0.15);
  }
  for(const p of amostras)if(p.ponte)p.h=alturaTabuleiro(p.ponte.h,p.ponte.arqueamento,(p.s-p.ponte.s0)/p.ponte.comprimento);
  const perfilTrilha=(x,y)=> {
    const p=projetar(x,y,eixo);
    const i=limitar(Math.round(p.s/0.5),0,amostras.length-1),a=amostras[i];
    const ponte=pontes.find(ponte=>p.s>=ponte.s0&&p.s<=ponte.s1)??null;
    return {...p,h:ponte?alturaTabuleiro(ponte.h,ponte.arqueamento,(p.s-ponte.s0)/ponte.comprimento):a.h,escada:a.escada,ponte};
  };

  // Uma única projeção por célula evita que a queda de baixo escave o lábio
  // superior. A margem acompanha o patamar correto, inclusive nas curvas.
  for(let j=0;j<G.ny;j++)for(let i=0;i<G.nx;i++) {
    const k=j*G.nx+i,x=G.x0+i*G.passo,y=G.y0+j*G.passo;
    const rio=projetarRio(x,y),meia=(rio?.largura??riacho.largura)/2;
    const caminho=perfilTrilha(x,y);
    if(caminho.d<trilha.largura*0.9&&!caminho.ponte) {
      const peso=1-suave(trilha.largura*0.5,trilha.largura*0.9,caminho.d);
      H[k]=misturar(H[k],caminho.h-(caminho.escada?0.24:0),peso);
    }
    if(rio&&rio.d<meia+1.8) {
      const leito=rio.agua-0.5;
      if(fatorLago?.(x,y)<.98){H[k]=Math.min(H[k],leito);continue;}
      const margem=Math.max(H[k],rio.agua+0.18);
      const canal=misturar(leito,margem,suave(meia+0.45,meia+0.95,rio.d));
      H[k]=misturar(canal,H[k],suave(meia+0.95,meia+1.8,rio.d));
    }
    // Reserva um pequeno vão sob cada cortina. A interpolação da grade não
    // pode criar um triângulo de terra atravessando a lâmina vertical.
    for(const queda of quedas) {
      const dx=x-queda.x,dy=y-queda.y;
      const longitudinal=dx*queda.dx+dy*queda.dy,lateral=-dx*queda.dy+dy*queda.dx;
      if(Math.abs(longitudinal)<1.05&&Math.abs(lateral)<queda.largura/2+0.3)H[k]=Math.min(H[k],queda.agua-0.5);
    }
  }
  return {pontes,ponte:pontes[0]??null,distRiacho,larguraRiacho,perfilTrilha};
}
