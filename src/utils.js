export const genId = () => Math.random().toString(36).substr(2, 9);

export const fmt = (n) => `$${Number(n).toFixed(2)}`;

export const fmtDate = (d) =>
  new Date(d + 'T12:00:00').toLocaleDateString('es-VE', {
    day: '2-digit', month: 'short', year: 'numeric',
  });

export const today = () => new Date().toISOString().split('T')[0];

export const nextInvoice = (sales) => {
  const nums = sales.map(s => {
    const m = s.invoiceNum?.match(/(\d+)$/);
    return m ? parseInt(m[1]) : 0;
  });
  const next = Math.max(0, ...nums) + 1;
  return `FAC-${String(next).padStart(3, '0')}`;
};
