/** Painel fixo "Evolução do módulo": apanhado do estudo de Pediatria sobre o jardim.
 * Independente da cena 3D (abre antes do mapa carregar). Gráficos em SVG próprio,
 * com cores da paleta do jardim. Sem registros reais: usa o exemplo fictício ou o
 * estado vazio do início real; dados do site entram por window.jardimModulo.carregar. */
import { CATALOGO_PEDIATRIA } from './catalogoPediatria.js';
import { ESPECIES } from './especies.js';
import { resumirModulo, ESTAGIOS_PAINEL, RESULTADOS_PAINEL } from './resumoModulo.js';
import { gerarExemploModulo, MODULO_PEDIATRIA, FIM_EXEMPLO } from './exemploModulo.js';
import { diaNumero, somarDias } from './crescimentoEstudo.js';

const $ = (id) => document.getElementById(id);
const CHAVE = 'jardim-painel-modulo-v1';
// Estágio é ordinal: um verde só, do escuro (broto) ao claro (adulta); "semente" é o trilho neutro.
const COR_ESTAGIO = { semente: '#3a3f3e', broto: '#3f6e3c', muda: '#75a650', jovem: '#9cc364', adulta: '#c6dd84' };
const NOME_ESTAGIO = { semente: 'Não plantado', broto: 'Broto', muda: 'Muda', jovem: 'Jovem', adulta: 'Adulta' };
// Validado com o verificador de paletas (fundo #1a241f): separação para daltonismo ≥ 17.
const COR_RESULTADO = { autonomo: '#568a45', pista: '#9b80cc', apos_explicacao: '#d07a36', nao_recuperou: '#a8323a' };
const NOME_RESULTADO = { autonomo: 'Sem ajuda', pista: 'Com pista', apos_explicacao: 'Após explicação', nao_recuperou: 'Não recuperou' };
const CALOR = ['#1e2a22', '#1e3b45', '#28566a', '#34748a', '#4f97a3', '#86c2bd'];
const ABAS = [['resumo', 'Resumo'], ['areas', 'Áreas'], ['atividade', 'Atividade'], ['proximos', 'Próximos']];

const ler = () => { try { return JSON.parse(localStorage.getItem(CHAVE)) ?? {}; } catch { return {}; } };
const salvar = () => { try { localStorage.setItem(CHAVE, JSON.stringify({ fonte: estado.fonte, dia: estado.dia, aba: estado.aba, fixado: estado.fixado, aberto: estado.fixado && estado.aberto })); } catch { /* sem armazenamento: o painel funciona igual */ } };
const esc = (t) => String(t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const dataCurta = (d) => d ? d.split('-').reverse().slice(0, 2).join('/') : '—';
const dataLonga = (d) => d ? new Date(diaNumero(d) * 86400000).toLocaleDateString('pt-BR', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }) : '—';
const pct = (x) => x == null ? '—' : `${Math.round(x * 100)}%`;
const hojeLocal = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
const nomeEspecie = (id) => ESPECIES[id]?.nome ?? id;
const dica = (t) => `data-dica="${esc(t)}"`;

const salvo = ler();
const hoje = hojeLocal();
const estado = {
  fonte: ['exemplo', 'vazio'].includes(salvo.fonte) ? salvo.fonte : 'exemplo',
  dia: /^\d{4}-\d{2}-\d{2}$/.test(salvo.dia ?? '') ? salvo.dia : (hoje >= MODULO_PEDIATRIA.inicio && hoje <= FIM_EXEMPLO ? hoje : '2026-12-05'),
  aba: ABAS.some(([id]) => id === salvo.aba) ? salvo.aba : 'resumo',
  fixado: Boolean(salvo.fixado), aberto: Boolean(salvo.aberto), ordemAreas: 'catalogo', externo: null,
};
let exemplo = null, resumo = null, agendado = 0;

