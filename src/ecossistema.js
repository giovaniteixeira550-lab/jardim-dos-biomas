/**
 * Ecossistema — regras ecológicas e geográficas (simplificadas, mas reais).
 *
 * Tudo aqui é calculado UMA vez por indivíduo (na criação do mundo e quando
 * ele muda de estágio), nunca a cada quadro: o jogo continua leve.
 *
 * 1. AMBIENTE (geografia): cada ponto do terreno tem
 *    - umidade do solo: perto d'água e em vales (a água escorre morro abaixo
 *      e se acumula nas depressões); declive drena;
 *    - altitude relativa e declive (derivados do relevo);
 *    - luz potencial: céu aberto nas clareiras, menos sob mata densa.
 * 2. NICHO (ecologia): cada espécie tem um ótimo de umidade, tolerância à
 *    sombra e preferência de altitude (`especies.js`). A aptidão de um lugar
 *    para uma espécie decide QUEM nasce ali (com raridade e um pouco de acaso).
 * 3. COMPETIÇÃO POR LUZ (física): copas vizinhas mais altas, sobretudo do lado
 *    de onde vem o sol, sombreiam a árvore. Menos luz ⇒ menos vigor ⇒ árvore
 *    menor e crescimento mais lento — exceto nas espécies tolerantes à sombra.
 */
import { ESPECIES } from "./especies.js";

const clamp01 = (v) => Math.min(1, Math.max(0, v));
const gauss = (x, otimo, tol) => Math.exp(-((x - otimo) ** 2) / (2 * tol * tol));

/** Direção HORIZONTAL de onde vem o sol (mesma luz da cena). */
export const SOL = (() => {
  const x = -0.6, z = -0.35, n = Math.hypot(x, z);
  return { x: x / n, z: z / n };
})();

/** Campos do ambiente para um mundo gerado por `gerarMundo`. */
export function criarAmbiente(m) {
  const declive = (x, y) => {
    const dx = (m.altitude(x + 1, y) - m.altitude(x - 1, y)) / 2;
    const dy = (m.altitude(x, y + 1) - m.altitude(x, y - 1)) / 2;
    return clamp01(Math.hypot(dx, dy) * 4); // ~0,25 m/m já é íngreme para a clareira
  };
  const altitudeRel = (x, y) => clamp01((m.altitude(x, y) + 1.6) / 3.2);
  const umidade = (x, y) => {
    const raioMedio = (m.lago.rx + m.lago.ry) / 2;
    const dAgua = Math.max(0, m.fatorLago(x, y) - 1) * raioMedio; // metros até a margem (aprox.)
    const agua = Math.exp(-dAgua / 14);
    // Vale: abaixo da média do entorno (10 m) ⇒ acumula água escorrida.
    const h = m.altitude(x, y);
    const media = (m.altitude(x + 10, y) + m.altitude(x - 10, y) + m.altitude(x, y + 10) + m.altitude(x, y - 10)) / 4;
    const vale = clamp01(0.5 + (media - h) * 0.7);
    return clamp01(0.62 * agua + 0.38 * vale - declive(x, y) * 0.25 + 0.16);
  };
  const luzAberta = (x, y) => clamp01(1 - m.densidade(x, y) * 0.8);
  return { umidade, declive, altitudeRel, luzAberta };
}

/** Aptidão 0..1 de uma espécie para condições (umidade, luz, altitude relativa). */
export function aptidao(especie, { umidade, luz, altitude }) {
  const n = ESPECIES[especie].nicho;
  const fu = gauss(umidade, n.umidade[0], n.umidade[1]);
  // Luz: espécies de sol pleno sofrem na sombra; tolerantes quase não ligam.
  const fl = clamp01(luz + n.sombra * (1 - luz) * 1.1);
  const fa = n.altitude ? gauss(altitude, n.altitude[0], n.altitude[1]) : 1;
  return fu * fl * fa;
}

/** Condições de um ponto (luz potencial, antes da competição). */
export function condicoes(amb, x, y) {
  return { umidade: amb.umidade(x, y), luz: amb.luzAberta(x, y), altitude: amb.altitudeRel(x, y) };
}

/**
 * Quem nasce aqui: sorteio ponderado por aptidão² × raridade. O quadrado
 * favorece fortemente a espécie mais adaptada, sem eliminar o acaso.
 */
export function escolherEspecie(tipo, cond, rng) {
  if (tipo === "arbusto") return "arbusto";
  const pesos = Object.entries(ESPECIES)
    .filter(([, e]) => !e.arbusto)
    .map(([id, e]) => [id, aptidao(id, cond) ** 2 * e.raridade]);
  const total = pesos.reduce((s, [, p]) => s + p, 0);
  let r = rng() * total;
  for (const [id, p] of pesos) if ((r -= p) <= 0) return id;
  return pesos[0][0];
}

/**
 * Competição por luz entre indivíduos já plantados. Cada indivíduo precisa de
 * { x, z, altura, especie }. Escreve: luz (0..1), vigor (0..1).
 * Raio da copa ≈ 35% da altura; só vizinhos com ≥ 70% da altura sombreiam.
 */
export function competirPorLuz(individuos, amb) {
  const CEL = 8;
  const grade = new Map();
  for (const a of individuos) {
    const k = `${Math.floor(a.x / CEL)},${Math.floor(a.z / CEL)}`;
    grade.set(k, [...(grade.get(k) ?? []), a]);
  }
  for (const a of individuos) {
    const ra = a.altura * 0.35;
    let sombra = 0;
    const cx = Math.floor(a.x / CEL), cz = Math.floor(a.z / CEL);
    for (let i = -2; i <= 2; i++)
      for (let j = -2; j <= 2; j++)
        for (const b of grade.get(`${cx + i},${cz + j}`) ?? []) {
          if (b === a || ESPECIES[b.especie].arbusto || b.altura < a.altura * 0.7) continue;
          const dx = b.x - a.x, dz = b.z - a.z, d = Math.hypot(dx, dz);
          const sobreposicao = clamp01(1 - d / (ra + b.altura * 0.35));
          if (!sobreposicao) continue;
          // Vizinho do lado do sol sombreia mais (a luz vem de SOL).
          const ladoSol = d > 0 ? Math.max(0, (dx * -SOL.x + dz * -SOL.z) / d) : 1;
          sombra += sobreposicao * (0.55 + 0.45 * ladoSol) * Math.min(1.5, b.altura / a.altura);
        }
    a.luz = clamp01(amb.luzAberta(a.x, a.z) * 0.4 + 0.6 - sombra * 0.42);
    a.umidade = amb.umidade(a.x, a.z);
    a.altitudeRel = amb.altitudeRel(a.x, a.z);
    a.vigor = aptidao(a.especie, { umidade: a.umidade, luz: a.luz, altitude: a.altitudeRel });
  }
}

/** Textos para a ficha do indivíduo. */
export function descrever(a) {
  const umid = a.umidade < 0.3 ? "seco" : a.umidade < 0.55 ? "moderado" : a.umidade < 0.8 ? "úmido" : "encharcado";
  const luz = a.luz < 0.4 ? "sombra" : a.luz < 0.7 ? "meia-sombra" : "sol pleno";
  const vigor = a.vigor < 0.35 ? "fraco" : a.vigor < 0.7 ? "bom" : "ótimo";
  return [`Solo: ${umid} · Luz: ${luz}`, `Vigor: ${vigor} (${Math.round(a.vigor * 100)}%)`];
}
