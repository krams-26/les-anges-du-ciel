export type AnnualCycleStatus = "draft" | "active" | "notes_closed" | "proclaimed" | "archived";
export type SecondSessionCandidateStatus = "eligible" | "registered" | "exempt" | "ineligible" | "absent" | "completed" | "withdrawn";

const secondSessionTerminalStatuses = new Set<SecondSessionCandidateStatus>(["exempt", "ineligible", "absent", "completed", "withdrawn"]);
const nonContinuingEnrollmentStatuses = new Set(["excluded", "deceased", "transferred", "withdrawn"]);

export function canEditAcademicData(status: AnnualCycleStatus) {
  return status === "draft" || status === "active";
}

export function canCloseNotes(status: AnnualCycleStatus, unfinishedGrades: number) {
  return status === "active" && unfinishedGrades === 0;
}

export function hasCompletedSecondSession(statuses: SecondSessionCandidateStatus[]) {
  return statuses.every((status) => secondSessionTerminalStatuses.has(status));
}

export function canProclaim(input: { status: AnnualCycleStatus; secondSessionRequired: boolean; secondSessionStatuses: SecondSessionCandidateStatus[]; deliberationEnabled: boolean; allowIndividualDeliberation: boolean; activeEnrollments: number; validatedGlobalDecisions: number; requiredIndividualDecisions: number; validatedIndividualDecisions: number }) {
  if (input.status !== "notes_closed") return false;
  if (input.secondSessionRequired && !hasCompletedSecondSession(input.secondSessionStatuses)) return false;
  if (input.deliberationEnabled) return input.validatedGlobalDecisions === input.activeEnrollments;
  if (input.allowIndividualDeliberation) return input.validatedIndividualDecisions === input.requiredIndividualDecisions;
  return true;
}

export function canArchive(status: AnnualCycleStatus) {
  return status === "proclaimed";
}

/** Ces situations historiques n’ouvrent jamais une inscription suivante sans acte explicite d’admission. */
export function requiresExplicitReadmission(previousEnrollmentStatus: string) {
  return nonContinuingEnrollmentStatuses.has(previousEnrollmentStatus);
}
