import * as THREE from 'three';
import {estagioDe} from './especies.js';
import {RAMPAS} from './paleta.js';
import {prepararSenescencia,construirSenescencia,descartarSenescencia} from './senescencia.js';

/** Amostra restrita às duas espécies com senescência anatômica preparada. */
export function criarVisualCrescimento(variacao,estado,{referencia=false}={}) {
  const fase=estagioDe(estado.crescimento);
  if(fase.indice<0)return null;
  const base=variacao.estagios[fase.indice];
  let geometria;
  if(!referencia&&fase.indice===3&&estado.senescencia>0){
    const anatomia=prepararSenescencia(base,1234);
    // A resposta anatômica inicial é suave; o indicador não é porcentagem de folhas.
    try{geometria=construirSenescencia(anatomia,estado.senescencia*.7);}finally{descartarSenescencia(anatomia);}
    // O modelo original conserva integralmente a madeira conquistada.
    // A amostra de senescência pode tingi-la: restaura cor, posição e normais
    // do bloco inicial de madeira na geometria resultante.
    const banda=base.attributes.banda,raio=base.attributes.raioCopa;
    let j=0;
    for(let i=0;i<base.attributes.position.count;i+=3)if(!(banda.getX(i)>-2&&raio.getX(i)>0)){
      for(let k=0;k<3;k++,j++)for(const nome of ['position','normal','color']){
        const a=base.attributes[nome],b=geometria.attributes[nome];
        for(let c=0;c<a.itemSize;c++)b.array[j*a.itemSize+c]=a.array[(i+k)*a.itemSize+c];
      }
    }
  }else{
    geometria=base.clone();
    if(!referencia&&estado.senescencia>0){
      const cor=geometria.attributes.color,banda=geometria.attributes.banda,raio=geometria.attributes.raioCopa;
      const alvo=new THREE.Color(RAMPAS.salvia[1]),atual=new THREE.Color();
      for(let i=0;i<cor.count;i++)if(banda.getX(i)>-2&&raio.getX(i)>0){atual.fromBufferAttribute(cor,i).lerp(alvo,estado.senescencia*.7);cor.setXYZ(i,atual.r,atual.g,atual.b);}
    }
  }
  geometria.computeBoundingBox();geometria.computeBoundingSphere();
  return {geometria,escala:fase.escala,indice:fase.indice,alturaConquistada:variacao.alturas[fase.indice]*fase.escala};
}
