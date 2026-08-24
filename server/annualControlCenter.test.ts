import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const component = readFileSync(resolve(process.cwd(), "client", "src", "components", "AnnualControlCenter.tsx"), "utf8");
const stylesheet = readFileSync(resolve(process.cwd(), "client", "src", "index.css"), "utf8");

describe("Centre annuel administratif", () => {
  it("présente les états de chargement, erreur, vide et les quatre circuits métier", () => {
    for (const label of ["Consolidation du contrôle annuel", "Contrôle annuel indisponible", "Aucune année disponible", "Notes à valider", "Rapports à traiter", "Encaissement", "Décisions à valider"]) {
      expect(component).toContain(label);
    }
    for (const destination of ["Notes", "Rapports", "Paiements", "Examens"]) {
      expect(component).toContain(`openWorkflow("${destination}")`);
    }
  });

  it("prévoit une adaptation structurelle aux formats tablette et mobile", () => {
    expect(stylesheet).toContain("@media (max-width: 900px) { .annual-metric-grid { grid-template-columns: repeat(2, 1fr); }.annual-register-grid { grid-template-columns: 1fr; } }");
    expect(stylesheet).toContain("@media (max-width: 620px) { .annual-toolbar { align-items: stretch; flex-direction: column; }");
    expect(stylesheet).toContain(".annual-metric-grid { grid-template-columns: 1fr; }");
    expect(stylesheet).toContain(".annual-status-row { grid-template-columns: minmax(120px, 1fr) 27px minmax(38px, 1fr) 30px;");
  });
});
