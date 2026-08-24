import { trpc } from "@/lib/trpc";
import { Bell, BookOpen, CalendarCheck2, ChevronLeft, CircleDollarSign, FileText, Loader2, UserRound, UsersRound } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";

export type ParentView = "dashboard" | "children" | "results" | "attendance" | "finances" | "documents" | "notifications" | "profile";

const money = (amount: number | null | undefined, currency = "CDF") => `${new Intl.NumberFormat("fr-FR").format(amount ?? 0)} ${currency}`;
const fullName = (child: { firstName: string; lastName: string }) => `${child.firstName} ${child.lastName}`;

function State({ loading, error, empty, children }: { loading: boolean; error: boolean; empty: boolean; children: React.ReactNode }) {
  if (loading) return <section className="parent-state"><Loader2 className="animate-spin" size={22} /><strong>Chargement des données…</strong><p>Le dossier lié à votre compte est en cours de préparation.</p></section>;
  if (error) return <section className="parent-state is-error"><strong>Impossible de charger les données.</strong><p>Vérifiez votre connexion puis réessayez.</p></section>;
  if (empty) return <section className="parent-state"><UsersRound size={24} /><strong>Aucun enfant lié à ce compte</strong><p>Contactez l’administration si cette situation semble incorrecte.</p></section>;
  return <>{children}</>;
}

