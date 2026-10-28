export function formatRupiah(amount: number | null | undefined): string {
  if (amount === null || amount === undefined || isNaN(amount)) {
    return 'Belum Dikonfigurasi';
  }

  const formatted = Math.round(amount)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, '.');

  return `Rp${formatted}`;
}

export function isPriceConfigured(price: number | null | undefined): price is number {
  return typeof price === 'number' && !isNaN(price) && price > 0;
}
