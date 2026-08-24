import { describe, expect, it } from "vitest";
import { canTransitionPayment, convertToCdf, displayUsd, nextBalance } from "./financeEngine";

describe("moteur financier annuel", () => {
  it("convertit un paiement USD en CDF en figeant le taux", () => {
    expect(convertToCdf(10, "USD", 2800)).toEqual({ amountCdf: 28000, rate: 2800 });
    expect(displayUsd(28000, 2800)).toBe(10);
  });
  it("gère paiement partiel et plusieurs paiements sans dépasser le solde", () => {
    expect(nextBalance(100000, 0, 25000)).toEqual({ before: 100000, after: 75000, paidAfter: 25000 });
    expect(nextBalance(100000, 25000, 75000)).toEqual({ before: 75000, after: 0, paidAfter: 100000 });
    expect(() => nextBalance(100000, 25000, 75001)).toThrow("dépasse");
  });
  it("autorise seulement les transitions bancaires auditables", () => {
    expect(canTransitionPayment("pending", "validated")).toBe(true);
    expect(canTransitionPayment("pending", "rejected")).toBe(true);
    expect(canTransitionPayment("validated", "cancelled")).toBe(true);
    expect(canTransitionPayment("rejected", "validated")).toBe(false);
  });
});
