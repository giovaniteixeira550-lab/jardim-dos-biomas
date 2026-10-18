import { Jardim } from '../src/cena.js';
const saida = document.querySelector('#resultado');
const jardim = new Jardim(document.querySelector('canvas'));
const erros = [];
window.addEventListener('error', e => erros.push(e.message));
window.addEventListener('unhandledrejection', e => erros.push(String(e.reason)));
const resultados = [];
function exigir(condicao, mensagem) { if (!condicao) throw Error(mensagem); }
async function prazo(promessa, etapa, ms = 60000) {
  let id;
  try { return await Promise.race([promessa, new Promise((_, rejeitar) => {
    id = setTimeout(() => rejeitar(Error(`Prazo excedido: ${etapa}`)), ms);
  })]); } finally { clearTimeout(id); }
}
async function amostrar() {
  exigir(!document.hidden, 'Abra o teste com a aba visível para medir os quadros.');
  return prazo(new Promise(resolve => {
    const deltas = [];
    let anterior, aquecimento = 15;
    function quadro(t) {
      if (anterior !== undefined && aquecimento-- <= 0) deltas.push(t - anterior);
      anterior = t;
      if (deltas.length < 90) requestAnimationFrame(quadro);
      else {
        deltas.sort((a, b) => a - b);
        resolve({ medianaMs: +deltas[45].toFixed(1), p95Ms: +deltas[85].toFixed(1) });
      }
    }
    requestAnimationFrame(quadro);
  }), 'amostragem de 90 quadros', 30000);
}
try {
  await prazo(jardim.carregar(1234, (_, etapa) => saida.textContent = etapa), 'carregamento');
  const base = JSON.stringify([jardim.alvo.toArray(), jardim.altura, jardim.yaw, jardim.pitch]);
  for (const modo of ['original', 'alta', 'original', 'alta']) {
    jardim.setQualidade(modo);
    const tempos = await amostrar();
    exigir(base === JSON.stringify([jardim.alvo.toArray(), jardim.altura, jardim.yaw, jardim.pitch]), 'Qualidade mudou o enquadramento.');
    exigir(jardim.pixel.uniforms.uContorno.value === 1 && jardim.pixel.uniforms.uQuant.value === 1, 'Contorno ou paleta desativados.');
    exigir(jardim.renderer.getContext().getError() === 0, 'Erro WebGL ao trocar qualidade.');
    resultados.push({ modo, ...tempos, tela: [jardim.canvas.width, jardim.canvas.height], cena: [jardim.rt.width, jardim.rt.height], sombra: jardim.sol.shadow.mapSize.toArray(), instancias: jardim.info().instancias });
    saida.textContent = JSON.stringify(resultados, null, 2);
  }
  for (const hora of ['noite', 'entardecer', 'dia']) {
    jardim.setHora(hora);
    await amostrar();
    exigir(jardim.renderer.getContext().getError() === 0, `Erro WebGL em ${hora}.`);
  }
  jardim.zoom(1.25); await amostrar();
  jardim.girar(1); await amostrar();
  exigir(erros.length === 0, erros.join('\n'));
  saida.textContent = 'PASSOU — troca de definição, enquadramento, paleta, contorno, dia/noite, zoom e giro.\n' + JSON.stringify(resultados, null, 2);
} catch (e) {
  saida.textContent = `FALHOU — ${e.message}\n${JSON.stringify(resultados, null, 2)}`;
} finally {
  jardim.dispose();
}
