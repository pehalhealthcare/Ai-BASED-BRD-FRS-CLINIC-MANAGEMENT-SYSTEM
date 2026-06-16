export const formatCurrency = (value, currency = 'INR') =>
  `${currency} ${Number(value || 0).toFixed(2)}`;
