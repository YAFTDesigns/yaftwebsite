// Tortoise licence prices. Amounts are in minor units (paise / cents).
// INR base price is owner-approved (₹4,100); GST is added on top for India.
export const TORTOISE_USD_CENTS = 4900; // US$49 per licence key, export (no GST)
export const TORTOISE_INR_BASE_PAISE = 410000; // ₹4,100 per licence key before GST (approved by owner)
export const GST_RATE_PERCENT = 18;
export const MAX_QUANTITY = 10;

export type Currency = 'INR' | 'USD';

export interface Price {
  currency: Currency;
  quantity: number;
  base: number; // minor units, before GST
  gst: number; // minor units, 0 for USD
  total: number; // minor units, what Razorpay charges
}

export function priceFor(currency: Currency, quantity: number): Price {
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > MAX_QUANTITY) {
    throw new Error('Invalid quantity');
  }
  if (currency === 'USD') {
    const base = TORTOISE_USD_CENTS * quantity;
    return { currency, quantity, base, gst: 0, total: base };
  }
  const base = TORTOISE_INR_BASE_PAISE * quantity;
  const gst = Math.round((base * GST_RATE_PERCENT) / 100);
  return { currency, quantity, base, gst, total: base + gst };
}

export function formatMinor(minor: number, currency: Currency): string {
  const v = (minor / 100).toLocaleString(currency === 'INR' ? 'en-IN' : 'en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return currency === 'INR' ? `₹${v}` : `US$${v}`;
}
