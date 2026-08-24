import { describe, expect, it } from "vitest";
import { canArchive, canCloseNotes, canEditAcademicData, canProclaim, hasCompletedSecondSession, requiresExplicitReadmission } from "./annualCycle";

describe("cycle académique annuel", () => {
  it("bloque la clôture tant que les notes ne sont pas toutes finalisées", () => {
    expect(canCloseNotes("active", 1)).toBe(false);
    expect(canCloseNotes("active", 0)).toBe(true);
  });

  it("bloque la proclamation avant clôture et avant traitement de deuxième session", () => {
    expect(canProclaim({ status: "active", secondSessionRequired: false, secondSessionStatuses: [], deliberationEnabled: false, allowIndividualDeliberation: false, activeEnrollments: 0, validatedGlobalDecisions: 0, requiredIndividualDecisions: 0, validatedIndividualDecisions: 0 })).toBe(false);
    expect(hasCompletedSecondSession(["eligible", "registered"])).toBe(false);
    expect(canProclaim({ status: "notes_closed", secondSessionRequired: true, secondSessionStatuses: ["completed", "registered"], deliberationEnabled: false, allowIndividualDeliberation: false, activeEnrollments: 0, validatedGlobalDecisions: 0, requiredIndividualDecisions: 0, validatedIndividualDecisions: 0 })).toBe(false);
  });

  it("autorise les statuts terminaux configurables de deuxième session", () => {
    expect(hasCompletedSecondSession(["exempt", "ineligible", "absent", "completed", "withdrawn"])).toBe(true);
  });

  it("respecte la délibération globale ou individuelle avant proclamation", () => {
    const common = { status: "notes_closed" as const, secondSessionRequired: false, secondSessionStatuses: [] as const, activeEnrollments: 3, validatedGlobalDecisions: 2, requiredIndividualDecisions: 1, validatedIndividualDecisions: 0 };
    expect(canProclaim({ ...common, deliberationEnabled: true, allowIndividualDeliberation: false })).toBe(false);
    expect(canProclaim({ ...common, deliberationEnabled: false, allowIndividualDeliberation: true })).toBe(false);
    expect(canProclaim({ ...common, deliberationEnabled: false, allowIndividualDeliberation: true, validatedIndividualDecisions: 1 })).toBe(true);
  });

  it("gèle les résultats proclamés et archive seulement une année proclamée", () => {
    expect(canEditAcademicData("notes_closed")).toBe(false);
    expect(canEditAcademicData("proclaimed")).toBe(false);
    expect(canArchive("notes_closed")).toBe(false);
    expect(canArchive("proclaimed")).toBe(true);
  });

  it("ne reconduit jamais automatiquement les dossiers exclus, décédés, transférés ou retirés", () => {
    for (const status of ["excluded", "deceased", "transferred", "withdrawn"]) expect(requiresExplicitReadmission(status)).toBe(true);
    expect(requiresExplicitReadmission("closed")).toBe(false);
  });
});
