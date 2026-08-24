import { and, eq } from "drizzle-orm";
import { enrollmentFinancialAccounts, enrollments, students } from "../drizzle/schema";
import { closeDbPool, getDb } from "../server/db";
import { appRouter } from "../server/routers";

let completed = false;

try {
  const db = await getDb();
  if (!db) throw new Error("Base de données indisponible.");
  const caller = appRouter.createCaller({ user: { id: 1, openId: "finance-admin", name: "Administrateur financier de test", email: null, loginMethod: "test", role: "admin", accountStatus: "active", accessRoleId: 1, createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() }, req: {} as never, res: {} as never });
  const roles = await caller.governance.roles.list();
  const role = roles.find((item) => item.id === 1) ?? roles[0];
  if (!role) throw new Error("Rôle administrateur introuvable.");
  await caller.governance.roles.savePermissions({ accessRoleId: role.id, permissions: ["view", "create", "edit", "validate", "cancel", "export", "print"].map((action) => ({ resource: "finance" as const, action: action as "view" | "create" | "edit" | "validate" | "cancel" | "export" | "print", allowed: true })) });
  const [enrollment] = await db.select({ id: enrollments.id, academicYearId: enrollments.academicYearId, studentId: enrollments.studentId }).from(enrollments).innerJoin(students, eq(enrollments.studentId, students.id)).where(and(eq(enrollments.academicYearId, 1), eq(enrollments.status, "active"))).limit(1);
  if (!enrollment) throw new Error("Inscription financière de test introuvable.");
  const [existingAccount] = await db.select({ paidAmount: enrollmentFinancialAccounts.paidAmount }).from(enrollmentFinancialAccounts).where(eq(enrollmentFinancialAccounts.enrollmentId, enrollment.id)).limit(1);
  await caller.finance.accounts.configure({ enrollmentId: enrollment.id, expectedAmountCdf: (existingAccount?.paidAmount ?? 0) + 100000 });
  await caller.finance.exchangeRates.save({ academicYearId: enrollment.academicYearId, cdfPerUnit: 2800 });
  const cdfPayment = await caller.finance.payments.create({ enrollmentId: enrollment.id, reference: `CDF-${Date.now()}`, payerName: "Payeur de test", sourceCurrency: "CDF", sourceAmount: 25000 });
  const cdfValidation = await caller.finance.payments.validate({ paymentId: cdfPayment.id });
  const usdPayment = await caller.finance.payments.create({ enrollmentId: enrollment.id, reference: `USD-${Date.now()}`, payerName: "Payeur de test", sourceCurrency: "USD", sourceAmount: 10 });
  const usdValidation = await caller.finance.payments.validate({ paymentId: usdPayment.id });
  let overpaymentBlocked = false;
  const excessive = await caller.finance.payments.create({ enrollmentId: enrollment.id, reference: `OVER-${Date.now()}`, payerName: "Payeur de test", sourceCurrency: "CDF", sourceAmount: 50000 });
  try { await caller.finance.payments.validate({ paymentId: excessive.id }); } catch (error) { overpaymentBlocked = (error as { code?: string }).code === "BAD_REQUEST"; }
  const rejected = await caller.finance.payments.create({ enrollmentId: enrollment.id, reference: `REJ-${Date.now()}`, payerName: "Payeur de test", sourceCurrency: "CDF", sourceAmount: 1000 });
  await caller.finance.payments.reject({ paymentId: rejected.id, reason: "Bordereau bancaire illisible lors du test." });
  const cancelled = await caller.finance.payments.create({ enrollmentId: enrollment.id, reference: `CAN-${Date.now()}`, payerName: "Payeur de test", sourceCurrency: "CDF", sourceAmount: 1000 });
  await caller.finance.payments.cancel({ paymentId: cancelled.id, reason: "Annulation de test avant validation." });
  const receipt = await caller.finance.payments.receipt({ paymentId: usdPayment.id });
  await caller.finance.exchangeRates.save({ academicYearId: enrollment.academicYearId, cdfPerUnit: 2900 });
  const historicReceipt = await caller.finance.payments.receipt({ paymentId: usdPayment.id });
  const exported = await caller.finance.payments.export({ academicYearId: enrollment.academicYearId });
  if (cdfValidation.after !== 75000 || usdValidation.after !== 47000 || !overpaymentBlocked || receipt.exchangeRate !== 2800 || historicReceipt.exchangeRate !== 2800 || !receipt.receiptNumber || !exported.some((row) => row.id === usdPayment.id)) throw new Error("Les règles financières de validation, solde ou historique ne sont pas respectées.");
  console.log(JSON.stringify({ verified: true, partialBalance: cdfValidation.after, multiplePaymentBalance: usdValidation.after, overpaymentBlocked, receipt: receipt.receiptNumber, historicRate: historicReceipt.exchangeRate, exported: exported.length }, null, 2));
  completed = true;
} finally {
  await closeDbPool();
  if (completed) process.exit(0);
}
