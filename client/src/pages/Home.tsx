/**
 * Direction visuelle : « Registre diocésain contemporain » — navigation documentaire,
 * bleu cobalt structurant, densité administrative lisible et interactions discrètes.
 */
import { DesignSystemShowcase } from "@/components/DesignSystemShowcase";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  Archive,
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  Bell,
  BookOpen,
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  ClipboardCheck,
  CreditCard,
  FileText,
  FolderOpen,
  GraduationCap,
  LayoutDashboard,
  Menu,
  MoreHorizontal,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  ReceiptText,
  Search,
  Send,
  Settings2,
  ShieldCheck,
  UserCheck,
  UsersRound,
  WalletCards,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { LucideIcon } from "lucide-react";

const logoUrl = "/manus-storage/les-anges-monogram_c8475a26.png";
const pedagogyImage = "/manus-storage/pedagogie-context_cb7a9824.png";
const financeImage = "/manus-storage/finance-context_86e01043.png";

type Role = "admin" | "teacher";

type NavItem = {
  label: string;
  icon: LucideIcon;
  roles: Role[];
};

type NavGroup = {
  label?: string;
  items: NavItem[];
};

const navGroups: NavGroup[] = [
  {
    items: [{ label: "Tableau de bord", icon: LayoutDashboard, roles: ["admin", "teacher"] }],
  },
  {
    label: "Scolarité",
    items: [
      { label: "Élèves", icon: UsersRound, roles: ["admin", "teacher"] },
      { label: "Classes", icon: GraduationCap, roles: ["admin", "teacher"] },
      { label: "Cours", icon: BookOpen, roles: ["admin", "teacher"] },
      { label: "Affectations", icon: UserCheck, roles: ["admin", "teacher"] },
      { label: "Années scolaires", icon: CalendarDays, roles: ["admin"] },
    ],
  },
  {
    label: "Pédagogie",
    items: [
      { label: "Présences", icon: ClipboardCheck, roles: ["admin", "teacher"] },
      { label: "Évaluations", icon: FileText, roles: ["admin", "teacher"] },
      { label: "Notes", icon: BarChart3, roles: ["admin", "teacher"] },
      { label: "Relevés", icon: ReceiptText, roles: ["admin", "teacher"] },
      { label: "Résultats", icon: BarChart3, roles: ["admin", "teacher"] },
      { label: "Examens", icon: CalendarDays, roles: ["admin", "teacher"] },
    ],
  },
  {
    label: "Finance",
    items: [
      { label: "Frais scolaires", icon: WalletCards, roles: ["admin"] },
      { label: "Paiements", icon: CreditCard, roles: ["admin"] },
      { label: "Soldes", icon: CircleDollarSign, roles: ["admin"] },
      { label: "Reçus", icon: ReceiptText, roles: ["admin"] },
    ],
  },
  {
    label: "Institution",
    items: [
      { label: "Enseignants", icon: UsersRound, roles: ["admin"] },
      { label: "Parents", icon: UsersRound, roles: ["admin", "teacher"] },
      { label: "Communication", icon: Send, roles: ["admin", "teacher"] },
      { label: "Documents", icon: FolderOpen, roles: ["admin", "teacher"] },
      { label: "Rapports", icon: BarChart3, roles: ["admin"] },
    ],
  },
  {
    label: "Administration",
    items: [
      { label: "Utilisateurs", icon: ShieldCheck, roles: ["admin"] },
      { label: "Paramètres", icon: Settings2, roles: ["admin"] },
      { label: "Archives", icon: Archive, roles: ["admin"] },
    ],
  },
];

const students = [
  { initials: "MK", name: "Mireille Kalume", code: "LAC-7A-014", gender: "F", attendance: "100 %", average: "16,2 / 20", status: "À jour" },
  { initials: "JM", name: "Jean-Marc Mbuyi", code: "LAC-7A-021", gender: "M", attendance: "96 %", average: "14,7 / 20", status: "À jour" },
  { initials: "CN", name: "Chantal Ngalula", code: "LAC-7A-028", gender: "F", attendance: "92 %", average: "12,5 / 20", status: "À suivre" },
  { initials: "PK", name: "Patrick Kabasele", code: "LAC-7A-031", gender: "M", attendance: "98 %", average: "15,1 / 20", status: "À jour" },
];

