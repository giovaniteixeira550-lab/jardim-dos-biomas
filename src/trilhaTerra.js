/** Largos de chegada: mesma máscara no terreno, no plantio e na planta. */
export function distanciaLargo(x, y, largo, largura) {
  return Math.hypot((x - largo.x) / largo.rx, (y - largo.y) / largo.ry) * largura * 0.5;
}

export function distanciaTerra(x, y, distanciaEixo, trilha) {
  let d = distanciaEixo;
  for (const largo of trilha.largos ?? []) d = Math.min(d, distanciaLargo(x, y, largo, trilha.largura));
  return d;
}

/** Banco na margem norte, com o assento horizontal e a frente para a água. */
export function definirPontoPesca(lago) {
  const a=-1.4,r=lago.raio(a);
  const x=lago.cx+Math.cos(a)*lago.rx*r*1.11;
  const y=lago.cy+Math.sin(a)*lago.ry*r*1.11;
  const yaw=Math.atan2(lago.cx-x,lago.cy-y);
  // A trilha chega por trás do assento; não passa sob o banco ou dentro d’água.
  return {x,y,yaw,acesso:{x:x-Math.sin(yaw)*2.1,y:y-Math.cos(yaw)*2.1}};
}
