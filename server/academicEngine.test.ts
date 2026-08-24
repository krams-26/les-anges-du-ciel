import { describe, expect, it } from "vitest";
import { calculateAcademicResult, calculateSecondSessionResult, institutionalPeriodDefinitions, postSecondSessionResult, rankAcademicResults, type AcademicGrade, type AcademicPeriod, type ClassCourseConfiguration } from "./academicEngine";

const periods: AcademicPeriod[] = [
  { id: 1, code: "P1", kind: "period", sequence: 1 }, { id: 2, code: "P2", kind: "period", sequence: 2 }, { id: 3, code: "EX1", kind: "exam", sequence: 3 },
  { id: 4, code: "P3", kind: "period", sequence: 4 }, { id: 5, code: "P4", kind: "period", sequence: 5 }, { id: 6, code: "EX2", kind: "exam", sequence: 6 },
];
const courses: ClassCourseConfiguration[] = [
  { id: 11, courseId: 101, courseName: "Mathématiques", periodWeight: 10, status: "configured" },
  { id: 12, courseId: 102, courseName: "Français", periodWeight: 5, status: "configured" },
  { id: 13, courseId: 103, courseName: "Option non applicable", periodWeight: 8, status: "inactive" },
];
const grades = (enrollmentId: number, scores: Record<number, [number, number]>) => Object.entries(scores).flatMap(([classCourseId, values]) => values.map(([periodId, score]) => ({ enrollmentId, classCourseId: Number(classCourseId), academicPeriodId: periodId, score, status: "validated" as const })));
const fullGrades = grades(1, { 11: [[1, 8], [2, 9], [3, 17], [4, 10], [5, 8], [6, 19]], 12: [[1, 4], [2, 4], [3, 8], [4, 5], [5, 4], [6, 8]] });

describe("moteur académique central", () => {
  it("définit un calendrier annuel configurable avec P1, P2, EX1, P3, P4 et EX2", () => {
    expect(institutionalPeriodDefinitions.map((period) => period.code)).toEqual(["P1", "P2", "EX1", "P3", "P4", "EX2"]);
    expect(institutionalPeriodDefinitions.map((period) => period.sequence)).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it("applique 10 points par période, 20 à l’examen et 40 par semestre", () => {
    const p1 = calculateAcademicResult({ enrollmentId: 1, scope: { type: "period", periodId: 1 }, periods, classCourses: courses, grades: fullGrades });
    const semester = calculateAcademicResult({ enrollmentId: 1, scope: { type: "semester", semester: 1 }, periods, classCourses: courses, grades: fullGrades });
    expect(p1.courses.find((course) => course.classCourseId === 11)).toMatchObject({ obtained: 8, expectedMaximum: 10, percentage: 80 });
    expect(semester.courses.find((course) => course.classCourseId === 11)).toMatchObject({ obtained: 34, expectedMaximum: 40, percentage: 85 });
  });

  it("calcule P1, P2, les deux semestres et l’annuel avec plusieurs pondérations", () => {
    const p2 = calculateAcademicResult({ enrollmentId: 1, scope: { type: "period", periodId: 2 }, periods, classCourses: courses, grades: fullGrades });
    const s1 = calculateAcademicResult({ enrollmentId: 1, scope: { type: "semester", semester: 1 }, periods, classCourses: courses, grades: fullGrades });
    const s2 = calculateAcademicResult({ enrollmentId: 1, scope: { type: "semester", semester: 2 }, periods, classCourses: courses, grades: fullGrades });
    const annual = calculateAcademicResult({ enrollmentId: 1, scope: { type: "annual" }, periods, classCourses: courses, grades: fullGrades });
    expect(p2).toMatchObject({ obtained: 13, expectedMaximum: 15, percentage: 86.67 });
    expect(s1).toMatchObject({ obtained: 50, expectedMaximum: 60, percentage: 83.33 });
    expect(s2).toMatchObject({ obtained: 54, expectedMaximum: 60, percentage: 90 });
    expect(annual).toMatchObject({ obtained: 104, expectedMaximum: 120, percentage: 86.67, status: "complete" });
  });

  it("exclut les brouillons, accepte les notes corrigées et marque les notes manquantes", () => {
    const draftAndCorrected: AcademicGrade[] = [...fullGrades.filter((grade) => grade.academicPeriodId !== 2), { enrollmentId: 1, classCourseId: 11, academicPeriodId: 2, score: 10, status: "corrected" }, { enrollmentId: 1, classCourseId: 12, academicPeriodId: 2, score: 5, status: "draft" }];
    const result = calculateAcademicResult({ enrollmentId: 1, scope: { type: "semester", semester: 1 }, periods, classCourses: courses, grades: draftAndCorrected });
    expect(result.courses.find((course) => course.classCourseId === 11)).toMatchObject({ obtained: 35, comparableMaximum: 40, status: "complete" });
    expect(result.courses.find((course) => course.classCourseId === 12)).toMatchObject({ obtained: 12, expectedMaximum: 20, comparableMaximum: 15, status: "incomplete" });
    expect(result.status).toBe("incomplete");
  });

  it("classe au pourcentage comparable plutôt qu’au total brut", () => {
    const first = calculateAcademicResult({ enrollmentId: 1, scope: { type: "annual" }, periods, classCourses: courses, grades: fullGrades });
    const second = calculateAcademicResult({ enrollmentId: 2, scope: { type: "annual" }, periods, classCourses: courses, grades: grades(2, { 11: [[1, 7], [2, 8], [3, 16], [4, 8], [5, 8], [6, 16]], 12: [[1, 4], [2, 4], [3, 8], [4, 4], [5, 4], [6, 8]] }) });
    const shortButHigher = calculateAcademicResult({ enrollmentId: 3, scope: { type: "annual" }, periods, classCourses: courses, grades: grades(3, { 11: [[1, 9], [2, 9], [3, 18]] }) });
    const ranking = rankAcademicResults([first, second, shortButHigher]);
    expect(ranking.find((result) => result.enrollmentId === 3)).toMatchObject({ percentage: 90, rank: 1 });
    expect(ranking.find((result) => result.enrollmentId === 1)?.rank).toBe(2);
  });

  it("calcule la deuxième session à partir des maxima dérivés et fournit la base de délibération", () => {
    const first = calculateAcademicResult({ enrollmentId: 1, scope: { type: "annual" }, periods, classCourses: courses, grades: fullGrades });
    const second = calculateSecondSessionResult({ enrollmentId: 1, classCourses: courses, assessments: [{ enrollmentId: 1, classCourseId: 11, score: 18, status: "validated" }, { enrollmentId: 1, classCourseId: 12, score: 9, status: "corrected" }] });
    expect(second).toMatchObject({ obtained: 27, expectedMaximum: 30, percentage: 90, status: "complete" });
    expect(postSecondSessionResult(first, second)).toMatchObject({ basis: "second_session", percentage: 90 });
  });
});