function CrestMark({ compact = false }: { compact?: boolean }) {
  return (
    <div className="brand-lockup">
      <div className="brand-mark" aria-hidden="true">
        <img src={logoUrl} alt="" />
      </div>
      {!compact && (
        <div className="brand-type">
          <span>Les Anges</span>
          <small>du Ciel</small>
        </div>
      )}
    </div>
  );
}

function ContextPill({ children }: { children: React.ReactNode }) {
  return <span className="context-pill">{children}</span>;
}

function StatCard({
  label,
  value,
  detail,
  trend,
  direction = "up",
  tone = "blue",
}: {
  label: string;
  value: string;
  detail: string;
  trend: string;
  direction?: "up" | "down";
  tone?: "blue" | "gold" | "green" | "slate";
}) {
  const TrendIcon = direction === "up" ? ArrowUpRight : ArrowDownRight;
  return (
    <article className={`stat-card stat-${tone}`}>
      <div className="stat-card-topline">
        <span>{label}</span>
        <span className={`trend trend-${direction}`}><TrendIcon size={14} /> {trend}</span>
      </div>
      <strong>{value}</strong>
      <p>{detail}</p>
    </article>
  );
}

function SectionMenu({
  groups,
  collapsed,
  activeNav,
  onNavigate,
}: {
  groups: NavGroup[];
  collapsed: boolean;
  activeNav: string;
  onNavigate: (label: string) => void;
}) {
  return (
    <nav className="side-navigation" aria-label="Navigation principale">
      {groups.map((group, groupIndex) => (
        <div className="nav-group" key={group.label ?? `main-${groupIndex}`}>
          {group.label && !collapsed && <p className="nav-group-label">{group.label}</p>}
          {group.items.map((item) => {
            const Icon = item.icon;
            const active = activeNav === item.label;
            return (
              <button
                className={`side-nav-link ${active ? "is-active" : ""}`}
                key={item.label}
                onClick={() => onNavigate(item.label)}
                title={collapsed ? item.label : undefined}
              >
                <Icon size={18} strokeWidth={1.8} />
                {!collapsed && <span>{item.label}</span>}
                {!collapsed && item.label === "Paiements" && <span className="nav-dot" />}
              </button>
            );
          })}
        </div>
      ))}
    </nav>
  );
}

function WorkspacePlaceholder({ activeNav, onAction }: { activeNav: string; onAction: () => void }) {
  const isFinance = ["Frais scolaires", "Paiements", "Soldes", "Reçus"].includes(activeNav);
  const subject = isFinance ? "suivi financier" : "suivi scolaire";
  return (
    <section className="workspace-placeholder">
      <div className="placeholder-rule" />
      <p className="eyebrow">Module de travail</p>
      <h2>{activeNav}</h2>
      <p>
        Cet espace est prêt à centraliser le {subject} de l’année scolaire 2026-2027. Les filtres de contexte, la navigation et les composants conservent la même logique sur chaque module.
      </p>
      <Button onClick={onAction} className="primary-action"><Plus size={16} /> Créer un enregistrement</Button>
    </section>
  );
}

