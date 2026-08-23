import { and, eq } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { rolePermissions, userPermissionOverrides, users } from "../drizzle/schema";
import { getDb } from "./db";

export type PermissionResource = "students" | "enrollments" | "grades" | "attendance" | "evaluations" | "results" | "finance" | "payments" | "users" | "settings" | "archives" | "audit";
export type PermissionAction = "view" | "create" | "edit" | "delete" | "export" | "print" | "validate" | "cancel";

export async function assertPermission(userId: number, resource: PermissionResource, action: PermissionAction) {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "La vérification des permissions est indisponible." });
  const [account] = await db.select({ accessRoleId: users.accessRoleId }).from(users).where(eq(users.id, userId)).limit(1);
  if (!account) throw new TRPCError({ code: "FORBIDDEN", message: "Ce compte n’est plus autorisé." });
  const [override] = await db.select({ allowed: userPermissionOverrides.allowed }).from(userPermissionOverrides).where(and(eq(userPermissionOverrides.userId, userId), eq(userPermissionOverrides.resource, resource), eq(userPermissionOverrides.action, action))).limit(1);
  if (override) {
    if (override.allowed) return;
    throw new TRPCError({ code: "FORBIDDEN", message: "Cette action a été retirée des permissions de votre compte." });
  }
  if (!account.accessRoleId) throw new TRPCError({ code: "FORBIDDEN", message: "Aucun rôle d’accès actif n’est associé à ce compte." });
  const [permission] = await db.select({ allowed: rolePermissions.allowed }).from(rolePermissions).where(and(eq(rolePermissions.accessRoleId, account.accessRoleId), eq(rolePermissions.resource, resource), eq(rolePermissions.action, action))).limit(1);
  if (permission?.allowed) return;
  throw new TRPCError({ code: "FORBIDDEN", message: "Vous ne disposez pas de la permission requise pour cette action." });
}
