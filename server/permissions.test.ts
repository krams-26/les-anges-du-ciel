import { describe, expect, it } from "vitest";
import { resolvePermission } from "./permissions";

describe("résolution des permissions fines", () => {
  it("autorise une permission héritée par un rôle actif", () => {
    expect(resolvePermission(undefined, true, true)).toEqual({ allowed: true, reason: "role_allowed" });
  });

  it("refuse une action absente du rôle", () => {
    expect(resolvePermission(undefined, true, false)).toEqual({ allowed: false, reason: "role_denied" });
  });

  it("fait primer une dérogation utilisateur de refus sur le rôle", () => {
    expect(resolvePermission(false, true, true)).toEqual({ allowed: false, reason: "override_denied" });
  });

  it("fait primer une dérogation utilisateur d’autorisation sur le rôle", () => {
    expect(resolvePermission(true, true, false)).toEqual({ allowed: true, reason: "override_allowed" });
  });
});
