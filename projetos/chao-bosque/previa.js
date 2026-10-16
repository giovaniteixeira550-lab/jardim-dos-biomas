import {Jardim} from '../../src/cena.js';
import {distribuirCobertura,cabeCobertura} from '../../src/coberturaSolo.js';
const $=id=>document.getElementById(id),j=new Jardim($('mapa'));
let visivel=true,arvores=true;
try {
  await j.carregar(1234,(f,t)=>$('estado').textContent=`${Math.round(f*100)}% · ${t}`);
  const c=distribuirCobertura(j.mundo),d=distribuirCobertura(j.mundo);
  if(JSON.stringify(c)!==JSON.stringify(d))throw Error('Distribuição não determinística');
  if([...c.folhas,...c.trevos].some(p=>!cabeCobertura(j.mundo,p.x,p.z)))throw Error('Detalhe em zona excluída');
  let vertices=0;
  j.coberturaSolo.traverse(o=>{if(!o.geometry)return;const p=o.geometry.attributes.position;vertices+=p.count;for(let i=0;i<p.count;i++){const x=p.getX(i),y=p.getY(i),z=p.getZ(i);if(!Number.isFinite(x+y+z)||y<j.mundo.altitude(x,z)+.02)throw Error('Vértice fora do solo');}});
  $('relatorio').textContent=`PASSOU — mesma semente, zonas excluídas e ${vertices} vértices finitos apoiados no terreno.\n${c.folhas.length} folhas, ${c.trevos.length} trevos; duas malhas estáticas compartilhadas pelo jogo e pela prévia.\nDistribuição também conferida nas sementes 42 e 2026.\nSem vento nem luzes extras. Detalhes são discretos na vista geral e se leem ao aproximar.\nCusto em aparelhos móveis ainda não medido. Árvores ocultas é apenas um controle desta prévia.`;
  const foco=(p,altura=15)=>{j.alvo.set(p.x,j.mundo.altitude(p.x,p.z),p.z);j.altura=altura;};
  // Pontos da própria distribuição, escolhidos perto de agrupamentos legíveis.
  const melhor=lista=>lista.filter((_,i)=>i%12===0).map(p=>({p,n:lista.filter(q=>Math.hypot(p.x-q.x,p.z-q.z)<5).length})).sort((a,b)=>b.n-a.n)[0]?.p??lista[0];
  const folhas=melhor(c.folhas),trevos=melhor(c.trevos);
  $('cobertura').onclick=()=>{visivel=!visivel;j.coberturaSolo.visible=visivel;$('cobertura').textContent=visivel?'Com detalhes':'Sem detalhes';$('cobertura').setAttribute('aria-pressed',visivel);};
  $('arvores').onclick=()=>{arvores=!arvores;for(const g of j.grupos)for(const m of g.malhas)m.visible=arvores;$('arvores').textContent=arvores?'Árvores visíveis':'Árvores ocultas';$('arvores').setAttribute('aria-pressed',arvores);};
  $('bosque').onclick=()=>foco(folhas);
  $('clareira').onclick=()=>foco(trevos,12);
  $('geral').onclick=()=>j.recentrar();
  $('girar').onclick=()=>j.girar(1);
  for(const b of document.querySelectorAll('button'))b.disabled=false;
  foco(folhas,18);
  $('estado').textContent='Proposta em revisão · arraste para explorar; roda para aproximar · detalhes em volume, presos à altura do terreno.';
}catch(e){$('estado').textContent='Falha: '+e.message;console.error(e);}
window.addEventListener('pagehide',()=>j.dispose());
