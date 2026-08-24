import { describe, expect, it } from "vitest";
import { createsNextEnrollment, requiresTargetClass, sourceEnrollmentStatus, targetEnrollmentType } from "./enrollmentTransitions";

describe("transitions d’inscription annuelle", () => {
  it("conserve le dossier permanent pour une promotion ou un redoublement", () => {
    expect(createsNextEnrollment("promote")).toBe(true);
    expect(createsNextEnrollment("repeat")).toBe(true);
    expect(targetEnrollmentType("promote")).toBe("re_enrollment");
    expect(targetEnrollmentType("repeat")).toBe("repeat");
    expect(requiresTargetClass("promote")).toBe(true);
  });

  it("préserve les sorties historiques sans créer d’inscription suivante", () => {
    for (const transition of ["transfer", "withdraw", "deceased", "exclude", "other"] as const) expect(createsNextEnrollment(transition)).toBe(false);
    expect(sourceEnrollmentStatus("transfer")).toBe("transferred");
    expect(sourceEnrollmentStatus("withdraw")).toBe("withdrawn");
    expect(sourceEnrollmentStatus("deceased")).toBe("deceased");
    expect(sourceEnrollmentStatus("exclude")).toBe("excluded");
  });
});
