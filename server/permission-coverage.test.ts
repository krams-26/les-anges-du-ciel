import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

type PermissionExpectation = { procedure: string; resource: string; action: string };

const sensitiveRouters: Record<string, PermissionExpectation[]> = {
  "annualControl.ts": [
    { procedure: "summary", resource: "settings", action: "view" },
    { procedure: "summary", resource: "results", action: "view" },
    { procedure: "summary", resource: "finance", action: "view" },
  ],
  "annualCycle.ts": [
    { procedure: "configure", resource: "settings", action: "edit" },
    { procedure: "closeNotes", resource: "results", action: "validate" },
    { procedure: "proclaim", resource: "results", action: "validate" },
    { procedure: "archive", resource: "settings", action: "edit" },
  ],
  "academic.ts": [
    { procedure: "classResults", resource: "results", action: "view" },
  ],
  "governance.ts": [
    { procedure: "setStatus", resource: "users", action: "edit" },
    { procedure: "assignRole", resource: "users", action: "edit" },
    { procedure: "savePermissions", resource: "settings", action: "edit" },
    { procedure: "saveOverride", resource: "settings", action: "edit" },
    { procedure: "resetOverride", resource: "settings", action: "edit" },
    { procedure: "audit", resource: "audit", action: "view" },
  ],
  "school.ts": [
    { procedure: "prepare", resource: "settings", action: "edit" },
    { procedure: "bulkCreate", resource: "students", action: "create" },
    { procedure: "createForStudent", resource: "enrollments", action: "create" },
    { procedure: "configure", resource: "settings", action: "edit" },
    { procedure: "updateWeight", resource: "settings", action: "edit" },
    { procedure: "linkAccount", resource: "users", action: "edit" },
    { procedure: "deactivate", resource: "settings", action: "edit" },
  ],
  "secondSession.ts": [
    { procedure: "save", resource: "settings", action: "edit" },
    { procedure: "assessments", resource: "grades", action: "edit" },
    { procedure: "validate", resource: "results", action: "validate" },
    { procedure: "rectify", resource: "results", action: "validate" },
  ],
  "teaching.ts": [
    { procedure: "roster", resource: "students", action: "view" },
    { procedure: "attendance", resource: "attendance", action: "create" },
    { procedure: "grades", resource: "grades", action: "edit" },
    { procedure: "reports", resource: "grades", action: "edit" },
  ],
  "parent.ts": [
    { procedure: "children", resource: "students", action: "view" },
    { procedure: "results", resource: "grades", action: "view" },
    { procedure: "attendance", resource: "attendance", action: "view" },
    { procedure: "finances", resource: "finance", action: "view" },
    { procedure: "documents", resource: "results", action: "view" },
  ],
  "personal.ts": [
    { procedure: "tasks", resource: "grades", action: "validate" },
    { procedure: "search", resource: "students", action: "view" },
    { procedure: "documents", resource: "archives", action: "view" },
  ],
};

function procedureBlock(source: string, procedure: string) {
  const nestedRouterStart = source.indexOf(`${procedure}: router({`);
  const start = nestedRouterStart >= 0 ? nestedRouterStart : source.indexOf(`${procedure}:`);
  expect(start, `la procédure ${procedure} doit être recensée`).toBeGreaterThanOrEqual(0);
  const next = source.indexOf("\n    }),", start);
  return source.slice(start, next === -1 ? undefined : next);
}

describe("couverture des permissions fines", () => {
  it("importe et invoque le contrôle centralisé dans chaque routeur sensible", () => {
    for (const file of Object.keys(sensitiveRouters)) {
      const source = readFileSync(resolve(process.cwd(), "server", "routers", file), "utf8");
      expect(source, `${file} doit importer le contrôle centralisé`).toContain('from "../permissions"');
      expect(source, `${file} doit contrôler des opérations sensibles`).toContain("assertPermission(");
    }
  });

  it("associe chaque procédure critique recensée à la permission attendue", () => {
    for (const [file, expectations] of Object.entries(sensitiveRouters)) {
      const source = readFileSync(resolve(process.cwd(), "server", "routers", file), "utf8");
      for (const { procedure, resource, action } of expectations) {
        expect(
          procedureBlock(source, procedure),
          `${file} · ${procedure} doit vérifier ${resource}.${action}`,
        ).toContain(`assertPermission(ctx.user.id, "${resource}", "${action}")`);
      }
    }
  });
});
