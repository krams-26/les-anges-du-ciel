export type FinancePaymentStatus = "pending" | "validated" | "rejected" | "cancelled";

export function convertToCdf(amount: number, sourceCurrency: "CDF" | "USD", cdfPerUsd?: number | null) {
  if (!Number.isInteger(amount) || amount <= 0) throw new Error("Le montant doit être un entier positif.");
  if (sourceCurrency === "CDF") return { amountCdf: amount, rate: null };
  if (!cdfPerUsd || !Number.isInteger(cdfPerUsd) || cdfPerUsd <= 0) throw new Error("Un taux CDF/USD actif est requis pour une conversion en dollars.");
  return { amountCdf: amount * cdfPerUsd, rate: cdfPerUsd };
}

export function nextBalance(expectedAmountCdf: number, paidAmountCdf: number, paymentAmountCdf: number) {
  if (paymentAmountCdf <= 0) throw new Error("Le montant du paiement doit être positif.");
  const before = Math.max(0, expectedAmountCdf - paidAmountCdf);
  if (paymentAmountCdf > before) throw new Error("Le paiement dépasse le solde restant.");
  return { before, after: before - paymentAmountCdf, paidAfter: paidAmountCdf + paymentAmountCdf };
}

export function canTransitionPayment(current: FinancePaymentStatus, next: FinancePaymentStatus) {
  return (current === "pending" && ["validated", "rejected", "cancelled"].includes(next)) || (current === "validated" && next === "cancelled");
}

export function displayUsd(amountCdf: number, cdfPerUsd: number | null) {
  if (!cdfPerUsd || cdfPerUsd <= 0) return null;
  return Math.round((amountCdf / cdfPerUsd) * 100) / 100;
}