function dadosAtuais() {
  if (estado.externo) return estado.externo;
  if (estado.fonte === 'vazio') return { modulo: MODULO_PEDIATRIA, origem: 'vazio', agora: hoje, registros: [], confusoes: [] };
  exemplo ??= gerarExemploModulo(CATALOGO_PEDIATRIA);
  return { ...exemplo, agora: estado.dia };
}

// ---------- gráficos ----------
function barraEstagios(porEstagio, total, { altura = 14, rotulos = true } = {}) {
  let x = 0; const partes = [];
  for (const e of [...ESTAGIOS_PAINEL.slice(1).reverse(), 'semente']) {
    const n = porEstagio[e]; if (!n) continue;
    const w = n / total * 100;
    // O contorno na cor do fundo abre a fresta de 2 px entre os segmentos.
    partes.push(`<rect x="${x}%" width="${w}%" height="${altura}" fill="${COR_ESTAGIO[e]}" ${dica(`${NOME_ESTAGIO[e]}: ${n} de ${total} (${pct(n / total)})`)}/>`);
    x += w;
  }
  return `<svg class="barra-estagios" height="${altura}" width="100%" role="img" aria-label="${ESTAGIOS_PAINEL.map(e => `${NOME_ESTAGIO[e]} ${porEstagio[e]}`).join(', ')}">${partes.join('')}</svg>${rotulos ? legendaEstagios(porEstagio) : ''}`;
}
const legendaEstagios = (p) => `<ul class="legenda">${ESTAGIOS_PAINEL.map(e => `<li><i style="background:${COR_ESTAGIO[e]}"></i>${NOME_ESTAGIO[e]} <b>${p[e]}</b></li>`).join('')}</ul>`;

/** Área empilhada por estágio ao longo dos dias, com a linha de ritmo uniforme do rodízio. */
function graficoFloresta(r) {
  const W = 372, H = 150, m = { e: 30, d: 8, t: 8, b: 20 }, serie = r.serie;
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
  return `<div class="grafico" data-grafico="floresta"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Assuntos por estágio ao longo do tempo">${grade}${camadas.join('')}${ritmo}${fimRodizio}${ticks}<line class="cursor" y1="${m.t}" y2="${H - m.b}" x1="-10" x2="-10"/><rect class="alvo" x="${m.e}" y="0" width="${W - m.e - m.d}" height="${H - m.b}" fill="transparent"/></svg></div>
    <ul class="legenda">${ordem.slice().reverse().map(e => `<li><i style="background:${COR_ESTAGIO[e]}"></i>${NOME_ESTAGIO[e]}</li>`).join('')}<li><i class="tracejado"></i>Ritmo uniforme até ${dataCurta(r.modulo.fim)}</li></ul>`;
}
function ligarFloresta(raiz, r) {
  const g = raiz.querySelector('[data-grafico="floresta"]'); if (!g) return;
  const svg = g.querySelector('svg'), cursor = svg.querySelector('.cursor'), alvo = svg.querySelector('.alvo');
  const W = 372, m = { e: 30, d: 8 }, serie = r.serie;
  const fimX = serie.at(-1).data > r.modulo.fim ? serie.at(-1).data : r.modulo.fim, d0 = diaNumero(serie[0].data), span = diaNumero(fimX) - d0 || 1;
  alvo.addEventListener('pointermove', (ev) => {
    const caixa = svg.getBoundingClientRect(), x = (ev.clientX - caixa.left) / caixa.width * W;
    const dia = Math.round((x - m.e) / (W - m.e - m.d) * span), s = serie[Math.max(0, Math.min(serie.length - 1, dia))];
    const px = m.e + (diaNumero(s.data) - d0) / span * (W - m.e - m.d);
    cursor.setAttribute('x1', px); cursor.setAttribute('x2', px);
    const esperado = s.data < r.modulo.inicio ? 0 : Math.min(r.total, Math.round((diaNumero(s.data) - diaNumero(r.modulo.inicio) + 1) / (diaNumero(r.modulo.fim) - diaNumero(r.modulo.inicio) + 1) * r.total));
    mostrarDica(ev, `${dataLonga(s.data)}${s.pausa ? ' · pausa' : ''}\nPlantados: ${s.iniciados} de ${r.total}\n${['adulta', 'jovem', 'muda', 'broto'].map(e => `${NOME_ESTAGIO[e]}: ${s.porEstagio[e]}`).join(' · ')}\nRitmo uniforme: ${esperado}`);
  });
  alvo.addEventListener('pointerleave', () => { cursor.setAttribute('x1', -10); cursor.setAttribute('x2', -10); esconderDica(); });
}

