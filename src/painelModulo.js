/** Caderno de aprendizado do módulo, dentro do jardim.
 * Versão compacta (cartão fixo para acompanhar enquanto navega) e caderno ampliado
 * com quatro abas: Panorama, Assuntos, Revisar e Histórico. Independente da cena 3D.
 * Padrão: seus registros, do zero, a partir de INICIO_CICLO. A demonstração fictícia só aparece
 * se escolhida. Os registros do site entram por window.jardimModulo. */
import { CATALOGO_PEDIATRIA } from './catalogoPediatria.js';
import { ESPECIES } from './especies.js';
import { resumirModulo, dimensoes, ESTAGIOS_PAINEL, RESULTADOS_PAINEL, EVIDENCIAS, NOME_EVIDENCIA } from './resumoModulo.js';
import { gerarExemploModulo, objetivosDeExemplo, MODULO_PEDIATRIA, FIM_EXEMPLO } from './exemploModulo.js';
import { diaNumero, somarDias } from './crescimentoEstudo.js';

const $ = (id) => document.getElementById(id);
// v2: a fonte padrão passou a ser os seus registros; a escolha antiga do exemplo não é herdada.
const CHAVE = 'jardim-caderno-modulo-v2';
/** Decisão do usuário em 21/10/2026: nada foi estudado ainda; só conta o que vier a partir daqui. */
const INICIO_CICLO = '2026-10-21';
// Estágio é ordinal: um verde só, do escuro (broto) ao claro (adulta); "semente" é o trilho neutro.
const COR_ESTAGIO = { semente: '#3a3f3e', broto: '#3f6e3c', muda: '#75a650', jovem: '#9cc364', adulta: '#c6dd84' };
const NOME_ESTAGIO = { semente: 'Não plantado', broto: 'Broto', muda: 'Muda', jovem: 'Jovem', adulta: 'Adulta' };
// Validado com o verificador de paletas (fundo #1a241f): separação para daltonismo ≥ 17.
const COR_RESULTADO = { autonomo: '#568a45', pista: '#9b80cc', apos_explicacao: '#d07a36', nao_recuperou: '#a8323a' };
const NOME_RESULTADO = { autonomo: 'Sem ajuda', pista: 'Com pista', apos_explicacao: 'Após explicação', nao_recuperou: 'Não recuperou' };
// Ajuda (lilás) × autonomia (verdes): separação ≥ 17 para daltonismo; "não avaliado" é vazado.
const COR_EVIDENCIA = { nao_avaliado: '#7c847e', com_ajuda: '#9b80cc', sem_ajuda: '#568a45', repetiu: '#c6dd84' };
const CURTO_EVIDENCIA = { nao_avaliado: 'Não avaliado', com_ajuda: 'Com ajuda', sem_ajuda: 'Sem ajuda', repetiu: 'Repetiu' };
const CALOR = ['#1e2a22', '#1e3b45', '#28566a', '#34748a', '#4f97a3', '#86c2bd'];
const ABAS = [['panorama', 'Panorama'], ['assuntos', 'Assuntos'], ['revisar', 'Revisar'], ['historico', 'Histórico']];
const GRUPOS_REVISAR = [
  ['dificuldade', 'Retomar objetivos que precisaram de ajuda'],
  ['confusao', 'Comparar assuntos que você confunde'],
  ['nao_avaliado', 'Testar o que ainda não foi avaliado'],
  ['repetir', 'Repetir a autonomia em outro encontro'],
  ['crescer', 'Árvores a um passo de crescer'],
];

const ler = () => { try { return JSON.parse(localStorage.getItem(CHAVE)) ?? {}; } catch { return {}; } };
const salvar = () => { try { localStorage.setItem(CHAVE, JSON.stringify({ fonte: estado.fonte, dia: estado.dia, aba: estado.aba, area: estado.area, fixado: estado.fixado, aberto: estado.fixado && estado.aberto, planejador: [...estado.planejador] })); } catch { /* sem armazenamento: funciona igual */ } };
const esc = (t) => String(t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const dataCurta = (d) => d ? d.split('-').reverse().slice(0, 2).join('/') : '—';
const dataLonga = (d) => d ? new Date(diaNumero(d) * 86400000).toLocaleDateString('pt-BR', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }) : '—';
const pct = (x) => x == null ? '—' : `${Math.round(x * 100)}%`;
const hojeLocal = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
const nomeEspecie = (id) => ESPECIES[id]?.nome ?? id;
const dica = (t) => `data-dica="${esc(t)}"`;
const normalizar = (t) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const ha = (d, agora) => { const n = Math.round(diaNumero(agora) - diaNumero(d)); return n === 0 ? 'hoje' : n === 1 ? 'ontem' : `há ${n} dias`; };

const salvo = ler();
const hoje = hojeLocal();
const estado = {
  fonte: salvo.fonte === 'exemplo' ? 'exemplo' : 'real',
  dia: /^\d{4}-\d{2}-\d{2}$/.test(salvo.dia ?? '') ? salvo.dia : (hoje >= MODULO_PEDIATRIA.inicio && hoje <= FIM_EXEMPLO ? hoje : '2026-12-05'),
  aba: ABAS.some(([id]) => id === salvo.aba) ? salvo.aba : 'panorama',
  area: typeof salvo.area === 'string' ? salvo.area : '',
  fixado: Boolean(salvo.fixado), aberto: Boolean(salvo.aberto), ampliado: false,
  planejador: new Set(Array.isArray(salvo.planejador) ? salvo.planejador : []),
  busca: '', filtro: 'todos', ordem: 'catalogo', vista: 'lista', selecionado: null, externo: null, maisRevisar: new Set(),
};
let exemplo = null, resumo = null, agendado = 0;

function dadosAtuais() {
  if (estado.externo) return estado.externo;
  // Ainda sem ligação com o organizador: seus registros começam vazios.
  if (estado.fonte === 'real') return { modulo: MODULO_PEDIATRIA, origem: 'real', inicioCiclo: INICIO_CICLO, agora: hoje < INICIO_CICLO ? INICIO_CICLO : hoje, objetivos: objetivosDeExemplo(CATALOGO_PEDIATRIA), registros: [], confusoes: [] };
  exemplo ??= gerarExemploModulo(CATALOGO_PEDIATRIA);
  return { ...exemplo, agora: estado.dia };
}
const assuntosDaArea = (r) => estado.area ? r.assuntos.filter(a => a.especie === estado.area) : r.assuntos;
const nomeArea = (r) => estado.area ? r.areas.find(a => a.especie === estado.area)?.area : 'todas as áreas';

