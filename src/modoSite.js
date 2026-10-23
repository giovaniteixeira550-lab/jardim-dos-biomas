/** O mesmo modo vale no iframe do site e ao abrir seu endereço diretamente. */
export function modoSite(ambiente = globalThis) {
  return Boolean(ambiente.parent && ambiente.parent !== ambiente) ||
    new URLSearchParams(ambiente.location?.search ?? '').get('incorporado') === '1';
}
