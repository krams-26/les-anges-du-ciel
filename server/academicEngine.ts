/**
 * Moteur académique central : aucune interface ne doit recalculer les points,
 * maxima ou rangs. Les cours configurés d’une classe et les périodes de l’année
 * constituent l’unique référence de calcul.
 */
export type AcademicPeriodKind = "period" | "exam" | "semester" | "annual";
export type AcademicPeriod = { id: number; code: string; kind: AcademicPeriodKind; sequence: number };
export type ClassCourseConfiguration = { id: number; courseId: number; periodWeight: number; status: "configured" | "inactive"; courseName?: string; courseCode?: string };
export type AcademicGradeStatus = "draft" | "submitted" | "validated" | "corrected";
export type AcademicGrade = { enrollmentId: number; classCourseId: number; academicPeriodId: number; score: number; status: AcademicGradeStatus };
export type AcademicAssessment = { enrollmentId: number; classCourseId: number; score: number; status: AcademicGradeStatus };
export type AcademicScope = { type: "period"; periodId: number } | { type: "semester"; semester: 1 | 2 } | { type: "annual" };

export type CourseAcademicResult = {
  classCourseId: number;
  courseId: number;
  courseName?: string;
  courseCode?: string;
  obtained: number;
  expectedMaximum: number;
  comparableMaximum: number;
  percentage: number | null;
  completedComponents: number;
  expectedComponents: number;
  status: "complete" | "incomplete" | "missing" | "not_applicable";
};

export type AcademicResult = {
  enrollmentId: number;
  scope: AcademicScope;
  courses: CourseAcademicResult[];
  obtained: number;
  expectedMaximum: number;
  comparableMaximum: number;
  percentage: number | null;
  status: "complete" | "incomplete" | "missing";
};

export type RankedAcademicResult = AcademicResult & { rank: number | null; rankedCount: number };
export type SecondSessionResult = { enrollmentId: number; obtained: number; expectedMaximum: number; comparableMaximum: number; percentage: number | null; status: "complete" | "incomplete" | "missing" };

/** Calendrier institutionnel par défaut, à enregistrer par année et jamais par classe. */
export const institutionalPeriodDefinitions = [
  { code: "P1", label: "Période 1", kind: "period" as const, sequence: 1 },
  { code: "P2", label: "Période 2", kind: "period" as const, sequence: 2 },
  { code: "EX1", label: "Examen 1", kind: "exam" as const, sequence: 3 },
  { code: "P3", label: "Période 3", kind: "period" as const, sequence: 4 },
  { code: "P4", label: "Période 4", kind: "period" as const, sequence: 5 },
  { code: "EX2", label: "Examen 2", kind: "exam" as const, sequence: 6 },
];

const finalStatuses = new Set<AcademicGradeStatus>(["validated", "corrected"]);

export function roundPercentage(obtained: number, maximum: number) {
  return maximum > 0 ? Math.round((obtained / maximum) * 10_000) / 100 : null;
}

export function isFinalAcademicStatus(status: AcademicGradeStatus) {
  return finalStatuses.has(status);
}

/** La pondération annuelle est portée par class_courses, jamais par l’écran ou la période. */
export function maximumForConfiguredCoursePeriod(periodWeight: number, period: Pick<AcademicPeriod, "kind">) {
  if (period.kind === "period") return periodWeight;
  if (period.kind === "exam") return periodWeight * 2;
  return null;
}

/**
 * Convention institutionnelle centralisée : P1/P2/EX1 composent S1 et
 * P3/P4/EX2 composent S2. En l’absence de code explicite, la séquence annuelle
 * permet de conserver un calendrier configurable par année.
 */
export function semesterForPeriod(period: AcademicPeriod): 1 | 2 | null {
  if (period.kind !== "period" && period.kind !== "exam") return null;
  const code = period.code.trim().toUpperCase().replace(/\s+/g, "");
  const match = code.match(/(?:P|EX|E|S|SEMESTRE)[_-]?(\d+)/);
  const ordinal = match ? Number(match[1]) : null;
  if (period.kind === "period") {
    if (ordinal === 1 || ordinal === 2) return 1;
    if (ordinal === 3 || ordinal === 4) return 2;
  }
  if (period.kind === "exam") {
    if (ordinal === 1) return 1;
    if (ordinal === 2) return 2;
  }
  return period.sequence <= 3 ? 1 : 2;
}

function periodsForScope(periods: AcademicPeriod[], scope: AcademicScope) {
  if (scope.type === "period") return periods.filter((period) => period.id === scope.periodId && maximumForConfiguredCoursePeriod(1, period) !== null);
  if (scope.type === "semester") return periods.filter((period) => semesterForPeriod(period) === scope.semester);
  return periods.filter((period) => semesterForPeriod(period) !== null);
}

function resultStatus(completedComponents: number, expectedComponents: number): CourseAcademicResult["status"] {
  if (!expectedComponents) return "not_applicable";
  if (!completedComponents) return "missing";
  if (completedComponents < expectedComponents) return "incomplete";
  return "complete";
}

