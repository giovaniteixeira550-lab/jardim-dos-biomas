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

/** Registros a partir do início do ciclo. Uma pausa que atravessa o início continua valendo.
 * Guardado por lista e data, para o cálculo das conquistas também ser reaproveitado. */
const cacheCiclo = new WeakMap();
function registrosDoCiclo(registros, inicio) {
  if (!inicio) return registros;
  const porInicio = cacheCiclo.get(registros) ?? new Map();
  cacheCiclo.set(registros, porInicio);
  if (!porInicio.has(inicio)) porInicio.set(inicio, registros.filter(r => r.data >= inicio || (r.tipo === 'pausa' && r.fim > inicio)));
  return porInicio.get(inicio);
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

/** Evidência por objetivo — linguagem proposta para a interface, não uma certificação.
 * O estado segue a tentativa avaliada mais recente; conquistas anteriores ficam no motivo. */
export const EVIDENCIAS = ['nao_avaliado', 'com_ajuda', 'sem_ajuda', 'repetiu'];
export const NOME_EVIDENCIA = { nao_avaliado: 'Ainda não avaliado', com_ajuda: 'Recupera com ajuda', sem_ajuda: 'Recuperou sem ajuda', repetiu: 'Repetiu a autonomia em encontros separados' };
const NOME_RESULTADO = { autonomo: 'recuperou sem ajuda', pista: 'precisou de pista', apos_explicacao: 'só conseguiu após explicação', nao_recuperou: 'não conseguiu recuperar' };
const AJUDA = ['pista', 'apos_explicacao', 'nao_recuperou'];

function avaliarObjetivo(objetivo, registros, agora, regras) {
  const fmt = d => d.split('-').reverse().slice(0, 2).join('/');
  const proprios = registros.filter(r => r.objetivo === objetivo.id);
  // Estudo sem objetivo marcado vale como contato com o assunto inteiro.
  const contatos = registros.filter(r => ATIVIDADES.includes(r.tipo) && (r.objetivo === objetivo.id || !r.objetivo));
  const avaliadas = proprios.filter(r => r.tipo === 'tentativa' && r.resultado && r.resultado !== 'nao_avaliado');
  const ultima = avaliadas.at(-1) ?? null;
  const diasAutonomos = [...new Set(avaliadas.filter(r => r.resultado === 'autonomo').map(r => r.data))].sort();
  const espacados = [];
  for (const d of diasAutonomos) if (!espacados.length || dias(espacados.at(-1), d) >= regras.intervaloAutonomias) espacados.push(d);
  let estado = 'nao_avaliado', motivo;
  if (!ultima) motivo = contatos.length ? `Estudado ${contatos.length === 1 ? 'uma vez' : `em ${new Set(contatos.map(r => r.data)).size} dia(s)`}, mas nenhuma tentativa avaliou este objetivo.` : 'Ainda sem estudo nem tentativa.';
  else if (AJUDA.includes(ultima.resultado)) {
    estado = 'com_ajuda';
    motivo = `Na última tentativa (${fmt(ultima.data)}${ultima.atividade ? `, ${ultima.atividade}` : ''}): ${minuscula(ultima.evidencia || NOME_RESULTADO[ultima.resultado])}.`;
    if (diasAutonomos.length) motivo += ` Já tinha recuperado sem ajuda em ${fmt(diasAutonomos.at(-1))}; essa trajetória continua contando.`;
  } else if (espacados.length >= 2) {
    estado = 'repetiu';
    motivo = `Recuperou sem ajuda em ${espacados.map(fmt).join(', ')}, com pelo menos ${regras.intervaloAutonomias} dias entre as vezes.`;
  } else {
    estado = 'sem_ajuda';
    motivo = `Recuperou sem ajuda em ${fmt(ultima.data)}${ultima.atividade ? ` (${ultima.atividade})` : ''}.` + (diasAutonomos.length ? ` Para contar como repetição, uma nova recuperação a partir de ${fmt(somarDias(diasAutonomos[0], regras.intervaloAutonomias))}.` : '');
  }
  const percepcao = proprios.filter(r => Number.isFinite(r.confianca)).at(-1) ?? null;
  // Mudança recente com significado: o que antes exigia ajuda agora saiu sem ajuda.
  let virada = null;
  for (let i = 1; i < avaliadas.length; i++) {
    const antes = avaliadas.slice(0, i), agoraR = avaliadas[i];
    if (agoraR.resultado === 'autonomo' && AJUDA.includes(antes.at(-1).resultado)) virada = { tipo: 'superou', data: agoraR.data, antes: antes.at(-1).resultado };
    if (agoraR.resultado !== 'autonomo' && antes.at(-1).resultado === 'autonomo') virada = { tipo: 'voltou_ajuda', data: agoraR.data };
  }
  return {
    ...objetivo, estado, motivo, ultima, avaliadas: avaliadas.length, encontros: new Set(contatos.map(r => r.data)).size,
    ultimoContato: contatos.at(-1)?.data ?? null, fonte: ultima?.fonte ?? null, percepcao,
    repetiuEm: espacados.length >= 2 ? espacados[1] : null, virada, eventos: proprios,
  };
}
const minuscula = (t) => t ? t[0].toLowerCase() + t.slice(1) : t;

/** As três dimensões do panorama para um conjunto de assuntos (todos ou uma área). */
export function dimensoes(assuntos, agora) {
  const estudados = assuntos.filter(a => a.estado);
  const objetivos = assuntos.flatMap(a => a.objetivos);
  const objEstudados = estudados.flatMap(a => a.objetivos);
  const por = Object.fromEntries(EVIDENCIAS.map(e => [e, objEstudados.filter(o => o.estado === e).length]));
  const avaliados = objEstudados.length - por.nao_avaliado;
  const tentativas = estudados.flatMap(a => a.objetivos.flatMap(o => o.eventos.filter(r => r.tipo === 'tentativa' && r.resultado !== 'nao_avaliado' && r.data > somarDias(agora, -14))));
  const retornos = estudados.filter(a => a.estado.ultimaAtividade > somarDias(agora, -14) && a.estado.primeiraAtividade <= somarDias(agora, -14));
  const recente = estudados.flatMap(a => a.objetivos.filter(o => o.ultima).map(o => ({ assunto: a, objetivo: o, r: o.ultima }))).sort((x, y) => y.r.data.localeCompare(x.r.data))[0] ?? null;
  return {
    exploracao: { assuntos: estudados.length, total: assuntos.length, objetivos: objEstudados.length, objetivosTotal: objetivos.length },
    autonomia: { por, avaliados, objetivos: objEstudados.length, comAutonomia: por.sem_ajuda + por.repetiu,
      taxaTentativas: tentativas.length ? tentativas.filter(r => r.resultado === 'autonomo').length / tentativas.length : null, tentativas: tentativas.length,
      // Tentativas recentes concentradas em poucos objetivos escondem os não avaliados.
      objetivosNasTentativas: new Set(tentativas.map(r => r.objetivo)).size },
    acompanhamento: { retornos14: retornos.length, semRetorno: estudados.filter(a => ['em_retomada', 'sem_acompanhamento'].includes(a.estado.acompanhamento)).length, recente },
  };
}

/**
 * dados = { modulo:{nome,inicio,fim}, agora:'AAAA-MM-DD', objetivos:[{id, assunto, descricao}],
 *           registros:[{id, assunto|null, objetivo?, tipo, data, resultado?, fim?, atividade?, fonte?, evidencia?, confianca?}],
 *           confusoes:[{a, b, data}], inicioCiclo?:'AAAA-MM-DD' }
 * Registros sem assunto valem para todos (só pausas fazem sentido assim).
 * Com inicioCiclo, o caderno começa do zero nessa data: registros anteriores não entram.
 */
export function resumirModulo(dados, catalogo, regras = REGRAS_EXPERIMENTAIS) {
  const { modulo, agora, inicioCiclo } = dados;
  const doCiclo = registrosDoCiclo(dados.registros, inicioCiclo);
  const visiveis = doCiclo.filter(r => r.data <= agora);
  const pausas = visiveis.filter(r => r.tipo === 'pausa' && !r.assunto);
  const porAssunto = new Map(catalogo.map(a => [a.id, []]));
  for (const r of visiveis) if (r.assunto && porAssunto.has(r.assunto)) porAssunto.get(r.assunto).push(r);

  const objetivosDo = new Map(catalogo.map(a => [a.id, []]));
  for (const o of dados.objetivos ?? []) objetivosDo.get(o.assunto)?.push(o);
  const assuntos = catalogo.map(a => {
    const proprios = porAssunto.get(a.id), atividades = proprios.filter(r => ATIVIDADES.includes(r.tipo));
    const objetivos = objetivosDo.get(a.id).map(o => avaliarObjetivo(o, proprios, agora, regras));
    if (!atividades.length) return { ...a, estagio: 'semente', estado: null, registros: proprios, conquistas: {}, objetivos };
    const estado = avaliarCrescimento([...proprios, ...pausas], agora, regras);
    const conquistas = Object.fromEntries(Object.entries(datasDeConquista(doCiclo, regras).get(a.id) ?? {}).filter(([, d]) => d <= agora));
    const autonomias = atividades.filter(r => r.tipo === 'tentativa' && r.resultado === 'autonomo').map(r => r.data).sort();
    return { ...a, estagio: estado.estagio, estado, registros: proprios, conquistas, objetivos, primeiraAutonomia: autonomias[0] ?? null, ultimaAutonomia: autonomias.at(-1) ?? null };
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
  for (const c of (dados.confusoes ?? []).filter(c => c.data <= agora && (!inicioCiclo || c.data >= inicioCiclo))) {
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

  // Revisar: cada sugestão diz por que existe e qual tentativa fazer. Nada é agendado aqui.
  const PASSO = {
    pista: 'Tentar um caso diferente antes de consultar a explicação.',
    apos_explicacao: 'Explicar com suas palavras e, em outro dia, responder uma questão nova sem consulta.',
    nao_recuperou: 'Rever o ponto central e tentar recuperar de novo em 2 a 3 dias, sem consultar.',
  };
  const revisar = [];
  for (const a of iniciados) for (const o of a.objetivos) {
    if (o.estado === 'com_ajuda') revisar.push({ tipo: 'dificuldade', assunto: a, objetivo: o, data: o.ultima.data, porque: o.motivo, passo: PASSO[o.ultima.resultado] });
    else if (o.estado === 'nao_avaliado' && dias(a.estado.primeiraAtividade, agora) >= 2)
      revisar.push({ tipo: 'nao_avaliado', assunto: a, objetivo: o, data: a.estado.primeiraAtividade, porque: `Você estudou este assunto em ${fmt(a.estado.primeiraAtividade)}, mas este objetivo ainda não foi testado.`, passo: 'Tentar responder ou explicar antes de olhar o material.' });
    else if (o.estado === 'sem_ajuda' && dias(o.ultima.data, agora) >= regras.intervaloAutonomias)
      revisar.push({ tipo: 'repetir', assunto: a, objetivo: o, data: o.ultima.data, porque: `Recuperou sem ajuda em ${fmt(o.ultima.data)}, há ${dias(o.ultima.data, agora)} dias. Uma nova recuperação agora conta como encontro separado.`, passo: `Usar uma atividade diferente da última${o.ultima.atividade ? ` (foi ${o.ultima.atividade})` : ''}.` });
  }
  for (const c of confusoes.filter(c => c.vezes >= 2))
    revisar.push({ tipo: 'confusao', assunto: c.a, par: c.b, data: c.ultima, porque: `Você confundiu ${c.a.nome} com ${c.b.nome} ${c.vezes} vezes; a última em ${fmt(c.ultima)}.`, passo: 'Comparar os dois lado a lado: apresentação, exame que diferencia e conduta.' });
  for (const x of pertoDeCrescer.filter(x => x.pronto))
    revisar.push({ tipo: 'crescer', assunto: x.assunto, data: x.desde, porque: `A árvore está a um critério de virar ${x.para}: ${x.falta}.`, passo: 'Um encontro com tentativa avaliada cumpre o que falta.' });
  const ORDEM_REVISAR = ['dificuldade', 'confusao', 'nao_avaliado', 'repetir', 'crescer'];
  revisar.sort((x, y) => ORDEM_REVISAR.indexOf(x.tipo) - ORDEM_REVISAR.indexOf(y.tipo) || (x.tipo === 'dificuldade' || x.tipo === 'confusao' ? y.data.localeCompare(x.data) : x.data.localeCompare(y.data)));

  // Mudanças com significado nos últimos 14 dias (não contam cliques nem dias).
  const desde = somarDias(agora, -14), mudancas = [];
  const ANTES = { pista: 'precisava de pista', apos_explicacao: 'só saía após explicação', nao_recuperou: 'não saía' };
  for (const a of iniciados) {
    for (const o of a.objetivos) {
      if (o.virada?.tipo === 'superou' && o.virada.data > desde) mudancas.push({ data: o.virada.data, tom: 'avanco', assunto: a, objetivo: o, texto: `Recuperou sem ajuda um objetivo que antes ${ANTES[o.virada.antes]}.` });
      if (o.repetiuEm && o.repetiuEm > desde) mudancas.push({ data: o.repetiuEm, tom: 'avanco', assunto: a, objetivo: o, texto: 'Repetiu a autonomia em encontros separados.' });
      if (o.virada?.tipo === 'voltou_ajuda' && o.virada.data > desde) mudancas.push({ data: o.virada.data, tom: 'atencao', assunto: a, objetivo: o, texto: 'Voltou a precisar de ajuda; a recuperação anterior continua registrada.' });
    }
    for (const e of ['jovem', 'adulta']) if (a.conquistas[e] > desde) mudancas.push({ data: a.conquistas[e], tom: 'arvore', assunto: a, texto: `A árvore chegou a ${e}.` });
  }
  mudancas.sort((x, y) => y.data.localeCompare(x.data));

  // Histórico de sessões: um dia de estudo por linha.
  const sessoesMap = new Map();
  for (const r of atividades) {
    if (!sessoesMap.has(r.data)) sessoesMap.set(r.data, { data: r.data, assuntos: new Set(), novos: 0, estudos: 0, retomadas: 0, tentativas: Object.fromEntries(RESULTADOS_PAINEL.map(k => [k, 0])), registros: [] });
    const s = sessoesMap.get(r.data);
    s.assuntos.add(r.assunto); s.registros.push(r);
    if (r.tipo === 'estudo') s.estudos++;
    if (r.tipo === 'retomada') s.retomadas++;
    if (r.tipo === 'tentativa' && r.resultado in s.tentativas) s.tentativas[r.resultado]++;
  }
  for (const a of iniciados) sessoesMap.get(a.estado.primeiraAtividade).novos++;
  const sessoes = [...sessoesMap.values()].sort((x, y) => y.data.localeCompare(x.data));

  return {
    modulo, agora, origem: dados.origem ?? 'site', regras: regras.versao,
    total, iniciados: iniciados.length, porEstagio: contar(assuntos), assuntos, areas, serie, semanas: listaSemanas, ritmo,
    proximos: { pertoDeCrescer, recuperar, copa, dificuldades }, confusoes, marcos, revisar, mudancas, sessoes,
    dimensoes: dimensoes(assuntos, agora),
  };
}