// ---------- peças ----------
const chip = (e) => `<span class="chip" data-evidencia="${e}" style="--cor:${COR_EVIDENCIA[e]}">${CURTO_EVIDENCIA[e]}</span>`;
const pontos = (objs) => `<span class="pontos-obj">${objs.map(o => `<i data-evidencia="${o.estado}" style="--cor:${COR_EVIDENCIA[o.estado]}" ${dica(`${o.descricao}\n${NOME_EVIDENCIA[o.estado]}`)}></i>`).join('')}</span>`;
const legendaEvidencia = (por) => `<ul class="legenda">${EVIDENCIAS.map(e => `<li><i data-evidencia="${e}" style="--cor:${COR_EVIDENCIA[e]}"></i>${NOME_EVIDENCIA[e]}${por ? ` <b>${por[e]}</b>` : ''}</li>`).join('')}</ul>`;
function barraEvidencias(por, total) {
  if (!total) return '<div class="barra-vazia"></div>';
  let x = 0; const partes = [];
  for (const e of ['repetiu', 'sem_ajuda', 'com_ajuda', 'nao_avaliado']) {
    if (!por[e]) continue; const w = por[e] / total * 100;
    partes.push(`<rect x="${x}%" width="${w}%" height="12" fill="${e === 'nao_avaliado' ? 'transparent' : COR_EVIDENCIA[e]}" class="${e === 'nao_avaliado' ? 'vazado' : ''}" ${dica(`${NOME_EVIDENCIA[e]}: ${por[e]} de ${total} objetivos (${pct(por[e] / total)})`)}/>`);
    x += w;
  }
  return `<svg class="barra-segmentos" height="12" width="100%" role="img" aria-label="${EVIDENCIAS.map(e => `${NOME_EVIDENCIA[e]} ${por[e]}`).join(', ')}">${partes.join('')}</svg>`;
}
function barraEstagios(porEstagio, total) {
  let x = 0; const partes = [];
  for (const e of [...ESTAGIOS_PAINEL.slice(1).reverse(), 'semente']) {
    const n = porEstagio[e]; if (!n) continue; const w = n / total * 100;
    partes.push(`<rect x="${x}%" width="${w}%" height="12" fill="${COR_ESTAGIO[e]}" ${dica(`${NOME_ESTAGIO[e]}: ${n} de ${total}`)}/>`);
    x += w;
  }
  return `<svg class="barra-segmentos" height="12" width="100%" role="img" aria-label="Árvores por estágio">${partes.join('')}</svg><ul class="legenda">${ESTAGIOS_PAINEL.map(e => `<li><i style="--cor:${COR_ESTAGIO[e]}"></i>${NOME_ESTAGIO[e]} <b>${porEstagio[e]}</b></li>`).join('')}</ul>`;
}
// Resumo do assunto para o mapa: a lacuna mais urgente aparece primeiro.
function situacaoAssunto(a) {
  if (!a.estado) return 'nao_estudado';
  const e = a.objetivos.map(o => o.estado);
  if (e.includes('com_ajuda')) return 'com_ajuda';
  if (e.includes('nao_avaliado')) return 'nao_avaliado';
  return e.every(x => x === 'repetiu') ? 'repetiu' : 'sem_ajuda';
}
const NOME_SITUACAO = { nao_estudado: 'Ainda não estudado', com_ajuda: 'Algum objetivo precisa de ajuda', nao_avaliado: 'Algum objetivo ainda não avaliado', sem_ajuda: 'Todos os objetivos já saíram sem ajuda', repetiu: 'Autonomia repetida em todos os objetivos' };

