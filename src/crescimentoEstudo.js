/** Modelo experimental: conquista acumulada e acompanhamento da copa são independentes. */
export const REGRAS_EXPERIMENTAIS = Object.freeze({
  versao: 'crescimento-estudo-0.2',
  muda: Object.freeze({ dias: 2, intervalo: 1, encontros: 1.8, autonomias: 0 }),
  jovem: Object.freeze({ dias: 5, intervalo: 21, encontros: 5, autonomias: 1 }),
  adulta: Object.freeze({ dias: 12, intervalo: 90, encontros: 12, autonomias: 3, intervaloRecuperacoes: 60 }),
  intervaloAutonomias: 14,
  intervaloRecuperacaoCopa: 7,
  toleranciaSemRegistro: 45,
  diasParaCopaRala: 180,
  senescenciaMaxima: 0.6,
});
const TIPOS = ['estudo', 'tentativa', 'retomada', 'dificuldade', 'pausa'];
const RESULTADOS = ['autonomo', 'pista', 'apos_explicacao', 'nao_recuperou', 'nao_avaliado'];
const DIA = 86400000;
const limitar = (x,a,b) => Math.max(a,Math.min(b,x));

export function diaNumero(data) {
  if(typeof data!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(data))throw Error('Informe uma data válida no formato AAAA-MM-DD.');
  const n=Date.parse(data+'T00:00:00Z');
  if(!Number.isFinite(n)||new Date(n).toISOString().slice(0,10)!==data)throw Error('A data informada não existe.');
  return n/DIA;
}
export function somarDias(data,dias) {
  if(!Number.isInteger(dias))throw Error('O intervalo precisa ser um número inteiro de dias.');
  return new Date((diaNumero(data)+dias)*DIA).toISOString().slice(0,10);
}
export function validarRegras(r) {
  if(!['crescimento-estudo-0.1','crescimento-estudo-0.2'].includes(r?.versao))throw Error('Versão das regras não reconhecida.');
  for(const chave of ['intervaloAutonomias','toleranciaSemRegistro','diasParaCopaRala'])if(!Number.isFinite(r[chave])||r[chave]<1)throw Error('Intervalo inválido: '+chave);
  if(r.versao==='crescimento-estudo-0.2'&&(!Number.isInteger(r.intervaloRecuperacaoCopa)||r.intervaloRecuperacaoCopa<1))throw Error('Intervalo de recuperação da copa inválido.');
  if(!Number.isFinite(r.senescenciaMaxima)||r.senescenciaMaxima<0||r.senescenciaMaxima>1)throw Error('Limite de copa inválido.');
  let anterior={dias:0,intervalo:0,encontros:0,autonomias:0,intervaloRecuperacoes:0};
  for(const nome of ['muda','jovem','adulta']){
    const e=r[nome];
    if(!e||!['dias','intervalo','encontros','autonomias'].every(k=>Number.isFinite(e[k])&&e[k]>=anterior[k])||e.dias<1||e.encontros<=0||!Number.isInteger(e.dias)||!Number.isInteger(e.autonomias))throw Error('Critérios de crescimento inválidos: '+nome);
    const recuperacoes=e.intervaloRecuperacoes??0;
    if(!Number.isFinite(recuperacoes)||recuperacoes<anterior.intervaloRecuperacoes||(recuperacoes>0&&e.autonomias<2))throw Error('Distribuição das recuperações inválida: '+nome);
    anterior={...e,intervaloRecuperacoes:recuperacoes};
  }
}
function normalizarEvento(e) {
  if(!e||typeof e.id!=='string'||!e.id.trim()||!TIPOS.includes(e.tipo))throw Error('Registro sem identidade ou tipo válido.');
  diaNumero(e.data);
  if(e.tipo==='pausa'){
    if(diaNumero(e.fim)<=diaNumero(e.data))throw Error('A pausa precisa terminar depois do início.');
    return {id:e.id,tipo:e.tipo,data:e.data,fim:e.fim};
  }
  const resultado=e.resultado??'nao_avaliado';
  if(!RESULTADOS.includes(resultado))throw Error('Resultado de recuperação inválido.');
  if(e.tipo!=='tentativa'&&resultado!=='nao_avaliado')throw Error('Somente uma tentativa avaliada pode declarar autonomia ou ajuda.');
  return {id:e.id,tipo:e.tipo,data:e.data,resultado};
}
export function normalizarEventos(eventos) {
  if(!Array.isArray(eventos)||eventos.length>10000)throw Error('Histórico da amostra inválido.');
  const unicos=new Map();
  for(const bruto of eventos){
    const e=normalizarEvento(bruto),anterior=unicos.get(e.id);
    if(anterior&&JSON.stringify(anterior)!==JSON.stringify(e))throw Error('O mesmo registro foi reenviado com conteúdo diferente.');
    unicos.set(e.id,e);
  }
  // A ordenação estável preserva a sequência registrada dentro do mesmo dia.
  return [...unicos.values()].sort((a,b)=>a.data.localeCompare(b.data));
}
/** Acrescentar um registro repetido não duplica crescimento. Não altera a entrada. */
export function registrarEvento(eventos,evento) { return normalizarEventos([...eventos,evento]); }

