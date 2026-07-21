let symbol = '₱';

export function setCurrencySymbol(s: string) {
  symbol = s || '₱';
}

/** Format a number as store currency, e.g. ₱140.00 */
export function money(value: number): string {
  return `${symbol}${value.toFixed(2)}`;
}
