/** Resumo do módulo: transforma registros por assunto no apanhado mostrado no painel.
 * Puro (sem DOM). Usa o mesmo motor de crescimento da prévia, então porte e copa
 * significam o mesmo aqui e na floresta. Porte é trajetória, não domínio do assunto. */
import { avaliarCrescimento, diaNumero, somarDias, REGRAS_EXPERIMENTAIS } from './crescimentoEstudo.js';

export const ESTAGIOS_PAINEL = ['semente', 'broto', 'muda', 'jovem', 'adulta'];
export const RESULTADOS_PAINEL = ['autonomo', 'pista', 'apos_explicacao', 'nao_recuperou'];
const ATIVIDADES = ['estudo', 'tentativa', 'retomada'];
const MARCOS_QUANTIDADE = [1, 25, 50, 100, 150, 200, 250];

const dias = (a, b) => diaNumero(b) - diaNumero(a);
/** Segunda-feira da semana da data (semanas do painel começam na segunda). */
export function inicioSemana(data) {
  const n = diaNumero(data), dow = (new Date(n * 86400000).getUTCDay() + 6) % 7;
  return somarDias(data, -dow);
}

/** Data em que cada assunto alcançou cada estágio. O porte só depende dos registros
 * até o dia (nunca do relógio nem de pausas), então vale para qualquer data simulada
 * e é calculado uma vez por lista de registros. */
const cacheConquistas = new WeakMap();
function datasDeConquista(registros, regras) {
  const guardado = cacheConquistas.get(registros);
  if (guardado?.regras === regras) return guardado.mapa;
  const porAssunto = new Map();
  for (const r of registros) if (r.assunto) { if (!porAssunto.has(r.assunto)) porAssunto.set(r.assunto, []); porAssunto.get(r.assunto).push(r); }
  const mapa = new Map();
  for (const [id, lista] of porAssunto) {
    const conquistas = {};
    for (const data of [...new Set(lista.filter(r => ATIVIDADES.includes(r.tipo)).map(r => r.data))].sort()) {
      const e = avaliarCrescimento(lista.filter(r => r.data <= data), data, regras).estagio;
      for (const nome of ESTAGIOS_PAINEL.slice(1, ESTAGIOS_PAINEL.indexOf(e) + 1)) conquistas[nome] ??= data;
      if (e === 'adulta') break;
    }
    mapa.set(id, conquistas);
  }
  cacheConquistas.set(registros, { regras, mapa });
  return mapa;
}

/**
 * dados = { modulo:{nome,inicio,fim}, agora:'AAAA-MM-DD',
 *           registros:[{id, assunto|null, tipo, data, resultado?, fim?}],
 *           confusoes:[{a, b, data}] }
 * Registros sem assunto valem para todos (só pausas fazem sentido assim).
 */
