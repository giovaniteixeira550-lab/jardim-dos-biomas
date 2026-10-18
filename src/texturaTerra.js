/** Azulejo autoral de terra: grupos de pixels, sem fotografia ou ruído por pixel. */
import * as THREE from 'three';
import { RAMPAS } from './paleta.js';

export function criarTexturaTerra() {
  const largura=96, altura=64;
  const pixels=new Uint8Array(largura*altura*4);
  const cores=[1,2,3,4].map(i=>new THREE.Color(RAMPAS.terra[i]));
  const indice=new Uint8Array(largura*altura).fill(1);
  const hash=(x,y,s=0)=>{const v=Math.sin(x*127.1+y*311.7+s*57.3)*43758.5453;return v-Math.floor(v);};
  const put=(x,y,tom)=>{indice[((y+altura)%altura)*largura+(x+largura)%largura]=tom;};
  // Silhuetas assimétricas com recortes de um pixel; pares claros/escuros
  // pertencem ao mesmo torrão, em vez de aparecerem como confete independente.
  const formas=[
    ['..###...','.#####..','#######.','#######.','.######.','..####..','...##...'],
    ['...###..','..#####.','.######.','#######.','######..','.####...','..##....'],
    ['.####...','######..','#######.','.#######','..######','..#####.','...##...'],
    ['..####..','.######.','########','#######.','.#####..','..####..','...#....']
  ];
  for(let linha=0;linha<8;linha++)for(let coluna=0;coluna<12;coluna++){
    const h=hash(coluna,linha), mascara=formas[Math.floor(h*formas.length)];
    const ox=coluna*8+(linha%2)*4+Math.floor(hash(coluna,linha,1)*3)-1;
    const oy=linha*8+Math.floor(hash(coluna,linha,2)*3)-1;
    const principal=h>.8?1:2;
    const dentro=(x,y)=>mascara[y]?.[x]==='#';
    for(let y=0;y<mascara.length;y++)for(let x=0;x<mascara[y].length;x++){
      if(!dentro(x,y))continue;
      const pe=!dentro(x,y+1), topo=!dentro(x,y-1);
      let tom=principal;
      // Não contorna cada torrão: massas se encostam como terra compactada,
      // com poucos recortes escuros em vez de um calçamento de pedrinhas.
      if(pe&&x>3&&h>.68)tom=0;
      else if(topo&&x<5&&h>.38)tom=3;
      else if(x>3&&y>3&&h>.45)tom=1;
      put(ox+x,oy+y,tom);
    }
  }
  for(let i=0;i<indice.length;i++){
    const c=cores[indice[i]];pixels.set([Math.round(c.r*255),Math.round(c.g*255),Math.round(c.b*255),255],i*4);
  }
  const textura=new THREE.DataTexture(pixels,largura,altura,THREE.RGBAFormat);
  textura.wrapS=textura.wrapT=THREE.RepeatWrapping;
  textura.minFilter=textura.magFilter=THREE.NearestFilter;
  textura.generateMipmaps=false;textura.needsUpdate=true;
  textura.name='terra-pixel-torroes-autoral';
  return textura;
}