/** Calendário do módulo: uma coluna por semana, linhas de segunda a domingo. */
function calendario(r) {
  const s0 = r.semanas[0]?.semana; if (!s0) return '';
  const porData = new Map(r.serie.map(s => [s.data, s]));
  const ultima = r.agora > r.modulo.fim ? r.agora : r.modulo.fim;
  const nSem = Math.floor((diaNumero(ultima) - diaNumero(s0)) / 7) + 1;
  const max = Math.max(1, ...r.serie.map(s => s.atividades));
  // Largura fixa do painel: poucas semanas dão quadrados maiores, até um teto.
  const lado = Math.max(6, Math.min(20, Math.floor(348 / nSem) - 3)), passo = lado + 3, W = 372, H = 7 * passo + 14;
  const celulas = [];
  for (let c = 0; c < nSem; c++) for (let l = 0; l < 7; l++) {
    const d = somarDias(s0, c * 7 + l), s = porData.get(d), futuro = d > r.agora;
    const nivel = !s || !s.atividades ? 0 : 1 + Math.min(4, Math.floor(s.atividades / max * 4.999));
    const noRodizio = d >= r.modulo.inicio && d <= r.modulo.fim;
    celulas.push(`<rect x="${22 + c * passo}" y="${l * passo}" width="${lado}" height="${lado}" rx="2" fill="${futuro ? 'transparent' : CALOR[nivel]}" class="${futuro ? 'futuro' : ''}${s?.pausa ? ' pausa' : ''}${noRodizio ? ' rodizio' : ''}" ${dica(`${dataLonga(d)}${futuro ? ' · ainda não chegou' : s?.pausa ? ' · pausa' : ''}\n${s?.atividades ?? 0} registro(s) de estudo`)}/>`);
  }
  const dias = ['seg', '', 'qua', '', 'sex', '', 'dom'].map((t, l) => t ? `<text x="0" y="${l * passo + lado - 2}" class="eixo">${t}</text>` : '').join('');
  const meses = []; let ultimoMes = '';
  for (let c = 0; c < nSem; c++) { const d = somarDias(s0, c * 7), mes = d.slice(5, 7); if (mes !== ultimoMes) { ultimoMes = mes; meses.push(`<text x="${22 + c * passo}" y="${H - 2}" class="eixo">${new Date(diaNumero(d) * 86400000).toLocaleDateString('pt-BR', { month: 'short', timeZone: 'UTC' }).replace('.', '')}</text>`); } }
  return `<svg viewBox="0 0 ${W} ${H}" class="calendario" role="img" aria-label="Calendário de dias com estudo">${dias}${celulas.join('')}${meses.join('')}</svg>
    <ul class="legenda"><li>menos</li>${CALOR.map(c => `<li><i style="background:${c}"></i></li>`).join('')}<li>mais registros</li><li><i class="pausa-i"></i>pausa</li><li><i class="rodizio-i"></i>rodízio</li></ul>`;
}

