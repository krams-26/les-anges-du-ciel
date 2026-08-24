export type EnrollmentTransition = "promote" | "repeat" | "transfer" | "withdraw" | "deceased" | "exclude" | "other";

export function targetEnrollmentType(transition: EnrollmentTransition) {
  if (transition === "repeat") return "repeat" as const;
  if (transition === "transfer") return "transfer" as const;
  return "re_enrollment" as const;
}

export function sourceEnrollmentStatus(transition: EnrollmentTransition) {
  if (transition === "transfer") return "transferred" as const;
  if (transition === "withdraw" || transition === "other") return "withdrawn" as const;
  if (transition === "deceased") return "deceased" as const;
  if (transition === "exclude") return "excluded" as const;
  return "closed" as const;
}

export function requiresTargetClass(transition: EnrollmentTransition) {
  return transition === "promote" || transition === "repeat";
}

export function createsNextEnrollment(transition: EnrollmentTransition) {
  return transition === "promote" || transition === "repeat";
}
