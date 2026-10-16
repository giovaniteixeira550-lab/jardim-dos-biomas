/** Espaçamento calculado pelos quatro modelos reais, inclusive folhas abertas. */
export function organizarViveiro(variacoes, largura, inicioZ) {
  const grupos=[]; let x=4,z=inicioZ,profundidadeLinha=0;
  for(const v of variacoes){
    let cursor=0,minZ=0,maxZ=0,altura=0;
    const modelos=v.estagios.map((geo,estagio)=>{
      const b=geo.boundingBox;
      const p={geo,estagio,x:cursor-b.min.x,z:0};
      cursor+=b.max.x-b.min.x+1.8;
      minZ=Math.min(minZ,b.min.z);maxZ=Math.max(maxZ,b.max.z);altura=Math.max(altura,b.max.y);
      return p;
    });
    const comprimento=Math.max(14,cursor-1.8),profundidade=maxZ-minZ+altura*1.3+12;
    if(x>4&&x+comprimento>largura-4){x=4;z+=profundidadeLinha;profundidadeLinha=0;}
    for(const p of modelos){p.x+=x;p.z=z-minZ;}
    grupos.push({especie:v.especie,modelos,rotulo:{x:x+comprimento/2,z:z+maxZ-minZ+7},limites:{minX:x,maxX:x+comprimento,minZ:z,maxZ:z+profundidade}});
    x+=comprimento+5;profundidadeLinha=Math.max(profundidadeLinha,profundidade);
  }
  return grupos;
}
