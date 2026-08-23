import { useMemo, useState } from "react";
import { Bell, CheckCheck, CircleAlert, Clock3, FileText, HelpCircle, Loader2, Search, ShieldCheck, UserRound } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export type PersonalCenterView = "profile" | "tasks" | "documents" | "help" | "notifications";

const dateFormatter = new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeStyle: "short" });

const helpTopics = [
  { title: "Saisir et soumettre des notes", description: "Accédez à Mes enseignements, choisissez une affectation puis enregistrez ou soumettez votre saisie." },
  { title: "Effectuer l’appel", description: "Ouvrez la classe et la période concernées puis validez la présence de chaque élève." },
  { title: "Inscrire un élève à la deuxième session", description: "L’administration évalue les candidatures selon les résultats validés et les paramètres de l’année." },
  { title: "Consulter un document", description: "Les documents disponibles dépendent de votre rôle, de vos affectations ou de vos enfants explicitement liés." },
];

export function PersonalCenter({ view, role, onNavigate }: { view: PersonalCenterView; role: "admin" | "teacher" | "parent"; onNavigate: (label: string) => void }) {
  const utils = trpc.useUtils();
  const profile = trpc.personal.profile.get.useQuery();
  const tasks = trpc.personal.tasks.useQuery(undefined, { enabled: view === "tasks" });
  const [documentQuery, setDocumentQuery] = useState("");
  const [documentCategory, setDocumentCategory] = useState("");
  const [documentYear, setDocumentYear] = useState("");
  const [documentClassId, setDocumentClassId] = useState("");
  const [documentAfter, setDocumentAfter] = useState("");
  const [documentBefore, setDocumentBefore] = useState("");
  const documentFilters = useMemo(() => ({ query: documentQuery.trim() || undefined, category: documentCategory || undefined, yearCode: documentYear || undefined, classId: documentClassId ? Number(documentClassId) : undefined, createdAfter: documentAfter || undefined, createdBefore: documentBefore || undefined }), [documentAfter, documentBefore, documentCategory, documentClassId, documentQuery, documentYear]);
  const documents = trpc.personal.documents.useQuery(documentFilters, { enabled: view === "documents" });
  const notifications = trpc.personal.notifications.list.useQuery(undefined, { enabled: view === "notifications" });
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const updateProfile = trpc.personal.profile.update.useMutation({
    onSuccess: async () => {
      await utils.personal.profile.get.invalidate();
      setEditing(false);
      toast.success("Profil mis à jour", { description: "Vos informations personnelles ont été enregistrées." });
    },
    onError: () => toast.error("Mise à jour impossible", { description: "Vos informations n’ont pas pu être enregistrées. Réessayez." }),
  });
  const markRead = trpc.personal.notifications.markRead.useMutation({ onSuccess: () => utils.personal.notifications.list.invalidate() });
  const markAllRead = trpc.personal.notifications.markAllRead.useMutation({ onSuccess: () => utils.personal.notifications.list.invalidate() });

  const unreadCount = useMemo(() => notifications.data?.filter((item) => !item.readAt).length ?? 0, [notifications.data]);
  const documentCategories = useMemo(() => Array.from(new Set((documents.data ?? []).map((document) => document.category))).sort(), [documents.data]);
  const documentYears = useMemo(() => Array.from(new Set((documents.data ?? []).map((document) => document.yearCode).filter((year): year is string => Boolean(year)))).sort(), [documents.data]);
  const documentClasses = useMemo(() => Array.from(new Map((documents.data ?? []).filter((document): document is typeof document & { classId: number; className: string } => Boolean(document.classId && document.className)).map((document) => [document.classId, document.className])).entries()).sort((a, b) => a[1].localeCompare(b[1])), [documents.data]);
  const clearDocumentFilters = () => { setDocumentQuery(""); setDocumentCategory(""); setDocumentYear(""); setDocumentClassId(""); setDocumentAfter(""); setDocumentBefore(""); };
  const printDocument = (fileUrl: string) => {
    const printWindow = window.open("", "_blank", "width=960,height=720");
    if (!printWindow) { toast.error("Impression impossible", { description: "Autorisez les fenêtres contextuelles pour imprimer ce document." }); return; }
    printWindow.document.title = "Impression du document scolaire";
    printWindow.document.body.style.margin = "0";
    const frame = printWindow.document.createElement("iframe");
    frame.src = fileUrl;
    frame.title = "Document à imprimer";
    frame.style.width = "100%";
    frame.style.height = "100vh";
    frame.style.border = "0";
    frame.addEventListener("load", () => { printWindow.focus(); printWindow.print(); });
    printWindow.document.body.append(frame);
  };

  if (view === "profile") {
    const account = profile.data;
    return <section className="module-shell personal-center">
      <div className="module-shell-heading"><div><p className="eyebrow">Compte et préférences</p><h1>Mon profil</h1><p>Vos informations de contact. Certaines données sont gérées par l’administration et ne peuvent pas être modifiées ici.</p></div><ShieldCheck size={28} /></div>
      {profile.isLoading ? <LoadingBlock label="Chargement du profil…" /> : <div className="personal-profile-grid">
        <article className="personal-identity-card"><span className="personal-avatar">{(account?.name || "U").split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase()}</span><div><p className="eyebrow">Identité de session</p><h2>{account?.name || "Utilisateur"}</h2><p>{account?.email || "Aucune adresse e-mail renseignée"}</p></div><Badge className="status-badge success">{account?.accountStatus === "active" || !account?.accountStatus ? "Actif" : account.accountStatus}</Badge></article>
        <article className="personal-form-card"><div className="module-card-header"><div><h2>Informations personnelles</h2><p>Modifiez vos coordonnées sans toucher à vos permissions.</p></div>{!editing && <Button variant="outline" onClick={() => { setName(account?.name || ""); setEmail(account?.email || ""); setEditing(true); }}>Modifier mes informations</Button>}</div>
          {editing ? <div className="personal-fields"><label>Nom affiché<Input value={name} onChange={(event) => setName(event.target.value)} /></label><label>Adresse e-mail<Input type="email" value={email} onChange={(event) => setEmail(event.target.value)} /></label><div className="personal-actions"><Button variant="outline" onClick={() => setEditing(false)}>Annuler</Button><Button className="primary-action" disabled={updateProfile.isPending} onClick={() => updateProfile.mutate({ name, email: email.trim() || null })}>{updateProfile.isPending && <Loader2 className="animate-spin" size={16} />} Enregistrer</Button></div></div> : <dl className="profile-definition-list"><div><dt>Rôle principal</dt><dd>{role === "admin" ? "Administration" : role === "parent" ? "Responsable" : "Enseignant"}</dd></div><div><dt>Langue</dt><dd>Français</dd></div><div><dt>Dernière connexion</dt><dd>{account?.lastSignedIn ? dateFormatter.format(new Date(account.lastSignedIn)) : "Non disponible"}</dd></div></dl>}
        </article>
      </div>}
    </section>;
  }

  if (view === "tasks") return <section className="module-shell personal-center"><div className="module-shell-heading"><div><p className="eyebrow">Centre d’action</p><h1>Mes tâches</h1><p>Actions générées à partir des états réels des workflows auxquels votre compte a accès.</p></div><Clock3 size={28} /></div>{tasks.isLoading ? <LoadingBlock label="Analyse des tâches en cours…" /> : !tasks.data?.length ? <EmptyBlock title="Tout est à jour" detail="Aucune tâche ne nécessite votre attention." /> : <div className="personal-task-list">{tasks.data.map((task) => <article key={task.id} className="personal-task"><span className={`task-priority ${task.priority}`} aria-label={`Priorité ${task.priority}`} /><div><h2>{task.title}</h2><p>{task.detail}</p></div><Button variant="outline" onClick={() => onNavigate(task.route)}>Traiter</Button></article>)}</div>}</section>;

  if (view === "documents") return <section className="module-shell personal-center"><div className="module-shell-heading"><div><p className="eyebrow">Registre documentaire</p><h1>Documents</h1><p>Les documents visibles sont limités au périmètre autorisé de votre compte.</p></div><FileText size={28} /></div><div className="document-filter-panel"><div className="inline-search"><Search size={16} /><input value={documentQuery} onChange={(event) => setDocumentQuery(event.target.value)} placeholder="Rechercher un document…" /></div><label>Type<select value={documentCategory} onChange={(event) => setDocumentCategory(event.target.value)}><option value="">Tous</option>{documentCategories.map((category) => <option value={category} key={category}>{category}</option>)}</select></label><label>Année<select value={documentYear} onChange={(event) => setDocumentYear(event.target.value)}><option value="">Toutes</option>{documentYears.map((year) => <option value={year} key={year}>{year}</option>)}</select></label><label>Classe<select value={documentClassId} onChange={(event) => setDocumentClassId(event.target.value)}><option value="">Toutes</option>{documentClasses.map(([id, className]) => <option value={id} key={id}>{className}</option>)}</select></label><label>Date du<input type="date" value={documentAfter} onChange={(event) => setDocumentAfter(event.target.value)} /></label><label>Date au<input type="date" value={documentBefore} onChange={(event) => setDocumentBefore(event.target.value)} /></label><button className="quiet-action" onClick={clearDocumentFilters}>Réinitialiser</button></div>{documents.isLoading ? <LoadingBlock label="Chargement des documents…" /> : !documents.data?.length ? <EmptyBlock title="Aucun document disponible" detail="Les documents apparaîtront ici lorsqu’ils auront été publiés pour votre périmètre." /> : <div className="responsive-table-wrap"><table className="admin-table"><thead><tr><th>Nom</th><th>Type</th><th>Année / classe</th><th>Élève</th><th>Date</th><th>Actions</th></tr></thead><tbody>{documents.data.map((document) => <tr key={document.id}><td data-label="Nom"><strong>{document.fileName}</strong></td><td data-label="Type">{document.category}</td><td data-label="Année / classe">{document.yearCode ?? "—"} · {document.className ?? "—"}</td><td data-label="Élève">{document.studentLastName} {document.studentName}</td><td data-label="Date">{dateFormatter.format(new Date(document.createdAt))}</td><td data-label="Actions">{document.fileUrl ? <span className="document-actions"><a className="quiet-action" href={document.fileUrl} target="_blank" rel="noreferrer">Voir</a><a className="quiet-action" href={document.fileUrl} download>Télécharger</a><button className="quiet-action" onClick={() => printDocument(document.fileUrl)}>Imprimer</button></span> : <span className="muted-cell">Indisponible</span>}</td></tr>)}</tbody></table></div>}</section>;

  if (view === "notifications") return <section className="module-shell personal-center"><div className="module-shell-heading"><div><p className="eyebrow">Suivi personnel</p><h1>Notifications</h1><p>{unreadCount ? `${unreadCount} notification${unreadCount > 1 ? "s" : ""} non lue${unreadCount > 1 ? "s" : ""}.` : "Aucune notification non lue."}</p></div><Button variant="outline" disabled={!unreadCount || markAllRead.isPending} onClick={() => markAllRead.mutate()}><CheckCheck size={16} /> Tout marquer comme lu</Button></div>{notifications.isLoading ? <LoadingBlock label="Chargement des notifications…" /> : !notifications.data?.length ? <EmptyBlock title="Aucune notification" detail="Les informations importantes apparaîtront ici." /> : <div className="personal-notification-list">{notifications.data.map((notification) => <button key={notification.id} className={`personal-notification ${notification.readAt ? "" : "is-unread"}`} onClick={() => { if (!notification.readAt) markRead.mutate({ id: notification.id }); if (notification.resourceType) onNavigate(notification.resourceType); }}><Bell size={18} /><span><strong>{notification.title}</strong><small>{notification.description}</small><em>{dateFormatter.format(new Date(notification.createdAt))}</em></span>{!notification.readAt && <i />}</button>)}</div>}</section>;

  return <section className="module-shell personal-center"><div className="module-shell-heading"><div><p className="eyebrow">Accompagnement</p><h1>Centre d’aide</h1><p>Des repères adaptés à vos droits et aux parcours de l’établissement.</p></div><HelpCircle size={28} /></div><div className="help-topic-grid">{helpTopics.map((topic) => <article className="help-topic" key={topic.title}><h2>{topic.title}</h2><p>{topic.description}</p></article>)}</div><div className="help-contact"><CircleAlert size={20} /><div><strong>Vous ne trouvez pas la réponse ?</strong><p>Contactez l’administration de l’établissement pour un accompagnement sur votre dossier.</p></div><Button variant="outline" onClick={() => onNavigate("Communication")}>Contacter l’administration</Button></div></section>;
}

function LoadingBlock({ label }: { label: string }) { return <div className="personal-status"><Loader2 className="animate-spin" size={20} /><span>{label}</span></div>; }
function EmptyBlock({ title, detail }: { title: string; detail: string }) { return <div className="personal-empty"><FileText size={24} /><h2>{title}</h2><p>{detail}</p></div>; }
