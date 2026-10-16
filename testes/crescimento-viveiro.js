const assert={ok:(valor,mensagem)=>{if(!valor)throw Error(mensagem);}};
export const resultados=[];
const registrar=texto=>{resultados.push(texto);console.log(texto);};
import {ESPECIES} from '../src/especies.js';
import {construirVariacao} from '../src/arvoreProc.js';
import {organizarViveiro} from '../src/viveiro.js';

let modelos=0;
for(const seed of [1234,917,40281]){
 const variacoes=Object.entries(ESPECIES).map(([especie,def])=>({especie,...construirVariacao(def,seed)}));
 try{
  for(const v of variacoes){
   v.alturas.forEach((h,i)=>{assert.ok(h>0&&(!i||h>v.alturas[i-1]),`${v.especie}/${seed}: diminuiu no estágio ${i}`);modelos++;});
  }
  const grupos=organizarViveiro(variacoes,260,182),caixas=[];
  for(const grupo of grupos)for(const m of grupo.modelos){
   const b=m.geo.boundingBox;
   caixas.push({id:grupo.especie+'/'+m.estagio,minX:m.x+b.min.x,maxX:m.x+b.max.x,minZ:m.z+b.min.z,maxZ:m.z+b.max.z});
  }
  for(let i=0;i<caixas.length;i++){
   const a=caixas[i];assert.ok(a.minX>=0&&a.maxX<=260,`${a.id}: fora da faixa do viveiro`);
   for(let j=0;j<i;j++){const b=caixas[j];assert.ok(a.maxX<=b.minX||b.maxX<=a.minX||a.maxZ<=b.minZ||b.maxZ<=a.minZ,`${a.id} sobrepõe ${b.id}`);}
  }
  registrar(`PASSOU — semente ${seed}: ${variacoes.length} espécies, ${caixas.length} modelos sem sobreposição e crescimento progressivo.`);
 }finally{for(const v of variacoes)v.estagios.forEach(g=>g.dispose());}
}
registrar(`PASSOU — ${modelos} estágios conferidos.`);
