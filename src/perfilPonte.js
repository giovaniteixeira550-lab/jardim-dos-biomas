/** Perfil suave: entradas horizontais e ponto alto no centro da ponte. */
export const alturaTabuleiro=(base,arco,t)=>base+arco*Math.sin(Math.PI*Math.max(0,Math.min(1,t)))**2;
export const inclinacaoTabuleiro=(arco,comprimento,t)=>arco*Math.PI/comprimento*Math.sin(2*Math.PI*t);