export function resumirModulo(dados, catalogo, regras = REGRAS_EXPERIMENTAIS) {
  const { modulo, agora } = dados;
  const visiveis = dados.registros.filter(r => r.data <= agora);
  const pausas = visiveis.filter(r => r.tipo === 'pausa' && !r.assunto);
  const porAssunto = new Map(catalogo.map(a => [a.id, []]));
  for (const r of visiveis) if (r.assunto && porAssunto.has(r.assunto)) porAssunto.get(r.assunto).push(r);

  const assuntos = catalogo.map(a => {
    const proprios = porAssunto.get(a.id), atividades = proprios.filter(r => ATIVIDADES.includes(r.tipo));
    if (!atividades.length) return { ...a, estagio: 'semente', estado: null, registros: proprios, conquistas: {} };
    const estado = avaliarCrescimento([...proprios, ...pausas], agora, regras);
    const conquistas = Object.fromEntries(Object.entries(datasDeConquista(dados.registros, regras).get(a.id) ?? {}).filter(([, d]) => d <= agora));
    const autonomias = atividades.filter(r => r.tipo === 'tentativa' && r.resultado === 'autonomo').map(r => r.data).sort();
    return { ...a, estagio: estado.estagio, estado, registros: proprios, conquistas, primeiraAutonomia: autonomias[0] ?? null, ultimaAutonomia: autonomias.at(-1) ?? null };
  });

  const contar = lista => Object.fromEntries(ESTAGIOS_PAINEL.map(e => [e, lista.filter(a => a.estagio === e).length]));
  const iniciados = assuntos.filter(a => a.estado);

  // Áreas na ordem do catálogo (a mesma das espécies).
  const areas = [];
  for (const a of assuntos) {
    let area = areas.find(x => x.especie === a.especie);
    if (!area) areas.push(area = { especie: a.especie, area: a.area, assuntos: [], grupos: [] });
    area.assuntos.push(a);
    let grupo = area.grupos.find(g => g.id === a.grupo);
    if (!grupo) area.grupos.push(grupo = { id: a.grupo, nome: a.grupoNome, assuntos: [] });
    grupo.assuntos.push(a);
  }
  for (const area of areas) {
    area.total = area.assuntos.length;
    area.porEstagio = contar(area.assuntos);
    area.iniciados = area.total - area.porEstagio.semente;
    area.ultima = area.assuntos.map(a => a.estado?.ultimaAtividade).filter(Boolean).sort().at(-1) ?? null;
    area.dificuldades = area.assuntos.filter(a => a.estado?.dificuldadeAtiva).length;
  }

  // Série diária desde o início do módulo (ou do primeiro registro, se anterior).
  const atividades = visiveis.filter(r => r.assunto && ATIVIDADES.includes(r.tipo));
  const primeiraData = [modulo.inicio, ...atividades.map(r => r.data)].sort()[0];
  const fimSerie = agora < primeiraData ? primeiraData : agora;
  const porDia = new Map();
  for (const r of atividades) porDia.set(r.data, (porDia.get(r.data) ?? 0) + 1);
  const diaPausado = d => pausas.some(p => p.data <= d && p.fim > d);
  const serie = [];
  for (let d = primeiraData, n = 0; d <= fimSerie && n < 800; d = somarDias(d, 1), n++) {
    const porEstagio = Object.fromEntries(ESTAGIOS_PAINEL.slice(1).map(e => [e, 0]));
    // Conta cada assunto no estágio mais alto alcançado até o dia.
    for (const a of iniciados) {
      const alto = ESTAGIOS_PAINEL.slice(1).filter(e => a.conquistas[e] && a.conquistas[e] <= d).at(-1);
      if (alto) porEstagio[alto]++;
    }
    serie.push({ data: d, atividades: porDia.get(d) ?? 0, pausa: diaPausado(d), porEstagio, iniciados: Object.values(porEstagio).reduce((s, x) => s + x, 0) });
  }

  // Tentativas por semana e resultado.
  const semanas = new Map();
  for (const r of atividades.filter(r => r.tipo === 'tentativa' && r.resultado !== 'nao_avaliado')) {
    const s = inicioSemana(r.data);
    if (!semanas.has(s)) semanas.set(s, Object.fromEntries(RESULTADOS_PAINEL.map(x => [x, 0])));
    semanas.get(s)[r.resultado]++;
  }
  const listaSemanas = [];
  for (let s = inicioSemana(primeiraData); s <= fimSerie; s = somarDias(s, 7)) listaSemanas.push({ semana: s, ...(semanas.get(s) ?? Object.fromEntries(RESULTADOS_PAINEL.map(x => [x, 0]))) });

  // Ritmo do rodízio: quanto do tempo passou e quanto da lista foi iniciada.
  const total = catalogo.length, duracao = dias(modulo.inicio, modulo.fim) + 1;
  const decorridos = Math.max(0, Math.min(duracao, dias(modulo.inicio, agora) + 1));
  const restantes = duracao - decorridos, faltam = total - iniciados.length;
  const novosEm = (de, ate) => iniciados.filter(a => a.estado.primeiraAtividade > de && a.estado.primeiraAtividade <= ate).length;
  const ultimas2 = novosEm(somarDias(agora, -14), agora) / 2;
  const tentativasEm = (de, ate) => atividades.filter(r => r.tipo === 'tentativa' && r.resultado !== 'nao_avaliado' && r.data > de && r.data <= ate);
  const taxa = l => l.length ? l.filter(r => r.resultado === 'autonomo').length / l.length : null;
  const recentes = tentativasEm(somarDias(agora, -14), agora), anteriores = tentativasEm(somarDias(agora, -28), somarDias(agora, -14));
  const ritmo = {
    duracao, decorridos, restantes, faltam, emAndamento: agora >= modulo.inicio && agora <= modulo.fim, antes: agora < modulo.inicio,
    novosPorSemana: ultimas2, necessarioPorSemana: restantes > 0 ? faltam / (restantes / 7) : null,
    projecaoFim: restantes > 0 ? Math.min(total, Math.round(iniciados.length + ultimas2 * restantes / 7)) : iniciados.length,
    diasDeEstudo: porDia.size, diasDeEstudo14: [...porDia.keys()].filter(d => d > somarDias(agora, -14)).length,
    autonomia14: taxa(recentes), autonomiaAnterior: taxa(anteriores), tentativas14: recentes.length,
  };

  // Próximos passos: só sugestões derivadas dos critérios; nada aqui altera o planejador.
  const fmt = d => d.split('-').reverse().slice(0, 2).join('/');
  // A partir de quando o critério que falta pode ser cumprido por um novo encontro.
  const liberadoEm = (a, c) => c.chave === 'intervalo' ? somarDias(a.estado.primeiraAtividade, c.meta)
    : c.chave === 'intervaloRecuperacoes' && a.primeiraAutonomia ? somarDias(a.primeiraAutonomia, c.meta)
    : c.chave === 'autonomias' && a.ultimaAutonomia ? somarDias(a.ultimaAutonomia, regras.intervaloAutonomias) : agora;
  const descreverFalta = (a, c, desde) => {
    const quando = desde > agora ? ` a partir de ${fmt(desde)}` : ' já';
    if (c.chave === 'dias') return `mais ${Math.ceil(c.meta - c.atual)} dia(s) de estudo`;
    if (c.chave === 'intervalo') return desde > agora ? `voltar a partir de ${fmt(desde)}` : 'um novo encontro já completa a fase';
    if (c.chave === 'autonomias') return `recuperar sem ajuda${quando}`;
    if (c.chave === 'intervaloRecuperacoes') return `recuperar sem ajuda${quando} (falta espalhar as recuperações)`;
    return c.rotulo;
  };
  const pertoDeCrescer = iniciados
    .filter(a => a.estado.proximo && a.estado.proximo.criterios.filter(c => !c.concluido).length === 1)
    .map(a => { const c = a.estado.proximo.criterios.find(c => !c.concluido), desde = liberadoEm(a, c); return { assunto: a, para: a.estado.proximo.estagio, falta: descreverFalta(a, c, desde), chave: c.chave, desde, pronto: desde <= agora }; })
    // Primeiro o que dá para fazer hoje; depois a fase mais alta e o contato mais antigo.
    .sort((x, y) => (y.pronto - x.pronto) || ESTAGIOS_PAINEL.indexOf(y.para) - ESTAGIOS_PAINEL.indexOf(x.para) || x.desde.localeCompare(y.desde));
  // A próxima recuperação só conta como espaçada depois do intervalo mínimo.
  const recuperar = iniciados
    .filter(a => a.estado.proximo?.autonomias > 0 && a.estado.diasDeEstudo >= 1 && (!a.ultimaAutonomia || dias(a.ultimaAutonomia, agora) >= regras.intervaloAutonomias) && dias(a.estado.ultimaAtividade, agora) >= 1)
    .sort((x, y) => x.estado.ultimaAtividade.localeCompare(y.estado.ultimaAtividade));
  const copa = iniciados.filter(a => ['em_retomada', 'sem_acompanhamento'].includes(a.estado.acompanhamento))
    .sort((x, y) => y.estado.diasSemAcompanhamento - x.estado.diasSemAcompanhamento);
  const dificuldades = iniciados.filter(a => a.estado.dificuldadeAtiva)
    .sort((x, y) => (y.estado.dataUltimaTentativa ?? '').localeCompare(x.estado.dataUltimaTentativa ?? ''));

  // Confusões: o mesmo par 2+ vezes vira confusão frequente (regra do organizador).
  const nomes = new Map(catalogo.map(a => [a.id, a]));
  const pares = new Map();
  for (const c of (dados.confusoes ?? []).filter(c => c.data <= agora)) {
    const chave = [c.a, c.b].sort().join('|');
    const p = pares.get(chave) ?? { a: nomes.get(c.a), b: nomes.get(c.b), vezes: 0, ultima: c.data };
    p.vezes++; if (c.data > p.ultima) p.ultima = c.data;
    pares.set(chave, p);
  }
  const confusoes = [...pares.values()].filter(p => p.a && p.b).sort((x, y) => y.vezes - x.vezes || y.ultima.localeCompare(x.ultima));

  // Marcos alcançados, do mais recente ao mais antigo.
  const marcos = [];
  const inicios = iniciados.map(a => a.estado.primeiraAtividade).sort();
  for (const q of MARCOS_QUANTIDADE) if (inicios.length >= q) marcos.push({ data: inicios[q - 1], texto: q === 1 ? 'Primeiro assunto plantado' : `${q} assuntos plantados` });
  if (inicios.length === total && total) marcos.push({ data: inicios.at(-1), texto: `Todos os ${total} assuntos plantados` });
  for (const e of ['jovem', 'adulta']) {
    const datas = iniciados.map(a => a.conquistas[e]).filter(Boolean).sort();
    if (datas[0]) marcos.push({ data: datas[0], texto: `Primeira árvore ${e}` });
    if (e === 'adulta' && datas.length >= 10) marcos.push({ data: datas[9], texto: '10 árvores adultas' });
  }
  for (const area of areas) {
    const d = area.assuntos.map(a => a.estado?.primeiraAtividade);
    if (d.every(Boolean)) marcos.push({ data: d.sort().at(-1), texto: `${area.area}: todos os assuntos plantados` });
  }
  marcos.sort((x, y) => y.data.localeCompare(x.data));

  return {
    modulo, agora, origem: dados.origem ?? 'site', regras: regras.versao,
    total, iniciados: iniciados.length, porEstagio: contar(assuntos), assuntos, areas, serie, semanas: listaSemanas, ritmo,
    proximos: { pertoDeCrescer, recuperar, copa, dificuldades }, confusoes, marcos,
  };
}
