/** Planta de cima: lê o mesmo mundo usado na cena e não altera o jardim. */
import { gerarMundo } from "./mundo.js";
import { RAMPAS } from "./paleta.js";

const NS = "http://www.w3.org/2000/svg";
const $ = (id) => document.getElementById(id);
const SVG = $("mapa");
const numero = (n, casas = 0) => Number(n).toLocaleString("pt-BR", { maximumFractionDigits: casas });
const elemento = (tag, atributos = {}, texto) => {
  const e = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(atributos)) e.setAttribute(k, String(v));
  if (texto !== undefined) e.textContent = texto;
  return e;
};
const pontos = (lista) => lista.map((p) => `${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(" ");
const camada = (id) => { const g = elemento("g", { id }); SVG.append(g); return g; };
const adicionarTitulo = (e, texto) => e.prepend(elemento("title", {}, texto));
const rgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const coresAltura = [RAMPAS.salvia[2], RAMPAS.salvia[3], RAMPAS.salvia[4], RAMPAS.salvia[5]];

function terreno(m) {
  const canvas = document.createElement("canvas");
  const xmin=m.plano.passarela?-24:0;
  canvas.width = Math.round((m.largura-xmin) * 2); canvas.height = Math.round(m.altura * 2);
  const ctx = canvas.getContext("2d"), imagem = ctx.createImageData(canvas.width, canvas.height);
  const tons = coresAltura.map(rgb), pedra = rgb(RAMPAS.terra[2]);
  for (let y = 0; y < canvas.height; y++) for (let x = 0; x < canvas.width; x++) {
    const px = xmin+(x + 0.5) / 2, py = (y + 0.5) / 2, h = m.altitude(px, py);
    const nivel = Math.max(0, Math.min(3, Math.round(h / (m.DEGRAU || 4.5))));
    const inclinacao = Math.hypot(m.altitude(px + 0.5, py) - m.altitude(px - 0.5, py), m.altitude(px, py + 0.5) - m.altitude(px, py - 0.5));
    const c = inclinacao > 1.3 ? pedra : tons[nivel];
    const k = (y * canvas.width + x) * 4;
    imagem.data[k] = c[0]; imagem.data[k + 1] = c[1]; imagem.data[k + 2] = c[2]; imagem.data[k + 3] = 255;
  }
  ctx.putImageData(imagem, 0, 0);
  SVG.append(elemento("image", { x: xmin, y: 0, width: m.largura-xmin, height: m.altura, href: canvas.toDataURL(), "image-rendering": "pixelated", "data-tipo": "relevo-real" }));
  coresAltura.forEach((cor, i) => {
    const item = document.createElement("span"), amostra = document.createElement("i");
    amostra.className = "amostra"; amostra.style.backgroundColor = cor;
    item.append(amostra, `Patamar ${numero(i * (m.DEGRAU || 4.5), 1)} m`);
    $("altitudes").append(item);
  });
}

function curvas(m, pai) {
  // Interseções da mesma altitude em células de 1,5 m: linhas vêm do chão real.
  const passo = 1.5;
  for (let h = (m.DEGRAU || 4.5) / 2; h < 18; h += m.DEGRAU || 4.5) {
    const linhas = [];
    for (let y = 0; y < m.altura; y += passo) for (let x = m.plano.passarela?-24:0; x < m.largura; x += passo) {
      const q = [{ x, y }, { x: Math.min(m.largura, x + passo), y }, { x: Math.min(m.largura, x + passo), y: Math.min(m.altura, y + passo) }, { x, y: Math.min(m.altura, y + passo) }];
      const alturas = q.map((p) => m.altitude(p.x, p.y)), encontros = [];
      for (let k = 0; k < 4; k++) {
        const j = (k + 1) % 4;
        if ((alturas[k] < h) === (alturas[j] < h)) continue;
        const t = (h - alturas[k]) / (alturas[j] - alturas[k]);
        encontros.push({ x: q[k].x + (q[j].x - q[k].x) * t, y: q[k].y + (q[j].y - q[k].y) * t });
      }
      for (let k = 0; k + 1 < encontros.length; k += 2) linhas.push(`M${encontros[k].x.toFixed(2)},${encontros[k].y.toFixed(2)}L${encontros[k + 1].x.toFixed(2)},${encontros[k + 1].y.toFixed(2)}`);
    }
    if (linhas.length) pai.append(elemento("path", { d: linhas.join(""), fill: "none", stroke: RAMPAS.terra[1], "stroke-width": 0.28, opacity: 0.7, "data-altura": h }));
  }
}

function vegetacao(m, pai) {
  for (const o of m.objetos ?? []) {
    if (o.tipo !== "arvore" && o.tipo !== "arbusto") continue;
    const arvore = o.tipo === "arvore";
    const e = elemento("circle", { cx: o.x, cy: o.y, r: (arvore ? 1.6 : 0.7) * (o.escala || 1), fill: arvore ? RAMPAS.mata[2] : RAMPAS.mata[4], stroke: RAMPAS.mata[1], "stroke-width": 0.2, opacity: arvore ? 0.83 : 0.7, "data-tipo": o.tipo });
    pai.append(e);
  }
}

function setores(m, pai) {
  const definidos = m.plano?.setores;
  if (Array.isArray(definidos) && definidos.length) {
    for (const s of definidos) {
      if (![s.x, s.y, s.largura, s.profundidade].every(Number.isFinite)) continue;
      const g = elemento("g");
      g.append(elemento("rect", { x: s.x - s.largura / 2, y: s.y - s.profundidade / 2, width: s.largura, height: s.profundidade, rx: 2, fill: RAMPAS.mata[2], "fill-opacity": 0.08, stroke: RAMPAS.mata[1], "stroke-opacity": 0.5, "stroke-width": 0.32, "stroke-dasharray": "1.2 1.2" }));
      const texto = elemento("text", { x: s.x, y: s.y - s.profundidade / 2 + 3.1, "text-anchor": "middle", fill: RAMPAS.mata[0], "font-size": 2.45, "font-weight": 600 }, s.nome);
      g.append(texto); adicionarTitulo(g, s.descricao || s.nome); pai.append(g);
    }
    return;
  }
  // Sem setores cadastrados, os rótulos refletem o relevo e a vegetação existentes.
  const regioes = new Map();
  for (let y = 3; y < m.altura; y += 6) for (let x = 3; x < m.largura; x += 6) {
    if (m.fatorLago(x, y) < 1.1) continue;
    const nome = m.fatorLago(x, y) < 1.6 ? "Margens do lago" : m.altitude(x, y) >= 8.5 ? "Patamar alto" : m.densidade(x, y) > 0.5 ? "Bosque" : "Clareira";
    if (!regioes.has(nome)) regioes.set(nome, { x: 0, y: 0, n: 0 });
    const r = regioes.get(nome); r.x += x; r.y += y; r.n++;
  }
  for (const [nome, r] of regioes) pai.append(elemento("text", { x: r.x / r.n, y: r.y / r.n, "text-anchor": "middle", fill: RAMPAS.mata[0], "font-size": 2.8, "font-weight": 600, opacity: 0.68 }, nome));
}

function percursos(m, pai) {
  const trilha = m.trilha.amostras?.length ? m.trilha.amostras : m.trilha.pontos;
  const linha = pontos(trilha);
  pai.append(elemento("polyline", { points: linha, fill: "none", stroke: RAMPAS.terra[2], "stroke-width": m.trilha.largura + 0.7, "stroke-linejoin": "round", "stroke-linecap": "round" }));
  pai.append(elemento("polyline", { points: linha, fill: "none", stroke: RAMPAS.terra[5], "stroke-width": m.trilha.largura, "stroke-linejoin": "round", "stroke-linecap": "round", "data-tipo": "trilha-real" }));
  const lago = elemento("polygon", { points: pontos(m.lago.contorno), fill: RAMPAS.agua[3], stroke: RAMPAS.agua[1], "stroke-width": 0.65, "data-tipo": "lago-real" });
  adicionarTitulo(lago, "Lago do jardim"); pai.append(lago);
  const rio = m.riacho?.pontos ?? [];
  if (rio.length) {
    const curso=rio.filter((p,i)=>!i||Math.hypot(p.x-rio[i-1].x,p.y-rio[i-1].y)>0.0001);
    const lados=[[],[]];
    curso.forEach((p,i)=>{
      const a=curso[Math.max(0,i-1)],b=curso[Math.min(curso.length-1,i+1)],l=Math.hypot(b.x-a.x,b.y-a.y)||1;
      for(const lado of [0,1]){const r=(p.largura??m.riacho.largura)/2*(lado?1:-1);lados[lado].push({x:p.x-(b.y-a.y)/l*r,y:p.y+(b.x-a.x)/l*r});}
    });
    pai.append(elemento("polygon",{points:pontos([...lados[0],...lados[1].reverse()]),fill:RAMPAS.agua[3],stroke:RAMPAS.agua[1],"stroke-width":0.25,"data-tipo":"riacho-real"}));
  }
  let distanciaDesdeSeta = 7;
  for (let i = 1; i < rio.length; i++) {
    const a = rio[i - 1], b = rio[i], d = Math.hypot(b.x - a.x, b.y - a.y);
    distanciaDesdeSeta += d;
    if (d < 0.01 || distanciaDesdeSeta < 15) continue;
    const x = (a.x + b.x) / 2, y = (a.y + b.y) / 2, dx = (b.x - a.x) / d, dy = (b.y - a.y) / d;
    pai.append(elemento("polygon", { points: `${x + dx},${y + dy} ${x - dx - dy * 0.7},${y - dy + dx * 0.7} ${x - dx + dy * 0.7},${y - dy - dx * 0.7}`, fill: RAMPAS.agua[5], "data-tipo": "sentido-agua" }));
    distanciaDesdeSeta = 0;
  }
  let quedas = 0, escadas = 0, naEscada = false;
  for (let i = 0; i < trilha.length; i++) {
    const a = trilha[i];
    if (a.escada && !naEscada) escadas++;
    naEscada = Boolean(a.escada);
    const b = trilha[i + 1];
    if (!b || !(a.escada || b.escada)) continue;
    pai.append(elemento("line", { x1: a.x, y1: a.y, x2: b.x, y2: b.y, stroke: RAMPAS.pedra[3], "stroke-width": m.trilha.largura, "data-tipo": "escada-real" }));
    if (Math.abs(a.h - b.h) < 0.15) continue;
    const d = Math.hypot(b.x - a.x, b.y - a.y) || 1, nx = -(b.y - a.y) / d, ny = (b.x - a.x) / d, x = (a.x + b.x) / 2, y = (a.y + b.y) / 2;
    pai.append(elemento("line", { x1: x - nx * m.trilha.largura / 2, y1: y - ny * m.trilha.largura / 2, x2: x + nx * m.trilha.largura / 2, y2: y + ny * m.trilha.largura / 2, stroke: RAMPAS.pedra[1], "stroke-width": 0.22 }));
  }
  for (let i = 1; i < rio.length; i++) {
    const a = rio[i - 1], b = rio[i];
    if (Math.hypot(a.x - b.x, a.y - b.y) > 0.01 || !(a.agua - b.agua > 0.1)) continue;
    const e = elemento("g", { "data-tipo": "cascata-real", "data-x": b.x, "data-y": b.y });
    e.append(elemento("circle", { cx: b.x, cy: b.y, r: 1.55, fill: RAMPAS.agua[1], stroke: RAMPAS.agua[5], "stroke-width": 0.38 }));
    e.append(elemento("path", { d: `M${b.x - 0.65},${b.y - 0.7}v1.4m0.65,-1.4v1.4m0.65,-1.4v1.4`, stroke: RAMPAS.agua[5], "stroke-width": 0.25, fill: "none" }));
    adicionarTitulo(e, `Cascata · queda de ${numero(a.agua - b.agua, 1)} m`); pai.append(e); quedas++;
  }
  const pontes = [...(m.pontes ?? (m.ponte ? [m.ponte] : []))];
  const extra=m.plano.passarela;
  if(extra){const dx=extra.fim.x-extra.inicio.x,dy=extra.fim.y-extra.inicio.y;const L=Math.hypot(dx,dy);pontes.push({x:(extra.inicio.x+extra.fim.x)/2,y:(extra.inicio.y+extra.fim.y)/2,dx:dx/L,dy:dy/L,comprimento:L,largura:extra.largura,arqueamento:extra.arqueamento});}
  for (const p of pontes) {
    const e = elemento("g", { transform: `translate(${p.x} ${p.y}) rotate(${Math.atan2(p.dy, p.dx) * 180 / Math.PI})`, "data-tipo": "ponte-real" });
    e.append(elemento("rect", { x: -p.comprimento / 2, y: -p.largura / 2 - 0.25, width: p.comprimento, height: p.largura + 0.5, fill: RAMPAS.terra[3], stroke: RAMPAS.terra[1], "stroke-width": 0.45 }));
    for (let x = -p.comprimento / 2 + 1.7; x < p.comprimento / 2; x += 1.7) e.append(elemento("line", { x1: x, y1: -p.largura / 2, x2: x, y2: p.largura / 2, stroke: RAMPAS.terra[1], "stroke-width": 0.2 }));
    adicionarTitulo(e, "Ponte de madeira em arco"); pai.append(e);
  }
  $("resumo").textContent = `${numero(escadas)} ${escadas === 1 ? "escada" : "escadas"} · ${numero(pontes.length)} ${pontes.length === 1 ? "ponte" : "pontes"} · ${numero(quedas)} ${quedas === 1 ? "cascata" : "cascatas"} no mapa atual. As alturas, posições e trajetos vêm do mesmo jardim em 3D.`;
}

function locais(m, implantados, propostos) {
  const lista = (m.plano?.locais ?? []).filter((l) => l.id && Number.isFinite(l.x) && Number.isFinite(l.y));
  const desenhos = new Map(), botoes = new Map();
  const selecionar = (id) => {
    const l = lista.find((item) => item.id === id);
    if (!l) return;
    desenhos.forEach((e, chave) => { e.classList.toggle("local-ativo", chave === id); e.setAttribute("aria-pressed", String(chave === id)); });
    botoes.forEach((e, chave) => e.setAttribute("aria-pressed", String(chave === id)));
    const proposto = l.status !== "implantado";
    $("local-status").textContent = proposto ? "PROPOSTO" : "JÁ NO JARDIM";
    $("local-status").classList.toggle("proposto", proposto);
    $("local-nome").textContent = l.nome;
    $("local-descricao").textContent = l.descricao || "Um lugar previsto na composição do jardim.";
    const dados = $("local-dados"); dados.replaceChildren(); dados.hidden = false;
    const linha = (termo, valor) => { const d = document.createElement("div"), dt = document.createElement("dt"), dd = document.createElement("dd"); dt.textContent = `${termo}:`; dd.textContent = valor; d.append(dt, dd); dados.append(d); };
    if (Number.isFinite(l.largura) && Number.isFinite(l.profundidade)) {
      linha("Espaço", `${numero(l.largura, 1)} × ${numero(l.profundidade, 1)} m`);
      linha("Área prevista", `${numero(l.largura * l.profundidade)} m²`);
    }
    linha("Altura do terreno", `${numero(m.altitude(l.x, l.y), 1)} m`);
    $("local-nota").textContent = l.acesso==="replanejar" ? "Acesso em revisão após a retirada do caminho antigo." : proposto ? "O espaço está reservado no plano. A construção ainda será desenvolvida." : "Este lugar já faz parte do jardim. Sua posição acompanha o mapa atual.";
    $("ver-3d").href = `./index.html?local=${encodeURIComponent(l.id)}`;
    $("ver-3d").setAttribute("aria-label", `Ver ${l.nome} no mapa 3D`);
  };
  lista.forEach((l, i) => {
    const proposto = l.status !== "implantado", cor = proposto ? RAMPAS.outono[3] : RAMPAS.mata[6];
    const e = elemento("g", { role: "button", tabindex: 0, "aria-label": `${i + 1}. ${l.nome}. ${proposto ? "Proposto" : "Já no jardim"}`, "aria-pressed": false, "data-local": l.id, "data-status": proposto ? "proposto" : "implantado" });
    if (Number.isFinite(l.largura) && Number.isFinite(l.profundidade)) e.append(elemento("rect", { class: "local-area", x: l.x - l.largura / 2, y: l.y - l.profundidade / 2, width: l.largura, height: l.profundidade, rx: 0.7, fill: cor, "fill-opacity": proposto ? 0.12 : 0.08, stroke: cor, "stroke-dasharray": proposto ? "1.5 1" : "none" }));
    e.append(elemento("circle", { class: "marcador", cx: l.x, cy: l.y, r: 2.5, fill: RAMPAS.mata[0], stroke: cor, "stroke-width": 0.45 }));
    e.append(elemento("text", { x: l.x, y: l.y + 0.9, "text-anchor": "middle", "font-size": 2.75, "font-weight": 600, fill: cor, "pointer-events": "none" }, String(i + 1)));
    adicionarTitulo(e, l.nome);
    e.addEventListener("click", () => selecionar(l.id));
    e.addEventListener("keydown", (evento) => { if (evento.key === "Enter" || evento.key === " ") { evento.preventDefault(); selecionar(l.id); } });
    (proposto ? propostos : implantados).append(e); desenhos.set(l.id, e);
    const li = document.createElement("li"), b = document.createElement("button"), n = document.createElement("span"), texto = document.createElement("span"), pequeno = document.createElement("small");
    b.type = "button"; b.className = `local-botao${proposto ? " proposto" : ""}`; b.setAttribute("aria-pressed", "false"); b.dataset.local = l.id;
    n.className = "numero"; n.textContent = String(i + 1); texto.append(document.createTextNode(l.nome)); pequeno.textContent = proposto ? "Proposto" : "Já no jardim"; texto.append(pequeno); b.append(n, texto); li.append(b); $("lista-locais").append(li); botoes.set(l.id, b); b.addEventListener("click", () => selecionar(l.id));
  });
  $("sem-locais").hidden = Boolean(lista.length);
  if (!lista.length) {
    $("local-status").textContent = "MAPA ATUAL";
    $("local-nome").textContent = "O jardim visto de cima";
    $("local-descricao").textContent = "O relevo, os caminhos e o curso da água já podem ser explorados. Os lugares do plano aparecerão aqui quando forem definidos.";
  } else {
    const pedido = new URLSearchParams(window.location.search).get("local");
    selecionar(lista.some((l) => l.id === pedido) ? pedido : lista[0].id);
  }
}

function escala(m) {
  const e = elemento("g", { "aria-label": "Escala: vinte metros" });
  e.append(elemento("rect", { x: 3, y: m.altura - 7, width: 26, height: 5.5, fill: RAMPAS.mata[0], opacity: 0.83 }));
  e.append(elemento("path", { d: `M6,${m.altura - 5.5}v1.5h20v-1.5`, stroke: RAMPAS.betula[0], "stroke-width": 0.35, fill: "none" }));
  e.append(elemento("text", { x: 16, y: m.altura - 5.7, "text-anchor": "middle", fill: RAMPAS.betula[0], "font-size": 1.9 }, "20 m"));
  const norte = elemento("g", { "aria-label": "Norte" });
  norte.append(elemento("path", { d: `M${m.largura - 6},8l-1.4,3.2h2.8z`, fill: RAMPAS.mata[0] }));
  norte.append(elemento("text", { x: m.largura - 6, y: 6.6, "text-anchor": "middle", fill: RAMPAS.mata[0], "font-size": 2.2 }, "N"));
  SVG.append(e, norte);
}

async function preparar() {
  // Dá ao navegador um quadro para mostrar a preparação antes de gerar o mundo.
  await new Promise((resolver) => setTimeout(resolver, 0));
  const m = gerarMundo(1234);
  SVG.setAttribute("viewBox", `${m.plano.passarela?-24:0} 0 ${m.largura+(m.plano.passarela?24:0)} ${m.altura}`);
  $("dimensoes").textContent = `${numero(m.largura)} × ${numero(m.altura)} m`;
  if (m.plano?.nome) $("nome-plano").textContent = m.plano.nome;
  if (m.plano?.ideia) $("ideia").textContent = m.plano.ideia;
  terreno(m);
  const gCurvas = camada("mapa-curvas"), gSetores = camada("mapa-setores"), gVegetacao = camada("mapa-vegetacao"), gPercursos = camada("mapa-caminhos"), gLocais = camada("mapa-implantados"), gPropostas = camada("mapa-propostas");
  curvas(m, gCurvas); setores(m, gSetores); vegetacao(m, gVegetacao); percursos(m, gPercursos); locais(m, gLocais, gPropostas); escala(m);
  for (const nome of ["curvas", "setores", "vegetacao", "caminhos", "propostas"]) {
    const entrada = $(`camada-${nome}`), grupo = $(`mapa-${nome}`);
    const mostrar = () => { grupo.style.display = entrada.checked ? "" : "none"; };
    entrada.addEventListener("change", mostrar); mostrar();
  }
  $("aguarde").hidden = true;
  SVG.dataset.pronto = "true";
}

preparar().catch((erro) => {
  console.error("Não foi possível preparar a planta do jardim:", erro);
  $("aguarde").replaceChildren();
  const texto = document.createElement("p"); texto.textContent = "A planta não pôde ser carregada. Reabra esta página ou volte ao jardim."; $("aguarde").append(texto);
});
