import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import { schoolInputs } from "./routers/school";
import { canAccessAssignment, teachingInputs } from "./routers/teaching";
import { canValidateDeliberation, secondSessionInputs } from "./routers/secondSession";
import type { TrpcContext } from "./_core/context";

describe("validations des opérations scolaires", () => {
  it("accepte une création d’élève avec identité, inscription et responsable", () => {
    const parsed = schoolInputs.studentCreate.parse({
      studentCode: "STU-004201",
      lastName: "Kabila",
      firstName: "Jean",
      sex: "M",
      academicYearId: 1,
      classId: 1,
      enrollmentType: "re_enrollment",
      guardians: [{ fullName: "Mme Odette Kabila", relationship: "mother", phone: "+243810000000", isPrimary: true }],
    });
    expect(parsed.studentCode).toBe("STU-004201");
    expect(parsed.guardians).toHaveLength(1);
  });

  it("refuse une création d’élève sans responsable", () => {
    expect(() => schoolInputs.studentCreate.parse({ studentCode: "STU-004202", lastName: "Kabila", firstName: "Jean", sex: "M", academicYearId: 1, enrollmentType: "new", guardians: [] })).toThrow();
  });

  it("normalise les codes de cours et d’employé en majuscules", () => {
    expect(schoolInputs.courseCreate.parse({ code: "math", name: "Mathématiques", section: "Secondaire", levels: "7e" }).code).toBe("MATH");
    expect(schoolInputs.teacherCreate.parse({ employeeCode: "emp-100", fullName: "Mme Sophie Lukusa" }).employeeCode).toBe("EMP-100");
  });

  it("refuse la création d’un cours pour un compte non administrateur", async () => {
    const ctx: TrpcContext = {
      user: { id: 7, openId: "teacher-test", name: "Compte enseignant", email: null, loginMethod: "manus", role: "user", createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() },
      req: {} as TrpcContext["req"],
      res: {} as TrpcContext["res"],
    };
    const caller = appRouter.createCaller(ctx);
    await expect(caller.school.courses.create({ code: "GEO", name: "Géographie", section: "Secondaire", levels: "7e" })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("refuse une note négative ou supérieure au maximum", () => {
    const base = { assignmentId: 1, periodId: 1, scores: [{ enrollmentId: 1, score: 8, maximum: 10 }] };
    expect(teachingInputs.grades.parse(base).scores[0]?.score).toBe(8);
    expect(() => teachingInputs.grades.parse({ ...base, scores: [{ enrollmentId: 1, score: -1, maximum: 10 }] })).toThrow();
    expect(() => teachingInputs.grades.parse({ ...base, scores: [{ enrollmentId: 1, score: 11, maximum: 10 }] })).toThrow();
  });

  it("n’accepte que les statuts de présence réglementaires", () => {
    const base = { assignmentId: 1, sessionDate: new Date("2026-08-23"), records: [{ enrollmentId: 1, status: "present" }] };
    expect(teachingInputs.attendance.parse(base).records[0]?.status).toBe("present");
    expect(() => teachingInputs.attendance.parse({ ...base, records: [{ enrollmentId: 1, status: "missing" }] })).toThrow();
  });

  it("refuse l’affectation d’un enseignant liée à un autre compte", () => {
    expect(canAccessAssignment("user", 17, 17)).toBe(true);
    expect(canAccessAssignment("user", 17, 18)).toBe(false);
    expect(canAccessAssignment("user", null, 18)).toBe(false);
    expect(canAccessAssignment("admin", null, 18)).toBe(true);
  });

  it("refuse une épreuve de deuxième session hors de son maximum", () => {
    const valid = { candidateId: 1, classCourseId: 1, score: 15, maximum: 20, status: "submitted" as const };
    expect(secondSessionInputs.assessment.parse(valid).score).toBe(15);
    expect(() => secondSessionInputs.assessment.parse({ ...valid, score: 21 })).toThrow();
    expect(() => secondSessionInputs.assessment.parse({ ...valid, score: -1 })).toThrow();
  });

  it("n’autorise la validation d’une délibération qu’après proposition", () => {
    expect(canValidateDeliberation("draft")).toBe(false);
    expect(canValidateDeliberation("proposed")).toBe(true);
    expect(canValidateDeliberation("validated")).toBe(false);
  });
});
