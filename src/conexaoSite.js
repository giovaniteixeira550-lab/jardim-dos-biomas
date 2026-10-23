/** Quando a demo roda dentro do site de estudos (iframe), recebe os registros da conta por
 * postMessage e os entrega ao caderno. Só aceita mensagens das origens do site; os dados ficam
 * na memória desta página, sem salvar nem enviar a lugar algum. */
import './painelModulo.js'; // garante window.jardimModulo antes da primeira mensagem
import { traduzirOrganizador } from './registrosOrganizador.js';
import { modoSite } from './modoSite.js';

const VERSAO = 1;
const ORIGENS_SITE = ['https://study-compass-26.lovable.app', 'https://id-preview--dbee4ccb-0378-455b-bc99-6a414dfb9a9f.lovable.app'];
// Desenvolvimento: com a demo servida localmente, o site local também pode conversar com ela.
const local = (o) => /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(o);
const permitida = (o) => ORIGENS_SITE.includes(o) || (local(location.origin) && local(o));

if (modoSite()) document.documentElement.dataset.incorporado = '1';

if (window.parent !== window) {
  addEventListener('message', (e) => {
    if (e.source !== window.parent || !permitida(e.origin)) return;
    const msg = e.data;
    if (msg?.tipo !== 'jardim:registros' || msg.versao !== VERSAO) return;
    try { window.jardimModulo?.carregar(traduzirOrganizador(msg.dados)); }
    catch (erro) { console.error('Registros do site recusados:', erro); }
  });
  // Avisa que está pronta; só as origens do site recebem o aviso (que não leva dados).
  const origemPai = (() => { try { return new URL(document.referrer).origin; } catch { return null; } })();
  for (const o of origemPai && permitida(origemPai) ? [origemPai] : ORIGENS_SITE) window.parent.postMessage({ tipo: 'jardim:pronto', versao: VERSAO }, o);
}