export function ParentSuite({ view, onNavigate, parentName }: { view: ParentView; onNavigate: (view: ParentView) => void; parentName: string }) {
  const childrenQuery = trpc.parent.children.useQuery();
  const children = childrenQuery.data ?? [];
  const [selectedEnrollmentId, setSelectedEnrollmentId] = useState<number | null>(null);
  useEffect(() => { if (!selectedEnrollmentId && children[0]) setSelectedEnrollmentId(children[0].enrollmentId); }, [children, selectedEnrollmentId]);
  const selected = children.find((child) => child.enrollmentId === selectedEnrollmentId) ?? children[0];
  const enabled = Boolean(selected?.enrollmentId);
  const resultsQuery = trpc.parent.results.useQuery({ enrollmentId: selected?.enrollmentId ?? 0, periodId: 1 }, { enabled });
  const progressionQuery = trpc.parent.results.useQuery({ enrollmentId: selected?.enrollmentId ?? 0 }, { enabled });
  const attendanceQuery = trpc.parent.attendance.useQuery({ enrollmentId: selected?.enrollmentId ?? 0 }, { enabled });
  const financesQuery = trpc.parent.finances.useQuery({ enrollmentId: selected?.enrollmentId ?? 0 }, { enabled });
  const documentsQuery = trpc.parent.documents.useQuery({ enrollmentId: selected?.enrollmentId ?? 0 }, { enabled });
  const preferencesQuery = trpc.parent.preferences.get.useQuery();
  const notificationsQuery = trpc.parent.notifications.list.useQuery();
  const preferenceUpdate = trpc.parent.preferences.update.useMutation({ onSuccess: () => { preferencesQuery.refetch(); toast.success("Préférences enregistrées"); } });
  const markRead = trpc.parent.notifications.markRead.useMutation({ onSuccess: () => notificationsQuery.refetch() });
  const attendanceSummary = useMemo(() => (attendanceQuery.data ?? []).reduce((summary, item) => ({ ...summary, [item.status]: (summary[item.status] ?? 0) + 1 }), {} as Record<string, number>), [attendanceQuery.data]);
  const academicResult = resultsQuery.data?.result;
  const totalScore = academicResult?.obtained ?? 0;
  const totalMaximum = academicResult?.comparableMaximum ?? 0;
  const percentage = academicResult?.percentage ?? null;
  const progression = useMemo(() => (progressionQuery.data?.progression ?? []).map((period) => ({ id: period.id, label: period.label, percentage: period.result.percentage ?? 0 })).sort((a, b) => a.id - b.id), [progressionQuery.data]);

  const header = (title: string, detail: string, back = false) => <header className="parent-page-header">{back && <button className="parent-back" onClick={() => onNavigate("dashboard")} aria-label="Retour"><ChevronLeft size={18} /></button>}<div><p className="eyebrow">Espace parent · Année scolaire 2026-2027</p><h1>{title}</h1><p>{detail}</p></div></header>;
  const childSwitcher = <div className="parent-child-switcher" aria-label="Changer d’enfant">{children.map((child) => <button key={child.enrollmentId} className={child.enrollmentId === selected?.enrollmentId ? "is-active" : ""} onClick={() => setSelectedEnrollmentId(child.enrollmentId)}><span>{child.firstName.slice(0, 1)}{child.lastName.slice(0, 1)}</span><strong>{fullName(child)}</strong><small>{child.className ?? "Classe non attribuée"}</small></button>)}</div>;

  return <State loading={childrenQuery.isLoading} error={childrenQuery.isError} empty={!children.length}>
    <section className="parent-suite">
      {view === "dashboard" && <>
        {header(`Bonjour, ${parentName}`, "Voici la situation scolaire de vos enfants.")}
        <div className="parent-child-switcher">{childSwitcher}</div>
        <div className="parent-kpis">
          <article><BookOpen size={18} /><span>Résultats</span><strong>{percentage === null ? "En attente" : `${percentage} %`}</strong><small>Résultats validés P1</small></article>
          <article><CalendarCheck2 size={18} /><span>Présence</span><strong>{attendanceSummary.present ?? 0}</strong><small>Appels enregistrés</small></article>
          <article><CircleDollarSign size={18} /><span>Solde</span><strong>{money((financesQuery.data?.account?.expectedAmount ?? 0) - (financesQuery.data?.account?.paidAmount ?? 0), financesQuery.data?.account?.currency)}</strong><small>Situation annuelle</small></article>
        </div>
        <div className="parent-actions-grid">
          {[{ view: "results" as const, label: "Voir les résultats", icon: BookOpen }, { view: "attendance" as const, label: "Voir les présences", icon: CalendarCheck2 }, { view: "finances" as const, label: "Voir les finances", icon: CircleDollarSign }, { view: "documents" as const, label: "Mes documents", icon: FileText }].map(({ view: target, label, icon: Icon }) => <button key={target} onClick={() => onNavigate(target)}><Icon size={19} /><span>{label}</span></button>)}
        </div>
      </>}

      {view === "children" && <>
        {header("Mes enfants", "Les dossiers affichés sont exclusivement ceux que l’établissement a liés à votre compte.")}
        <div className="parent-children-grid">{children.map((child) => <article className="parent-child-card" key={child.enrollmentId}><span className="parent-avatar">{child.firstName[0]}{child.lastName[0]}</span><div><p className="eyebrow">{child.relationship === "father" ? "Père" : child.relationship === "mother" ? "Mère" : "Responsable"}</p><h2>{fullName(child)}</h2><p>{child.className ?? "Classe non attribuée"} · {child.section ?? "Section"}</p><small>Statut : {child.enrollmentStatus === "active" ? "Actif" : child.enrollmentStatus}</small></div><Button variant="outline" onClick={() => { setSelectedEnrollmentId(child.enrollmentId); onNavigate("results"); }}>Voir le dossier</Button></article>)}</div>
      </>}

      {view === "results" && <>
        {header("Résultats scolaires", selected ? `${fullName(selected)} · ${selected.className ?? "Classe"} · P1` : "")}
        {childSwitcher}
        <State loading={resultsQuery.isLoading || progressionQuery.isLoading} error={resultsQuery.isError || progressionQuery.isError} empty={!academicResult?.courses.length}>
          <div className="parent-result-summary"><span>Points obtenus<strong>{totalScore} / {totalMaximum}</strong></span><span>Pourcentage<strong>{percentage ?? "—"}{percentage === null ? "" : " %"}</strong></span><span>Document<strong>Relevé de côtes</strong></span></div>
          <div className="parent-progression"><div><p className="eyebrow">Suivi annuel</p><h2>Progression des résultats validés</h2><p>La moyenne de chaque période apparaît dès que les notes ont été validées par l’établissement.</p></div><div className="parent-progression-bars">{progression.map((period) => <div key={period.id} className="parent-progression-item"><div className="parent-progression-track"><i style={{ height: `${Math.max(period.percentage, 5)}%` }} /></div><strong>{period.percentage} %</strong><span>{period.label}</span></div>)}</div></div>
          <div className="parent-table-wrap"><table><thead><tr><th>Cours</th><th>Points</th><th>Maximum</th><th>Pourcentage</th></tr></thead><tbody>{academicResult?.courses.map((item) => <tr key={item.classCourseId}><td>{item.courseName}</td><td>{item.obtained}</td><td>{item.comparableMaximum}</td><td>{item.percentage ?? "—"}{item.percentage === null ? "" : " %"}</td></tr>)}</tbody></table></div>
          <p className="parent-note">Ce relevé de côtes est généré par l’école. Il ne constitue pas un bulletin officiel de l’État.</p>
        </State>
      </>}

      {view === "attendance" && <>
        {header("Présences", selected ? `${fullName(selected)} · ${selected.className ?? "Classe"}` : "")}
        {childSwitcher}
        <State loading={attendanceQuery.isLoading} error={attendanceQuery.isError} empty={!attendanceQuery.data?.length}><div className="parent-result-summary"><span>Présences<strong>{attendanceSummary.present ?? 0}</strong></span><span>Absences<strong>{attendanceSummary.absent ?? 0}</strong></span><span>Retards<strong>{attendanceSummary.late ?? 0}</strong></span><span>Excusées<strong>{attendanceSummary.excused ?? 0}</strong></span></div><div className="attendance-parent-list">{attendanceQuery.data?.map((item, index) => <div key={`${item.sessionDate}-${index}`}><span className={`attendance-parent-dot is-${item.status}`} /><strong>{new Date(item.sessionDate).toLocaleDateString("fr-FR")}</strong><span>{item.status === "present" ? "Présent" : item.status === "absent" ? "Absent" : item.status === "late" ? "Retard" : "Excusé"}</span></div>)}</div><p className="parent-note">Les observations internes de l’établissement ne sont pas affichées dans cet espace.</p></State>
      </>}

      {view === "finances" && <>
        {header("Situation financière", selected ? `${fullName(selected)} · Lecture seule` : "")}
        {childSwitcher}
        <State loading={financesQuery.isLoading} error={financesQuery.isError} empty={!financesQuery.data?.account}><div className="parent-finance-summary"><span>Frais scolaires<strong>{money(financesQuery.data?.account?.expectedAmount, financesQuery.data?.account?.currency)}</strong></span><span>Total payé<strong>{money(financesQuery.data?.account?.paidAmount, financesQuery.data?.account?.currency)}</strong></span><span>Solde<strong>{money((financesQuery.data?.account?.expectedAmount ?? 0) - (financesQuery.data?.account?.paidAmount ?? 0), financesQuery.data?.account?.currency)}</strong></span></div><div className="parent-table-wrap"><table><thead><tr><th>Date</th><th>Montant</th><th>Référence</th><th>Statut</th></tr></thead><tbody>{financesQuery.data?.payments.map((payment) => <tr key={payment.id}><td>{payment.paidAt ? new Date(payment.paidAt).toLocaleDateString("fr-FR") : "En attente"}</td><td>{money(payment.amount, payment.currency)}</td><td>{payment.reference}</td><td>{payment.status === "verified" ? "Vérifié" : payment.status}</td></tr>)}</tbody></table></div><p className="parent-note">Les enregistrements financiers sont consultables mais ne peuvent pas être modifiés par un parent.</p></State>
      </>}

      {view === "documents" && <>{header("Documents", "Seuls les documents autorisés par l’établissement sont disponibles.")}{childSwitcher}<State loading={documentsQuery.isLoading} error={documentsQuery.isError} empty={!documentsQuery.data?.length}><div className="parent-documents">{documentsQuery.data?.map((document) => <a key={document.id} href={document.fileUrl} target="_blank" rel="noreferrer"><FileText size={20} /><span><strong>{document.fileName}</strong><small>{document.category} · {new Date(document.createdAt).toLocaleDateString("fr-FR")}</small></span></a>)}</div></State></>}

      {view === "notifications" && <>{header("Notifications", "Les communications sont limitées aux dossiers liés à votre compte.")}{notificationsQuery.isLoading ? <State loading error={false} empty={false}>{null}</State> : <div className="parent-notifications">{notificationsQuery.data?.length ? notificationsQuery.data.map((notification) => <button key={notification.id} className={notification.readAt ? "is-read" : ""} onClick={() => markRead.mutate({ id: notification.id })}><Bell size={18} /><span><strong>{notification.title}</strong><small>{notification.description}</small></span><time>{new Date(notification.createdAt).toLocaleDateString("fr-FR")}</time></button>) : <State loading={false} error={false} empty>{null}</State>}</div>}</>}

      {view === "profile" && <>{header("Mon profil", "Vos informations scolaires restent gérées par l’administration.")}{preferencesQuery.data?.map((entry) => {
        const preferences = entry.preferences;
        if (!preferences) return null;
        const values = { appNotifications: preferences.appNotifications, sms: preferences.sms, whatsapp: preferences.whatsapp, email: preferences.email, results: preferences.results, attendance: preferences.attendance, finance: preferences.finance, general: preferences.general };
        return <article className="parent-preferences" key={entry.guardianId}><div><UserRound size={20} /><div><h2>{entry.guardianName}</h2><p>{entry.phone}</p></div></div><h3>Préférences de communication</h3>{([ ["Notifications de l’application", "appNotifications"], ["SMS", "sms"], ["WhatsApp", "whatsapp"], ["E-mail", "email"], ["Résultats scolaires", "results"], ["Présences", "attendance"], ["Paiements", "finance"], ["Informations générales", "general"] ] as const).map(([label, key]) => <label key={key}><span>{label}</span><Switch checked={values[key]} onCheckedChange={(checked) => preferenceUpdate.mutate({ guardianId: entry.guardianId, ...values, [key]: checked })} /></label>)}</article>;
      })}</>}
    </section>
  </State>;
}
