import { and, asc, desc, eq } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { accessRoles, auditEvents, rolePermissions, userPermissionOverrides, users } from "../../drizzle/schema";
import { getDb } from "../db";
import { assertPermission } from "../permissions";
import { adminProcedure, router } from "../_core/trpc";

const resources = ["students", "enrollments", "grades", "attendance", "evaluations", "results", "finance", "payments", "users", "settings", "archives", "audit"] as const;
const actions = ["view", "create", "edit", "delete", "export", "print", "validate", "cancel"] as const;

async function database() {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "La base de données n’est pas disponible." });
  return db;
}

const permission = z.object({ resource: z.enum(resources), action: z.enum(actions), allowed: z.boolean() });

export const governanceRouter = router({
  users: router({
    list: adminProcedure.query(async ({ ctx }) => {
      await assertPermission(ctx.user.id, "users", "view");
      const db = await database();
      return db.select({ id: users.id, name: users.name, email: users.email, role: users.role, accountStatus: users.accountStatus, accessRoleId: users.accessRoleId, roleLabel: accessRoles.label, lastSignedIn: users.lastSignedIn, createdAt: users.createdAt }).from(users).leftJoin(accessRoles, eq(users.accessRoleId, accessRoles.id)).orderBy(asc(users.name));
    }),
    setStatus: adminProcedure.input(z.object({ userId: z.number().int().positive(), status: z.enum(["active", "disabled", "invited", "blocked"]), reason: z.string().trim().min(3).max(500) })).mutation(async ({ ctx, input }) => {
      await assertPermission(ctx.user.id, "users", "edit");
      if (input.userId === ctx.user.id && input.status !== "active") throw new TRPCError({ code: "BAD_REQUEST", message: "Vous ne pouvez pas désactiver votre propre session administrative." });
      const db = await database();
      await db.update(users).set({ accountStatus: input.status }).where(eq(users.id, input.userId));
      await db.insert(auditEvents).values({ actorUserId: ctx.user.id, action: "account_status_changed", module: "users", resourceType: "user", resourceId: input.userId, afterState: JSON.stringify({ status: input.status }), reason: input.reason });
      return { ok: true };
    }),
    assignRole: adminProcedure.input(z.object({ userId: z.number().int().positive(), accessRoleId: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
      await assertPermission(ctx.user.id, "users", "edit");
      const db = await database();
      const [role] = await db.select({ id: accessRoles.id }).from(accessRoles).where(and(eq(accessRoles.id, input.accessRoleId), eq(accessRoles.active, true))).limit(1);
      if (!role) throw new TRPCError({ code: "NOT_FOUND", message: "Le rôle sélectionné est indisponible." });
      await db.update(users).set({ accessRoleId: input.accessRoleId }).where(eq(users.id, input.userId));
      await db.insert(auditEvents).values({ actorUserId: ctx.user.id, action: "access_role_assigned", module: "users", resourceType: "user", resourceId: input.userId, afterState: JSON.stringify({ accessRoleId: input.accessRoleId }) });
      return { ok: true };
    }),
  }),
  roles: router({
    list: adminProcedure.query(async ({ ctx }) => { await assertPermission(ctx.user.id, "settings", "view"); return (await database()).select().from(accessRoles).orderBy(asc(accessRoles.label)); }),
    save: adminProcedure.input(z.object({ id: z.number().int().positive().optional(), code: z.string().trim().toLowerCase().regex(/^[a-z0-9_-]{3,48}$/), label: z.string().trim().min(3).max(120), description: z.string().trim().max(1000).optional(), active: z.boolean().default(true) })).mutation(async ({ ctx, input }) => {
      await assertPermission(ctx.user.id, "settings", "edit");
      const db = await database();
      if (input.id) {
        await db.update(accessRoles).set({ code: input.code, label: input.label, description: input.description || null, active: input.active }).where(eq(accessRoles.id, input.id));
        await db.insert(auditEvents).values({ actorUserId: ctx.user.id, action: "role_updated", module: "permissions", resourceType: "role", resourceId: input.id, afterState: JSON.stringify(input) });
        return { id: input.id };
      }
      await db.insert(accessRoles).values({ code: input.code, label: input.label, description: input.description || null });
      const [created] = await db.select({ id: accessRoles.id }).from(accessRoles).where(eq(accessRoles.code, input.code)).limit(1);
      if (!created) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Le rôle n’a pas été créé." });
      await db.insert(auditEvents).values({ actorUserId: ctx.user.id, action: "role_created", module: "permissions", resourceType: "role", resourceId: created.id, afterState: JSON.stringify(input) });
      return { id: created.id };
    }),
    permissions: adminProcedure.input(z.object({ accessRoleId: z.number().int().positive() })).query(async ({ ctx, input }) => { await assertPermission(ctx.user.id, "settings", "view"); return (await database()).select().from(rolePermissions).where(eq(rolePermissions.accessRoleId, input.accessRoleId)); }),
    savePermissions: adminProcedure.input(z.object({ accessRoleId: z.number().int().positive(), permissions: z.array(permission).min(1) })).mutation(async ({ ctx, input }) => {
      await assertPermission(ctx.user.id, "settings", "edit");
      const db = await database();
      for (const item of input.permissions) await db.insert(rolePermissions).values({ accessRoleId: input.accessRoleId, ...item }).onDuplicateKeyUpdate({ set: { allowed: item.allowed } });
      await db.insert(auditEvents).values({ actorUserId: ctx.user.id, action: "role_permissions_updated", module: "permissions", resourceType: "role", resourceId: input.accessRoleId, afterState: JSON.stringify(input.permissions) });
      return { saved: input.permissions.length };
    }),
  }),
  permissions: router({
    user: adminProcedure.input(z.object({ userId: z.number().int().positive() })).query(async ({ ctx, input }) => {
      await assertPermission(ctx.user.id, "users", "view");
      const db = await database();
      const [user] = await db.select({ id: users.id, name: users.name, accessRoleId: users.accessRoleId, roleLabel: accessRoles.label }).from(users).leftJoin(accessRoles, eq(users.accessRoleId, accessRoles.id)).where(eq(users.id, input.userId)).limit(1);
      if (!user) throw new TRPCError({ code: "NOT_FOUND", message: "Utilisateur introuvable." });
      const inherited = user.accessRoleId ? await db.select().from(rolePermissions).where(eq(rolePermissions.accessRoleId, user.accessRoleId)) : [];
      const overrides = await db.select().from(userPermissionOverrides).where(eq(userPermissionOverrides.userId, input.userId));
      return { user, inherited, overrides };
    }),
    saveOverride: adminProcedure.input(z.object({ userId: z.number().int().positive(), ...permission.shape, reason: z.string().trim().min(3).max(500) })).mutation(async ({ ctx, input }) => {
      await assertPermission(ctx.user.id, "settings", "edit");
      const db = await database();
      await db.insert(userPermissionOverrides).values({ ...input, changedByUserId: ctx.user.id }).onDuplicateKeyUpdate({ set: { allowed: input.allowed, changedByUserId: ctx.user.id, reason: input.reason } });
      await db.insert(auditEvents).values({ actorUserId: ctx.user.id, action: "user_permission_overridden", module: "permissions", resourceType: "user", resourceId: input.userId, afterState: JSON.stringify(input), reason: input.reason });
      return { ok: true };
    }),
    resetOverride: adminProcedure.input(z.object({ userId: z.number().int().positive(), resource: z.enum(resources), action: z.enum(actions) })).mutation(async ({ ctx, input }) => {
      await assertPermission(ctx.user.id, "settings", "edit");
      const db = await database();
      await db.delete(userPermissionOverrides).where(and(eq(userPermissionOverrides.userId, input.userId), eq(userPermissionOverrides.resource, input.resource), eq(userPermissionOverrides.action, input.action)));
      await db.insert(auditEvents).values({ actorUserId: ctx.user.id, action: "user_permission_reset", module: "permissions", resourceType: "user", resourceId: input.userId, afterState: JSON.stringify(input) });
      return { ok: true };
    }),
  }),
  audit: router({
    list: adminProcedure.input(z.object({ module: z.string().trim().max(80).optional(), limit: z.number().int().min(1).max(250).default(100) }).optional()).query(async ({ ctx, input }) => {
      await assertPermission(ctx.user.id, "audit", "view");
      const db = await database();
      const query = db.select({ id: auditEvents.id, action: auditEvents.action, module: auditEvents.module, resourceType: auditEvents.resourceType, resourceId: auditEvents.resourceId, reason: auditEvents.reason, outcome: auditEvents.outcome, createdAt: auditEvents.createdAt, actorName: users.name }).from(auditEvents).leftJoin(users, eq(auditEvents.actorUserId, users.id)).orderBy(desc(auditEvents.createdAt)).limit(input?.limit ?? 100);
      return input?.module ? query.where(eq(auditEvents.module, input.module)) : query;
    }),
  }),
});
