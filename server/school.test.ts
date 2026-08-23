import { describe, expect, it } from "vitest";
import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import { schoolInputs } from "./routers/school";
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
});