/** Tentativas de recuperação por semana, empilhadas pelo resultado. */
function graficoTentativas(r) {
  const semanas = r.semanas.filter(s => s.semana <= r.agora);
  const totais = semanas.map(s => RESULTADOS_PAINEL.reduce((t, k) => t + s[k], 0));
  const max = Math.max(1, ...totais);
  if (!totais.some(Boolean)) return '<p class="vazio">Ainda não há tentativas de recuperação registradas.</p>';
  const W = 372, H = 140, m = { e: 26, d: 4, t: 6, b: 18 }, n = semanas.length, larg = (W - m.e - m.d) / n;
  const barras = semanas.map((s, i) => {
    let y = H - m.b; const partes = [];
    for (const k of RESULTADOS_PAINEL) {
      if (!s[k]) continue;
      const h = s[k] / max * (H - m.t - m.b);
      partes.push(`<rect x="${(m.e + i * larg + 1).toFixed(1)}" y="${(y - h + 1).toFixed(1)}" width="${Math.max(1, larg - 2).toFixed(1)}" height="${Math.max(0.5, h - 2).toFixed(1)}" fill="${COR_RESULTADO[k]}" rx="1"/>`);
      y -= h;
    }
    const tot = totais[i];
    const texto = `Semana de ${dataCurta(s.semana)}\n${tot} tentativa(s)${tot ? ` · ${pct(s.autonomo / tot)} sem ajuda` : ''}\n${RESULTADOS_PAINEL.map(k => `${NOME_RESULTADO[k]}: ${s[k]}`).join(' · ')}`;
    return `<g ${dica(texto)}>${partes.join('')}<rect x="${m.e + i * larg}" y="${m.t}" width="${larg}" height="${H - m.t - m.b}" fill="transparent"/></g>`;
  }).join('');
  const grade = [0, 0.5, 1].map(f => `<line x1="${m.e}" x2="${W - m.d}" y1="${H - m.b - f * (H - m.t - m.b)}" y2="${H - m.b - f * (H - m.t - m.b)}" class="grade"/><text x="${m.e - 4}" y="${H - m.b - f * (H - m.t - m.b) + 3}" class="eixo" text-anchor="end">${Math.round(f * max)}</text>`).join('');
  const ticks = [0, n - 1].map(i => `<text x="${m.e + i * larg + (i ? larg : 0)}" y="${H - 5}" class="eixo" text-anchor="${i ? 'end' : 'start'}">${dataCurta(semanas[i].semana)}</text>`).join('');
  const tabela = `<details class="tabela"><summary>Ver em tabela</summary><table><thead><tr><th>Semana</th>${RESULTADOS_PAINEL.map(k => `<th>${NOME_RESULTADO[k]}</th>`).join('')}<th>Sem ajuda</th></tr></thead><tbody>${semanas.map((s, i) => `<tr><td>${dataCurta(s.semana)}</td>${RESULTADOS_PAINEL.map(k => `<td>${s[k]}</td>`).join('')}<td>${totais[i] ? pct(s.autonomo / totais[i]) : '—'}</td></tr>`).join('')}</tbody></table></details>`;
  return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Tentativas de recuperação por semana e resultado">${grade}${barras}${ticks}</svg>
    <ul class="legenda">${RESULTADOS_PAINEL.map(k => `<li><i style="background:${COR_RESULTADO[k]}"></i>${NOME_RESULTADO[k]}</li>`).join('')}</ul>${tabela}`;
}

// ---------- abas ----------
function abaResumo(r) {
  const rt = r.ritmo, semanaAtual = Math.min(Math.ceil(rt.duracao / 7), Math.max(1, Math.ceil(rt.decorridos / 7)));
  const linhaTempo = `<div class="rodizio"><div class="rodizio-topo"><span>Rodízio ${dataCurta(r.modulo.inicio)} → ${dataCurta(r.modulo.fim)}</span><span>${rt.antes ? `começa em ${Math.round(diaNumero(r.modulo.inicio) - diaNumero(r.agora))} dia(s)` : rt.emAndamento ? `semana ${semanaAtual} de ${Math.ceil(rt.duracao / 7)} · dia ${rt.decorridos} de ${rt.duracao}` : 'encerrado'}</span></div>
    <div class="trilho" ${dica(`${rt.decorridos} de ${rt.duracao} dias do rodízio`)}><div style="width:${rt.decorridos / rt.duracao * 100}%"></div><div class="plantio" style="width:${r.iniciados / r.total * 100}%" ${dica(`${r.iniciados} de ${r.total} assuntos plantados`)}></div></div>
    <div class="rodizio-legenda"><span><i class="tempo"></i>tempo do rodízio ${pct(rt.decorridos / rt.duracao)}</span><span><i class="plantado"></i>assuntos plantados ${pct(r.iniciados / r.total)}</span></div></div>`;
  const sinal = rt.autonomia14 != null && rt.autonomiaAnterior != null ? (rt.autonomia14 >= rt.autonomiaAnterior ? `↑ antes ${pct(rt.autonomiaAnterior)}` : `↓ antes ${pct(rt.autonomiaAnterior)}`) : 'nas últimas 2 semanas';
  const blocos = [
    ['Assuntos plantados', `${r.iniciados}<small>/${r.total}</small>`, `${r.total - r.iniciados} ainda em semente`],
    ['Árvores adultas', r.porEstagio.adulta, `${r.porEstagio.jovem} jovens · ${r.porEstagio.muda} mudas`],
    ['Dias de estudo', rt.diasDeEstudo, `${rt.diasDeEstudo14} nos últimos 14 dias`],
    ['Recuperação sem ajuda', pct(rt.autonomia14), rt.tentativas14 ? `${rt.tentativas14} tentativas · ${sinal}` : 'sem tentativas recentes'],
  ].map(([t, v, s]) => `<div class="bloco"><p class="bloco-t">${t}</p><p class="bloco-v">${v}</p><p class="bloco-s">${s}</p></div>`).join('');
  let ritmo = '';
  if (rt.emAndamento && rt.restantes > 0) ritmo = `<p class="nota">No ritmo das últimas 2 semanas (<b>${rt.novosPorSemana.toFixed(1).replace('.', ',')}</b> assuntos novos/semana), o rodízio termina com cerca de <b>${rt.projecaoFim}</b> de ${r.total}. Para plantar todos, seriam cerca de <b>${Math.ceil(rt.necessarioPorSemana)}</b> por semana.</p>`;
  else if (rt.antes) ritmo = `<p class="nota">O mapa começa do zero: cada assunto planta sua árvore quando for estudado pela primeira vez.</p>`;
  else if (!rt.emAndamento) ritmo = `<p class="nota">Rodízio encerrado com <b>${r.iniciados}</b> de ${r.total} assuntos plantados. As revisões continuam fazendo as árvores crescer.</p>`;
  const marcos = r.marcos.length ? `<ol class="marcos">${r.marcos.slice(0, 5).map(m => `<li><time>${dataCurta(m.data)}</time>${esc(m.texto)}</li>`).join('')}</ol>${r.marcos.length > 5 ? `<details class="mais"><summary>Todos os ${r.marcos.length} marcos</summary><ol class="marcos">${r.marcos.slice(5).map(m => `<li><time>${dataCurta(m.data)}</time>${esc(m.texto)}</li>`).join('')}</ol></details>` : ''}` : '<p class="vazio">Nenhum marco ainda.</p>';
  return `${linhaTempo}<div class="blocos">${blocos}</div>${ritmo}
    <h3>Floresta por estágio</h3>${barraEstagios(r.porEstagio, r.total)}
    <h3>Evolução da floresta</h3>${graficoFloresta(r)}
    <h3>Marcos</h3>${marcos}`;
}

function abaAreas(r) {
  const ordens = { catalogo: () => 0, menos: (a, b) => a.iniciados / a.total - b.iniciados / b.total, dificuldades: (a, b) => b.dificuldades - a.dificuldades, antiga: (a, b) => (a.ultima ?? '0').localeCompare(b.ultima ?? '0') };
  const areas = [...r.areas].sort(ordens[estado.ordemAreas]);
  const linhas = areas.map(a => {
    const grupos = a.grupos.map(g => `<div class="grupo-assuntos"><p>${esc(g.nome)}</p><div class="pontos">${g.assuntos.map(s => `<i style="background:${COR_ESTAGIO[s.estagio]}" ${dica(`${s.nome}\n${NOME_ESTAGIO[s.estagio]}${s.estado ? ` · último contato ${dataCurta(s.estado.ultimaAtividade)}` : ''}${s.estado?.dificuldadeAtiva ? '\nDificuldade em aberto' : ''}`)} class="${s.estado?.dificuldadeAtiva ? 'dif' : ''}"></i>`).join('')}</div></div>`).join('');
    return `<details class="area"><summary><span class="area-nome">${esc(a.area)}<small>${esc(nomeEspecie(a.especie))}</small></span><span class="area-num">${a.iniciados}/${a.total}${a.dificuldades ? ` <em ${dica(`${a.dificuldades} assunto(s) com dificuldade em aberto`)}>⚑${a.dificuldades}</em>` : ''}</span>${barraEstagios(a.porEstagio, a.total, { altura: 8, rotulos: false })}<span class="area-ultima">${a.ultima ? `último estudo ${dataCurta(a.ultima)}` : 'ainda não iniciada'}</span></summary>${grupos}</details>`;
  }).join('');
  return `<div class="linha-ctl"><label for="ordem-areas">Ordenar</label><select id="ordem-areas">${[['catalogo', 'Ordem do catálogo'], ['menos', 'Menos plantadas'], ['dificuldades', 'Mais dificuldades'], ['antiga', 'Estudo mais antigo']].map(([v, t]) => `<option value="${v}"${v === estado.ordemAreas ? ' selected' : ''}>${t}</option>`).join('')}</select></div>
    ${legendaEstagios(r.porEstagio)}<p class="dica-painel">Abra uma área para ver cada assunto por grupo. ⚑ = dificuldade em aberto.</p>${linhas}`;
}

function abaAtividade(r) {
  return `<h3>Dias de estudo</h3>${calendario(r)}<h3>Tentativas de recuperação por semana</h3>${graficoTentativas(r)}
    <p class="nota">Ajuda e erro também fazem a árvore crescer: contam como encontros. Só a recuperação sem ajuda conta para as fases jovem e adulta.</p>`;
}

function lista(titulo, itens, desenhar, vazio, limite = 6) {
  const corpo = itens.length ? `<ul class="lista">${itens.slice(0, limite).map(desenhar).join('')}</ul>${itens.length > limite ? `<details class="mais"><summary>Mais ${itens.length - limite}</summary><ul class="lista">${itens.slice(limite).map(desenhar).join('')}</ul></details>` : ''}` : `<p class="vazio">${vazio}</p>`;
  return `<section class="bloco-lista"><h3>${titulo} <span class="contagem">${itens.length}</span></h3>${corpo}</section>`;
}
function abaProximos(r) {
  const p = r.proximos, item = (a, extra) => `<li><span class="li-nome">${esc(a.nome)}</span><span class="li-meta">${esc(a.area)}${extra ? ` · ${extra}` : ''}</span></li>`;
  const semente = r.areas.map(a => ({ ...a, faltam: a.porEstagio.semente })).filter(a => a.faltam).sort((a, b) => b.faltam - a.faltam);
  return [
    lista('Perto de crescer', p.pertoDeCrescer, x => item(x.assunto, `<b>→ ${NOME_ESTAGIO[x.para].toLowerCase()}</b>: ${esc(x.falta)}${x.pronto ? ' ✓' : ''}`), 'Nenhuma árvore a um critério da próxima fase.'),
    lista('Bom momento para recuperar sem ajuda', p.recuperar, a => item(a, `último contato há ${Math.round(diaNumero(r.agora) - diaNumero(a.estado.ultimaAtividade))} dia(s)`), 'Nada aguardando recuperação agora.'),
    lista('Dificuldades em aberto', p.dificuldades, a => item(a, `última tentativa ${dataCurta(a.estado.dataUltimaTentativa)}`), 'Nenhuma dificuldade em aberto.'),
    lista('Confusões entre assuntos', r.confusoes, c => `<li><span class="li-nome">${esc(c.a.nome)} <b>×</b> ${esc(c.b.nome)}</span><span class="li-meta">${c.vezes}× · última ${dataCurta(c.ultima)}${c.vezes >= 2 ? ' · <b>frequente</b>' : ''}</span></li>`, 'Nenhuma confusão registrada.'),
    lista('Copa pedindo retorno', p.copa, a => item(a, `${a.estado.diasSemAcompanhamento} dias sem registro`), 'Todas as copas acompanhadas.'),
    lista('Ainda em semente, por área', semente, a => `<li><span class="li-nome">${esc(a.area)}</span><span class="li-meta">${a.faltam} de ${a.total} assuntos</span></li>`, 'Todos os assuntos já foram plantados.', 4),
    '<p class="nota">Sugestões tiradas dos critérios de crescimento; não alteram o planejador do site. O porte mostra trajetória de estudo, não domínio do assunto.</p>',
  ].join('');
}

// ---------- montagem ----------
function desenhar() {
  agendado = 0;
  const dados = dadosAtuais();
  resumo = resumirModulo(dados, CATALOGO_PEDIATRIA);
  const r = resumo, corpo = $('modulo-corpo');
  const origem = { exemplo: 'não são dados seus', vazio: 'nenhum registro ainda', site: 'registros do site' }[r.origem] ?? r.origem;
  $('modulo-origem').textContent = origem;
  $('modulo-origem').dataset.origem = r.origem;
  $('modulo-dia-saida').textContent = dataLonga(r.agora);
  $('modulo-simulacao').hidden = r.origem !== 'exemplo';
  $('modulo-fonte').hidden = r.origem === 'site';
  corpo.innerHTML = { resumo: abaResumo, areas: abaAreas, atividade: abaAtividade, proximos: abaProximos }[estado.aba](r);
  ligarFloresta(corpo, r);
  $('ordem-areas')?.addEventListener('change', (e) => { estado.ordemAreas = e.target.value; desenhar(); });
  for (const b of document.querySelectorAll('#modulo-abas [role="tab"]')) { const ativo = b.dataset.aba === estado.aba; b.setAttribute('aria-selected', String(ativo)); b.tabIndex = ativo ? 0 : -1; }
  $('abrir-modulo').querySelector('small').textContent = `${r.iniciados}/${r.total}`;
}
const pedirDesenho = () => { if (!agendado) agendado = requestAnimationFrame(desenhar); };

const balao = () => $('modulo-dica');
function mostrarDica(ev, texto) {
  const b = balao(); b.textContent = texto; b.hidden = false;
  const w = b.offsetWidth, h = b.offsetHeight;
  b.style.left = `${Math.min(innerWidth - w - 8, ev.clientX + 14)}px`;
  b.style.top = `${ev.clientY + h + 18 > innerHeight ? ev.clientY - h - 10 : ev.clientY + 16}px`;
}
const esconderDica = () => { balao().hidden = true; };

function abrir(aberto) {
  estado.aberto = aberto;
  $('painel-modulo').hidden = !aberto;
  $('abrir-modulo').setAttribute('aria-expanded', String(aberto));
  if (aberto) desenhar(); else esconderDica();
  salvar();
}

function iniciarPainel() {
  const inicio = diaNumero(MODULO_PEDIATRIA.inicio), dia = $('modulo-dia');
  dia.min = 0; dia.max = diaNumero(FIM_EXEMPLO) - inicio;
  dia.value = Math.max(0, Math.min(+dia.max, diaNumero(estado.dia) - inicio));
  estado.dia = somarDias(MODULO_PEDIATRIA.inicio, +dia.value);
  $('modulo-fonte').value = estado.fonte;
  $('modulo-abas').innerHTML = ABAS.map(([id, t]) => `<button type="button" role="tab" data-aba="${id}" aria-controls="modulo-corpo">${t}</button>`).join('');
  $('fixar-modulo').setAttribute('aria-pressed', String(estado.fixado));

  $('abrir-modulo').addEventListener('click', () => abrir(!estado.aberto));
  $('fechar-modulo').addEventListener('click', () => abrir(false));
  $('fixar-modulo').addEventListener('click', () => { estado.fixado = !estado.fixado; $('fixar-modulo').setAttribute('aria-pressed', String(estado.fixado)); salvar(); });
  $('modulo-fonte').addEventListener('change', (e) => { estado.fonte = e.target.value; estado.externo = null; salvar(); desenhar(); });
  dia.addEventListener('input', () => { estado.dia = somarDias(MODULO_PEDIATRIA.inicio, +dia.value); $('modulo-dia-saida').textContent = dataLonga(estado.dia); pedirDesenho(); });
  dia.addEventListener('change', salvar);
  for (const [botao, alvo] of [['modulo-ir-fim', MODULO_PEDIATRIA.fim], ['modulo-ir-inicio', somarDias(MODULO_PEDIATRIA.inicio, 6)], ['modulo-ir-marco', FIM_EXEMPLO]]) {
    $(botao).addEventListener('click', () => { dia.value = diaNumero(alvo) - inicio; estado.dia = alvo; salvar(); desenhar(); });
  }
  $('modulo-abas').addEventListener('click', (e) => { const b = e.target.closest('[role="tab"]'); if (!b) return; estado.aba = b.dataset.aba; salvar(); desenhar(); $('modulo-corpo').scrollTop = 0; });
  $('modulo-abas').addEventListener('keydown', (e) => {
    if (!['ArrowLeft', 'ArrowRight'].includes(e.key)) return;
    e.preventDefault(); e.stopPropagation();
    const i = ABAS.findIndex(([id]) => id === estado.aba), j = (i + (e.key === 'ArrowRight' ? 1 : ABAS.length - 1)) % ABAS.length;
    estado.aba = ABAS[j][0]; salvar(); desenhar(); $('modulo-abas').querySelector(`[data-aba="${estado.aba}"]`).focus();
  });
  const painel = $('painel-modulo');
  painel.addEventListener('pointerover', (e) => { const alvo = e.target.closest('[data-dica]'); if (alvo) mostrarDica(e, alvo.dataset.dica); });
  painel.addEventListener('pointermove', (e) => { const alvo = e.target.closest('[data-dica]'); if (alvo) mostrarDica(e, alvo.dataset.dica); });
  painel.addEventListener('pointerout', (e) => { if (e.target.closest('[data-dica]') && !e.relatedTarget?.closest?.('[data-dica]')) esconderDica(); });
  // Teclas do painel não movem a câmera.
  painel.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !estado.fixado) abrir(false); e.stopPropagation(); });
  painel.addEventListener('keyup', (e) => e.stopPropagation());
  addEventListener('resize', () => { if (estado.aberto) pedirDesenho(); });
  // O título quebra em duas linhas em telas estreitas: botão e painel descem junto.
  const titulo = document.querySelector('.titulo'), botao = $('abrir-modulo');
  const acomodar = () => {
    if (matchMedia('(max-width: 560px)').matches) { botao.style.top = ''; painel.style.top = ''; return; }
    const base = titulo.getBoundingClientRect().bottom + 6;
    botao.style.top = `${base}px`; painel.style.top = `${base + botao.offsetHeight + 6}px`;
  };
  new ResizeObserver(acomodar).observe(titulo);
  addEventListener('resize', acomodar);

  /** Ponto de entrada para registros reais, no mesmo formato do exemplo (ver docs/painel-modulo.md). */
  window.jardimModulo = {
    carregar(dados) { estado.externo = { modulo: MODULO_PEDIATRIA, confusoes: [], ...dados, origem: 'site', agora: dados.agora ?? hoje }; if (estado.aberto) desenhar(); return resumirModulo(estado.externo, CATALOGO_PEDIATRIA); },
    limpar() { estado.externo = null; if (estado.aberto) desenhar(); },
    resumo: () => resumo,
  };
  abrir(estado.fixado && estado.aberto);
}

iniciarPainel();
