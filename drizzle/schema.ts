import { boolean, index, int, mysqlEnum, mysqlTable, text, timestamp, uniqueIndex, varchar } from "drizzle-orm/mysql-core";

/** Identités authentifiées et rôles d’administration. */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin", "parent"]).default("user").notNull(),
  accountStatus: mysqlEnum("accountStatus", ["active", "disabled", "invited", "blocked"]).default("active").notNull(),
  accessRoleId: int("accessRoleId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

/** Profils de rôle réutilisables : leurs permissions constituent des valeurs par défaut, non des limites absolues. */
export const accessRoles = mysqlTable("access_roles", {
  id: int("id").autoincrement().primaryKey(),
  code: varchar("code", { length: 48 }).notNull(),
  label: varchar("label", { length: 120 }).notNull(),
  description: text("description"),
  isSystem: boolean("isSystem").default(false).notNull(),
  active: boolean("active").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => [uniqueIndex("access_roles_code_unique").on(table.code)]);

/** Autorisations explicites accordées ou refusées par un profil de rôle. */
export const rolePermissions = mysqlTable("role_permissions", {
  id: int("id").autoincrement().primaryKey(),
  accessRoleId: int("accessRoleId").notNull(),
  resource: varchar("resource", { length: 64 }).notNull(),
  action: varchar("action", { length: 32 }).notNull(),
  allowed: boolean("allowed").default(false).notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => [uniqueIndex("role_permission_unique").on(table.accessRoleId, table.resource, table.action), index("role_permissions_role_index").on(table.accessRoleId)]);

/** Dérogations nominatives : une absence de ligne laisse la permission héritée du rôle. */
export const userPermissionOverrides = mysqlTable("user_permission_overrides", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  resource: varchar("resource", { length: 64 }).notNull(),
  action: varchar("action", { length: 32 }).notNull(),
  allowed: boolean("allowed").notNull(),
  changedByUserId: int("changedByUserId"),
  reason: text("reason"),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => [uniqueIndex("user_permission_override_unique").on(table.userId, table.resource, table.action), index("user_permissions_user_index").on(table.userId)]);

/** Contexte annuel immuable : les enregistrements pédagogiques s’y rattachent toujours. */
export const academicYears = mysqlTable("academic_years", {
  id: int("id").autoincrement().primaryKey(),
  code: varchar("code", { length: 16 }).notNull(),
  label: varchar("label", { length: 32 }).notNull(),
  status: mysqlEnum("status", ["draft", "active", "notes_closed", "proclaimed", "archived"]).default("draft").notNull(),
  secondSessionRequired: boolean("secondSessionRequired").default(false).notNull(),
  deliberationEnabled: boolean("deliberationEnabled").default(false).notNull(),
  allowIndividualDeliberation: boolean("allowIndividualDeliberation").default(false).notNull(),
  notesClosedAt: timestamp("notesClosedAt"),
  proclaimedAt: timestamp("proclaimedAt"),
  archivedAt: timestamp("archivedAt"),
  startsAt: timestamp("startsAt").notNull(),
  endsAt: timestamp("endsAt").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => [uniqueIndex("academic_years_code_unique").on(table.code)]);

/** Identité permanente de l’élève, indépendante des réinscriptions annuelles. */
export const students = mysqlTable("students", {
  id: int("id").autoincrement().primaryKey(),
  studentCode: varchar("studentCode", { length: 32 }).notNull(),
  lastName: varchar("lastName", { length: 120 }).notNull(),
  postName: varchar("postName", { length: 120 }),
  firstName: varchar("firstName", { length: 120 }).notNull(),
  sex: mysqlEnum("sex", ["F", "M"]).notNull(),
  birthDate: timestamp("birthDate"),
  phone: varchar("phone", { length: 40 }),
  address: text("address"),
  photoUrl: text("photoUrl"),
  status: mysqlEnum("status", ["active", "inactive", "archived"]).default("active").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => [uniqueIndex("students_code_unique").on(table.studentCode), index("students_name_index").on(table.lastName, table.firstName)]);

/** Responsables rattachés au dossier permanent de l’élève. */
export const guardians = mysqlTable("guardians", {
  id: int("id").autoincrement().primaryKey(),
  studentId: int("studentId").notNull(),
  fullName: varchar("fullName", { length: 180 }).notNull(),
  relationship: mysqlEnum("relationship", ["father", "mother", "guardian", "other"]).notNull(),
  phone: varchar("phone", { length: 40 }).notNull(),
  address: text("address"),
  isPrimary: boolean("isPrimary").default(false).notNull(),
  receivesCommunications: boolean("receivesCommunications").default(true).notNull(),
  canViewResults: boolean("canViewResults").default(true).notNull(),
  canMakePayments: boolean("canMakePayments").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => [index("guardians_student_index").on(table.studentId)]);

/** Classe définie pour une année scolaire donnée. */
export const classes = mysqlTable("classes", {
  id: int("id").autoincrement().primaryKey(),
  academicYearId: int("academicYearId").notNull(),
  section: varchar("section", { length: 80 }).notNull(),
  level: varchar("level", { length: 32 }).notNull(),
  name: varchar("name", { length: 80 }).notNull(),
  status: mysqlEnum("status", ["draft", "active", "closed"]).default("draft").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => [uniqueIndex("classes_year_name_unique").on(table.academicYearId, table.name), index("classes_year_index").on(table.academicYearId)]);

/** Inscription annuelle : relation entre identité, année et classe. */
export const enrollments = mysqlTable("enrollments", {
  id: int("id").autoincrement().primaryKey(),
  studentId: int("studentId").notNull(),
  academicYearId: int("academicYearId").notNull(),
  classId: int("classId"),
  enrollmentType: mysqlEnum("enrollmentType", ["new", "re_enrollment", "transfer", "repeat"]).notNull(),
  status: mysqlEnum("status", ["pending", "active", "suspended", "closed", "transferred", "withdrawn", "excluded", "deceased"]).default("pending").notNull(),
  enrolledAt: timestamp("enrolledAt").defaultNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => [uniqueIndex("enrollments_student_year_unique").on(table.studentId, table.academicYearId), index("enrollments_class_index").on(table.classId), index("enrollments_year_index").on(table.academicYearId)]);

/** Référentiel de cours réutilisable. */
export const courses = mysqlTable("courses", {
  id: int("id").autoincrement().primaryKey(),
  code: varchar("code", { length: 32 }).notNull(),
  name: varchar("name", { length: 160 }).notNull(),
  section: varchar("section", { length: 80 }).notNull(),
  levels: varchar("levels", { length: 120 }).notNull(),
  status: mysqlEnum("status", ["active", "inactive"]).default("active").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => [uniqueIndex("courses_code_unique").on(table.code)]);

/** Configuration annuelle d’un cours au sein d’une classe, y compris la pondération. */
export const classCourses = mysqlTable("class_courses", {
  id: int("id").autoincrement().primaryKey(),
  classId: int("classId").notNull(),
  courseId: int("courseId").notNull(),
  periodWeight: int("periodWeight").notNull(),
  status: mysqlEnum("status", ["configured", "inactive"]).default("configured").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => [uniqueIndex("class_course_unique").on(table.classId, table.courseId), index("class_courses_class_index").on(table.classId)]);

/** Fiche permanente de l’enseignant. */
export const teachers = mysqlTable("teachers", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId"),
  employeeCode: varchar("employeeCode", { length: 32 }).notNull(),
  fullName: varchar("fullName", { length: 180 }).notNull(),
  phone: varchar("phone", { length: 40 }),
  email: varchar("email", { length: 320 }),
  specialties: text("specialties"),
  status: mysqlEnum("status", ["active", "inactive", "suspended"]).default("active").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => [uniqueIndex("teachers_code_unique").on(table.employeeCode), uniqueIndex("teachers_user_unique").on(table.userId), index("teachers_name_index").on(table.fullName)]);

/** Affectation annuelle : enseignant vers un cours déjà configuré dans une classe. */
export const teachingAssignments = mysqlTable("teaching_assignments", {
  id: int("id").autoincrement().primaryKey(),
  teacherId: int("teacherId").notNull(),
  classCourseId: int("classCourseId").notNull(),
  status: mysqlEnum("status", ["active", "inactive"]).default("active").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => [uniqueIndex("teaching_assignments_unique").on(table.teacherId, table.classCourseId), index("teaching_assignments_course_index").on(table.classCourseId)]);

/** Documents référencés hors base, stockés dans un service objet compatible Vercel. */
export const studentDocuments = mysqlTable("student_documents", {
  id: int("id").autoincrement().primaryKey(),
  studentId: int("studentId").notNull(),
  enrollmentId: int("enrollmentId"),
  category: varchar("category", { length: 80 }).notNull(),
  fileName: varchar("fileName", { length: 255 }).notNull(),
  fileKey: varchar("fileKey", { length: 512 }).notNull(),
  fileUrl: text("fileUrl").notNull(),
  parentVisible: boolean("parentVisible").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => [index("student_documents_student_index").on(table.studentId), index("student_documents_enrollment_index").on(table.enrollmentId)]);

/** Période pédagogique d’un cours configuré dans une classe. */
export const academicPeriods = mysqlTable("academic_periods", {
  id: int("id").autoincrement().primaryKey(),
  academicYearId: int("academicYearId").notNull(),
  code: varchar("code", { length: 32 }).notNull(),
  label: varchar("label", { length: 80 }).notNull(),
  kind: mysqlEnum("kind", ["period", "exam", "semester", "annual"]).notNull(),
  sequence: int("sequence").notNull(),
  startsAt: timestamp("startsAt"),
  endsAt: timestamp("endsAt"),
  status: mysqlEnum("status", ["draft", "active", "closed"]).default("draft").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => [uniqueIndex("academic_periods_year_code_unique").on(table.academicYearId, table.code), index("academic_periods_year_index").on(table.academicYearId)]);

/** Une séance d’appel rattache la présence à une affectation précise et à une date. */
export const attendanceSessions = mysqlTable("attendance_sessions", {
  id: int("id").autoincrement().primaryKey(),
  teachingAssignmentId: int("teachingAssignmentId").notNull(),
  sessionDate: timestamp("sessionDate").notNull(),
  status: mysqlEnum("status", ["draft", "submitted"]).default("draft").notNull(),
  submittedByUserId: int("submittedByUserId"),
  submittedAt: timestamp("submittedAt"),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => [uniqueIndex("attendance_session_unique").on(table.teachingAssignmentId, table.sessionDate), index("attendance_session_assignment_index").on(table.teachingAssignmentId)]);

export const attendanceRecords = mysqlTable("attendance_records", {
  id: int("id").autoincrement().primaryKey(),
  attendanceSessionId: int("attendanceSessionId").notNull(),
  enrollmentId: int("enrollmentId").notNull(),
  status: mysqlEnum("status", ["present", "absent", "late", "excused"]).notNull(),
  note: text("note"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => [uniqueIndex("attendance_record_unique").on(table.attendanceSessionId, table.enrollmentId), index("attendance_record_enrollment_index").on(table.enrollmentId)]);

/** Notes brutes : seul le total dérivé est affiché, jamais saisi manuellement. */
export const grades = mysqlTable("grades", {
  id: int("id").autoincrement().primaryKey(),
  teachingAssignmentId: int("teachingAssignmentId").notNull(),
  academicPeriodId: int("academicPeriodId").notNull(),
  enrollmentId: int("enrollmentId").notNull(),
  score: int("score").notNull(),
  maximum: int("maximum").notNull(),
  status: mysqlEnum("status", ["draft", "submitted", "validated", "corrected"]).default("draft").notNull(),
  enteredByUserId: int("enteredByUserId"),
  submittedAt: timestamp("submittedAt"),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => [uniqueIndex("grades_assignment_period_enrollment_unique").on(table.teachingAssignmentId, table.academicPeriodId, table.enrollmentId), index("grades_period_index").on(table.academicPeriodId), index("grades_enrollment_index").on(table.enrollmentId)]);

/** Les corrections administratives restent auditables. */
export const gradeAudits = mysqlTable("grade_audits", {
  id: int("id").autoincrement().primaryKey(),
  gradeId: int("gradeId").notNull(),
  previousScore: int("previousScore").notNull(),
  nextScore: int("nextScore").notNull(),
  reason: text("reason").notNull(),
  changedByUserId: int("changedByUserId").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => [index("grade_audits_grade_index").on(table.gradeId)]);

/** Critères flexibles définis par l’établissement, non figés dans l’interface. */
export const evaluationCriteria = mysqlTable("evaluation_criteria", {
  id: int("id").autoincrement().primaryKey(),
  academicYearId: int("academicYearId").notNull(),
  label: varchar("label", { length: 120 }).notNull(),
  sequence: int("sequence").notNull(),
  active: boolean("active").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => [uniqueIndex("evaluation_criteria_year_label_unique").on(table.academicYearId, table.label)]);

export const studentEvaluations = mysqlTable("student_evaluations", {
  id: int("id").autoincrement().primaryKey(),
  teachingAssignmentId: int("teachingAssignmentId").notNull(),
  academicPeriodId: int("academicPeriodId").notNull(),
  enrollmentId: int("enrollmentId").notNull(),
  criterionId: int("criterionId").notNull(),
  level: mysqlEnum("level", ["TB", "B", "M", "INSUFFICIENT"]).notNull(),
  observation: text("observation"),
  enteredByUserId: int("enteredByUserId"),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => [uniqueIndex("student_evaluation_unique").on(table.teachingAssignmentId, table.academicPeriodId, table.enrollmentId, table.criterionId), index("student_evaluations_enrollment_index").on(table.enrollmentId)]);

/** Rapports évolutifs par affectation et période. */
export const teacherReports = mysqlTable("teacher_reports", {
  id: int("id").autoincrement().primaryKey(),
  teachingAssignmentId: int("teachingAssignmentId").notNull(),
  academicPeriodId: int("academicPeriodId").notNull(),
  courseDelivery: text("courseDelivery"),
  plannedProgram: text("plannedProgram"),
  completedProgram: text("completedProgram"),
  progressPercentage: int("progressPercentage"),
  difficulties: text("difficulties"),
  classParticipation: mysqlEnum("classParticipation", ["TB", "B", "M", "INSUFFICIENT"]),
  generalNotes: text("generalNotes"),
  additionalComments: text("additionalComments"),
  status: mysqlEnum("status", ["draft", "submitted", "validated"]).default("draft").notNull(),
  submittedAt: timestamp("submittedAt"),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => [uniqueIndex("teacher_reports_assignment_period_unique").on(table.teachingAssignmentId, table.academicPeriodId)]);

/** Liaison explicite, révocable et auditée entre un responsable permanent et son compte portail. */
export const guardianUserLinks = mysqlTable("guardian_user_links", {
  id: int("id").autoincrement().primaryKey(),
  guardianId: int("guardianId").notNull(),
  userId: int("userId").notNull(),
  status: mysqlEnum("status", ["active", "revoked"]).default("active").notNull(),
  linkedByUserId: int("linkedByUserId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  revokedAt: timestamp("revokedAt"),
}, (table) => [uniqueIndex("guardian_user_unique").on(table.guardianId, table.userId), index("guardian_user_user_index").on(table.userId)]);

/** Préférences du portail parent ; les canaux obligatoires restent pilotés par l’établissement. */
export const guardianCommunicationPreferences = mysqlTable("guardian_communication_preferences", {
  id: int("id").autoincrement().primaryKey(),
  guardianId: int("guardianId").notNull(),
  appNotifications: boolean("appNotifications").default(true).notNull(),
  sms: boolean("sms").default(true).notNull(),
  whatsapp: boolean("whatsapp").default(false).notNull(),
  email: boolean("email").default(false).notNull(),
  results: boolean("results").default(true).notNull(),
  attendance: boolean("attendance").default(true).notNull(),
  finance: boolean("finance").default(true).notNull(),
  general: boolean("general").default(true).notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => [uniqueIndex("guardian_preferences_guardian_unique").on(table.guardianId)]);

/** Situation financière annuelle en lecture seule pour les parents. */
export const enrollmentFinancialAccounts = mysqlTable("enrollment_financial_accounts", {
  id: int("id").autoincrement().primaryKey(),
  enrollmentId: int("enrollmentId").notNull(),
  expectedAmount: int("expectedAmount").default(0).notNull(),
  paidAmount: int("paidAmount").default(0).notNull(),
  currency: varchar("currency", { length: 8 }).default("CDF").notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => [uniqueIndex("financial_account_enrollment_unique").on(table.enrollmentId)]);

/** Barème annuel en CDF, configurable par section sans modifier les transactions antérieures. */
export const financeFeeSchedules = mysqlTable("finance_fee_schedules", {
  id: int("id").autoincrement().primaryKey(),
  academicYearId: int("academicYearId").notNull(),
  section: varchar("section", { length: 80 }).notNull(),
  expectedAmountCdf: int("expectedAmountCdf").notNull(),
  active: boolean("active").default(true).notNull(),
  createdByUserId: int("createdByUserId"),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => [uniqueIndex("finance_fee_schedule_year_section_unique").on(table.academicYearId, table.section), index("finance_fee_schedule_year_index").on(table.academicYearId)]);

/** Taux explicite CDF par USD, versionné par année et figé dans chaque paiement converti. */
export const financeExchangeRates = mysqlTable("finance_exchange_rates", {
  id: int("id").autoincrement().primaryKey(),
  academicYearId: int("academicYearId").notNull(),
  sourceCurrency: varchar("sourceCurrency", { length: 8 }).default("USD").notNull(),
  targetCurrency: varchar("targetCurrency", { length: 8 }).default("CDF").notNull(),
  cdfPerUnit: int("cdfPerUnit").notNull(),
  active: boolean("active").default(true).notNull(),
  createdByUserId: int("createdByUserId"),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => [index("finance_exchange_rate_year_index").on(table.academicYearId)]);

export const studentPayments = mysqlTable("student_payments", {
  id: int("id").autoincrement().primaryKey(),
  enrollmentId: int("enrollmentId").notNull(),
  amount: int("amount").notNull(),
  currency: varchar("currency", { length: 8 }).default("CDF").notNull(),
  reference: varchar("reference", { length: 80 }).notNull(),
  status: mysqlEnum("status", ["pending", "validated", "rejected", "cancelled", "verified", "failed"]).default("pending").notNull(),
  paidAt: timestamp("paidAt"),
  recordedByUserId: int("recordedByUserId"),
  payerName: varchar("payerName", { length: 180 }),
  sourceCurrency: varchar("sourceCurrency", { length: 8 }).default("CDF").notNull(),
  sourceAmount: int("sourceAmount"),
  exchangeRateCdfPerUnit: int("exchangeRateCdfPerUnit"),
  amountBefore: int("amountBefore"),
  amountAfter: int("amountAfter"),
  receiptNumber: varchar("receiptNumber", { length: 80 }),
  validatedByUserId: int("validatedByUserId"),
  validatedAt: timestamp("validatedAt"),
  rejectedAt: timestamp("rejectedAt"),
  cancelledAt: timestamp("cancelledAt"),
  statusReason: text("statusReason"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => [uniqueIndex("student_payment_reference_unique").on(table.reference), uniqueIndex("student_payment_receipt_unique").on(table.receiptNumber), index("student_payments_enrollment_index").on(table.enrollmentId)]);

/** Paramétrage annuel de la deuxième session : les seuils sont explicites et versionnables par année. */
export const secondSessionSettings = mysqlTable("second_session_settings", {
  id: int("id").autoincrement().primaryKey(),
  academicYearId: int("academicYearId").notNull(),
  eligibilityMode: mysqlEnum("eligibilityMode", ["below_average", "unvalidated", "manual"]).default("below_average").notNull(),
  thresholdPercent: int("thresholdPercent").default(50).notNull(),
  registrationDeadline: timestamp("registrationDeadline"),
  examStartsAt: timestamp("examStartsAt"),
  examEndsAt: timestamp("examEndsAt"),
  status: mysqlEnum("status", ["draft", "open", "closed", "archived"]).default("draft").notNull(),
  createdByUserId: int("createdByUserId"),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => [uniqueIndex("second_session_year_unique").on(table.academicYearId)]);

/** Éligibilité par dossier annuel ; toute exception manuelle reste expliquée. */
export const secondSessionCandidates = mysqlTable("second_session_candidates", {
  id: int("id").autoincrement().primaryKey(),
  secondSessionSettingId: int("secondSessionSettingId").notNull(),
  enrollmentId: int("enrollmentId").notNull(),
  status: mysqlEnum("status", ["eligible", "registered", "exempt", "ineligible", "absent", "completed", "withdrawn"]).default("eligible").notNull(),
  calculatedAverage: int("calculatedAverage"),
  eligibilityReason: text("eligibilityReason"),
  decidedByUserId: int("decidedByUserId"),
  decidedAt: timestamp("decidedAt"),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => [uniqueIndex("second_session_candidate_unique").on(table.secondSessionSettingId, table.enrollmentId), index("second_session_candidates_enrollment_index").on(table.enrollmentId)]);

/** Épreuves de deuxième session : une note par cours configuré et candidat. */
export const secondSessionAssessments = mysqlTable("second_session_assessments", {
  id: int("id").autoincrement().primaryKey(),
  candidateId: int("candidateId").notNull(),
  classCourseId: int("classCourseId").notNull(),
  score: int("score").notNull(),
  maximum: int("maximum").notNull(),
  status: mysqlEnum("status", ["draft", "submitted", "validated", "corrected"]).default("draft").notNull(),
  enteredByUserId: int("enteredByUserId"),
  submittedAt: timestamp("submittedAt"),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => [uniqueIndex("second_session_assessment_unique").on(table.candidateId, table.classCourseId), index("second_session_assessments_candidate_index").on(table.candidateId)]);

/** Cadre de délibération indépendant, pour maintenir les décisions annuelles distinctes des notes. */
export const deliberationSessions = mysqlTable("deliberation_sessions", {
  id: int("id").autoincrement().primaryKey(),
  academicYearId: int("academicYearId").notNull(),
  label: varchar("label", { length: 120 }).notNull(),
  status: mysqlEnum("status", ["draft", "open", "closed", "published"]).default("draft").notNull(),
  openedAt: timestamp("openedAt"),
  closedAt: timestamp("closedAt"),
  publishedAt: timestamp("publishedAt"),
  createdByUserId: int("createdByUserId"),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => [uniqueIndex("deliberation_year_label_unique").on(table.academicYearId, table.label), index("deliberation_year_index").on(table.academicYearId)]);

/** Décision annuelle finale : proposée puis validée, jamais déduite silencieusement des notes. */
export const deliberationDecisions = mysqlTable("deliberation_decisions", {
  id: int("id").autoincrement().primaryKey(),
  deliberationSessionId: int("deliberationSessionId").notNull(),
  enrollmentId: int("enrollmentId").notNull(),
  decision: mysqlEnum("decision", ["pending", "admitted", "referred", "repeat", "withdrawn"]).default("pending").notNull(),
  basis: mysqlEnum("basis", ["first_session", "second_session", "manual"]).default("first_session").notNull(),
  finalAverage: int("finalAverage"),
  rationale: text("rationale"),
  requiresDeliberation: boolean("requiresDeliberation").default(false).notNull(),
  status: mysqlEnum("status", ["draft", "proposed", "validated"]).default("draft").notNull(),
  proposedByUserId: int("proposedByUserId"),
  proposedAt: timestamp("proposedAt"),
  validatedByUserId: int("validatedByUserId"),
  validatedAt: timestamp("validatedAt"),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => [uniqueIndex("deliberation_decision_unique").on(table.deliberationSessionId, table.enrollmentId), index("deliberation_decisions_enrollment_index").on(table.enrollmentId)]);

/** Historique append-only des propositions, validations et rectifications de délibération. */
export const deliberationAudits = mysqlTable("deliberation_audits", {
  id: int("id").autoincrement().primaryKey(),
  deliberationDecisionId: int("deliberationDecisionId").notNull(),
  action: varchar("action", { length: 80 }).notNull(),
  previousState: text("previousState"),
  nextState: text("nextState"),
  reason: text("reason"),
  actorUserId: int("actorUserId").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => [index("deliberation_audits_decision_index").on(table.deliberationDecisionId)]);

/** Notifications internes toujours filtrées par destinataire authentifié. */
export const userNotifications = mysqlTable("user_notifications", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  category: mysqlEnum("category", ["school", "results", "finance", "attendance", "communication", "administration"]).notNull(),
  title: varchar("title", { length: 180 }).notNull(),
  description: text("description").notNull(),
  resourceType: varchar("resourceType", { length: 80 }),
  resourceId: int("resourceId"),
  readAt: timestamp("readAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => [index("notifications_user_read_index").on(table.userId, table.readAt)]);

/** Journal append-only des actions sensibles, conservé hors des interfaces normales de suppression. */
export const auditEvents = mysqlTable("audit_events", {
  id: int("id").autoincrement().primaryKey(),
  actorUserId: int("actorUserId"),
  action: varchar("action", { length: 120 }).notNull(),
  module: varchar("module", { length: 80 }).notNull(),
  resourceType: varchar("resourceType", { length: 80 }),
  resourceId: int("resourceId"),
  beforeState: text("beforeState"),
  afterState: text("afterState"),
  reason: text("reason"),
  outcome: mysqlEnum("outcome", ["success", "failure"]).default("success").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => [index("audit_events_actor_index").on(table.actorUserId), index("audit_events_module_index").on(table.module, table.createdAt)]);

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