export default function Home() {
  const [role, setRole] = useState<Role>("admin");
  const [activeNav, setActiveNav] = useState("Tableau de bord");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [academicYear, setAcademicYear] = useState("2026-2027");

  const visibleGroups = useMemo(
    () => navGroups
      .map((group) => ({ ...group, items: group.items.filter((item) => item.roles.includes(role)) }))
      .filter((group) => group.items.length > 0),
    [role],
  );

  useEffect(() => {
    const stillVisible = visibleGroups.some((group) => group.items.some((item) => item.label === activeNav));
    if (!stillVisible) setActiveNav("Tableau de bord");
  }, [activeNav, visibleGroups]);

  const navigate = (label: string) => {
    setActiveNav(label);
    setMobileNavOpen(false);
  };

  const toggleStudent = (code: string) => {
    setSelectedStudents((current) => current.includes(code) ? current.filter((value) => value !== code) : [...current, code]);
  };

  const selectAll = (checked: boolean) => {
    setSelectedStudents(checked ? students.map((student) => student.code) : []);
  };

  const showToast = (title: string, description: string) => toast(title, { description });
  const isDashboard = activeNav === "Tableau de bord";
  const isSystem = activeNav === "Bibliothèque UI";

  return (
    <div className="school-app">
      <aside className={`sidebar ${sidebarCollapsed ? "is-collapsed" : ""}`}>
        <div className="sidebar-brand">
          <CrestMark compact={sidebarCollapsed} />
          <button className="sidebar-collapse" onClick={() => setSidebarCollapsed((value) => !value)} aria-label="Réduire le menu latéral">
            {sidebarCollapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
          </button>
        </div>
        <SectionMenu groups={visibleGroups} collapsed={sidebarCollapsed} activeNav={activeNav} onNavigate={navigate} />
        <div className="sidebar-footer">
          <button className="side-nav-link ui-library-link" onClick={() => navigate("Bibliothèque UI")} title={sidebarCollapsed ? "Bibliothèque UI" : undefined}>
            <Settings2 size={18} strokeWidth={1.8} />
            {!sidebarCollapsed && <span>Bibliothèque UI</span>}
          </button>
          {!sidebarCollapsed && <div className="sidebar-policy"><ShieldCheck size={15} /> Accès protégé par rôle</div>}
        </div>
      </aside>

      <div className={`mobile-drawer ${mobileNavOpen ? "is-open" : ""}`} aria-hidden={!mobileNavOpen}>
        <button className="drawer-backdrop" onClick={() => setMobileNavOpen(false)} aria-label="Fermer le menu" />
        <div className="drawer-panel">
          <div className="drawer-header"><CrestMark /><button className="icon-button" onClick={() => setMobileNavOpen(false)} aria-label="Fermer"><X size={20} /></button></div>
          <SectionMenu groups={visibleGroups} collapsed={false} activeNav={activeNav} onNavigate={navigate} />
          <button className="side-nav-link ui-library-link" onClick={() => navigate("Bibliothèque UI")}><Settings2 size={18} /> <span>Bibliothèque UI</span></button>
        </div>
      </div>

      <div className="content-stage">
        <header className="topbar">
          <div className="topbar-left">
            <button className="mobile-menu-trigger icon-button" onClick={() => setMobileNavOpen(true)} aria-label="Ouvrir la navigation"><Menu size={21} /></button>
            <div className="topbar-breadcrumb">
              <span>Les Anges du Ciel</span><ChevronRight size={14} /><strong>{activeNav}</strong>
            </div>
          </div>
          <div className="topbar-actions">
            <Select value={academicYear} onValueChange={setAcademicYear}>
              <SelectTrigger className="year-select"><CalendarDays size={16} /><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="2026-2027">2026-2027</SelectItem>
                <SelectItem value="2025-2026">2025-2026</SelectItem>
              </SelectContent>
            </Select>
            <button className="icon-button desktop-only" onClick={() => setSearchOpen(true)} aria-label="Rechercher"><Search size={19} /></button>
            <div className="topbar-popover-wrap">
              <button className="icon-button notification-button" onClick={() => setNotificationsOpen((value) => !value)} aria-label="Notifications"><Bell size={19} /><span /></button>
              {notificationsOpen && (
                <div className="notification-popover">
                  <div className="popover-heading"><strong>Notifications</strong><button onClick={() => showToast("Notifications marquées comme lues", "Le tableau de bord a été actualisé.")}>Tout lire</button></div>
                  <button className="notification-item" onClick={() => navigate("Présences")}><span className="notification-icon blue"><ClipboardCheck size={16} /></span><span><strong>Présences à valider</strong><small>7e A · 3 signalements à revoir</small></span></button>
                  <button className="notification-item" onClick={() => navigate("Paiements")}><span className="notification-icon gold"><ReceiptText size={16} /></span><span><strong>12 paiements reçus</strong><small>À rapprocher aujourd’hui</small></span></button>
                </div>
              )}
            </div>
            <div className="topbar-popover-wrap">
              <button className="profile-button" onClick={() => setProfileOpen((value) => !value)}>
                <span className="avatar avatar-primary">AM</span>
                <span className="profile-copy"><strong>Aline Mbuyi</strong><small>{role === "admin" ? "Administratrice" : "Enseignante"}</small></span>
                <ChevronDown size={15} className="desktop-only" />
              </button>
              {profileOpen && (
                <div className="profile-popover">
                  <p className="menu-label">Aperçu des permissions</p>
                  <button className={role === "admin" ? "role-option is-selected" : "role-option"} onClick={() => setRole("admin")}><ShieldCheck size={16} /><span><strong>Administratrice</strong><small>Accès à tous les modules</small></span></button>
                  <button className={role === "teacher" ? "role-option is-selected" : "role-option"} onClick={() => setRole("teacher")}><GraduationCap size={16} /><span><strong>Enseignante</strong><small>Finance et administration masquées</small></span></button>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="app-main">
          <section className="page-heading">
            <div>
              <p className="eyebrow">{isSystem ? "Référentiel de composants" : "Vue institutionnelle"}</p>
              <h1>{isSystem ? "Bibliothèque UI" : activeNav}</h1>
              <p className="page-subtitle">{isSystem ? "États, contrôles et modèles réutilisables de l’application." : "Suivez les données essentielles de l’établissement dans leur contexte courant."}</p>
            </div>
            {!isSystem && <Button className="primary-action page-action" onClick={() => showToast("Nouvelle opération", "Le formulaire adapté au module s’ouvrirait ici.")}><Plus size={17} /> Nouvelle opération</Button>}
          </section>

          {!isSystem && <div className="context-rail"><ContextPill>Année scolaire {academicYear}</ContextPill><ContextPill>Section : Secondaire</ContextPill><ContextPill>Classe : 7e A</ContextPill></div>}

          {isDashboard && (
            <>
              <div className="register-band" aria-label="Repère de registre">
                <span><i /> Indicateurs de l’établissement</span>
                <small>Situation consolidée · 27 août 2026</small>
              </div>
              <section className="stats-grid" aria-label="Indicateurs principaux">
                <StatCard label="Élèves actifs" value="576" detail="sur 602 inscrits cette année" trend="+3,8 %" />
                <StatCard label="Présence aujourd’hui" value="96,4 %" detail="555 élèves présents à 10 h 30" trend="+1,2 pts" tone="green" />
                <StatCard label="Résultats à publier" value="84" detail="copies en attente de validation" trend="12 urgences" direction="down" tone="gold" />
                <StatCard label="Encaissements d’août" value="12,4 M FC" detail="82 % de l’objectif mensuel" trend="+8,1 %" tone="slate" />
              </section>

              <section className="operational-grid">
                <article className="module-card roster-card">
                  <div className="module-card-header">
                    <div><p className="eyebrow">Suivi de classe</p><h2>7e A · Situation du jour</h2></div>
                    <button className="icon-button" onClick={() => showToast("Filtres de classe", "Les filtres sont prêts pour la classe 7e A.")} aria-label="Filtrer la liste"><MoreHorizontal size={19} /></button>
                  </div>
                  <div className="table-toolbar">
                    <div className="inline-search"><Search size={16} /><input placeholder="Rechercher un élève" aria-label="Rechercher un élève" /></div>
                    <button className="quiet-action" onClick={() => showToast("Export préparé", "Le registre de la classe 7e A est prêt à être exporté.")}>Exporter</button>
                  </div>
                  <div className="responsive-table-wrap">
                    <table className="admin-table">
                      <thead><tr><th><Checkbox checked={selectedStudents.length === students.length} onCheckedChange={(value) => selectAll(value === true)} aria-label="Sélectionner tous les élèves" /></th><th>Élève</th><th>Présence</th><th>Moyenne</th><th>Statut</th><th aria-label="Actions" /></tr></thead>
                      <tbody>{students.map((student) => <tr key={student.code}>
                        <td data-label="Sélection"><Checkbox checked={selectedStudents.includes(student.code)} onCheckedChange={() => toggleStudent(student.code)} aria-label={`Sélectionner ${student.name}`} /></td>
                        <td data-label="Élève"><div className="student-cell"><span className={`avatar avatar-${student.gender.toLowerCase()}`}>{student.initials}</span><span><strong>{student.name}</strong><small>{student.code}</small></span></div></td>
                        <td data-label="Présence"><span className="metric-text">{student.attendance}</span></td>
                        <td data-label="Moyenne"><strong className="metric-text">{student.average}</strong></td>
                        <td data-label="Statut"><Badge className={student.status === "À jour" ? "status-badge success" : "status-badge warning"}>{student.status}</Badge></td>
                        <td data-label="Actions"><button className="row-action" onClick={() => showToast(student.name, "La fiche élève est prête à être consultée.")} aria-label={`Voir ${student.name}`}><MoreHorizontal size={18} /></button></td>
                      </tr>)}</tbody>
                    </table>
                  </div>
                  <footer className="card-footer"><span>1–4 sur 32 élèves</span><div><button className="mini-page" aria-label="Page précédente"><ChevronLeft size={16} /></button><button className="mini-page is-current">1</button><button className="mini-page">2</button><button className="mini-page" aria-label="Page suivante"><ChevronRight size={16} /></button></div></footer>
                </article>

                <div className="side-modules">
                  <article className="dossier-brief coordination-brief">
                    <div className="dossier-brief-rule" />
                    <div className="dossier-brief-heading"><span className="dossier-seal"><img src={logoUrl} alt="" /></span><p className="eyebrow">Pédagogie · Registre 04</p></div>
                    <div className="dossier-brief-body"><div><h2>17 évaluations à relire</h2><p>Copies et validations assignées à l’équipe pédagogique.</p></div><button onClick={() => navigate("Évaluations")}>Ouvrir le suivi <ChevronRight size={15} /></button></div>
                  </article>
                  <article className="finance-card">
                    <div className="document-thumbnail"><img src={financeImage} alt="Dossier et outils de suivi financier" /></div>
                    <div className="finance-card-content"><div><p className="eyebrow">Finance · Dossier T1</p><h2>76 % des frais du T1 réglés</h2></div><button className="text-action" onClick={() => navigate("Paiements")}>Consulter <ChevronRight size={15} /></button></div>
                  </article>
                  <article className="agenda-card"><div className="agenda-date"><strong>27</strong><span>août</span></div><div><p className="eyebrow">À venir</p><h2>Conseil pédagogique</h2><p>14 h 30 · Salle Saint-Joseph</p></div><button className="icon-button" onClick={() => showToast("Conseil pédagogique", "Le rendez-vous a été ajouté à votre agenda.")} aria-label="Voir l’événement"><ChevronRight size={18} /></button></article>
                </div>
              </section>
            </>
          )}

          {isSystem && <DesignSystemShowcase onToast={showToast} />}
          {!isDashboard && !isSystem && <WorkspacePlaceholder activeNav={activeNav} onAction={() => showToast("Création d’enregistrement", `Le formulaire ${activeNav.toLowerCase()} est prêt à être configuré.`)} />}
        </main>
      </div>

      <Dialog open={searchOpen} onOpenChange={setSearchOpen}>
        <DialogContent className="search-dialog">
          <DialogHeader><DialogTitle>Recherche globale</DialogTitle><DialogDescription>Retrouvez rapidement un élève, une classe, un reçu ou un document.</DialogDescription></DialogHeader>
          <div className="dialog-search"><Search size={18} /><Input autoFocus value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder="Ex. Mireille Kalume, LAC-7A-014…" /></div>
          <div className="search-suggestions"><span>Suggestions</span>{["Mireille Kalume · Élève", "7e A · Classe", "REC-2026-0814 · Reçu"].filter((item) => !searchTerm || item.toLowerCase().includes(searchTerm.toLowerCase())).map((item) => <button key={item} onClick={() => { setSearchOpen(false); showToast("Résultat sélectionné", item); }}>{item}<ChevronRight size={16} /></button>)}</div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