// ---------- gráficos do histórico ----------
function graficoFloresta(r) {
  const W = 560, H = 170, m = { e: 30, d: 8, t: 10, b: 20 }, serie = r.serie;
  if (serie.length < 2) return '<p class="vazio">O gráfico aparece a partir do segundo dia com registro.</p>';
  const fimX = serie.at(-1).data > r.modulo.fim ? serie.at(-1).data : r.modulo.fim;
  const d0 = diaNumero(serie[0].data), span = diaNumero(fimX) - d0 || 1;
  const X = d => m.e + (diaNumero(d) - d0) / span * (W - m.e - m.d), Y = v => H - m.b - v / r.total * (H - m.t - m.b);
  const ordem = ['adulta', 'jovem', 'muda', 'broto'];
  let base = serie.map(() => 0); const camadas = [];
  for (const e of ordem) {
    const topo = serie.map((s, i) => base[i] + s.porEstagio[e]);
    const ida = serie.map((s, i) => `${X(s.data).toFixed(1)},${Y(topo[i]).toFixed(1)}`), volta = serie.map((s, i) => `${X(s.data).toFixed(1)},${Y(base[i]).toFixed(1)}`).reverse();
    camadas.push(`<polygon points="${ida.join(' ')} ${volta.join(' ')}" fill="${COR_ESTAGIO[e]}"/>`);
    base = topo;
  }
  const grade = [0, 0.5, 1].map(f => `<line x1="${m.e}" x2="${W - m.d}" y1="${Y(f * r.total)}" y2="${Y(f * r.total)}" class="grade"/><text x="${m.e - 4}" y="${Y(f * r.total) + 3}" class="eixo" text-anchor="end">${Math.round(f * r.total)}</text>`).join('');
  const ritmo = `<line x1="${X(r.modulo.inicio)}" y1="${Y(0)}" x2="${X(r.modulo.fim)}" y2="${Y(r.total)}" class="ritmo"/>`;
  const fimRodizio = `<line x1="${X(r.modulo.fim)}" x2="${X(r.modulo.fim)}" y1="${m.t}" y2="${H - m.b}" class="marca"/><text x="${X(r.modulo.fim) - 3}" y="${m.t + 8}" class="eixo" text-anchor="end">fim do rodízio</text>`;
  const ticks = [serie[0].data, fimX].map((d, i) => `<text x="${X(d)}" y="${H - 6}" class="eixo" text-anchor="${i ? 'end' : 'start'}">${dataCurta(d)}</text>`).join('');
  return `<div class="grafico" data-grafico="floresta" data-w="${W}" data-me="${m.e}" data-md="${m.d}"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Assuntos por estágio ao longo do tempo">${grade}${camadas.join('')}${ritmo}${fimRodizio}${ticks}<line class="cursor" y1="${m.t}" y2="${H - m.b}" x1="-10" x2="-10"/><rect class="alvo" x="${m.e}" y="0" width="${W - m.e - m.d}" height="${H - m.b}" fill="transparent"/></svg></div>
    <ul class="legenda">${ordem.slice().reverse().map(e => `<li><i style="--cor:${COR_ESTAGIO[e]}"></i>${NOME_ESTAGIO[e]}</li>`).join('')}<li><i class="tracejado"></i>Ritmo uniforme até ${dataCurta(r.modulo.fim)}</li></ul>`;
}
function ligarFloresta(raiz, r) {
  const g = raiz.querySelector('[data-grafico="floresta"]'); if (!g) return;
  const svg = g.querySelector('svg'), cursor = svg.querySelector('.cursor'), alvo = svg.querySelector('.alvo');
  const W = +g.dataset.w, m = { e: +g.dataset.me, d: +g.dataset.md }, serie = r.serie;
  const fimX = serie.at(-1).data > r.modulo.fim ? serie.at(-1).data : r.modulo.fim, d0 = diaNumero(serie[0].data), span = diaNumero(fimX) - d0 || 1;
  alvo.addEventListener('pointermove', (ev) => {
    const caixa = svg.getBoundingClientRect(), x = (ev.clientX - caixa.left) / caixa.width * W;
    const s = serie[Math.max(0, Math.min(serie.length - 1, Math.round((x - m.e) / (W - m.e - m.d) * span)))];
    const px = m.e + (diaNumero(s.data) - d0) / span * (W - m.e - m.d);
    cursor.setAttribute('x1', px); cursor.setAttribute('x2', px);
    const esperado = s.data < r.modulo.inicio ? 0 : Math.min(r.total, Math.round((diaNumero(s.data) - diaNumero(r.modulo.inicio) + 1) / (diaNumero(r.modulo.fim) - diaNumero(r.modulo.inicio) + 1) * r.total));
    mostrarDica(ev, `${dataLonga(s.data)}${s.pausa ? ' · pausa' : ''}\nPlantados: ${s.iniciados} de ${r.total}\n${['adulta', 'jovem', 'muda', 'broto'].map(e => `${NOME_ESTAGIO[e]}: ${s.porEstagio[e]}`).join(' · ')}\nRitmo uniforme: ${esperado}`);
  });
  alvo.addEventListener('pointerleave', () => { cursor.setAttribute('x1', -10); cursor.setAttribute('x2', -10); esconderDica(); });
}
function calendario(r) {
  const s0 = r.semanas[0]?.semana; if (!s0) return '';
  const porData = new Map(r.serie.map(s => [s.data, s]));
  const ultima = r.agora > r.modulo.fim ? r.agora : r.modulo.fim;
  const nSem = Math.floor((diaNumero(ultima) - diaNumero(s0)) / 7) + 1;
  const max = Math.max(1, ...r.serie.map(s => s.atividades));
  const lado = Math.max(6, Math.min(18, Math.floor(530 / nSem) - 3)), passo = lado + 3, W = 560, H = 7 * passo + 14;
  const celulas = [];
  for (let c = 0; c < nSem; c++) for (let l = 0; l < 7; l++) {
    const d = somarDias(s0, c * 7 + l), s = porData.get(d), futuro = d > r.agora;
    const nivel = !s || !s.atividades ? 0 : 1 + Math.min(4, Math.floor(s.atividades / max * 4.999));
    celulas.push(`<rect x="${26 + c * passo}" y="${l * passo}" width="${lado}" height="${lado}" rx="2" fill="${futuro ? 'transparent' : CALOR[nivel]}" class="${futuro ? 'futuro' : ''}${s?.pausa ? ' pausa' : ''}${d >= r.modulo.inicio && d <= r.modulo.fim ? ' rodizio' : ''}" ${dica(`${dataLonga(d)}${futuro ? ' · ainda não chegou' : s?.pausa ? ' · pausa' : ''}\n${s?.atividades ?? 0} registro(s) de estudo`)}/>`);
  }
  const rotulos = ['seg', '', 'qua', '', 'sex', '', 'dom'].map((t, l) => t ? `<text x="0" y="${l * passo + lado - 2}" class="eixo">${t}</text>` : '').join('');
  const meses = []; let ultimoMes = '';
  for (let c = 0; c < nSem; c++) { const d = somarDias(s0, c * 7); if (d.slice(5, 7) !== ultimoMes) { ultimoMes = d.slice(5, 7); meses.push(`<text x="${26 + c * passo}" y="${H - 2}" class="eixo">${new Date(diaNumero(d) * 86400000).toLocaleDateString('pt-BR', { month: 'short', timeZone: 'UTC' }).replace('.', '')}</text>`); } }
  return `<svg viewBox="0 0 ${W} ${H}" class="calendario" role="img" aria-label="Calendário de dias com estudo">${rotulos}${celulas.join('')}${meses.join('')}</svg>
    <ul class="legenda"><li>menos</li>${CALOR.map(c => `<li><i style="--cor:${c}"></i></li>`).join('')}<li>mais registros</li><li><i class="pausa-i"></i>pausa</li><li><i class="rodizio-i"></i>rodízio</li></ul>`;
}
function graficoTentativas(r) {
  const semanas = r.semanas.filter(s => s.semana <= r.agora);
  const totais = semanas.map(s => RESULTADOS_PAINEL.reduce((t, k) => t + s[k], 0));
  const max = Math.max(1, ...totais);
  if (!totais.some(Boolean)) return '<p class="vazio">Ainda não há tentativas de recuperação registradas.</p>';
  const W = 560, H = 150, m = { e: 28, d: 4, t: 6, b: 18 }, n = semanas.length, larg = (W - m.e - m.d) / n;
  const barras = semanas.map((s, i) => {
    let y = H - m.b; const partes = [];
    for (const k of RESULTADOS_PAINEL) {
      if (!s[k]) continue; const h = s[k] / max * (H - m.t - m.b);
      partes.push(`<rect x="${(m.e + i * larg + 1).toFixed(1)}" y="${(y - h + 1).toFixed(1)}" width="${Math.max(1, larg - 2).toFixed(1)}" height="${Math.max(0.5, h - 2).toFixed(1)}" fill="${COR_RESULTADO[k]}" rx="1"/>`);
      y -= h;
    }
    const tot = totais[i];
    return `<g ${dica(`Semana de ${dataCurta(s.semana)}\n${tot} tentativa(s)${tot ? ` · ${pct(s.autonomo / tot)} sem ajuda` : ''}\n${RESULTADOS_PAINEL.map(k => `${NOME_RESULTADO[k]}: ${s[k]}`).join(' · ')}`)}>${partes.join('')}<rect x="${m.e + i * larg}" y="${m.t}" width="${larg}" height="${H - m.t - m.b}" fill="transparent"/></g>`;
  }).join('');
  const grade = [0, 0.5, 1].map(f => `<line x1="${m.e}" x2="${W - m.d}" y1="${H - m.b - f * (H - m.t - m.b)}" y2="${H - m.b - f * (H - m.t - m.b)}" class="grade"/><text x="${m.e - 4}" y="${H - m.b - f * (H - m.t - m.b) + 3}" class="eixo" text-anchor="end">${Math.round(f * max)}</text>`).join('');
  const ticks = [0, n - 1].map(i => `<text x="${m.e + i * larg + (i ? larg : 0)}" y="${H - 5}" class="eixo" text-anchor="${i ? 'end' : 'start'}">${dataCurta(semanas[i].semana)}</text>`).join('');
  const tabela = `<details class="tabela"><summary>Ver em tabela</summary><table><thead><tr><th>Semana</th>${RESULTADOS_PAINEL.map(k => `<th>${NOME_RESULTADO[k]}</th>`).join('')}<th>Sem ajuda</th></tr></thead><tbody>${semanas.map((s, i) => `<tr><td>${dataCurta(s.semana)}</td>${RESULTADOS_PAINEL.map(k => `<td>${s[k]}</td>`).join('')}<td>${totais[i] ? pct(s.autonomo / totais[i]) : '—'}</td></tr>`).join('')}</tbody></table></details>`;
  return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Tentativas de recuperação por semana e resultado">${grade}${barras}${ticks}</svg>
    <ul class="legenda">${RESULTADOS_PAINEL.map(k => `<li><i style="--cor:${COR_RESULTADO[k]}"></i>${NOME_RESULTADO[k]}</li>`).join('')}</ul>${tabela}`;
}

// ---------- três dimensões ----------
function cartoesDimensoes(d, r) {
  const ex = d.exploracao, au = d.autonomia, ac = d.acompanhamento;
  const naoAval = au.por.nao_avaliado;
  // O alerta do pedido: muitas tentativas sobre poucos objetivos podem esconder lacunas.
  const cobertura = au.tentativas
    ? `Nos últimos 14 dias, <b>${pct(au.taxaTentativas)}</b> das ${au.tentativas} tentativas saíram sem ajuda, mas elas avaliaram só <b>${au.objetivosNasTentativas}</b> dos ${au.objetivos} objetivos estudados.`
    : 'Nenhuma tentativa nos últimos 14 dias.';
  const rec = ac.recente;
  return `<div class="dimensoes">
    <section class="dimensao"><p class="dim-t">Exploração</p><p class="dim-v">${ex.assuntos}<small> de ${ex.total} assuntos</small></p>
      <p class="dim-s">${ex.objetivos} de ${ex.objetivosTotal} objetivos já receberam estudo.</p>
      <div class="trilho-fino"><div style="width:${ex.total ? ex.assuntos / ex.total * 100 : 0}%"></div></div>
      <p class="dim-o">O que já foi estudado, sem dizer se foi aprendido.</p></section>
    <section class="dimensao"><p class="dim-t">Autonomia demonstrada</p><p class="dim-v">${au.comAutonomia}<small> de ${au.objetivos} objetivos</small></p>
      <p class="dim-s">recuperados sem ajuda pelo menos uma vez; <b>${au.por.repetiu}</b> com repetição em encontros separados.</p>
      ${barraEvidencias(au.por, au.objetivos)}
      <p class="dim-o">${cobertura}${naoAval ? ` <b>${naoAval}</b> objetivos estudados nunca foram avaliados.` : ''}</p></section>
    <section class="dimensao"><p class="dim-t">Acompanhamento</p><p class="dim-v">${ac.retornos14}<small> retornos em 14 dias</small></p>
      <p class="dim-s">assuntos que você voltou a estudar recentemente${ac.semRetorno ? `; <b>${ac.semRetorno}</b> sem retorno há mais de 45 dias` : ''}.</p>
      <p class="dim-o">${rec ? `Evidência mais recente: <b>${esc(rec.objetivo.descricao)}</b> em ${esc(rec.assunto.nome)} — ${esc(NOME_RESULTADO[rec.r.resultado].toLowerCase())}, ${ha(rec.r.data, r.agora)}.` : 'Ainda sem evidência registrada.'}</p></section>
  </div>`;
}

// ---------- abas ----------
function abaPanorama(r) {
  const lista = assuntosDaArea(r), d = estado.area ? dimensoes(lista, r.agora) : r.dimensoes;
  const daArea = (x) => !estado.area || x.assunto.especie === estado.area;
  const foco = r.revisar.filter(s => s.tipo === 'dificuldade' && daArea(s)).slice(0, 3);
  const mudancas = r.mudancas.filter(daArea);
  const porEstagio = Object.fromEntries(ESTAGIOS_PAINEL.map(e => [e, lista.filter(a => a.estagio === e).length]));
  const rt = r.ritmo;
  const ciclo = r.origem === 'exemplo' ? '' : `<p class="rodizio-linha">Caderno zerado em ${dataLonga(INICIO_CICLO)}: só entra o que for estudado a partir dessa data. ${r.iniciados ? '' : 'Nenhum assunto estudado ainda.'}</p>`;
  const rodizio = `${ciclo}<p class="rodizio-linha">${rt.antes ? `O rodízio começa em ${dataCurta(r.modulo.inicio)}. O mapa começa do zero: cada assunto planta sua árvore quando for estudado.` : rt.emAndamento ? `Rodízio: dia ${rt.decorridos} de ${rt.duracao} (${pct(rt.decorridos / rt.duracao)} do tempo) · ${r.iniciados} de ${r.total} assuntos plantados.` : `Rodízio encerrado em ${dataCurta(r.modulo.fim)} com ${r.iniciados} de ${r.total} assuntos plantados; as revisões continuam.`}</p>`;
  const tabelaAreas = estado.area ? '' : `<h3>Por área</h3><div class="rolagem-x"><table class="tabela-areas"><thead><tr><th>Área</th><th>Exploração</th><th>Autonomia</th><th>Com ajuda</th><th>Não avaliados</th><th>Último contato</th></tr></thead><tbody>${r.areas.map(a => {
    const da = dimensoes(a.assuntos, r.agora);
    return `<tr data-area="${a.especie}" tabindex="0"><td>${esc(a.area)}<small>${esc(nomeEspecie(a.especie))}</small></td><td>${da.exploracao.assuntos}/${da.exploracao.total}</td><td>${da.autonomia.comAutonomia}/${da.autonomia.objetivos}</td><td>${da.autonomia.por.com_ajuda || '—'}</td><td>${da.autonomia.por.nao_avaliado || '—'}</td><td>${a.ultima ? dataCurta(a.ultima) : '—'}</td></tr>`;
  }).join('')}</tbody></table></div><p class="dica-painel">Autonomia: objetivos recuperados sem ajuda / objetivos estudados. Clique numa área para ver o panorama dela.</p>`;
  return `${seletorArea(r)}${rodizio}${cartoesDimensoes(d, r)}
    <div class="duas-colunas">
      <section><h3>Dificuldades em foco</h3>${foco.length ? `<ul class="cartoes">${foco.map(cartaoSugestao).join('')}</ul>` : '<p class="vazio">Nenhum objetivo precisando de ajuda agora.</p>'}</section>
      <section><h3>Mudanças com significado <span class="contagem">14 dias</span></h3>${listaMudancas(mudancas, 6)}</section>
    </div>
    ${tabelaAreas}
    <h3>Trajetória da floresta ${estado.area ? `· ${esc(nomeArea(r))}` : ''}</h3>${barraEstagios(porEstagio, lista.length)}
    <p class="nota">O tamanho da árvore mostra a trajetória de estudo e retorno. Uma árvore adulta continua adulta mesmo com uma dificuldade pendente: o estado de cada objetivo fica na ficha do assunto.</p>`;
}
function listaMudancas(mudancas, limite) {
  if (!mudancas.length) return '<p class="vazio">Sem mudanças nos últimos 14 dias.</p>';
  const item = m => `<li data-tom="${m.tom}"><button type="button" class="link-ficha" data-assunto="${m.assunto.id}"><span class="li-nome">${esc(m.texto)}</span><span class="li-meta">${m.objetivo ? `${esc(m.objetivo.descricao)} · ` : ''}${esc(m.assunto.nome)} · ${dataCurta(m.data)}</span></button></li>`;
  return `<ul class="mudancas">${mudancas.slice(0, limite).map(item).join('')}</ul>${mudancas.length > limite ? `<details class="mais"><summary>Mais ${mudancas.length - limite}</summary><ul class="mudancas">${mudancas.slice(limite).map(item).join('')}</ul></details>` : ''}`;
}
function seletorArea(r) {
  return `<div class="linha-ctl"><label for="caderno-area">Área</label><select id="caderno-area"><option value="">Todas as áreas</option>${r.areas.map(a => `<option value="${a.especie}"${a.especie === estado.area ? ' selected' : ''}>${esc(a.area)}</option>`).join('')}</select></div>`;
}

function filtrarAssuntos(r) {
  const termo = normalizar(estado.busca.trim());
  let lista = assuntosDaArea(r).filter(a => !termo || normalizar(`${a.nome} ${a.grupoNome} ${a.area}`).includes(termo) || a.objetivos.some(o => normalizar(o.descricao).includes(termo)));
  const f = estado.filtro;
  if (f === 'estudados') lista = lista.filter(a => a.estado);
  if (f === 'nao_estudados') lista = lista.filter(a => !a.estado);
  if (f === 'com_ajuda') lista = lista.filter(a => a.objetivos.some(o => o.estado === 'com_ajuda'));
  if (f === 'nao_avaliado') lista = lista.filter(a => a.estado && a.objetivos.some(o => o.estado === 'nao_avaliado'));
  if (f === 'autonomia') lista = lista.filter(a => a.estado && a.objetivos.every(o => ['sem_ajuda', 'repetiu'].includes(o.estado)));
  const lacunas = a => a.objetivos.filter(o => o.estado === 'com_ajuda').length * 2 + a.objetivos.filter(o => o.estado === 'nao_avaliado').length;
  if (estado.ordem === 'recente') lista = [...lista].sort((x, y) => (y.estado?.ultimaAtividade ?? '').localeCompare(x.estado?.ultimaAtividade ?? ''));
  if (estado.ordem === 'lacunas') lista = [...lista].sort((x, y) => Boolean(y.estado) - Boolean(x.estado) || lacunas(y) - lacunas(x));
  return lista;
}
function abaAssuntos(r) {
  const lista = filtrarAssuntos(r);
  const controles = `<div class="filtros">
    <input id="caderno-busca" type="search" placeholder="Buscar assunto, grupo ou objetivo" value="${esc(estado.busca)}" aria-label="Buscar assunto">
    ${seletorArea(r)}
    <div class="linha-ctl"><label for="caderno-filtro">Mostrar</label><select id="caderno-filtro">${[['todos', 'Todos'], ['estudados', 'Estudados'], ['com_ajuda', 'Com objetivo que precisa de ajuda'], ['nao_avaliado', 'Com objetivo não avaliado'], ['autonomia', 'Todos os objetivos sem ajuda'], ['nao_estudados', 'Ainda não estudados']].map(([v, t]) => `<option value="${v}"${v === estado.filtro ? ' selected' : ''}>${t}</option>`).join('')}</select></div>
    <div class="linha-ctl"><label for="caderno-ordem">Ordenar</label><select id="caderno-ordem">${[['catalogo', 'Catálogo'], ['recente', 'Contato mais recente'], ['lacunas', 'Mais lacunas']].map(([v, t]) => `<option value="${v}"${v === estado.ordem ? ' selected' : ''}>${t}</option>`).join('')}</select></div>
    <div class="grupo" role="group" aria-label="Forma de ver"><button type="button" data-vista="lista" aria-pressed="${estado.vista === 'lista'}">Lista</button><button type="button" data-vista="mapa" aria-pressed="${estado.vista === 'mapa'}">Mapa por áreas</button></div>
  </div>`;
  const corpo = estado.vista === 'mapa' ? mapaAreas(r, lista) : `<p class="contagem-lista">${lista.length} assunto(s)</p><ul class="lista-assuntos">${lista.map(a => `<li><button type="button" class="link-ficha${a.id === estado.selecionado ? ' ativo' : ''}" data-assunto="${a.id}">
      <span class="la-nome">${esc(a.nome)}</span>
      <span class="la-meta">${esc(a.area)} · ${esc(a.grupoNome)}</span>
      <span class="la-linha">${pontos(a.objetivos)}<span class="estagio" style="--cor:${COR_ESTAGIO[a.estagio]}">${NOME_ESTAGIO[a.estagio]}</span><span class="la-data">${a.estado ? ha(a.estado.ultimaAtividade, r.agora) : 'não estudado'}</span></span>
    </button></li>`).join('')}</ul>`;
  const selecionado = r.assuntos.find(a => a.id === estado.selecionado);
  return `${controles}<div class="assuntos-layout"><div class="assuntos-lista">${estado.vista === 'lista' ? legendaEvidencia() : ''}${corpo}</div><div class="assuntos-ficha" id="caderno-ficha">${selecionado ? ficha(selecionado, r) : '<p class="vazio">Escolha um assunto na lista ou no mapa para abrir a ficha com os objetivos.</p>'}</div></div>`;
}
function mapaAreas(r, filtrados) {
  const visiveis = new Set(filtrados.map(a => a.id));
  const areas = estado.area ? r.areas.filter(a => a.especie === estado.area) : r.areas;
  const cores = { nao_estudado: 'transparent', com_ajuda: COR_EVIDENCIA.com_ajuda, nao_avaliado: '#4f6447', sem_ajuda: COR_EVIDENCIA.sem_ajuda, repetiu: COR_EVIDENCIA.repetiu };
  return `<ul class="legenda">${Object.keys(NOME_SITUACAO).map(s => `<li><i class="sit-${s}" style="--cor:${cores[s]}"></i>${NOME_SITUACAO[s]}</li>`).join('')}</ul>
    ${areas.map(area => `<section class="mapa-area"><h4>${esc(area.area)} <small>${esc(nomeEspecie(area.especie))} · ${area.iniciados}/${area.total}</small></h4>${area.grupos.map(g => `<div class="mapa-grupo"><span>${esc(g.nome)}</span><div>${g.assuntos.map(a => { const s = situacaoAssunto(a); return `<button type="button" class="quadro link-ficha sit-${s}${visiveis.has(a.id) ? '' : ' apagado'}${a.id === estado.selecionado ? ' ativo' : ''}" style="--cor:${cores[s]}" data-assunto="${a.id}" aria-label="${esc(a.nome)}: ${NOME_SITUACAO[s]}" ${dica(`${a.nome}\n${NOME_SITUACAO[s]}${a.estado ? `\nÁrvore: ${NOME_ESTAGIO[a.estagio]}` : ''}`)}></button>`; }).join('')}</div></div>`).join('')}</section>`).join('')}`;
}
function ficha(a, r) {
  const e = a.estado;
  const objetivos = a.objetivos.map(o => `<tr>
      <td>${esc(o.descricao)}</td>
      <td><details class="motivo"><summary>${chip(o.estado)}</summary><p>${esc(o.motivo)}</p></details></td>
      <td>${o.ultimoContato ? dataCurta(o.ultimoContato) : '—'}</td>
      <td>${o.encontros || '—'}</td>
      <td>${o.fonte ? (o.fonte === 'observado' ? 'Observado na atividade' : 'Informado por você') : '—'}</td>
    </tr>`).join('');
  const percepcoes = a.objetivos.filter(o => o.percepcao).sort((x, y) => y.percepcao.data.localeCompare(x.percepcao.data));
  const percepcao = percepcoes.length ? `<p>Sua segurança declarada: <b>${percepcoes[0].percepcao.confianca}/5</b> em ${dataCurta(percepcoes[0].percepcao.data)} (${esc(percepcoes[0].descricao)}).</p><p class="dica-painel">Fica separada do resultado: sentir-se seguro não conta como recuperação, nem insegurança desfaz uma conquista.</p>` : '<p class="vazio">Você ainda não registrou sua percepção para este assunto.</p>';
  const sugestoes = r.revisar.filter(s => s.assunto.id === a.id || s.par?.id === a.id);
  const confusoes = r.confusoes.filter(c => c.a.id === a.id || c.b.id === a.id);
  const eventos = a.registros.filter(x => x.tipo !== 'pausa').slice().reverse();
  const nomeObj = new Map(a.objetivos.map(o => [o.id, o.descricao]));
  return `<header class="ficha-topo"><p class="ficha-area">${esc(a.area)} · ${esc(a.grupoNome)}</p><h3>${esc(a.nome)}</h3>
      <p class="ficha-arvore"><span class="estagio" style="--cor:${COR_ESTAGIO[a.estagio]}">${NOME_ESTAGIO[a.estagio]}</span> ${e ? `${esc(nomeEspecie(a.especie))} · ${e.diasDeEstudo} dia(s) de estudo, de ${dataCurta(e.primeiraAtividade)} a ${dataCurta(e.ultimaAtividade)}` : 'Ainda não estudado: a árvore nasce no primeiro estudo.'}</p>
      <p class="ficha-acoes">${e ? `<button type="button" data-localizar="${a.id}">Localizar no jardim</button>` : `<button type="button" disabled title="O lugar fica guardado em segredo até a árvore nascer">Localizar no jardim</button> <span class="dica-painel">Ainda é semente: o lugar é surpresa até o primeiro estudo.</span>`}</p></header>
    <h4>Objetivos</h4>
    ${a.objetivos.length ? `<div class="rolagem-x"><table class="tabela-objetivos"><thead><tr><th>Objetivo</th><th>Evidência</th><th>Último</th><th>Encontros</th><th>Origem</th></tr></thead><tbody>${objetivos}</tbody></table></div><p class="dica-painel">Clique na evidência para ver o motivo. ${r.origem !== 'site' ? 'Objetivos genéricos de exemplo; no site, cada tópico usa os objetivos cadastrados.' : ''}</p>` : '<p class="vazio">Nenhum objetivo cadastrado para este assunto.</p>'}
    <h4>Sua percepção</h4>${percepcao}
    ${sugestoes.length ? `<h4>Sugestões</h4><ul class="cartoes">${sugestoes.slice(0, 3).map(cartaoSugestao).join('')}</ul>` : ''}
    ${confusoes.length ? `<h4>Confusões</h4><ul class="lista">${confusoes.map(c => `<li><span class="li-nome">${esc(c.a.id === a.id ? c.b.nome : c.a.nome)}</span><span class="li-meta">${c.vezes}× · última ${dataCurta(c.ultima)}</span></li>`).join('')}</ul>` : ''}
    <h4>Histórico do assunto</h4>${eventos.length ? `<ol class="eventos">${eventos.slice(0, 12).map(x => linhaEvento(x, nomeObj)).join('')}</ol>${eventos.length > 12 ? `<details class="mais"><summary>Mais ${eventos.length - 12}</summary><ol class="eventos">${eventos.slice(12).map(x => linhaEvento(x, nomeObj)).join('')}</ol></details>` : ''}` : '<p class="vazio">Sem registros.</p>'}`;
}
function linhaEvento(x, nomeObj) {
  const tipo = { estudo: 'Estudo', retomada: 'Retomada', dificuldade: 'Dificuldade registrada', tentativa: 'Tentativa' }[x.tipo] ?? x.tipo;
  const resultado = x.tipo === 'tentativa' && x.resultado !== 'nao_avaliado' ? ` · <span class="res" style="--cor:${COR_RESULTADO[x.resultado]}">${NOME_RESULTADO[x.resultado]}</span>` : '';
  return `<li><time>${dataCurta(x.data)}</time><span>${tipo}${x.atividade ? ` (${esc(x.atividade)})` : ''}${resultado}${x.objetivo ? `<small>${esc(nomeObj.get(x.objetivo) ?? '')}</small>` : ''}${x.evidencia && x.resultado !== 'autonomo' ? `<small>${esc(x.evidencia)}</small>` : ''}</span></li>`;
}

const chaveSugestao = (s) => `${s.tipo}|${s.assunto.id}|${s.objetivo?.id ?? s.par?.id ?? ''}`;
function cartaoSugestao(s) {
  const chave = chaveSugestao(s), no = estado.planejador.has(chave);
  const titulo = s.tipo === 'confusao' ? `${esc(s.assunto.nome)} × ${esc(s.par.nome)}` : s.objetivo ? `${esc(s.objetivo.descricao)}` : esc(s.assunto.nome);
  const sub = s.tipo === 'confusao' ? '' : s.objetivo ? esc(s.assunto.nome) : esc(s.assunto.area);
  return `<li class="sugestao" data-tipo="${s.tipo}"><p class="sg-titulo">${titulo}</p>${sub ? `<p class="sg-sub">${sub}</p>` : ''}
    <p><b>Por quê:</b> ${esc(s.porque)}</p><p><b>Próximo passo:</b> ${esc(s.passo)}</p>
    <div class="sg-acoes"><button type="button" class="link-ficha" data-assunto="${s.assunto.id}">Ver ficha</button><button type="button" data-planejar="${esc(chave)}" aria-pressed="${no}">${no ? '✓ Na sua seleção' : 'Levar ao planejador'}</button></div></li>`;
}
function abaRevisar(r) {
  const daArea = (s) => !estado.area || s.assunto.especie === estado.area;
  const todas = r.revisar.filter(daArea);
  const escolhidas = r.revisar.filter(s => estado.planejador.has(chaveSugestao(s)));
  const grupos = GRUPOS_REVISAR.map(([tipo, titulo]) => {
    const itens = todas.filter(s => s.tipo === tipo); if (!itens.length) return '';
    const limite = estado.maisRevisar.has(tipo) ? itens.length : 4;
    return `<section class="grupo-revisar"><h3>${titulo} <span class="contagem">${itens.length}</span></h3><ul class="cartoes">${itens.slice(0, limite).map(cartaoSugestao).join('')}</ul>${itens.length > limite ? `<button type="button" class="mais-revisar" data-mais="${tipo}">Mostrar mais ${itens.length - limite}</button>` : ''}</section>`;
  }).join('');
  return `${seletorArea(r)}
    <p class="nota">Cada sugestão vem da evidência registrada e diz por que apareceu. Nada é agendado sozinho: você escolhe o que levar ao planejador.</p>
    <section class="selecao"><h3>Sua seleção para o planejador <span class="contagem">${escolhidas.length}</span></h3>${escolhidas.length ? `<ul class="lista">${escolhidas.map(s => `<li><span class="li-nome">${esc(s.objetivo?.descricao ?? s.assunto.nome)}</span><span class="li-meta">${esc(s.assunto.nome)}</span></li>`).join('')}</ul><p class="dica-painel">Prévia: a seleção fica só neste navegador; o planejador do site ainda não a recebe.</p>` : '<p class="vazio">Nada selecionado ainda.</p>'}</section>
    ${grupos || '<p class="vazio">Nenhuma sugestão agora.</p>'}`;
}
function abaHistorico(r) {
  const sessoes = r.sessoes;
  const linha = s => {
    const tot = RESULTADOS_PAINEL.reduce((t, k) => t + s.tentativas[k], 0);
    return `<li><details><summary><time>${dataCurta(s.data)}</time><span>${s.assuntos.size} assunto(s)${s.novos ? ` · ${s.novos} novo(s)` : ''}${tot ? ` · ${tot} tentativa(s)` : ''}</span><span class="mini-res">${RESULTADOS_PAINEL.map(k => s.tentativas[k] ? `<i style="--cor:${COR_RESULTADO[k]}" ${dica(`${NOME_RESULTADO[k]}: ${s.tentativas[k]}`)}>${s.tentativas[k]}</i>` : '').join('')}</span></summary>
      <ul class="lista">${[...s.assuntos].map(id => r.assuntos.find(a => a.id === id)).map(a => `<li><button type="button" class="link-ficha" data-assunto="${a.id}"><span class="li-nome">${esc(a.nome)}</span><span class="li-meta">${s.registros.filter(x => x.assunto === a.id).map(x => x.tipo === 'tentativa' ? NOME_RESULTADO[x.resultado] ?? 'tentativa' : x.tipo).join(' · ')}</span></button></li>`).join('')}</ul></details></li>`;
  };
  return `<div class="duas-colunas">
      <section><h3>Evolução da floresta</h3>${graficoFloresta(r)}</section>
      <section><h3>Tentativas por semana</h3>${graficoTentativas(r)}</section>
    </div>
    <h3>Dias de estudo</h3>${calendario(r)}
    <div class="duas-colunas">
      <section><h3>Sessões <span class="contagem">${sessoes.length}</span></h3>${sessoes.length ? `<ol class="sessoes">${sessoes.slice(0, 15).map(linha).join('')}</ol>${sessoes.length > 15 ? `<details class="mais"><summary>Mais ${sessoes.length - 15} dias</summary><ol class="sessoes">${sessoes.slice(15).map(linha).join('')}</ol></details>` : ''}` : '<p class="vazio">Nenhuma sessão registrada.</p>'}</section>
      <section><h3>Marcos</h3>${r.marcos.length ? `<ol class="marcos">${r.marcos.map(m => `<li><time>${dataCurta(m.data)}</time>${esc(m.texto)}</li>`).join('')}</ol>` : '<p class="vazio">Nenhum marco ainda.</p>'}</section>
    </div>`;
}

// ---------- cartão compacto ----------
function desenharCompacto(r) {
  const d = r.dimensoes, foco = r.revisar.find(s => s.tipo === 'dificuldade');
  if (!r.iniciados) {
    $('compacto-corpo').innerHTML = `<p class="compacto-zero">Nenhum assunto estudado ainda: os ${r.total} assuntos estão em semente.</p><p class="dica-painel">Cada assunto entra no caderno, e planta sua árvore, quando for estudado pela primeira vez${r.origem === 'exemplo' ? '' : ` a partir de ${dataCurta(INICIO_CICLO)}`}.</p>`;
    $('abrir-modulo').querySelector('small').textContent = `0/${r.total}`;
    return;
  }
  $('compacto-corpo').innerHTML = `
    <dl class="compacto-dims">
      <div><dt>Exploração</dt><dd>${d.exploracao.assuntos}<small>/${d.exploracao.total} assuntos</small></dd></div>
      <div><dt>Autonomia</dt><dd>${d.autonomia.comAutonomia}<small>/${d.autonomia.objetivos} objetivos</small></dd></div>
      <div><dt>Retornos</dt><dd>${d.acompanhamento.retornos14}<small> em 14 dias</small></dd></div>
    </dl>
    ${d.autonomia.objetivos ? barraEvidencias(d.autonomia.por, d.autonomia.objetivos) : ''}
    ${d.autonomia.por.nao_avaliado ? `<p class="compacto-alerta">${d.autonomia.por.nao_avaliado} objetivos estudados ainda sem avaliação.</p>` : ''}
    <div class="compacto-foco"><p class="dim-t">Dificuldade em foco</p>${foco ? `<button type="button" class="link-ficha" data-assunto="${foco.assunto.id}"><span class="li-nome">${esc(foco.objetivo.descricao)}</span><span class="li-meta">${esc(foco.assunto.nome)}</span><span class="li-meta">${esc(foco.passo)}</span></button>` : '<p class="vazio">Nenhuma agora.</p>'}</div>`;
  $('abrir-modulo').querySelector('small').textContent = `${r.iniciados}/${r.total}`;
}

// ---------- montagem ----------
function desenhar() {
  agendado = 0;
  resumo = resumirModulo(dadosAtuais(), CATALOGO_PEDIATRIA);
  const r = resumo;
  const origem = { exemplo: 'demonstração fictícia', real: `seus registros · desde ${dataCurta(INICIO_CICLO)}`, site: `registros do site · desde ${dataCurta(INICIO_CICLO)}` }[r.origem] ?? r.origem;
  for (const id of ['compacto-origem', 'caderno-origem']) { $(id).textContent = origem; $(id).dataset.origem = r.origem; }
  $('compacto-dia').textContent = r.origem === 'exemplo' ? `dia simulado: ${dataLonga(r.agora)}` : '';
  $('caderno-dia-saida').textContent = dataLonga(r.agora);
  $('caderno-simulacao').hidden = r.origem !== 'exemplo';
  $('caderno-fonte').hidden = r.origem === 'site';
  desenharCompacto(r);
  // O mapa acompanha a fonte do caderno: cada árvore de estudo recebe o porte do seu assunto.
  document.dispatchEvent(new CustomEvent('jardim:estudo', { detail: portesDasArvores() }));
  if (estado.ampliado) desenharCaderno();
}
function desenharCaderno() {
  const r = resumo, corpo = $('caderno-corpo');
  corpo.innerHTML = { panorama: abaPanorama, assuntos: abaAssuntos, revisar: abaRevisar, historico: abaHistorico }[estado.aba](r);
  ligarFloresta(corpo, r);
  for (const b of document.querySelectorAll('#caderno-abas [role="tab"]')) { const ativo = b.dataset.aba === estado.aba; b.setAttribute('aria-selected', String(ativo)); b.tabIndex = ativo ? 0 : -1; }
}
const pedirDesenho = () => { if (!agendado) agendado = requestAnimationFrame(desenhar); };

const balao = () => $('modulo-dica');
function mostrarDica(ev, texto) {
  const b = balao(); b.textContent = texto; b.hidden = false;
  const w = b.offsetWidth, h = b.offsetHeight;
  b.style.left = `${Math.max(8, Math.min(innerWidth - w - 8, ev.clientX + 14))}px`;
  b.style.top = `${ev.clientY + h + 18 > innerHeight ? ev.clientY - h - 10 : ev.clientY + 16}px`;
}
const esconderDica = () => { balao().hidden = true; };

function abrirCompacto(aberto) {
  estado.aberto = aberto;
  $('caderno-compacto').hidden = !aberto;
  $('abrir-modulo').setAttribute('aria-expanded', String(aberto));
  if (!aberto) esconderDica();
  salvar();
}
function ampliar(ampliado, { aba, assunto } = {}) {
  estado.ampliado = ampliado;
  if (aba) estado.aba = aba;
  if (assunto) { estado.selecionado = assunto; estado.aba = 'assuntos'; }
  $('caderno').hidden = !ampliado;
  esconderDica();
  if (ampliado) { desenharCaderno(); $('caderno').querySelector('[aria-selected="true"]')?.focus(); if (assunto) $('caderno-ficha')?.scrollIntoView({ block: 'nearest' }); }
  else $('abrir-caderno').focus();
  salvar();
}
/** Assunto → crescimento 0..1 do motor; assuntos ainda em semente ficam de fora (sem árvore). */
const portesDasArvores = () => new Map((resumo?.assuntos ?? []).filter(a => a.estado).map(a => [a.id, a.estado.crescimento]));

function abrirFicha(id) {
  if (!estado.ampliado) return ampliar(true, { assunto: id });
  estado.selecionado = id;
  if (estado.aba !== 'assuntos') { estado.aba = 'assuntos'; desenharCaderno(); }
  else {
    $('caderno-ficha').innerHTML = ficha(resumo.assuntos.find(a => a.id === id), resumo);
    for (const b of document.querySelectorAll('#caderno-corpo .link-ficha.ativo')) b.classList.remove('ativo');
    for (const b of document.querySelectorAll(`#caderno-corpo .assuntos-lista [data-assunto="${CSS.escape(id)}"]`)) b.classList.add('ativo');
  }
  $('caderno-ficha')?.scrollTo?.(0, 0);
  if (matchMedia('(max-width: 900px)').matches) $('caderno-ficha')?.scrollIntoView({ block: 'start' });
}

