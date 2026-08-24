/**
 * Direction visuelle : « Registre diocésain contemporain » — navigation documentaire,
 * bleu cobalt structurant, densité administrative lisible et interactions discrètes.
 */
import { DesignSystemShowcase } from "@/components/DesignSystemShowcase";
import { AdminDashboard } from "@/components/AdminDashboard";
import { StudentManagement } from "@/components/StudentManagement";
import { StudentProfile } from "@/components/StudentProfile";
import { EnrollmentWizard } from "@/components/EnrollmentWizard";
import { ClassManagement } from "@/components/ClassManagement";
import { ClassWorkspace } from "@/components/ClassWorkspace";
import { AssignmentManagement, CourseCatalog, ExcelStudentImport, NewYearPreparation, TeacherManagement, TeacherProfile, WeightConfiguration } from "@/components/AcademicModules";
import { TeacherAccountLinker } from "@/components/TeacherAccountLinker";
import { TeacherSuite } from "@/components/TeacherSuite";
import { ParentSuite } from "@/components/ParentSuite";
import { GovernanceSuite } from "@/components/GovernanceSuite";
import { SecondSessionSuite } from "@/components/SecondSessionSuite";
import { PersonalCenter } from "@/components/PersonalCenter";
import { SearchResultPanel, type SearchResultSelection } from "@/components/SearchResultPanel";
import { AnnualControlCenter } from "@/components/AnnualControlCenter";
import { trpc } from "@/lib/trpc";
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
  HelpCircle,
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
  Upload,
  WalletCards,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { LucideIcon } from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";
import { startLogin } from "@/const";

const logoUrl = "/manus-storage/les-anges-monogram_c8475a26.png";
const pedagogyImage = "/manus-storage/pedagogie-context_cb7a9824.png";
const financeImage = "/manus-storage/finance-context_86e01043.png";

type Role = "admin" | "teacher" | "parent";

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
    items: [
      { label: "Tableau de bord", icon: LayoutDashboard, roles: ["admin", "teacher", "parent"] },
      { label: "Vue administrateur", icon: ShieldCheck, roles: ["admin"] },
    ],
  },
  {
    label: "Scolarité",
    items: [
      { label: "Élèves", icon: UsersRound, roles: ["admin", "teacher"] },
      { label: "Inscription / Réinscription", icon: UserCheck, roles: ["admin"] },
      { label: "Importer les élèves", icon: Upload, roles: ["admin"] },
      { label: "Classes", icon: GraduationCap, roles: ["admin", "teacher"] },
      { label: "Cours", icon: BookOpen, roles: ["admin", "teacher"] },
      { label: "Affectations", icon: UserCheck, roles: ["admin", "teacher"] },
      { label: "Années scolaires", icon: CalendarDays, roles: ["admin"] },
    ],
  },
  {
    label: "Pédagogie",
    items: [
      { label: "Mes enseignements", icon: BookOpen, roles: ["teacher"] },
      { label: "Présences", icon: ClipboardCheck, roles: ["admin", "teacher"] },
      { label: "Évaluations", icon: FileText, roles: ["admin", "teacher"] },
      { label: "Notes", icon: BarChart3, roles: ["admin", "teacher"] },
      { label: "Relevés", icon: ReceiptText, roles: ["admin", "teacher"] },
      { label: "Résultats", icon: BarChart3, roles: ["admin", "teacher"] },
      { label: "Examens", icon: CalendarDays, roles: ["admin"] },
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
      { label: "Rapports", icon: BarChart3, roles: ["admin"] },
    ],
  },
  {
    label: "Administration",
    items: [
      { label: "Utilisateurs", icon: ShieldCheck, roles: ["admin"] },
      { label: "Contrôle annuel", icon: ClipboardCheck, roles: ["admin"] },
      { label: "Paramètres", icon: Settings2, roles: ["admin"] },
      { label: "Archives", icon: Archive, roles: ["admin"] },
    ],
  },
  {
    label: "Système",
    items: [
      { label: "Mes tâches", icon: ClipboardCheck, roles: ["admin", "teacher"] },
      { label: "Documents", icon: FolderOpen, roles: ["admin", "teacher"] },
      { label: "Centre d’aide", icon: HelpCircle, roles: ["admin", "teacher"] },
      { label: "Mon profil", icon: UserCheck, roles: ["admin", "teacher"] },
    ],
  },
];

