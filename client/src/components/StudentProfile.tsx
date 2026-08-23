/**
 * Direction visuelle : « Registre diocésain contemporain » — le dossier personnel pérenne
 * et le dossier scolaire annuel restent visuellement séparés, riches mais faciles à parcourir.
 */
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ArchiveRestore,
  ArrowLeft,
  BadgeCheck,
  Banknote,
  Bell,
  BookOpenCheck,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  FileSpreadsheet,
  FileText,
  FolderOpen,
  GraduationCap,
  Mail,
  MoreHorizontal,
  Pencil,
  Phone,
  Printer,
  ReceiptText,
  Send,
  ShieldCheck,
  UserRound,
  UsersRound,
  WalletCards,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useState } from "react";

type ProfileTab = "overview" | "personal" | "schooling" | "results" | "attendance" | "assessments" | "finance" | "documents" | "communication" | "history";

const tabs: { id: ProfileTab; label: string }[] = [
  { id: "overview", label: "Vue d’ensemble" }, { id: "personal", label: "Informations personnelles" }, { id: "schooling", label: "Scolarité" }, { id: "results", label: "Résultats" }, { id: "attendance", label: "Présences" }, { id: "assessments", label: "Évaluations" }, { id: "finance", label: "Finances" }, { id: "documents", label: "Documents" }, { id: "communication", label: "Communication" }, { id: "history", label: "Historique" },
];

const documents = [
  { name: "Acte de naissance", category: "Identité · PDF", date: "11 août 2026", tone: "blue" },
  { name: "Bulletin annuel 2025-2026", category: "Scolarité · PDF", date: "19 juillet 2026", tone: "gold" },
  { name: "Reçu de paiement REC-2026-084", category: "Finance · PDF", date: "27 août 2026", tone: "green" },
];

const activity: { icon: LucideIcon; title: string; detail: string; time: string; tone: string }[] = [
  { icon: Banknote, title: "Paiement enregistré", detail: "185 000 CDF · Frais de scolarité · REC-2026-084", time: "27 août · 10:18", tone: "green" },
  { icon: ClipboardCheck, title: "Présence confirmée", detail: "Jean Kabila est présent en 7e A.", time: "27 août · 07:46", tone: "blue" },
  { icon: FileSpreadsheet, title: "Note corrigée", detail: "Mathématiques · Contrôle continu 2 · 16 / 20", time: "26 août · 15:32", tone: "gold" },
  { icon: FolderOpen, title: "Document ajouté", detail: "Reçu de paiement classé dans le dossier finance.", time: "26 août · 14:10", tone: "slate" },
];

const progressionBySubject: Record<string, { period: string; jean: number; classAverage: number; assessment: string }[]> = {
  "Toutes les matières": [
    { period: "Sept.", jean: 72, classAverage: 69, assessment: "Évaluations diagnostiques" },
    { period: "Oct.", jean: 75, classAverage: 71, assessment: "Contrôles continus" },
    { period: "Nov.", jean: 78, classAverage: 73, assessment: "Devoirs mensuels" },
    { period: "Déc.", jean: 76, classAverage: 72, assessment: "Synthèse du trimestre" },
    { period: "Jan.", jean: 78.4, classAverage: 74, assessment: "Moyenne actuelle" },
  ],
  Mathématiques: [
    { period: "Sept.", jean: 70, classAverage: 68, assessment: "Évaluation 1" },
    { period: "Oct.", jean: 76, classAverage: 70, assessment: "Contrôle continu 1" },
    { period: "Nov.", jean: 81, classAverage: 72, assessment: "Devoir 1" },
    { period: "Déc.", jean: 80, classAverage: 73, assessment: "Contrôle continu 2" },
    { period: "Jan.", jean: 84, classAverage: 74, assessment: "Moyenne actuelle" },
  ],
  Français: [
    { period: "Sept.", jean: 75, classAverage: 70, assessment: "Expression écrite" },
    { period: "Oct.", jean: 72, classAverage: 71, assessment: "Grammaire" },
    { period: "Nov.", jean: 76, classAverage: 72, assessment: "Lecture" },
    { period: "Déc.", jean: 73, classAverage: 72, assessment: "Dictée" },
    { period: "Jan.", jean: 74, classAverage: 73, assessment: "Moyenne actuelle" },
  ],
  Sciences: [
    { period: "Sept.", jean: 71, classAverage: 69, assessment: "Observation" },
    { period: "Oct.", jean: 77, classAverage: 71, assessment: "Expérimentation" },
    { period: "Nov.", jean: 80, classAverage: 73, assessment: "Interrogation" },
    { period: "Déc.", jean: 79, classAverage: 72, assessment: "Compte rendu" },
    { period: "Jan.", jean: 79, classAverage: 74, assessment: "Moyenne actuelle" },
  ],
};

