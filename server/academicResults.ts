import { and, eq, inArray } from "drizzle-orm";
import { academicPeriods, academicYears, classCourses, classes, courses, enrollments, grades, teachingAssignments } from "../drizzle/schema";
import { getDb } from "./db";
import { calculateAcademicResult, maximumForConfiguredCoursePeriod, type AcademicScope, type AcademicResult, type AcademicPeriod, type ClassCourseConfiguration, type AcademicGrade } from "./academicEngine";

type Database = NonNullable<Awaited<ReturnType<typeof getDb>>>;

export function enrollmentMatchesTeachingContext(assignment: { classId: number; academicYearId: number }, enrollment: { classId: number | null; academicYearId: number; status: string }) {
  return enrollment.status === "active" && enrollment.classId === assignment.classId && enrollment.academicYearId === assignment.academicYearId;
}

export function periodMatchesTeachingContext(assignment: { academicYearId: number }, period: { academicYearId: number }) {
  return period.academicYearId === assignment.academicYearId;
}

export function canWriteAcademicYear(status: "draft" | "active" | "notes_closed" | "proclaimed" | "archived") {
  return status !== "proclaimed" && status !== "archived";
}

function toPeriods(rows: { id: number; code: string; kind: "period" | "exam" | "semester" | "annual"; sequence: number }[]): AcademicPeriod[] {
  return rows.map((row) => ({ id: row.id, code: row.code, kind: row.kind, sequence: row.sequence }));
}

function toCourseConfigurations(rows: { id: number; classId: number; courseId: number; courseName: string; courseCode: string; periodWeight: number; status: "configured" | "inactive" }[]) {
  const byClass = new Map<number, ClassCourseConfiguration[]>();
  for (const row of rows) {
    const configuration: ClassCourseConfiguration = { id: row.id, courseId: row.courseId, courseName: row.courseName, courseCode: row.courseCode, periodWeight: row.periodWeight, status: row.status };
    byClass.set(row.classId, [...(byClass.get(row.classId) ?? []), configuration]);
  }
  return byClass;
}

/** Vérifie l’affectation active et, le cas échéant, l’appartenance des élèves à sa classe et à son année. */
export async function getTeachingAssignmentContext(db: Database, assignmentId: number, enrollmentIds: number[] = []) {
  const [assignment] = await db.select({ classId: classes.id, academicYearId: classes.academicYearId, yearStatus: academicYears.status, periodWeight: classCourses.periodWeight, classCourseId: classCourses.id }).from(teachingAssignments).innerJoin(classCourses, eq(teachingAssignments.classCourseId, classCourses.id)).innerJoin(classes, eq(classCourses.classId, classes.id)).innerJoin(academicYears, eq(classes.academicYearId, academicYears.id)).where(eq(teachingAssignments.id, assignmentId)).limit(1);
  if (!assignment || !canWriteAcademicYear(assignment.yearStatus)) return null;
  if (enrollmentIds.length) {
    const allowed = await db.select({ id: enrollments.id, classId: enrollments.classId, academicYearId: enrollments.academicYearId, status: enrollments.status }).from(enrollments).where(inArray(enrollments.id, enrollmentIds));
    if (allowed.length !== Array.from(new Set(enrollmentIds)).length || !allowed.every((enrollment) => enrollmentMatchesTeachingContext(assignment, enrollment))) return null;
  }
  return assignment;
}

/** Vérifie qu’une note se rattache à la classe, au cours et à l’année de l’affectation. */
export async function getGradeWriteContext(db: Database, assignmentId: number, periodId: number, enrollmentIds: number[]) {
  const assignment = await getTeachingAssignmentContext(db, assignmentId, enrollmentIds);
  if (!assignment) return null;
  const [period] = await db.select({ id: academicPeriods.id, academicYearId: academicPeriods.academicYearId, code: academicPeriods.code, kind: academicPeriods.kind, sequence: academicPeriods.sequence }).from(academicPeriods).where(eq(academicPeriods.id, periodId)).limit(1);
  if (!period || !periodMatchesTeachingContext(assignment, period)) return null;
  const maximum = maximumForConfiguredCoursePeriod(assignment.periodWeight, period);
  if (!maximum) return null;
  return { ...assignment, period, maximum };
}