const parentNavGroup: NavGroup = {
  label: "Espace parent",
  items: [
    { label: "Mes enfants", icon: UsersRound, roles: ["parent"] },
    { label: "Résultats scolaires", icon: BookOpen, roles: ["parent"] },
    { label: "Présences de l’enfant", icon: ClipboardCheck, roles: ["parent"] },
    { label: "Situation financière", icon: CircleDollarSign, roles: ["parent"] },
    { label: "Documents de l’enfant", icon: FolderOpen, roles: ["parent"] },
    { label: "Notifications", icon: Bell, roles: ["parent"] },
    { label: "Mon profil", icon: UserCheck, roles: ["parent"] },
  ],
};

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
  const { user, loading, isAuthenticated, logout } = useAuth();
  const role: Role = user?.role === "admin" ? "admin" : user?.role === "parent" ? "parent" : "teacher";
  const [activeNav, setActiveNav] = useState(() => {
    const view = new URLSearchParams(window.location.search).get("vue");
    return view === "administrateur" ? "Vue administrateur" : view === "utilisateurs" ? "Utilisateurs" : view === "controle-annuel" ? "Contrôle annuel" : view === "examens" ? "Examens" : view === "taches" ? "Mes tâches" : view === "documents" ? "Documents" : view === "aide" ? "Centre d’aide" : view === "profil" ? "Mon profil" : view === "notifications" ? "Notifications" : view === "eleves" ? "Élèves" : view === "profil-eleve" ? "Profil élève" : view === "inscription" ? "Inscription / Réinscription" : view === "classes" ? "Classes" : view === "classe-7a" ? "Espace de classe" : view === "cours" ? "Cours" : view === "ponderations" ? "Cours et pondérations" : view === "enseignants" ? "Enseignants" : view === "profil-enseignant" ? "Profil enseignant" : view === "affectations" ? "Affectations" : view === "annees" ? "Années scolaires" : view === "import-eleves" ? "Importer les élèves" : view === "enseignements" ? "Mes enseignements" : view === "appel" ? "Faire l’appel" : view === "historique-presences" ? "Historique des présences" : view === "evaluations-enseignant" ? "Évaluations enseignant" : view === "saisie-notes" ? "Saisie des notes" : view === "saisie-examen" ? "Saisie examen" : view === "rapport-enseignant" ? "Rapport enseignant" : view === "suivi-saisies" ? "Suivi des saisies" : view === "validation-notes" ? "Validation des notes" : view === "releve-cotes" ? "Relevé de côtes" : view === "resultats-classe" ? "Résultats classe" : view === "resultats-eleve" ? "Résultats élève" : "Tableau de bord";
  });
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchCategory, setSearchCategory] = useState<"all" | "students" | "staff" | "classes" | "finance" | "documents">("all");
  const [searchResult, setSearchResult] = useState<SearchResultSelection | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [academicYear, setAcademicYear] = useState("2026-2027");
  const yearsQuery = trpc.school.years.list.useQuery();
  const searchInput = useMemo(() => ({ query: searchTerm.trim(), category: searchCategory }), [searchCategory, searchTerm]);
  const globalSearch = trpc.personal.search.useQuery(searchInput, { enabled: searchOpen && searchTerm.trim().length >= 2 });

  const visibleGroups = useMemo(
    () => (role === "parent" ? [navGroups[0], parentNavGroup] : navGroups)
      .map((group) => ({ ...group, items: group.items.filter((item) => item.roles.includes(role)) }))
      .filter((group) => group.items.length > 0),
    [role],
  );

  useEffect(() => {
    const stillVisible = visibleGroups.some((group) => group.items.some((item) => item.label === activeNav));
    if (!stillVisible && !["Profil élève", "Espace de classe", "Cours et pondérations", "Profil enseignant", "Élèves de la classe", "Faire l’appel", "Historique des présences", "Évaluations enseignant", "Saisie des notes", "Saisie examen", "Rapport enseignant", "Suivi des saisies", "Validation des notes", "Relevé de côtes", "Résultats classe", "Résultats élève", "Notifications", "Résultat de recherche"].includes(activeNav)) setActiveNav("Tableau de bord");
  }, [activeNav, visibleGroups]);

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("toast") !== "success") return undefined;
    const timer = window.setTimeout(() => toast.success("Paiement enregistré", { description: "185 000 CDF ont été enregistrés pour Mireille Kalume.", duration: 4800 }), 120);
    return () => window.clearTimeout(timer);
  }, []);

  const navigate = (label: string) => {
    setActiveNav(label);
    setMobileNavOpen(false);
  };

  const navigateSearchResult = (result: SearchResultSelection) => {
    setSearchResult(result);
    setSearchOpen(false);
    navigate("Résultat de recherche");
  };

  const toggleStudent = (code: string) => {
    setSelectedStudents((current) => current.includes(code) ? current.filter((value) => value !== code) : [...current, code]);
  };

  const selectAll = (checked: boolean) => {
    setSelectedStudents(checked ? students.map((student) => student.code) : []);
  };

  const showToast = (title: string, description: string) => toast(title, { description });
  const showSuccessToast = (title: string, description: string) => toast.success(title, { description, duration: 4800 });
  const isDashboard = activeNav === "Tableau de bord";
  const isSystem = activeNav === "Bibliothèque UI";
  const isAdminDashboard = activeNav === "Vue administrateur";
  const isStudents = activeNav === "Élèves";
  const isStudentProfile = activeNav === "Profil élève";
  const isEnrollment = activeNav === "Inscription / Réinscription";
  const isClasses = activeNav === "Classes";
  const isClassWorkspace = activeNav === "Espace de classe";
  const isAcademicSuite = ["Cours", "Cours et pondérations", "Enseignants", "Profil enseignant", "Affectations", "Années scolaires", "Importer les élèves"].includes(activeNav);
  const isTeacherSuite = ["Mes enseignements", "Élèves de la classe", "Faire l’appel", "Historique des présences", "Évaluations enseignant", "Saisie des notes", "Saisie examen", "Rapport enseignant", "Suivi des saisies", "Validation des notes", "Relevé de côtes", "Résultats classe", "Résultats élève"].includes(activeNav) || role === "teacher";
  const isParentSuite = ["Mes enfants", "Résultats scolaires", "Présences de l’enfant", "Situation financière", "Documents de l’enfant", "Notifications", "Mon profil"].includes(activeNav) || role === "parent";
  const isPersonalCenter = role !== "parent" && ["Mes tâches", "Documents", "Centre d’aide", "Mon profil", "Notifications"].includes(activeNav);
  const isSearchResult = activeNav === "Résultat de recherche" && Boolean(searchResult);
  const isAnnualControl = activeNav === "Contrôle annuel";
  const isAdminTeachingView = ["Suivi des saisies", "Validation des notes", "Résultats classe"].includes(activeNav);
  const isAdminOnlyView = ["Vue administrateur", "Élèves", "Inscription / Réinscription", "Importer les élèves", "Classes", "Espace de classe", "Cours", "Cours et pondérations", "Enseignants", "Profil enseignant", "Affectations", "Années scolaires", "Bibliothèque UI"].includes(activeNav);

  if (loading) return <div className="auth-gate"><CrestMark /><div className="auth-gate-card"><ShieldCheck size={22} /><h1>Vérification de l’accès</h1><p>Préparation de votre environnement de gestion scolaire sécurisé.</p></div></div>;
  if (!isAuthenticated) return <div className="auth-gate"><CrestMark /><div className="auth-gate-card"><ShieldCheck size={22} /><p className="eyebrow">Accès sécurisé</p><h1>Connectez-vous à Les Anges du Ciel</h1><p>Une session est requise pour consulter ou modifier les dossiers scolaires persistants.</p><Button className="primary-action" onClick={() => startLogin()}>Se connecter</Button></div></div>;

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
              <SelectContent>{(yearsQuery.data ?? []).map((year) => <SelectItem key={year.id} value={year.code}>{year.code}</SelectItem>)}</SelectContent>
            </Select>
            <button className="icon-button desktop-only" onClick={() => setSearchOpen(true)} aria-label="Rechercher"><Search size={19} /></button>
            <button className="icon-button notification-button" onClick={() => navigate("Notifications")} aria-label="Notifications"><Bell size={19} /><span /></button>
            <div className="topbar-popover-wrap">
              <button className="profile-button" onClick={() => setProfileOpen((value) => !value)}>
                <span className="avatar avatar-primary">{(user?.name || "AM").split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase()}</span>
                <span className="profile-copy"><strong>{user?.name || "Utilisateur"}</strong><small>{role === "admin" ? "Administratrice" : role === "parent" ? "Responsable" : "Enseignante"}</small></span>
                <ChevronDown size={15} className="desktop-only" />
              </button>
              {profileOpen && (
                <div className="profile-popover">
                  <p className="menu-label">Permissions de la session</p>
                  <div className="role-option is-selected"><ShieldCheck size={16} /><span><strong>{role === "admin" ? "Administratrice" : role === "parent" ? "Responsable" : "Enseignante"}</strong><small>{role === "admin" ? "Accès administrateur accordé par le compte" : role === "parent" ? "Accès limité aux enfants explicitement liés à votre compte" : "Accès limité aux affectations de votre compte"}</small></span></div>
                  <button className="role-option" onClick={() => { setProfileOpen(false); navigate("Mon profil"); }}><UserCheck size={16} /><span><strong>Mon profil</strong><small>Informations et sécurité du compte</small></span></button>
                  <button className="role-option" onClick={() => logout()}><Archive size={16} /><span><strong>Se déconnecter</strong><small>Fermer la session en cours</small></span></button>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="app-main">
          {!isAdminDashboard && !isStudents && !isStudentProfile && !isEnrollment && !isClasses && !isClassWorkspace && !isAcademicSuite && !isTeacherSuite && !isParentSuite && !isPersonalCenter && !isSearchResult && !isAnnualControl && <section className="page-heading">
            <div>
              <p className="eyebrow">{isSystem ? "Référentiel de composants" : "Vue institutionnelle"}</p>
              <h1>{isSystem ? "Bibliothèque UI" : activeNav}</h1>
              <p className="page-subtitle">{isSystem ? "États, contrôles et modèles réutilisables de l’application." : "Suivez les données essentielles de l’établissement dans leur contexte courant."}</p>
            </div>
            {!isSystem && <Button className="primary-action page-action" onClick={() => navigate("Inscription / Réinscription")}><Plus size={17} /> Nouvelle opération</Button>}
          </section>}

          {!isDashboard && !isSystem && !isAdminDashboard && !isStudents && !isStudentProfile && !isEnrollment && !isClasses && !isClassWorkspace && !isAcademicSuite && !isTeacherSuite && !isParentSuite && !isPersonalCenter && !isSearchResult && !isAnnualControl && <div className="context-rail"><ContextPill>Année scolaire {academicYear}</ContextPill><ContextPill>Section : Secondaire</ContextPill></div>}

          {false && isDashboard && role === "admin" && (
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

          {isSystem && role === "admin" && <DesignSystemShowcase onToast={showToast} />}
          {isDashboard && role === "admin" && <AdminDashboard onNavigate={navigate} onAction={showSuccessToast} academicYearCode={academicYear} />}
          {isAdminDashboard && role === "admin" && <AdminDashboard onNavigate={navigate} onAction={showSuccessToast} academicYearCode={academicYear} />}
          {isStudents && role === "admin" && <StudentManagement onToast={showToast} onSuccess={showSuccessToast} onNavigate={navigate} />}
          {isStudentProfile && role === "admin" && <StudentProfile onBack={() => navigate("Élèves")} onToast={showToast} />}
          {isEnrollment && role === "admin" && <EnrollmentWizard onBack={() => navigate("Élèves")} onSuccess={showSuccessToast} />}
          {isClasses && role === "admin" && <ClassManagement onToast={showToast} onOpenWorkspace={() => navigate("Espace de classe")} onNavigate={navigate} />}
          {isClassWorkspace && role === "admin" && <ClassWorkspace onBack={() => navigate("Classes")} onToast={showToast} onNavigate={navigate} />}
          {activeNav === "Cours" && role === "admin" && <CourseCatalog onToast={showToast} onNavigate={navigate} />}
          {activeNav === "Cours et pondérations" && role === "admin" && <WeightConfiguration onBack={() => navigate("Espace de classe")} onToast={showToast} />}
          {activeNav === "Enseignants" && role === "admin" && <><TeacherManagement onToast={showToast} onNavigate={navigate} /><TeacherAccountLinker onToast={showToast} /></>}
          {activeNav === "Profil enseignant" && role === "admin" && <TeacherProfile onBack={() => navigate("Enseignants")} onToast={showToast} />}
          {activeNav === "Affectations" && role === "admin" && <AssignmentManagement onToast={showToast} />}
          {activeNav === "Années scolaires" && role === "admin" && <NewYearPreparation onToast={showSuccessToast} />}
          {activeNav === "Importer les élèves" && role === "admin" && <ExcelStudentImport onToast={showSuccessToast} onNavigate={navigate} />}
          {activeNav === "Utilisateurs" && role === "admin" && <GovernanceSuite />}
          {isAnnualControl && role === "admin" && <AnnualControlCenter onNavigate={navigate} />}
          {activeNav === "Examens" && role === "admin" && <SecondSessionSuite />}
          {isPersonalCenter && <PersonalCenter view={activeNav === "Mes tâches" ? "tasks" : activeNav === "Documents" ? "documents" : activeNav === "Centre d’aide" ? "help" : activeNav === "Notifications" ? "notifications" : "profile"} role={role} onNavigate={navigate} />}
          {isSearchResult && searchResult && <SearchResultPanel result={searchResult} onBack={() => { setSearchResult(null); setSearchOpen(true); }} />}
          {isAdminOnlyView && role !== "admin" && <section className="workspace-placeholder"><div className="placeholder-rule" /><p className="eyebrow">Accès limité</p><h2>Module administratif</h2><p>{role === "parent" ? "Ce registre est réservé à l’administration. Votre compte parent reste limité aux enfants explicitement liés à votre dossier." : "Ce registre est réservé à l’administration. Votre compte enseignant peut uniquement consulter et gérer vos affectations pédagogiques."}</p><Button className="primary-action" onClick={() => navigate(role === "parent" ? "Tableau de bord" : "Mes enseignements")}>{role === "parent" ? "Retour à mon espace" : "Retour à mes enseignements"}</Button></section>}
          {(activeNav === "Tableau de bord" && role === "teacher") && <TeacherSuite view="dashboard" onNavigate={(view) => navigate(view === "teachings" ? "Mes enseignements" : view === "attendance" ? "Faire l’appel" : view === "grades" ? "Saisie des notes" : view === "report" ? "Rapport enseignant" : view === "evaluations" ? "Évaluations enseignant" : "Tableau de bord")} onToast={showToast} />}
          {(activeNav === "Tableau de bord" && role === "parent") && <ParentSuite view="dashboard" parentName={user?.name || "Responsable"} onNavigate={(view) => navigate(view === "children" ? "Mes enfants" : view === "results" ? "Résultats scolaires" : view === "attendance" ? "Présences de l’enfant" : view === "finances" ? "Situation financière" : view === "documents" ? "Documents de l’enfant" : view === "notifications" ? "Notifications" : view === "profile" ? "Mon profil" : "Tableau de bord")} />}
          {role === "parent" && activeNav === "Mes enfants" && <ParentSuite view="children" parentName={user?.name || "Responsable"} onNavigate={(view) => navigate(view === "results" ? "Résultats scolaires" : "Tableau de bord")} />}
          {role === "parent" && activeNav === "Résultats scolaires" && <ParentSuite view="results" parentName={user?.name || "Responsable"} onNavigate={() => navigate("Tableau de bord")} />}
          {role === "parent" && activeNav === "Présences de l’enfant" && <ParentSuite view="attendance" parentName={user?.name || "Responsable"} onNavigate={() => navigate("Tableau de bord")} />}
          {role === "parent" && activeNav === "Situation financière" && <ParentSuite view="finances" parentName={user?.name || "Responsable"} onNavigate={() => navigate("Tableau de bord")} />}
          {role === "parent" && activeNav === "Documents de l’enfant" && <ParentSuite view="documents" parentName={user?.name || "Responsable"} onNavigate={() => navigate("Tableau de bord")} />}
          {role === "parent" && activeNav === "Notifications" && <ParentSuite view="notifications" parentName={user?.name || "Responsable"} onNavigate={() => navigate("Tableau de bord")} />}
          {role === "parent" && activeNav === "Mon profil" && <ParentSuite view="profile" parentName={user?.name || "Responsable"} onNavigate={() => navigate("Tableau de bord")} />}
          {activeNav === "Mes enseignements" && <TeacherSuite view="teachings" onNavigate={(view) => navigate(view === "students" ? "Élèves de la classe" : view === "attendance" ? "Faire l’appel" : view === "grades" ? "Saisie des notes" : view === "evaluations" ? "Évaluations enseignant" : view === "report" ? "Rapport enseignant" : "Tableau de bord")} onToast={showToast} />}
          {activeNav === "Élèves de la classe" && <TeacherSuite view="students" onNavigate={() => navigate("Mes enseignements")} onToast={showToast} />}
          {activeNav === "Faire l’appel" && <TeacherSuite view="attendance" onNavigate={(view) => navigate(view === "teachings" ? "Mes enseignements" : "Historique des présences")} onToast={showSuccessToast} />}
          {activeNav === "Historique des présences" && <TeacherSuite view="history" onNavigate={() => navigate("Faire l’appel")} onToast={showToast} />}
          {activeNav === "Évaluations enseignant" && <TeacherSuite view="evaluations" onNavigate={() => navigate("Élèves")} onToast={showSuccessToast} />}
          {activeNav === "Saisie des notes" && <TeacherSuite view="grades" onNavigate={() => navigate("Mes enseignements")} onToast={showSuccessToast} />}
          {activeNav === "Saisie examen" && <TeacherSuite view="exam" onNavigate={() => navigate("Mes enseignements")} onToast={showSuccessToast} />}
          {activeNav === "Rapport enseignant" && <TeacherSuite view="report" onNavigate={() => navigate("Mes enseignements")} onToast={showSuccessToast} />}
          {activeNav === "Suivi des saisies" && role === "admin" && <TeacherSuite view="monitoring" onNavigate={() => navigate("Validation des notes")} onToast={showSuccessToast} />}
          {activeNav === "Validation des notes" && role === "admin" && <TeacherSuite view="validation" onNavigate={() => navigate("Suivi des saisies")} onToast={showSuccessToast} />}
          {activeNav === "Relevé de côtes" && <TeacherSuite view="reportcard" onNavigate={() => navigate("Tableau de bord")} onToast={showToast} />}
          {activeNav === "Résultats classe" && role === "admin" && <TeacherSuite view="results" onNavigate={() => navigate("Tableau de bord")} onToast={showToast} />}
          {activeNav === "Résultats élève" && <TeacherSuite view="studentresults" onNavigate={() => navigate("Tableau de bord")} onToast={showToast} />}
          {isAdminTeachingView && role !== "admin" && <section className="workspace-placeholder"><div className="placeholder-rule" /><p className="eyebrow">Accès limité</p><h2>Autorisation requise</h2><p>Cette vue est réservée à l’administration académique. Votre compte enseignant reste limité à vos affectations actives.</p><Button className="primary-action" onClick={() => navigate("Mes enseignements")}>Retour à mes enseignements</Button></section>}
          {!isDashboard && !isSystem && !isAdminDashboard && !isStudents && !isStudentProfile && !isEnrollment && !isClasses && !isClassWorkspace && !isAcademicSuite && !isTeacherSuite && !isParentSuite && !isPersonalCenter && !isSearchResult && !isAnnualControl && <WorkspacePlaceholder activeNav={activeNav} onAction={() => showToast("Création d’enregistrement", `Le formulaire ${activeNav.toLowerCase()} est prêt à être configuré.`)} />}
        </main>
      </div>

      <Dialog open={searchOpen} onOpenChange={setSearchOpen}>
        <DialogContent className="search-dialog">
          <DialogHeader><DialogTitle>Recherche globale</DialogTitle><DialogDescription>Retrouvez rapidement un élève, une classe, un reçu ou un document.</DialogDescription></DialogHeader>
          <div className="dialog-search"><Search size={18} /><Input autoFocus value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder="Rechercher un élève, une classe ou un document…" /></div>
          <div className="search-filter-row" role="group" aria-label="Filtrer les résultats de recherche">{(["all", "students", "staff", "classes", "finance", "documents"] as const).map((category) => <button key={category} className={searchCategory === category ? "is-active" : ""} onClick={() => setSearchCategory(category)}>{category === "all" ? "Tout" : category === "students" ? "Élèves" : category === "staff" ? "Personnel" : category === "classes" ? "Classes" : category === "finance" ? "Finances" : "Documents"}</button>)}</div>
          <div className="search-suggestions"><span>{searchTerm.trim().length < 2 ? "Saisissez au moins deux caractères" : globalSearch.isLoading ? "Recherche en cours…" : "Résultats autorisés"}</span>{globalSearch.data?.map((item) => <button key={`${item.category}-${item.id}`} onClick={() => navigateSearchResult(item)}><span><strong>{item.title}</strong><small>{item.category === "students" ? "Élève" : item.category === "staff" ? "Personnel" : item.category === "classes" ? "Classe" : item.category === "finance" ? "Paiement" : "Document"} · {item.detail}</small></span><ChevronRight size={16} /></button>)}{searchTerm.trim().length >= 2 && !globalSearch.isLoading && !globalSearch.data?.length && <p className="search-empty">Aucun résultat trouvé dans les données auxquelles votre compte est autorisé à accéder.</p>}</div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
