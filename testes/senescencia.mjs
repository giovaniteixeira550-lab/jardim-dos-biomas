import test from 'node:test';
import assert from 'node:assert/strict';
import {construirVariacao} from '../src/arvoreProc.js';
import {ESPECIES} from '../src/especies.js';
import {ESTADOS_SENESCENCIA,prepararSenescencia,construirSenescencia,descartarSenescencia} from '../src/senescencia.js';

for(const id of ['carvalho','freixo']){
  const v=construirVariacao(ESPECIES[id],1234),base=v.estagios[3],a=prepararSenescencia(base,1234);
  test(`${id}: madeira preservada, perda real da copa e geometria válida nos cinco estados`,()=>{
    let anterior=Infinity;
    for(const e of ESTADOS_SENESCENCIA){
      const g=construirSenescencia(a,e.valor),info=g.userData.senescencia;
      assert.ok(info.volumes<=anterior);anterior=info.volumes;
      for(const b of Object.values(g.attributes))for(const x of b.array)assert.ok(Number.isFinite(x));
      const madeira=a.madeira.attributes.position.array;
      assert.deepEqual(g.attributes.position.array.slice(0,madeira.length),madeira);
      assert.ok(g.boundingBox.max.y>=base.boundingBox.max.y*.85);
      if(e.valor===1){assert.equal(info.semFolhas,true);assert.equal(info.folhas,0);assert.equal(info.volumes,0);assert.equal(g.attributes.position.count,a.madeira.attributes.position.count+a.ramificacao.attributes.position.count);}
      g.dispose();
    }
  });
  test(`${id}: ida e volta são determinísticas e não alteram a árvore original`,()=>{
    const pos=base.attributes.position.array.slice(),cor=base.attributes.color.array.slice(),antes=construirSenescencia(a,0);
    const seca=construirSenescencia(a,1),depois=construirSenescencia(a,0);
    for(const nome of Object.keys(antes.attributes))assert.deepEqual(antes.attributes[nome].array,depois.attributes[nome].array);
    assert.deepEqual(base.attributes.position.array,pos);assert.deepEqual(base.attributes.color.array,cor);
    assert.notDeepEqual(antes.attributes.color.array,seca.attributes.color.array);
    assert.throws(()=>construirSenescencia(a,NaN),/número/);
    for(const g of [antes,seca,depois])g.dispose();
  });
  test(`${id}: perda de vigor altera todos os tufos, sem mancha isolada`,()=>{
    const g=construirSenescencia(a,.28),cores=g.attributes.color.array;
    let inicio=a.madeira.attributes.position.count*3;
    for(const copa of a.copas){
      const original=copa.geo.attributes.color.array;let diferenca=0;
      for(let i=0;i<original.length;i++)diferenca+=Math.abs(cores[inicio+i]-original[i]);
      assert.ok(diferenca/original.length>.025,'Um tufo permaneceu com a cor original');inicio+=original.length;
    }
    g.dispose();
  });
  test.after(()=>{descartarSenescencia(a);for(const g of v.estagios)g.dispose();});
}
test('espécie sem adaptação é recusada em vez de receber uma árvore seca genérica',()=>{
  const v=construirVariacao(ESPECIES.pinheiro,1234);
  assert.throws(()=>prepararSenescencia(v.estagios[3]),/adaptação própria/);
  for(const g of v.estagios)g.dispose();
});