function pausasUnidas(eventos) {
  const intervalos=eventos.filter(e=>e.tipo==='pausa').map(e=>[diaNumero(e.data),diaNumero(e.fim)]).sort((a,b)=>a[0]-b[0]);
  const unidos=[];
  for(const p of intervalos){const ultimo=unidos.at(-1);if(ultimo&&p[0]<=ultimo[1])ultimo[1]=Math.max(ultimo[1],p[1]);else unidos.push([...p]);}
  return unidos;
}
function diasAtivos(a,b,pausas) {
  const inicio=diaNumero(a),fim=diaNumero(b);
  return Math.max(0,fim-inicio-pausas.reduce((s,[x,y])=>s+Math.max(0,Math.min(fim,y)-Math.max(inicio,x)),0));
}

export function avaliarCrescimento(eventos,agora,regras=REGRAS_EXPERIMENTAIS) {
  validarRegras(regras);diaNumero(agora);
  const lista=normalizarEventos(eventos);
  if(lista.some(e=>e.data>agora))throw Error('A data simulada não pode ficar antes dos registros existentes.');
  const atividades=lista.filter(e=>['estudo','tentativa','retomada'].includes(e.tipo));
  const dias=new Map();
  for(const e of atividades)dias.set(e.data,(dias.get(e.data)??0)+1);
  // Um encontro por dia tem valor cheio; repetições somam pouco, até um teto.
  const encontros=[...dias.values()].reduce((s,n)=>s+Math.min(1.25,1+(n-1)*.15),0);
  const datas=[...dias.keys()].sort(),primeira=datas[0]??null,ultima=datas.at(-1)??null;
  const intervalo=primeira?diaNumero(ultima)-diaNumero(primeira):0;
  const autonomias=[],datasRecuperacoes=[...new Set(atividades.filter(e=>e.tipo==='tentativa'&&e.resultado==='autonomo').map(e=>e.data))].sort();
  for(const data of datasRecuperacoes){
    if(!autonomias.length||diaNumero(data)-diaNumero(autonomias.at(-1))>=regras.intervaloAutonomias)autonomias.push(data);
  }
  // Usa todas as datas para o intervalo: inserir evidência antiga não pode reduzir a conquista.
  const intervaloRecuperacoes=datasRecuperacoes.length>1?diaNumero(datasRecuperacoes.at(-1))-diaNumero(datasRecuperacoes[0]):0;
  const medidas=e=>[
    {chave:'dias',rotulo:'Dias distintos de estudo',atual:datas.length,meta:e.dias},
    {chave:'intervalo',rotulo:'Intervalo entre encontros',atual:intervalo,meta:e.intervalo},
    {chave:'encontros',rotulo:'Encontros acumulados',atual:encontros,meta:e.encontros},
    {chave:'autonomias',rotulo:'Recuperações sem ajuda espaçadas',atual:autonomias.length,meta:e.autonomias},
    ...(e.intervaloRecuperacoes?[{chave:'intervaloRecuperacoes',rotulo:'Intervalo entre recuperações sem ajuda',atual:intervaloRecuperacoes,meta:e.intervaloRecuperacoes}]:[]),
  ].map(c=>({...c,concluido:c.atual>=c.meta}));
  const razoes=e=>medidas(e).map(c=>c.meta?c.atual/c.meta:1);
  const mede=e=>Math.min(...razoes(e));
  const parcial=e=>razoes(e).reduce((s,x)=>s+limitar(x,0,1),0)/razoes(e).length;
  const nomes=['broto','muda','jovem','adulta'],bases=[.04,.2,.45,.75],fins=[.199,.449,.749,1];
  let indice=atividades.length?0:-1;
  for(const [i,nome] of ['muda','jovem','adulta'].entries())if(atividades.length&&mede(regras[nome])>=1)indice=i+1;else break;
  const proximo=indice>=0&&indice<3?regras[nomes[indice+1]]:null;
  // O intervalo termina no último estudo, nunca no relógio atual: esperar não faz crescer.
  const fracao=indice<0?0:indice===3?limitar((encontros-regras.adulta.encontros)/30,0,1):parcial(proximo);
  const crescimento=indice<0?0:bases[indice]+(fins[indice]-bases[indice])*fracao;

  const pausas=pausasUnidas(lista);
  let perda=0,contato=null,ultimaRecuperacaoCopa=null;
  const avancar=(de,ate)=>de?Math.min(regras.senescenciaMaxima,perda+Math.max(0,diasAtivos(de,ate,pausas)-regras.toleranciaSemRegistro)/regras.diasParaCopaRala*regras.senescenciaMaxima):0;
  // Consolida por dia também na recuperação da copa; dez cliques no mesmo dia não a restauram dez vezes.
  for(const data of datas){
    perda=avancar(contato,data);
    if(regras.versao==='crescimento-estudo-0.1'){
      // Amostras anteriores mantêm as regras com que foram criadas.
      perda*=atividades.some(e=>e.data===data&&e.tipo==='retomada')?.35:.55;
    }else if(perda>0&&(!ultimaRecuperacaoCopa||diasAtivos(ultimaRecuperacaoCopa,data,pausas)>=regras.intervaloRecuperacaoCopa)){
      perda*=.65;ultimaRecuperacaoCopa=data;
    }
    contato=data;
  }
  perda=avancar(contato,agora);
  const semRegistro=ultima?diasAtivos(ultima,agora,pausas):0;
  const ultimaTentativa=atividades.filter(e=>e.tipo==='tentativa').at(-1)??null;
  const ultimoSinal=lista.filter(e=>e.tipo==='dificuldade'||e.tipo==='retomada'||e.tipo==='tentativa'&&e.resultado!=='nao_avaliado').at(-1);
  const ultimoAvaliativo=lista.filter(e=>e.tipo==='dificuldade'||e.tipo==='tentativa'&&e.resultado!=='nao_avaliado').at(-1);
  const dificuldadeAtiva=Boolean(ultimoAvaliativo&&(ultimoAvaliativo.tipo==='dificuldade'||['pista','apos_explicacao','nao_recuperou'].includes(ultimoAvaliativo.resultado)));
  return {
    versao:regras.versao,agora,indice,estagio:indice<0?'semente':nomes[indice],crescimento,
    diasDeEstudo:datas.length,atividades:atividades.length,intervaloEstudado:intervalo,encontros,autonomiasEspacadas:autonomias.length,intervaloRecuperacoes,
    primeiraAtividade:primeira,ultimaAtividade:ultima,ultimaTentativa:ultimaTentativa?.resultado??'nao_avaliado',dataUltimaTentativa:ultimaTentativa?.data??null,dificuldadeAtiva,retomadaEmAndamento:ultimoSinal?.tipo==='retomada'&&dificuldadeAtiva,
    senescencia:perda,vigorVisual:1-perda,diasSemAcompanhamento:semRegistro,
    acompanhamento:!ultima?'sem_registros':semRegistro>regras.toleranciaSemRegistro?'sem_acompanhamento':perda>.01?'em_retomada':'acompanhada',
    pausaAtiva:lista.some(e=>e.tipo==='pausa'&&e.data<=agora&&e.fim>agora),
    proximo:proximo?{estagio:nomes[indice+1],dias:Math.max(0,proximo.dias-datas.length),intervalo:Math.max(0,proximo.intervalo-intervalo),autonomias:Math.max(0,proximo.autonomias-autonomias.length),criterios:medidas(proximo)}:null,
  };
}
