/** Distribuição determinística de folhas caídas e trevos; sem alterar o mundo. */
import { criarRng } from './mundo.js';

export function cabeCobertura(m, x, z, margem = .9) {
  if (x < margem || z < margem || x > m.largura-margem || z > m.altura-margem) return false;
  if (m.fatorLago(x,z) < 1.1 || m.distTrilha(x,z) < m.trilha.largura*.85+margem || m.declive(x,z) > .3) return false;
  if (m.distRiacho(x,z) < m.larguraRiacho(x,z)*.5+1.4+margem) return false;
  if (m.plano.locais.some(l => l.status==='proposto' && Math.abs(x-l.x)<l.largura/2+1+margem && Math.abs(z-l.y)<l.profundidade/2+1+margem)) return false;
  const ponte=m.plano.passarela;
  if (ponte) {
    const a=ponte.inicio,b=ponte.fim,dx=b.x-a.x,dz=b.y-a.y;
    const t=Math.max(0,Math.min(1,((x-a.x)*dx+(z-a.y)*dz)/(dx*dx+dz*dz || 1)));
    if(Math.hypot(x-a.x-t*dx,z-a.y-t*dz)<ponte.largura/2+1.4+margem)return false;
  }
  // O detalhe inteiro deve caber no solo suave, não só seu centro.
  return [[margem,0],[-margem,0],[0,margem],[0,-margem]].every(([dx,dz])=>Math.abs(m.altitude(x+dx,z+dz)-m.altitude(x,z))<.22);
}

export function distribuirCobertura(m) {
  const rng=criarRng(m.semente^0x51fa),folhas=[],trevos=[];
  for(const arvore of m.objetos.filter(o=>o.tipo==='arvore')) {
    const direcao=rng()*Math.PI*2;
    for(let i=0;i<22;i++) {
      const ang=direcao+(rng()-.5)*3.8,r=1.1+Math.sqrt(rng())*4.4;
      const x=arvore.x+Math.cos(ang)*r,z=arvore.y+Math.sin(ang)*r;
      if(cabeCobertura(m,x,z))folhas.push({x,z,giro:rng()*Math.PI*2,tamanho:.32+rng()*.32,tom:Math.floor(rng()*3)});
    }
  }
  // Manchas esparsas junto à transição do bosque, sem tapete uniforme.
  for(let i=0;i<Math.round(450*m.areaRel);i++) {
    const x=rng()*m.largura,z=rng()*m.altura,d=m.densidade(x,z);
    if(d<.12||d>.6||m.fino(x/8,z/8,2)<.56||!cabeCobertura(m,x,z))continue;
    for(let k=0;k<5;k++) {
      const a=rng()*Math.PI*2,r=rng()*1.5,px=x+Math.cos(a)*r,pz=z+Math.sin(a)*r;
      if(cabeCobertura(m,px,pz))trevos.push({x:px,z:pz,giro:rng()*Math.PI*2,tamanho:.3+rng()*.2,tom:k%2});
    }
  }
  return {folhas,trevos};
}