export async function getAcademicResultForEnrollment(db: Database, enrollmentId: number, scope: AcademicScope): Promise<AcademicResult | null> {
  const [enrollment] = await db.select({ id: enrollments.id, classId: enrollments.classId, academicYearId: enrollments.academicYearId }).from(enrollments).where(eq(enrollments.id, enrollmentId)).limit(1);
  if (!enrollment?.classId) return null;
  const periods = toPeriods(await db.select({ id: academicPeriods.id, code: academicPeriods.code, kind: academicPeriods.kind, sequence: academicPeriods.sequence }).from(academicPeriods).where(eq(academicPeriods.academicYearId, enrollment.academicYearId)));
  const configurations = await db.select({ id: classCourses.id, classId: classCourses.classId, courseId: courses.id, courseName: courses.name, courseCode: courses.code, periodWeight: classCourses.periodWeight, status: classCourses.status }).from(classCourses).innerJoin(courses, eq(classCourses.courseId, courses.id)).where(eq(classCourses.classId, enrollment.classId));
  const gradeRows = await db.select({ enrollmentId: grades.enrollmentId, classCourseId: classCourses.id, academicPeriodId: grades.academicPeriodId, score: grades.score, status: grades.status }).from(grades).innerJoin(teachingAssignments, eq(grades.teachingAssignmentId, teachingAssignments.id)).innerJoin(classCourses, eq(teachingAssignments.classCourseId, classCourses.id)).innerJoin(academicPeriods, eq(grades.academicPeriodId, academicPeriods.id)).where(and(eq(grades.enrollmentId, enrollmentId), eq(classCourses.classId, enrollment.classId), eq(academicPeriods.academicYearId, enrollment.academicYearId)));
  return calculateAcademicResult({ enrollmentId, scope, periods, classCourses: toCourseConfigurations(configurations).get(enrollment.classId) ?? [], grades: gradeRows as AcademicGrade[] });
}

export async function getAcademicProgressionForEnrollment(db: Database, enrollmentId: number) {
  const [enrollment] = await db.select({ academicYearId: enrollments.academicYearId }).from(enrollments).where(eq(enrollments.id, enrollmentId)).limit(1);
  if (!enrollment) return [];
  const periods = await db.select({ id: academicPeriods.id, code: academicPeriods.code, label: academicPeriods.label, kind: academicPeriods.kind, sequence: academicPeriods.sequence }).from(academicPeriods).where(eq(academicPeriods.academicYearId, enrollment.academicYearId));
  const progression = [] as { id: number; code: string; label: string; sequence: number; result: AcademicResult }[];
  for (const period of periods.filter((period) => period.kind === "period" || period.kind === "exam")) {
    const result = await getAcademicResultForEnrollment(db, enrollmentId, { type: "period", periodId: period.id });
    if (result) progression.push({ id: period.id, code: period.code, label: period.label, sequence: period.sequence, result });
  }
  return progression;
}

/** Lecture groupée pour éligibilité, classement et délibération : les années et classes restent strictement isolées. */
export async function getAcademicResultsForYear(db: Database, academicYearId: number, scope: AcademicScope): Promise<AcademicResult[]> {
  const annualEnrollments = await db.select({ id: enrollments.id, classId: enrollments.classId }).from(enrollments).innerJoin(classes, eq(enrollments.classId, classes.id)).where(and(eq(classes.academicYearId, academicYearId), eq(enrollments.academicYearId, academicYearId), eq(enrollments.status, "active")));
  if (!annualEnrollments.length) return [];
  const classIds = Array.from(new Set(annualEnrollments.map((enrollment) => enrollment.classId).filter((id): id is number => id !== null)));
  const periods = toPeriods(await db.select({ id: academicPeriods.id, code: academicPeriods.code, kind: academicPeriods.kind, sequence: academicPeriods.sequence }).from(academicPeriods).where(eq(academicPeriods.academicYearId, academicYearId)));
  const configurations = await db.select({ id: classCourses.id, classId: classCourses.classId, courseId: courses.id, courseName: courses.name, courseCode: courses.code, periodWeight: classCourses.periodWeight, status: classCourses.status }).from(classCourses).innerJoin(courses, eq(classCourses.courseId, courses.id)).where(inArray(classCourses.classId, classIds));
  const gradeRows = await db.select({ enrollmentId: grades.enrollmentId, classCourseId: classCourses.id, academicPeriodId: grades.academicPeriodId, score: grades.score, status: grades.status, enrollmentClassId: enrollments.classId, assignmentClassId: classCourses.classId }).from(grades).innerJoin(enrollments, eq(grades.enrollmentId, enrollments.id)).innerJoin(teachingAssignments, eq(grades.teachingAssignmentId, teachingAssignments.id)).innerJoin(classCourses, eq(teachingAssignments.classCourseId, classCourses.id)).innerJoin(academicPeriods, eq(grades.academicPeriodId, academicPeriods.id)).where(and(eq(enrollments.academicYearId, academicYearId), eq(academicPeriods.academicYearId, academicYearId), inArray(enrollments.classId, classIds)));
  const configurationsByClass = toCourseConfigurations(configurations);
  return annualEnrollments.map((enrollment) => calculateAcademicResult({ enrollmentId: enrollment.id, scope, periods, classCourses: configurationsByClass.get(enrollment.classId ?? -1) ?? [], grades: gradeRows.filter((grade) => grade.enrollmentId === enrollment.id && grade.enrollmentClassId === grade.assignmentClassId).map(({ enrollmentClassId: _enrollmentClassId, assignmentClassId: _assignmentClassId, ...grade }) => grade as AcademicGrade) }));
}
