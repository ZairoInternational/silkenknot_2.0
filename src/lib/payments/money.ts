/** Integer paise. Prices in this shop are whole rupees, so paise is rupees × 100. */

export function rupeesToPaise(rupees: number) {
  if (!Number.isInteger(rupees) || rupees < 0 || rupees > 10_000_000) {
    throw new Error("Amount must be a whole number of rupees.");
  }
  return rupees * 100;
}

export function paiseToRupees(paise: number) {
  if (!Number.isInteger(paise) || paise < 0) throw new Error("Amount must be whole paise.");
  return paise / 100;
}

/** Half-up percent of an integer paise amount. Percent is a whole number 0–100. */
export function percentOfPaise(basePaise: number, percent: number) {
  if (!Number.isInteger(basePaise) || basePaise < 0) throw new Error("Base must be whole paise.");
  if (!Number.isInteger(percent) || percent < 0 || percent > 100) throw new Error("Percent is out of range.");
  return Math.floor((basePaise * percent + 50) / 100);
}
