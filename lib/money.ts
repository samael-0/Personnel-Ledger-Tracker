export const SUPPORTED_CURRENCIES = [
  { code: "USD", symbol: "$", name: "US Dollar" },
  { code: "EUR", symbol: "€", name: "Euro" },
  { code: "GBP", symbol: "£", name: "British Pound" },
  { code: "INR", symbol: "₹", name: "Indian Rupee" },
  { code: "NPR", symbol: "Rs.", name: "Nepalese Rupee" },
  { code: "CAD", symbol: "CA$", name: "Canadian Dollar" },
  { code: "AUD", symbol: "A$", name: "Australian Dollar" },
  { code: "JPY", symbol: "¥", name: "Japanese Yen", decimals: 0 },
] as const;

export type CurrencyCode = (typeof SUPPORTED_CURRENCIES)[number]["code"];

export function getCurrencyMeta(code: string) {
  const found = SUPPORTED_CURRENCIES.find((c) => c.code === code.toUpperCase());
  return {
    code: found ? found.code : code.toUpperCase(),
    symbol: found ? found.symbol : code.toUpperCase() + " ",
    name: found ? found.name : code.toUpperCase(),
    decimals:
      found && "decimals" in found && (found as any).decimals !== undefined
        ? (found as any).decimals
        : 2,
  };
}

/**
 * Converts integer minor units to formatted currency string
 * e.g., 1499 -> "$14.99"
 */
export function formatMoney(
  amountMinor: number,
  currencyCode = "USD",
  showCode = false
): string {
  const meta = getCurrencyMeta(currencyCode);
  const decimals = "decimals" in meta && meta.decimals !== undefined ? meta.decimals : 2;
  const isNegative = amountMinor < 0;
  // Ensure integer minor units to avoid float precision issues
  const absAmount = Math.round(Math.abs(amountMinor));

  let formattedNumber = "";
  if (decimals === 0) {
    formattedNumber = absAmount.toLocaleString();
  } else {
    const units = Math.floor(absAmount / 100);
    const fraction = (absAmount % 100).toString().padStart(2, "0");
    formattedNumber = `${units.toLocaleString()}.${fraction}`;
  }

  const sign = isNegative ? "-" : "";
  const codeSuffix = showCode ? ` ${meta.code}` : "";

  return `${sign}${meta.symbol}${formattedNumber}${codeSuffix}`;
}

/**
 * Converts decimal string input like "14.99" into integer minor units 1499
 */
export function parseToMinorUnits(
  input: string | number,
  currencyCode = "USD"
): number {
  const meta = getCurrencyMeta(currencyCode);
  const decimals = "decimals" in meta && meta.decimals !== undefined ? meta.decimals : 2;

  if (typeof input === "number") {
    if (decimals === 0) {
      return Math.round(input);
    }
    return Math.round(input * 100);
  }

  const cleaned = input.replace(/[^0-9.-]/g, "").trim();
  if (!cleaned) return 0;

  const parsed = parseFloat(cleaned);
  if (isNaN(parsed)) return 0;

  if (decimals === 0) {
    return Math.round(parsed);
  }

  return Math.round(parsed * 100);
}