function iniciarPainel() {
  const inicio = diaNumero(MODULO_PEDIATRIA.inicio), dia = $('caderno-dia');
  dia.min = 0; dia.max = diaNumero(FIM_EXEMPLO) - inicio;
  dia.value = Math.max(0, Math.min(+dia.max, diaNumero(estado.dia) - inicio));
  estado.dia = somarDias(MODULO_PEDIATRIA.inicio, +dia.value);
  $('caderno-fonte').value = estado.fonte;
  $('caderno-abas').innerHTML = ABAS.map(([id, t]) => `<button type="button" role="tab" data-aba="${id}" aria-controls="caderno-corpo">${t}</button>`).join('');
  $('fixar-modulo').setAttribute('aria-pressed', String(estado.fixado));

  $('abrir-modulo').addEventListener('click', () => abrirCompacto(!estado.aberto));
  $('fechar-modulo').addEventListener('click', () => abrirCompacto(false));
  $('abrir-caderno').addEventListener('click', () => ampliar(true));
  $('fechar-caderno').addEventListener('click', () => ampliar(false));
  $('fixar-modulo').addEventListener('click', () => { estado.fixado = !estado.fixado; $('fixar-modulo').setAttribute('aria-pressed', String(estado.fixado)); salvar(); });
  $('caderno-fonte').addEventListener('change', (e) => { estado.fonte = e.target.value; estado.externo = null; salvar(); desenhar(); });
  dia.addEventListener('input', () => { estado.dia = somarDias(MODULO_PEDIATRIA.inicio, +dia.value); $('caderno-dia-saida').textContent = dataLonga(estado.dia); pedirDesenho(); });
  dia.addEventListener('change', salvar);
  for (const [botao, alvo] of [['caderno-ir-inicio', somarDias(MODULO_PEDIATRIA.inicio, 6)], ['caderno-ir-meio', '2026-12-05'], ['caderno-ir-fim', MODULO_PEDIATRIA.fim], ['caderno-ir-marco', FIM_EXEMPLO]]) {
    $(botao).addEventListener('click', () => { dia.value = diaNumero(alvo) - inicio; estado.dia = alvo; salvar(); desenhar(); });
  }
  $('caderno-abas').addEventListener('click', (e) => { const b = e.target.closest('[role="tab"]'); if (!b) return; estado.aba = b.dataset.aba; salvar(); desenharCaderno(); $('caderno-corpo').scrollTop = 0; });
  $('caderno-abas').addEventListener('keydown', (e) => {
    if (!['ArrowLeft', 'ArrowRight'].includes(e.key)) return;
    e.preventDefault();
    const i = ABAS.findIndex(([id]) => id === estado.aba), j = (i + (e.key === 'ArrowRight' ? 1 : ABAS.length - 1)) % ABAS.length;
    estado.aba = ABAS[j][0]; salvar(); desenharCaderno(); $('caderno-abas').querySelector(`[data-aba="${estado.aba}"]`).focus();
  });

  // Ações dentro do caderno e do cartão: um só ouvinte por superfície.
  const corpo = $('caderno-corpo');
  const aoClicar = (e) => {
    const ficha = e.target.closest('.link-ficha'); if (ficha) { abrirFicha(ficha.dataset.assunto); return; }
    // Fecha o caderno e deixa o mapa à vista; a cena (main.js) leva a câmera até a árvore.
    const localizar = e.target.closest('[data-localizar]');
    if (localizar) { ampliar(false); document.dispatchEvent(new CustomEvent('jardim:localizar', { detail: localizar.dataset.localizar })); return; }
    const plano = e.target.closest('[data-planejar]');
    if (plano) { const k = plano.dataset.planejar; estado.planejador.has(k) ? estado.planejador.delete(k) : estado.planejador.add(k); salvar(); const y = corpo.scrollTop; desenharCaderno(); corpo.scrollTop = y; return; }
    const mais = e.target.closest('[data-mais]'); if (mais) { estado.maisRevisar.add(mais.dataset.mais); const y = corpo.scrollTop; desenharCaderno(); corpo.scrollTop = y; return; }
    const vista = e.target.closest('[data-vista]'); if (vista) { estado.vista = vista.dataset.vista; desenharCaderno(); return; }
    const area = e.target.closest('tr[data-area]'); if (area) { estado.area = area.dataset.area; salvar(); desenharCaderno(); corpo.scrollTop = 0; }
  };
  corpo.addEventListener('click', aoClicar);
  $('compacto-corpo').addEventListener('click', aoClicar);
  corpo.addEventListener('keydown', (e) => { const area = e.target.closest('tr[data-area]'); if (area && e.key === 'Enter') { estado.area = area.dataset.area; salvar(); desenharCaderno(); } });
  corpo.addEventListener('change', (e) => {
    if (e.target.id === 'caderno-area') { estado.area = e.target.value; salvar(); desenharCaderno(); }
    if (e.target.id === 'caderno-filtro') { estado.filtro = e.target.value; desenharCaderno(); }
    if (e.target.id === 'caderno-ordem') { estado.ordem = e.target.value; desenharCaderno(); }
  });
  corpo.addEventListener('input', (e) => {
    if (e.target.id !== 'caderno-busca') return;
    estado.busca = e.target.value;
    const pos = e.target.selectionStart; desenharCaderno();
    const campo = $('caderno-busca'); campo.focus(); campo.setSelectionRange(pos, pos);
  });

  for (const superficie of [$('caderno-compacto'), $('caderno')]) {
    superficie.addEventListener('pointerover', (e) => { const alvo = e.target.closest('[data-dica]'); if (alvo) mostrarDica(e, alvo.dataset.dica); });
    superficie.addEventListener('pointermove', (e) => { const alvo = e.target.closest('[data-dica]'); if (alvo) mostrarDica(e, alvo.dataset.dica); });
    superficie.addEventListener('pointerout', (e) => { if (e.target.closest('[data-dica]') && !e.relatedTarget?.closest?.('[data-dica]')) esconderDica(); });
    // Teclas digitadas aqui não movem a câmera.
    superficie.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') { if (estado.ampliado) ampliar(false); else if (!estado.fixado) abrirCompacto(false); }
      e.stopPropagation();
    });
    superficie.addEventListener('keyup', (e) => e.stopPropagation());
  }
  addEventListener('keydown', (e) => { if (e.key === 'Escape' && estado.ampliado) ampliar(false); });
  addEventListener('resize', () => { if (estado.aberto || estado.ampliado) pedirDesenho(); });
  // O título quebra em duas linhas em telas estreitas: botão e cartão descem junto.
  const titulo = document.querySelector('.titulo'), botao = $('abrir-modulo'), compacto = $('caderno-compacto');
  const acomodar = () => {
    const base = titulo.getBoundingClientRect().bottom + 6;
    botao.style.top = `${base}px`; compacto.style.top = `${base + botao.offsetHeight + 6}px`;
  };
  new ResizeObserver(acomodar).observe(titulo);
  addEventListener('resize', acomodar);

  /** Ponto de entrada para registros reais, no formato do exemplo (ver docs/painel-modulo.md). */
  window.jardimModulo = {
    carregar(dados) { estado.externo = { modulo: MODULO_PEDIATRIA, objetivos: [], confusoes: [], inicioCiclo: INICIO_CICLO, ...dados, origem: 'site', agora: dados.agora ?? hoje }; desenhar(); return resumo; },
    limpar() { estado.externo = null; desenhar(); },
    resumo: () => resumo,
    arvores: portesDasArvores,
    abrirFicha: (id) => { abrirCompacto(true); ampliar(true, { assunto: id }); },
  };
  desenhar();
  abrirCompacto(estado.fixado && estado.aberto);
}

iniciarPainel();