export function calculateAcademicResult(input: { enrollmentId: number; scope: AcademicScope; periods: AcademicPeriod[]; classCourses: ClassCourseConfiguration[]; grades: AcademicGrade[] }): AcademicResult {
  const scopedPeriods = periodsForScope(input.periods, input.scope);
  const periodById = new Map(scopedPeriods.map((period) => [period.id, period]));
  const gradesByCourse = new Map<number, AcademicGrade[]>();
  for (const grade of input.grades) {
    if (grade.enrollmentId !== input.enrollmentId || !periodById.has(grade.academicPeriodId)) continue;
    gradesByCourse.set(grade.classCourseId, [...(gradesByCourse.get(grade.classCourseId) ?? []), grade]);
  }

  const courses = input.classCourses.map((classCourse): CourseAcademicResult => {
    if (classCourse.status !== "configured") return { classCourseId: classCourse.id, courseId: classCourse.courseId, courseName: classCourse.courseName, courseCode: classCourse.courseCode, obtained: 0, expectedMaximum: 0, comparableMaximum: 0, percentage: null, completedComponents: 0, expectedComponents: 0, status: "not_applicable" };
    const componentMaxima = scopedPeriods.map((period) => ({ period, maximum: maximumForConfiguredCoursePeriod(classCourse.periodWeight, period) ?? 0 })).filter((component) => component.maximum > 0);
    const grades = gradesByCourse.get(classCourse.id) ?? [];
    let obtained = 0;
    let comparableMaximum = 0;
    let completedComponents = 0;
    for (const component of componentMaxima) {
      const grade = grades.find((item) => item.academicPeriodId === component.period.id);
      if (!grade || !isFinalAcademicStatus(grade.status)) continue;
      obtained += grade.score;
      comparableMaximum += component.maximum;
      completedComponents += 1;
    }
    const expectedMaximum = componentMaxima.reduce((sum, component) => sum + component.maximum, 0);
    return { classCourseId: classCourse.id, courseId: classCourse.courseId, courseName: classCourse.courseName, courseCode: classCourse.courseCode, obtained, expectedMaximum, comparableMaximum, percentage: roundPercentage(obtained, comparableMaximum), completedComponents, expectedComponents: componentMaxima.length, status: resultStatus(completedComponents, componentMaxima.length) };
  });

  const applicable = courses.filter((course) => course.status !== "not_applicable");
  const obtained = applicable.reduce((sum, course) => sum + course.obtained, 0);
  const expectedMaximum = applicable.reduce((sum, course) => sum + course.expectedMaximum, 0);
  const comparableMaximum = applicable.reduce((sum, course) => sum + course.comparableMaximum, 0);
  const completed = applicable.filter((course) => course.status === "complete").length;
  const status: AcademicResult["status"] = !applicable.length || !comparableMaximum ? "missing" : completed === applicable.length ? "complete" : "incomplete";
  return { enrollmentId: input.enrollmentId, scope: input.scope, courses, obtained, expectedMaximum, comparableMaximum, percentage: roundPercentage(obtained, comparableMaximum), status };
}

/** Le rang compare des pourcentages sur maxima applicables, jamais des totaux bruts. */
export function rankAcademicResults(results: AcademicResult[]): RankedAcademicResult[] {
  const ranked = results.filter((result) => result.percentage !== null).sort((left, right) => (right.percentage ?? 0) - (left.percentage ?? 0) || left.enrollmentId - right.enrollmentId);
  const rankByEnrollment = new Map<number, number>();
  let previousPercentage: number | null = null;
  let currentRank = 0;
  ranked.forEach((result, index) => {
    if (previousPercentage === null || result.percentage !== previousPercentage) currentRank = index + 1;
    rankByEnrollment.set(result.enrollmentId, currentRank);
    previousPercentage = result.percentage;
  });
  return results.map((result) => ({ ...result, rank: rankByEnrollment.get(result.enrollmentId) ?? null, rankedCount: ranked.length }));
}

/** Une deuxième session est une épreuve de type examen : maximum = 2 × pondération du cours. */
export function calculateSecondSessionResult(input: { enrollmentId: number; classCourses: ClassCourseConfiguration[]; assessments: AcademicAssessment[] }): SecondSessionResult {
  const applicable = input.classCourses.filter((course) => course.status === "configured");
  let obtained = 0;
  let comparableMaximum = 0;
  let completed = 0;
  for (const course of applicable) {
    const assessment = input.assessments.find((item) => item.enrollmentId === input.enrollmentId && item.classCourseId === course.id);
    if (!assessment || !isFinalAcademicStatus(assessment.status)) continue;
    obtained += assessment.score;
    comparableMaximum += course.periodWeight * 2;
    completed += 1;
  }
  const expectedMaximum = applicable.reduce((sum, course) => sum + course.periodWeight * 2, 0);
  const status: SecondSessionResult["status"] = !comparableMaximum ? "missing" : completed === applicable.length ? "complete" : "incomplete";
  return { enrollmentId: input.enrollmentId, obtained, expectedMaximum, comparableMaximum, percentage: roundPercentage(obtained, comparableMaximum), status };
}

/** La délibération choisit explicitement la base, mais ne recalcule jamais une formule locale. */
export function postSecondSessionResult(firstSession: AcademicResult, secondSession: SecondSessionResult | null) {
  if (secondSession && secondSession.percentage !== null) return { basis: "second_session" as const, percentage: secondSession.percentage, obtained: secondSession.obtained, maximum: secondSession.comparableMaximum };
  return { basis: "first_session" as const, percentage: firstSession.percentage, obtained: firstSession.obtained, maximum: firstSession.comparableMaximum };
}
