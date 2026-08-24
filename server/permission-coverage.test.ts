import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const sensitiveRouters = [
  "governance.ts",
  "school.ts",
  "secondSession.ts",
  "teaching.ts",
  "parent.ts",
  "personal.ts",
  "annualControl.ts",
];

describe("couverture des permissions fines", () => {
  it("applique le contrôle de permission à chaque routeur sensible recensé", () => {
    for (const file of sensitiveRouters) {
      const source = readFileSync(resolve(process.cwd(), "server", "routers", file), "utf8");
      expect(source, `${file} doit importer le contrôle centralisé`).toContain('from "../permissions"');
      expect(source, `${file} doit contrôler au moins une opération sensible`).toContain("assertPermission(");
    }
  });
});
