export const formatCurrency = (value) => {
  const amount = Number(value || 0);
  return `Br${amount.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
};

export const formatDate = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleDateString();
};

export const shortId = (id) => (id ? String(id).slice(-8) : "—");
