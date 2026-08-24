import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("raccourcis contextuels de l’espace de classe", () => {
  it("oriente les actions métier vers les modules persistants", () => {
    const source = readFileSync(resolve(process.cwd(), "client", "src", "components", "ClassWorkspace.tsx"), "utf8");

    for (const destination of ["Inscription / Réinscription", "Classes", "Cours et pondérations", "Affectations", "Présences", "Résultats", "Relevés"]) {
      expect(source, `le module ${destination} doit être accessible depuis la classe`).toContain(destination);
    }
    expect(source).toContain("onNavigate(destination)");
  });
});
