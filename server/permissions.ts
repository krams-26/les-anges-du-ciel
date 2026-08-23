import { and, eq } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { rolePermissions, userPermissionOverrides, users } from "../drizzle/schema";
import { getDb } from "./db";

export type PermissionResource = "students" | "enrollments" | "grades" | "attendance" | "evaluations" | "results" | "finance" | "payments" | "users" | "settings" | "archives" | "audit";
export type PermissionAction = "view" | "create" | "edit" | "delete" | "export" | "print" | "validate" | "cancel";

export function resolvePermission(override: boolean | undefined, hasRole: boolean, inherited: boolean | undefined) {
  if (override === true) return { allowed: true, reason: "override_allowed" as const };
  if (override === false) return { allowed: false, reason: "override_denied" as const };
  if (!hasRole) return { allowed: false, reason: "no_access_role" as const };
  if (inherited) return { allowed: true, reason: "role_allowed" as const };
  return { allowed: false, reason: "role_denied" as const };
}

export async function assertPermission(userId: number, resource: PermissionResource, action: PermissionAction) {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "La vérification des permissions est indisponible." });
  const [account] = await db.select({ accessRoleId: users.accessRoleId }).from(users).where(eq(users.id, userId)).limit(1);
  if (!account) throw new TRPCError({ code: "FORBIDDEN", message: "Ce compte n’est plus autorisé." });
  const [override] = await db.select({ allowed: userPermissionOverrides.allowed }).from(userPermissionOverrides).where(and(eq(userPermissionOverrides.userId, userId), eq(userPermissionOverrides.resource, resource), eq(userPermissionOverrides.action, action))).limit(1);
  const [permission] = account.accessRoleId ? await db.select({ allowed: rolePermissions.allowed }).from(rolePermissions).where(and(eq(rolePermissions.accessRoleId, account.accessRoleId), eq(rolePermissions.resource, resource), eq(rolePermissions.action, action))).limit(1) : [];
  const decision = resolvePermission(override?.allowed, Boolean(account.accessRoleId), permission?.allowed);
  if (decision.allowed) return;
  const message = decision.reason === "override_denied" ? "Cette action a été retirée des permissions de votre compte." : decision.reason === "no_access_role" ? "Aucun rôle d’accès actif n’est associé à ce compte." : "Vous ne disposez pas de la permission requise pour cette action.";
  throw new TRPCError({ code: "FORBIDDEN", message });
}
