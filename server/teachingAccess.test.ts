import { describe, expect, it } from "vitest";
import { enrollmentMatchesTeachingContext, periodMatchesTeachingContext } from "./academicResults";
import { canAccessAssignment } from "./routers/teaching";

describe("isolation pédagogique enseignant", () => {
  const assignment = { classId: 7, academicYearId: 2026 };

  it("refuse un élève d’une autre classe malgré un identifiant valide", () => {
    expect(enrollmentMatchesTeachingContext(assignment, { classId: 8, academicYearId: 2026, status: "active" })).toBe(false);
  });

  it("refuse un élève d’une autre année scolaire", () => {
    expect(enrollmentMatchesTeachingContext(assignment, { classId: 7, academicYearId: 2027, status: "active" })).toBe(false);
  });

  it("autorise seulement un élève actif de la bonne classe et année", () => {
    expect(enrollmentMatchesTeachingContext(assignment, { classId: 7, academicYearId: 2026, status: "active" })).toBe(true);
    expect(enrollmentMatchesTeachingContext(assignment, { classId: 7, academicYearId: 2026, status: "withdrawn" })).toBe(false);
  });

  it("refuse une période d’une autre année", () => {
    expect(periodMatchesTeachingContext(assignment, { academicYearId: 2027 })).toBe(false);
    expect(periodMatchesTeachingContext(assignment, { academicYearId: 2026 })).toBe(true);
  });

  it("refuse l’affectation ou le cours d’un autre enseignant, mais autorise l’administrateur", () => {
    expect(canAccessAssignment("user", 12, 99)).toBe(false);
    expect(canAccessAssignment("user", 12, 12)).toBe(true);
    expect(canAccessAssignment("admin", null, 99)).toBe(true);
  });
});