function DetailList({ title, label, icon: Icon, children }: { title: string; label: string; icon: LucideIcon; children: React.ReactNode }) {
  return <article className="profile-record"><div className="profile-record-heading"><span><Icon size={16} /></span><div><p className="eyebrow">{label}</p><h2>{title}</h2></div></div>{children}</article>;
}

function DefinitionRows({ rows }: { rows: { label: string; value: React.ReactNode }[] }) {
  return <dl className="profile-definition-list">{rows.map((row) => <div key={row.label}><dt>{row.label}</dt><dd>{row.value}</dd></div>)}</dl>;
}

function AcademicStrip({ label, value, helper, color }: { label: string; value: string; helper: string; color: "blue" | "green" | "gold" | "slate" }) {
  return <div className={`academic-strip profile-${color}`}><span>{label}</span><strong>{value}</strong><small>{helper}</small></div>;
}

function HistoryTimeline() {
  return <div className="school-history"><div className="school-history-item"><span className="history-point complete"><CheckCircle2 size={13} /></span><div><strong>2024-2025</strong><p>6e · Secondaire</p><small>Année validée · moyenne annuelle 75,2 %</small></div></div><div className="school-history-item"><span className="history-point complete"><CheckCircle2 size={13} /></span><div><strong>2025-2026</strong><p>7e · Secondaire</p><small>Année validée · moyenne annuelle 77,6 %</small></div></div><div className="school-history-item"><span className="history-point current"><GraduationCap size={13} /></span><div><strong>2026-2027</strong><p>7e A · Secondaire</p><small>Inscription active · année en cours</small></div></div></div>;
}

function DocumentsList({ compact = false }: { compact?: boolean }) {
  return <div className={`profile-documents ${compact ? "is-compact" : ""}`}>{documents.map((document) => <button className="profile-document-row" key={document.name}><span className={`document-icon ${document.tone}`}><FileText size={15} /></span><span><strong>{document.name}</strong><small>{document.category} · {document.date}</small></span><ChevronRight size={15} /></button>)}</div>;
}

function ActivityList({ limit }: { limit?: number }) {
  return <div className="profile-activity">{activity.slice(0, limit ?? activity.length).map((item) => { const Icon = item.icon; return <div className="profile-activity-row" key={item.title}><span className={`profile-activity-icon ${item.tone}`}><Icon size={15} /></span><div><strong>{item.title}</strong><small>{item.detail}</small></div><time>{item.time}</time></div>; })}</div>;
}

