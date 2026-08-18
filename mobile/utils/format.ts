// valueCents en CLP guarda pesos enteros, no centavos (el peso chileno no
// tiene subunidad) — así lo documenta el seed y así llegan los montos reales
// de Fintoc, por eso NO se divide por 100 acá.
export const fmtCLP = (cents: number) =>
  new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(cents);

export const fmtFecha = (iso: string) =>
  new Date(iso).toLocaleString('es-CL', { dateStyle: 'short', timeStyle: 'short' });