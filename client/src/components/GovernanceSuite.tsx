import { trpc } from "@/lib/trpc";
import { Check, History, Loader2, ShieldCheck, UserCog, UsersRound } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";

type Tab = "users" | "roles" | "audit";
const resources = ["students", "enrollments", "grades", "attendance", "evaluations", "results", "finance", "payments", "users", "settings", "archives", "audit"] as const;
const actions = ["view", "create", "edit", "delete", "export", "print", "validate", "cancel"] as const;

const statusLabel = { active: "Actif", disabled: "Désactivé", invited: "Invité", blocked: "Bloqué" } as const;
const roleLabel = { admin: "Administration", parent: "Parent", user: "Utilisateur" } as const;

export function GovernanceSuite() {
  const [tab, setTab] = useState<Tab>("users");
  const usersQuery = trpc.governance.users.list.useQuery();
  const rolesQuery = trpc.governance.roles.list.useQuery();
  const auditQuery = trpc.governance.audit.list.useQuery({ limit: 80 });
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [selectedRoleId, setSelectedRoleId] = useState<number | null>(null);
  useEffect(() => { if (!selectedUserId && usersQuery.data?.[0]) setSelectedUserId(usersQuery.data[0].id); }, [selectedUserId, usersQuery.data]);
  useEffect(() => { if (!selectedRoleId && rolesQuery.data?.[0]) setSelectedRoleId(rolesQuery.data[0].id); }, [selectedRoleId, rolesQuery.data]);
  const selectedUser = usersQuery.data?.find((user) => user.id === selectedUserId);
  const selectedRole = rolesQuery.data?.find((role) => role.id === selectedRoleId);
  const userPermissionsQuery = trpc.governance.permissions.user.useQuery({ userId: selectedUserId ?? 0 }, { enabled: Boolean(selectedUserId) });
  const rolePermissionsQuery = trpc.governance.roles.permissions.useQuery({ accessRoleId: selectedRoleId ?? 0 }, { enabled: Boolean(selectedRoleId) });
  const utils = trpc.useUtils();
  const statusMutation = trpc.governance.users.setStatus.useMutation({ onSuccess: () => { utils.governance.users.list.invalidate(); utils.governance.audit.list.invalidate(); toast.success("Statut du compte actualisé"); } });
  const assignRoleMutation = trpc.governance.users.assignRole.useMutation({ onSuccess: () => { utils.governance.users.list.invalidate(); utils.governance.permissions.user.invalidate(); toast.success("Profil de rôle attribué"); } });
  const overrideMutation = trpc.governance.permissions.saveOverride.useMutation({ onSuccess: () => { utils.governance.permissions.user.invalidate(); utils.governance.audit.list.invalidate(); toast.success("Dérogation enregistrée"); } });
  const resetOverrideMutation = trpc.governance.permissions.resetOverride.useMutation({ onSuccess: () => { utils.governance.permissions.user.invalidate(); utils.governance.audit.list.invalidate(); toast.success("Dérogation retirée"); } });
  const saveRolePermissions = trpc.governance.roles.savePermissions.useMutation({ onSuccess: () => { utils.governance.roles.permissions.invalidate(); utils.governance.audit.list.invalidate(); toast.success("Matrice de rôle enregistrée"); } });
  const [newRoleLabel, setNewRoleLabel] = useState("");
  const saveRole = trpc.governance.roles.save.useMutation({ onSuccess: () => { setNewRoleLabel(""); utils.governance.roles.list.invalidate(); toast.success("Profil de rôle créé"); } });
  const inherited = useMemo(() => new Map((userPermissionsQuery.data?.inherited ?? []).map((item) => [`${item.resource}:${item.action}`, item.allowed])), [userPermissionsQuery.data]);
  const overrides = useMemo(() => new Map((userPermissionsQuery.data?.overrides ?? []).map((item) => [`${item.resource}:${item.action}`, item.allowed])), [userPermissionsQuery.data]);
  const roleMatrix = useMemo(() => new Map((rolePermissionsQuery.data ?? []).map((item) => [`${item.resource}:${item.action}`, item.allowed])), [rolePermissionsQuery.data]);

  if (usersQuery.isLoading || rolesQuery.isLoading) return <section className="governance-state"><Loader2 className="animate-spin" /><strong>Chargement des accès institutionnels…</strong></section>;
  if (usersQuery.isError || rolesQuery.isError) return <section className="governance-state is-error"><strong>Le registre des accès n’est pas disponible.</strong><p>Réessayez après avoir vérifié la connexion à la base.</p></section>;

  return <section className="governance-suite">
    <header className="governance-header"><div><p className="eyebrow">Administration · Gouvernance</p><h1>Utilisateurs et permissions</h1><p>Les droits effectifs combinent le profil de rôle et les dérogations nominatives journalisées.</p></div><div className="governance-tabs">{([{ id: "users", label: "Utilisateurs", icon: UsersRound }, { id: "roles", label: "Rôles", icon: ShieldCheck }, { id: "audit", label: "Journal d’audit", icon: History }] as const).map(({ id, label, icon: Icon }) => <button key={id} className={tab === id ? "is-active" : ""} onClick={() => setTab(id)}><Icon size={15} />{label}</button>)}</div></header>

    {tab === "users" && <div className="governance-grid">
      <article className="governance-record"><div className="governance-record-heading"><div><p className="eyebrow">Registre des comptes</p><h2>{usersQuery.data?.length ?? 0} comptes</h2></div></div><div className="governance-user-list">{usersQuery.data?.map((user) => <button key={user.id} className={selectedUserId === user.id ? "is-selected" : ""} onClick={() => setSelectedUserId(user.id)}><span className="governance-avatar">{(user.name || "?" ).split(" ").map((part) => part[0]).join("").slice(0, 2)}</span><span><strong>{user.name || "Compte sans nom"}</strong><small>{user.email || "Sans e-mail"} · {roleLabel[user.role]}</small></span><em className={`governance-status is-${user.accountStatus}`}>{statusLabel[user.accountStatus]}</em></button>)}</div></article>
      <article className="governance-record governance-detail">{selectedUser ? <><div className="governance-record-heading"><div><p className="eyebrow">Compte sélectionné</p><h2>{selectedUser.name || "Compte sans nom"}</h2><p>{selectedUser.email || "Aucun e-mail"}</p></div><UserCog size={21} /></div><div className="governance-form-grid"><label><span>Statut du compte</span><Select value={selectedUser.accountStatus} onValueChange={(value) => statusMutation.mutate({ userId: selectedUser.id, status: value as keyof typeof statusLabel, reason: "Mise à jour administrative du statut" })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{Object.entries(statusLabel).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent></Select></label><label><span>Profil de rôle</span><Select value={selectedUser.accessRoleId ? String(selectedUser.accessRoleId) : "none"} onValueChange={(value) => value !== "none" && assignRoleMutation.mutate({ userId: selectedUser.id, accessRoleId: Number(value) })}><SelectTrigger><SelectValue placeholder="Aucun profil" /></SelectTrigger><SelectContent><SelectItem value="none">Aucun profil attribué</SelectItem>{rolesQuery.data?.filter((role) => role.active).map((role) => <SelectItem key={role.id} value={String(role.id)}>{role.label}</SelectItem>)}</SelectContent></Select></label></div><div className="governance-permission-heading"><div><h3>Dérogations individuelles</h3><p>Une dérogation remplace uniquement l’autorisation du profil pour la ligne concernée.</p></div><span>{userPermissionsQuery.isLoading ? "Lecture…" : userPermissionsQuery.data?.user.roleLabel || "Sans profil"}</span></div><div className="governance-permission-table"><div className="governance-permission-row governance-permission-head"><span>Module</span><span>Action</span><span>Profil</span><span>Dérogation</span></div>{resources.flatMap((resource) => actions.slice(0, resource === "grades" || resource === "results" ? 7 : 4).map((action) => { const key = `${resource}:${action}`; const override = overrides.get(key); return <div className="governance-permission-row" key={key}><span>{resource}</span><span>{action}</span><span>{inherited.get(key) ? "Autorisé" : "Non accordé"}</span><span className="governance-override"><Switch checked={override ?? inherited.get(key) ?? false} onCheckedChange={(allowed) => overrideMutation.mutate({ userId: selectedUser.id, resource, action, allowed, reason: "Dérogation individuelle administrée" })} /><button disabled={override === undefined || resetOverrideMutation.isPending} onClick={() => resetOverrideMutation.mutate({ userId: selectedUser.id, resource, action })}>Réinitialiser</button></span></div>; }))}</div></> : <div className="governance-empty">Sélectionnez un compte pour examiner ses autorisations.</div>}</article>
    </div>}

    {tab === "roles" && <div className="governance-grid">
      <article className="governance-record"><div className="governance-record-heading"><div><p className="eyebrow">Profils de rôle</p><h2>Modèles réutilisables</h2></div></div><div className="governance-user-list">{rolesQuery.data?.map((role) => <button key={role.id} className={selectedRoleId === role.id ? "is-selected" : ""} onClick={() => setSelectedRoleId(role.id)}><span className="governance-avatar"><ShieldCheck size={15} /></span><span><strong>{role.label}</strong><small>{role.code} · {role.active ? "Actif" : "Inactif"}</small></span></button>)}</div><div className="governance-create-role"><Label>Nouveau profil</Label><Input value={newRoleLabel} onChange={(event) => setNewRoleLabel(event.target.value)} placeholder="Ex. Responsable pédagogique" /><Button disabled={!newRoleLabel.trim() || saveRole.isPending} onClick={() => saveRole.mutate({ code: newRoleLabel.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""), label: newRoleLabel, description: "Profil créé par l’administration" })}><Check size={15} />Créer</Button></div></article>
      <article className="governance-record governance-detail">{selectedRole ? <><div className="governance-record-heading"><div><p className="eyebrow">Matrice d’autorisation</p><h2>{selectedRole.label}</h2><p>{selectedRole.description || "Aucune description fournie."}</p></div><ShieldCheck size={21} /></div><div className="governance-matrix">{resources.map((resource) => <div className="governance-matrix-row" key={resource}><strong>{resource}</strong>{actions.slice(0, resource === "grades" || resource === "results" ? 7 : 4).map((action) => <label key={action}><span>{action}</span><Switch checked={roleMatrix.get(`${resource}:${action}`) ?? false} onCheckedChange={(allowed) => saveRolePermissions.mutate({ accessRoleId: selectedRole.id, permissions: [{ resource, action, allowed }] })} /></label>)}</div>)}</div></> : <div className="governance-empty">Sélectionnez un profil pour administrer sa matrice.</div>}</article>
    </div>}

    {tab === "audit" && <article className="governance-record governance-audit"><div className="governance-record-heading"><div><p className="eyebrow">Traçabilité</p><h2>Journal d’audit</h2><p>Les événements sensibles sont enregistrés avec leur auteur et leur horodatage.</p></div><History size={21} /></div><div className="governance-audit-list">{auditQuery.data?.map((event) => <div key={event.id}><span className="governance-audit-icon"><History size={14} /></span><span><strong>{event.action.replaceAll("_", " ")}</strong><small>{event.module} · {event.resourceType} #{event.resourceId ?? "—"}{event.reason ? ` · ${event.reason}` : ""}</small></span><span><b>{event.actorName || "Système"}</b><small>{new Date(event.createdAt).toLocaleString("fr-FR")}</small></span></div>)}</div></article>}
  </section>;
}