export function StudentProfile({ onBack, onToast }: { onBack: () => void; onToast: (title: string, description: string) => void }) {
  const [activeTab, setActiveTab] = useState<ProfileTab>(() => new URLSearchParams(window.location.search).get("onglet") === "resultats" ? "results" : "overview");
  const [progressionSubject, setProgressionSubject] = useState("Toutes les matières");
  const progressionData = progressionBySubject[progressionSubject];
  const latestProgress = progressionData[progressionData.length - 1];

  const overview = <div className="profile-overview-grid"><div className="profile-overview-main"><section className="profile-record-grid"><DetailList title="Informations personnelles" label="Dossier permanent" icon={UserRound}><DefinitionRows rows={[{ label: "Nom", value: "Kabila" }, { label: "Postnom", value: "Kalenda" }, { label: "Prénom", value: "Jean" }, { label: "Date de naissance", value: "18 mars 2012" }, { label: "Sexe", value: "Masculin" }, { label: "Téléphone", value: "+243 81 430 2290" }]} /></DetailList><DetailList title="Parents / responsables" label="Dossier permanent" icon={UsersRound}><div className="guardian-list"><div><span className="guardian-role">Père</span><strong>M. Pierre Kabila</strong><small><Phone size={12} /> +243 81 430 2290</small></div><div><span className="guardian-role">Mère</span><strong>Mme Odette Kabila</strong><small><Phone size={12} /> +243 82 590 6412</small></div><div><span className="guardian-role">Tuteur</span><strong>M. Samuel Kalenda</strong><small><Phone size={12} /> +243 89 261 7794</small></div></div></DetailList></section><DetailList title="Scolarité actuelle" label="Dossier annuel · 2026-2027" icon={GraduationCap}><DefinitionRows rows={[{ label: "Année scolaire", value: "2026-2027" }, { label: "Section", value: "Secondaire" }, { label: "Niveau", value: "7e" }, { label: "Classe", value: "7e A" }, { label: "Type d’inscription", value: "Réinscription" }, { label: "Date d’inscription", value: "11 août 2026" }]} /></DetailList><DetailList title="Synthèse académique" label="Dossier annuel · premier trimestre" icon={BookOpenCheck}><div className="academic-strip-grid"><AcademicStrip label="Moyenne actuelle" value="78,4 %" helper="15,7 / 20" color="blue" /><AcademicStrip label="Rang actuel" value="6e / 32" helper="Classe 7e A" color="green" /><AcademicStrip label="Total des points" value="628" helper="sur 800" color="gold" /><AcademicStrip label="Taux de présence" value="96,8 %" helper="29 jours sur 30" color="slate" /></div></DetailList></div><aside className="profile-overview-aside"><DetailList title="Synthèse financière" label="Dossier annuel · 2026-2027" icon={WalletCards}><div className="profile-finance-summary"><div><span>Frais totaux</span><strong>620 000 CDF</strong></div><div><span>Montant payé</span><strong className="finance-paid">435 000 CDF</strong></div><div><span>Solde restant</span><strong className="finance-balance">185 000 CDF</strong></div><div className="latest-payment"><ReceiptText size={15} /><span><small>Dernier paiement</small><strong>185 000 CDF · 27 août 2026</strong></span></div></div></DetailList><DetailList title="Parcours scolaire" label="Historique réel" icon={CalendarDays}><HistoryTimeline /></DetailList></aside><DetailList title="Documents récents" label="Dossier permanent et annuel" icon={FolderOpen}><DocumentsList compact /></DetailList><DetailList title="Activité récente" label="Journal du dossier élève" icon={FileSpreadsheet}><ActivityList limit={4} /></DetailList></div>;

  const personal = <div className="profile-detail-page"><DetailList title="État civil et contacts" label="Dossier permanent" icon={UserRound}><DefinitionRows rows={[{ label: "Nom", value: "Kabila" }, { label: "Postnom", value: "Kalenda" }, { label: "Prénom", value: "Jean" }, { label: "Date de naissance", value: "18 mars 2012" }, { label: "Lieu de naissance", value: "Kinshasa" }, { label: "Sexe", value: "Masculin" }, { label: "Téléphone", value: "+243 81 430 2290" }, { label: "Adresse", value: "Quartier Ma Campagne, Kinshasa" }]} /></DetailList><DetailList title="Responsables légaux" label="Dossier permanent" icon={UsersRound}><div className="guardian-list extended"><div><span className="guardian-role">Père</span><strong>M. Pierre Kabila</strong><small><Phone size={12} /> +243 81 430 2290</small><small><Mail size={12} /> pierre.kabila@exemple.cd</small></div><div><span className="guardian-role">Mère</span><strong>Mme Odette Kabila</strong><small><Phone size={12} /> +243 82 590 6412</small><small><Mail size={12} /> odette.kabila@exemple.cd</small></div><div><span className="guardian-role">Tuteur</span><strong>M. Samuel Kalenda</strong><small><Phone size={12} /> +243 89 261 7794</small><small>Contact d’urgence</small></div></div></DetailList></div>;

  const schooling = <div className="profile-detail-page"><DetailList title="Inscription en cours" label="Dossier annuel · 2026-2027" icon={GraduationCap}><DefinitionRows rows={[{ label: "Année scolaire", value: "2026-2027" }, { label: "Section", value: "Secondaire" }, { label: "Niveau", value: "7e" }, { label: "Classe", value: "7e A" }, { label: "Statut", value: <Badge className="status-badge success">Actif</Badge> }, { label: "Type d’inscription", value: "Réinscription" }, { label: "Date d’inscription", value: "11 août 2026" }]} /></DetailList><DetailList title="Historique scolaire" label="Années terminées et année en cours" icon={CalendarDays}><HistoryTimeline /></DetailList></div>;

  const results = <div className="profile-detail-page"><DetailList title="Progression des notes" label="Dossier annuel · évolution par période" icon={BookOpenCheck}><div className="progression-toolbar"><div><p>Lecture interactive de la progression de Jean Kabila sur l’année scolaire.</p><div className="progression-legend"><span><i className="jean-line" /> Jean Kabila</span><span><i className="class-line" /> Moyenne de 7e A</span></div></div><Select value={progressionSubject} onValueChange={setProgressionSubject}><SelectTrigger aria-label="Filtrer la progression par matière" className="progression-subject-select"><SelectValue /></SelectTrigger><SelectContent>{Object.keys(progressionBySubject).map((subject) => <SelectItem key={subject} value={subject}>{subject}</SelectItem>)}</SelectContent></Select></div><div className="progression-metrics"><div><span>Dernière moyenne</span><strong>{String(latestProgress.jean).replace(".", ",")} %</strong><small>{latestProgress.assessment}</small></div><div><span>Écart avec la classe</span><strong className="positive">+{String((latestProgress.jean - latestProgress.classAverage).toFixed(1)).replace(".", ",")} pts</strong><small>moyenne 7e A : {latestProgress.classAverage} %</small></div></div><div className="progression-chart" aria-label="Graphique interactif de la progression annuelle des notes"><ResponsiveContainer width="100%" height="100%"><LineChart data={progressionData} margin={{ top: 17, right: 10, left: -19, bottom: 0 }}><CartesianGrid vertical={false} stroke="#e7edf3" strokeDasharray="3 3" /><XAxis dataKey="period" tick={{ fill: "#7e8c9e", fontSize: 10, fontWeight: 700 }} tickLine={false} axisLine={false} /><YAxis domain={[60, 90]} ticks={[60, 70, 80, 90]} tickFormatter={(value) => `${value} %`} tick={{ fill: "#8b97a6", fontSize: 9 }} tickLine={false} axisLine={false} /><Tooltip labelFormatter={(_, payload) => payload?.[0]?.payload?.assessment ?? "Évaluation"} formatter={(value: number, name: string): [string, string] => [`${String(value).replace(".", ",")} %`, name === "jean" ? "Jean Kabila" : "Moyenne 7e A"]} labelStyle={{ color: "#526277", fontSize: 11, fontWeight: 700 }} contentStyle={{ border: "1px solid #dbe4ef", borderRadius: "5px", boxShadow: "0 8px 18px rgba(34,52,77,.10)", fontSize: 11 }} /><Line isAnimationActive={false} type="monotone" dataKey="jean" stroke="#1f4a8a" strokeWidth={2.5} dot={{ r: 3.5, fill: "#1f4a8a", stroke: "#fff", strokeWidth: 2 }} activeDot={{ r: 5, fill: "#1f4a8a", stroke: "#fff", strokeWidth: 2 }} /><Line isAnimationActive={false} type="monotone" dataKey="classAverage" stroke="#b7831f" strokeWidth={1.8} strokeDasharray="4 4" dot={{ r: 2.8, fill: "#b7831f", stroke: "#fff", strokeWidth: 1.5 }} /></LineChart></ResponsiveContainer></div></DetailList><DetailList title="Résultats académiques" label="Premier trimestre · 7e A" icon={BookOpenCheck}><div className="results-headline"><AcademicStrip label="Moyenne actuelle" value="78,4 %" helper="15,7 / 20" color="blue" /><AcademicStrip label="Rang actuel" value="6e / 32" helper="Classe 7e A" color="green" /></div><table className="profile-data-table"><thead><tr><th>Matière</th><th>Points obtenus</th><th>Maximum</th><th>Moyenne</th><th>Appréciation</th></tr></thead><tbody><tr><td>Mathématiques</td><td>84</td><td>100</td><td>84 %</td><td><Badge className="status-badge success">Très bien</Badge></td></tr><tr><td>Français</td><td>74</td><td>100</td><td>74 %</td><td><Badge className="status-badge info">Bien</Badge></td></tr><tr><td>Sciences</td><td>79</td><td>100</td><td>79 %</td><td><Badge className="status-badge success">Très bien</Badge></td></tr><tr><td>Histoire</td><td>71</td><td>100</td><td>71 %</td><td><Badge className="status-badge info">Bien</Badge></td></tr></tbody></table></DetailList></div>;

  const attendance = <div className="profile-detail-page"><DetailList title="Présences" label="Dossier annuel · août 2026" icon={ClipboardCheck}><div className="attendance-figures"><AcademicStrip label="Taux de présence" value="96,8 %" helper="29 jours sur 30" color="green" /><AcademicStrip label="Retards" value="2" helper="ce mois" color="gold" /><AcademicStrip label="Absences justifiées" value="1" helper="27 août 2026" color="slate" /></div><div className="attendance-log"><div><span className="attendance-date">27 août</span><strong>Présent</strong><small>7e A · Appel du matin confirmé</small><Badge className="status-badge success">Confirmé</Badge></div><div><span className="attendance-date">26 août</span><strong>Présent</strong><small>7e A · Appel du matin confirmé</small><Badge className="status-badge success">Confirmé</Badge></div><div><span className="attendance-date">22 août</span><strong>Absence justifiée</strong><small>Motif transmis par la responsable légale</small><Badge className="status-badge info">Justifiée</Badge></div></div></DetailList></div>;

  const assessments = <div className="profile-detail-page"><DetailList title="Évaluations récentes" label="Dossier annuel · 7e A" icon={ClipboardCheck}><table className="profile-data-table"><thead><tr><th>Date</th><th>Matière</th><th>Évaluation</th><th>Note</th><th>État</th></tr></thead><tbody><tr><td>26 août 2026</td><td>Mathématiques</td><td>Contrôle continu 2</td><td><strong>16 / 20</strong></td><td><Badge className="status-badge success">Validée</Badge></td></tr><tr><td>22 août 2026</td><td>Sciences</td><td>Interrogation</td><td><strong>15 / 20</strong></td><td><Badge className="status-badge success">Validée</Badge></td></tr><tr><td>19 août 2026</td><td>Français</td><td>Expression écrite</td><td><strong>14 / 20</strong></td><td><Badge className="status-badge info">Publiée</Badge></td></tr></tbody></table></DetailList></div>;

  const finance = <div className="profile-detail-page"><DetailList title="Situation financière" label="Dossier annuel · 2026-2027" icon={WalletCards}><div className="finance-detail-grid"><AcademicStrip label="Frais totaux" value="620 000 CDF" helper="année scolaire" color="slate" /><AcademicStrip label="Total payé" value="435 000 CDF" helper="70,1 % régularisé" color="green" /><AcademicStrip label="Solde restant" value="185 000 CDF" helper="à régulariser" color="gold" /></div><table className="profile-data-table"><thead><tr><th>Date</th><th>Référence</th><th>Nature</th><th>Montant</th><th>Statut</th></tr></thead><tbody><tr><td>27 août 2026</td><td>REC-2026-084</td><td>Frais de scolarité</td><td>185 000 CDF</td><td><Badge className="status-badge success">Encaissé</Badge></td></tr><tr><td>15 août 2026</td><td>REC-2026-051</td><td>Frais d’inscription</td><td>250 000 CDF</td><td><Badge className="status-badge success">Encaissé</Badge></td></tr></tbody></table></DetailList></div>;

  const communication = <div className="profile-detail-page"><DetailList title="Communication avec les responsables" label="Dossier permanent" icon={Mail}><div className="communication-list"><div><span className="communication-icon"><Send size={15} /></span><div><strong>Rappel de solde envoyé</strong><small>SMS transmis à Mme Odette Kabila · +243 82 590 6412</small></div><time>27 août · 08:30</time></div><div><span className="communication-icon"><Mail size={15} /></span><div><strong>Relevé de notes partagé</strong><small>Courriel envoyé au responsable légal</small></div><time>24 août · 16:12</time></div><div><span className="communication-icon"><Bell size={15} /></span><div><strong>Convocation confirmée</strong><small>Rendez-vous pédagogique du 20 août</small></div><time>18 août · 11:05</time></div></div></DetailList></div>;

  const content = activeTab === "overview" ? overview : activeTab === "personal" ? personal : activeTab === "schooling" ? schooling : activeTab === "results" ? results : activeTab === "attendance" ? attendance : activeTab === "assessments" ? assessments : activeTab === "finance" ? finance : activeTab === "documents" ? <div className="profile-detail-page"><DetailList title="Documents du dossier" label="Dossier permanent et annuel" icon={FolderOpen}><DocumentsList /></DetailList></div> : activeTab === "communication" ? communication : <div className="profile-detail-page"><DetailList title="Historique du dossier" label="Opérations récentes" icon={FileSpreadsheet}><ActivityList /></DetailList></div>;

  return <section className="student-profile" aria-label="Profil de Jean Kabila"><button className="profile-back" onClick={onBack}><ArrowLeft size={16} /> Retour à la liste des élèves</button><header className="student-profile-header"><div className="profile-identity"><span className="profile-avatar">JK</span><div><p className="eyebrow">Dossier élève · identité permanente</p><h1>Jean Kabila</h1><div className="profile-meta"><span>STU-000145</span><i /> <span>Classe actuelle : <strong>7e A</strong></span><Badge className="status-badge success">Actif</Badge></div></div></div><div className="profile-actions"><Button variant="outline" className="secondary-action" onClick={() => onToast("Modification du dossier", "La fiche permanente de Jean Kabila est prête à être modifiée.")}><Pencil size={15} /> Modifier</Button><Button variant="outline" className="secondary-action" onClick={() => onToast("Impression préparée", "Le dossier de Jean Kabila est prêt à être imprimé.")}><Printer size={15} /> Imprimer le dossier</Button><Button className="primary-action" onClick={() => onToast("Réinscription", "La préinscription 2027-2028 de Jean Kabila peut être préparée.")}><ArchiveRestore size={15} /> Réinscrire</Button><DropdownMenu><DropdownMenuTrigger asChild><button className="profile-more" aria-label="Plus d’actions"><MoreHorizontal size={20} /></button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem onClick={() => onToast("Dossier archivé", "La consultation des archives est prête.")}><FolderOpen size={15} /> Voir les archives</DropdownMenuItem><DropdownMenuItem onClick={() => onToast("Accès sécurité", "Le journal d’audit de ce dossier est disponible.")}><ShieldCheck size={15} /> Journal du dossier</DropdownMenuItem></DropdownMenuContent></DropdownMenu></div></header><div className="profile-scope-band"><span><UserRound size={15} /> Profil permanent : identité et responsables</span><ChevronRight size={15} /><span><GraduationCap size={15} /> Dossier annuel : 2026-2027 · Secondaire · 7e A</span></div><nav className="profile-tabs" aria-label="Sections du dossier élève">{tabs.map((tab) => <button key={tab.id} className={activeTab === tab.id ? "is-active" : ""} onClick={() => setActiveTab(tab.id)}>{tab.label}</button>)}</nav><div className="profile-content">{content}</div></section>;
}
