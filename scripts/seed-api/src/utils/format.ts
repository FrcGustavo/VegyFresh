export const pad = (value: number, size = 3) =>
  value.toString().padStart(size, "0");

export const roundCurrency = (value: number) => Number(value.toFixed(2));

export const seedDate = (index: number, hour = 12) => {
  const date = new Date(Date.UTC(2025, 0, 1, hour));
  date.setUTCDate(date.getUTCDate() + index);
  return date.toISOString();
};

export const logStep = (message: string) => console.log(`\n[seed] ${message}`);
