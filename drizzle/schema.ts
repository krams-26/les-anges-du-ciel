import { boolean, index, int, mysqlEnum, mysqlTable, text, timestamp, uniqueIndex, varchar } from "drizzle-orm/mysql-core";

/** Identités authentifiées et rôles d’administration. */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

/** Contexte annuel immuable : les enregistrements pédagogiques s’y rattachent toujours. */
export const academicYears = mysqlTable("academic_years", {
  id: int("id").autoincrement().primaryKey(),
  code: varchar("code", { length: 16 }).notNull(),
  label: varchar("label", { length: 32 }).notNull(),
  status: mysqlEnum("status", ["draft", "active", "archived"]).default("draft").notNull(),
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
  status: mysqlEnum("status", ["pending", "active", "suspended", "closed"]).default("pending").notNull(),
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
  employeeCode: varchar("employeeCode", { length: 32 }).notNull(),
  fullName: varchar("fullName", { length: 180 }).notNull(),
  phone: varchar("phone", { length: 40 }),
  email: varchar("email", { length: 320 }),
  specialties: text("specialties"),
  status: mysqlEnum("status", ["active", "inactive", "suspended"]).default("active").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => [uniqueIndex("teachers_code_unique").on(table.employeeCode), index("teachers_name_index").on(table.fullName)]);

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
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => [index("student_documents_student_index").on(table.studentId), index("student_documents_enrollment_index").on(table.enrollmentId)]);

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
