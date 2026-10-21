/** Traduz o que o site envia (sessões consolidadas do organizador com marcas de assunto do
 * jardim) para os registros do caderno. Puro: sem rede nem DOM. Formato de entrada:
 * { sessoes:[{id,data,data_real,tipo,status_fechamento}], marcas:[{sessao_id,assunto_id,objetivo_id}],
 *   objetivos:[{sessao_id,objetivo_id,resultado,grau_ajuda,evidencia_resumida}], descricoes:[{id,descricao}] } */

const ATIVIDADE = { leitura: 'leitura', estudo_guiado: 'estudo guiado', revisao: 'revisão', questoes: 'questões', caso_clinico: 'caso clínico' };
const diaEmSaoPaulo = (instante) => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date(instante));

/** Resultado observado do organizador → resultado do caderno. A ajuda explícita sempre vence:
 * "autônomo" com pista ou explicação não conta como recuperação sem ajuda (regra do site). */
export function resultadoDoOrganizador(resultado, grauAjuda) {
  if (resultado === 'nao_avaliado' || !resultado) return null;
  if (grauAjuda === 'apos_explicacao' || resultado === 'apos_explicacao') return 'apos_explicacao';
  if (grauAjuda === 'com_pistas' || resultado === 'com_pista') return 'pista';
  return resultado === 'autonomo' ? 'autonomo' : null;
}

export function traduzirOrganizador(dados) {
  const sessoes = new Map((dados?.sessoes ?? []).filter(s => s.status_fechamento === 'consolidado').map(s => [s.id, s]));
  const avaliacoes = new Map((dados?.objetivos ?? []).map(o => [`${o.sessao_id}|${o.objetivo_id}`, o]));
  const descricoes = new Map((dados?.descricoes ?? []).map(d => [d.id, d.descricao]));
  const registros = [], objetivos = new Map();
  for (const m of dados?.marcas ?? []) {
    const s = sessoes.get(m.sessao_id);
    if (!s || typeof m.assunto_id !== 'string') continue;
    const data = s.data_real || diaEmSaoPaulo(s.data);
    if (!m.objetivo_id) {
      registros.push({ id: `${s.id}:${m.assunto_id}`, assunto: m.assunto_id, tipo: s.tipo === 'revisao' ? 'retomada' : 'estudo', data, atividade: ATIVIDADE[s.tipo] });
      continue;
    }
    // O mesmo objetivo canônico pode ser avaliado em assuntos diferentes: um objetivo por par.
    const objetivo = `${m.objetivo_id}@${m.assunto_id}`;
    if (!objetivos.has(objetivo)) objetivos.set(objetivo, { id: objetivo, assunto: m.assunto_id, descricao: descricoes.get(m.objetivo_id) ?? 'Objetivo avaliado' });
    const a = avaliacoes.get(`${s.id}|${m.objetivo_id}`), resultado = resultadoDoOrganizador(a?.resultado, a?.grau_ajuda);
    registros.push({
      id: `${s.id}:${m.assunto_id}:${m.objetivo_id}`, assunto: m.assunto_id, objetivo, data,
      atividade: ATIVIDADE[s.tipo], fonte: 'observado', ...(a?.evidencia_resumida ? { evidencia: a.evidencia_resumida } : {}),
      ...(resultado ? { tipo: 'tentativa', resultado } : { tipo: 'estudo' }),
    });
  }
  return { registros, objetivos: [...objetivos.values()] };
}
