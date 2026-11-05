/**
 * Ethiopian Birr (ETB) Currency Formatter
 */
export const CURRENCY = "ETB";

export const formatCurrency = (amount) => {
  const num = Number(amount) || 0;
  return `${num.toFixed(2)} ETB`;
};

export const formatETB = formatCurrency;
