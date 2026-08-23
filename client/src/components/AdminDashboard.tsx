/**
 * Direction visuelle : « Registre diocésain contemporain » — un poste de pilotage
 * pour la direction, bâti en bandes de dossier et indicateurs Cobalt Kinshasa.
 */
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  ArrowRight,
  BadgeCheck,
  Banknote,
  BellRing,
  BookOpenCheck,
  CheckCircle2,
  ChevronRight,
  CircleAlert,
  ClipboardPenLine,
  Clock3,
  FileSpreadsheet,
  GraduationCap,
  Landmark,
  Plus,
  ReceiptText,
  ShieldCheck,
  UserPlus,
  UsersRound,
  WalletCards,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

const attendanceData = [
  { day: "Lun.", rate: 92.8 },
  { day: "Mar.", rate: 94.1 },
  { day: "Mer.", rate: 95.3 },
  { day: "Jeu.", rate: 93.7 },
  { day: "Ven.", rate: 94.2 },
];

const performanceData = [
  { className: "7e A", score: 15.8 },
  { className: "7e B", score: 14.6 },
  { className: "8e A", score: 13.9 },
  { className: "8e B", score: 15.1 },
  { className: "6e A", score: 14.3 },
];

const academics = [
  { label: "Notes à saisir", value: "17", helper: "évaluations ouvertes", tone: "blue", status: "À traiter" },
  { label: "Notes soumises", value: "31", helper: "en attente de contrôle", tone: "green", status: "Soumises" },
  { label: "Notes à valider", value: "8", helper: "validation direction", tone: "gold", status: "Prioritaire" },
  { label: "Rapports enseignants", value: "6", helper: "rapports à compléter", tone: "slate", status: "À relancer" },
];

const alerts = [
  { level: "attention", text: "17 notes sont encore en attente de soumission.", target: "Notes" },
  { level: "warning", text: "8 notes attendent une validation.", target: "Notes" },
  { level: "attention", text: "6 rapports enseignants doivent être complétés.", target: "Rapports" },
  { level: "risk", text: "3 élèves présentent un solde important.", target: "Soldes" },
];

const activities: { icon: LucideIcon; title: string; detail: string; time: string; tone: string }[] = [
  { icon: Banknote, title: "Paiement enregistré", detail: "KAS-2026-084 · 185 000 CDF · Mireille Kalume", time: "Il y a 12 min", tone: "green" },
  { icon: ClipboardPenLine, title: "Note corrigée", detail: "Mathématiques · 7e A · Mme Nathalie Lumbala", time: "Il y a 28 min", tone: "blue" },
  { icon: UserPlus, title: "Élève inscrit", detail: "David Mukendi · 8e B · Dossier complet", time: "Il y a 1 h", tone: "slate" },
  { icon: GraduationCap, title: "Enseignant affecté", detail: "M. Alain Kanku · Sciences · 6e A", time: "Il y a 2 h", tone: "blue" },
  { icon: FileSpreadsheet, title: "Relevé généré", detail: "7e A · Premier trimestre · 32 élèves", time: "Aujourd’hui, 09:10", tone: "gold" },
];

function StatStrip({ icon: Icon, label, value, detail, color }: { icon: LucideIcon; label: string; value: string; detail: string; color: "blue" | "green" | "gold" | "slate" }) {
  return (
    <article className={`admin-stat-strip admin-stat-${color}`}>
      <span className="admin-stat-icon"><Icon size={18} /></span>
      <div><p>{label}</p><strong>{value}</strong><small>{detail}</small></div>
    </article>
  );
}

function FinanceLine({ label, value, sub, emphasis = false }: { label: string; value: string; sub: string; emphasis?: boolean }) {
  return <div className={`finance-line ${emphasis ? "is-emphasis" : ""}`}><span><strong>{label}</strong><small>{sub}</small></span><b>{value}</b></div>;
}

export function AdminDashboard({ onNavigate, onAction }: { onNavigate: (label: string) => void; onAction: (title: string, detail: string) => void }) {
  return (
    <section className="admin-dashboard" aria-label="Tableau de bord administrateur">
      <header className="admin-dashboard-heading">
        <div>
          <div className="heading-kicker"><span className="admin-monogram"><ShieldCheck size={15} /></span> Direction de l’établissement</div>
          <h1>Bonjour, Administrateur</h1>
          <p>Voici un aperçu de l’activité de l’établissement.</p>
        </div>
        <div className="admin-context-block"><span>Contexte en cours</span><strong>Année scolaire : 2026-2027</strong><small>Section principale : Secondaire</small></div>
      </header>

      <section className="admin-stat-band" aria-label="Statistiques principales">
        <StatStrip icon={UsersRound} label="Élèves actifs" value="842" detail="17 admissions ce mois" color="blue" />
        <StatStrip icon={GraduationCap} label="Enseignants" value="64" detail="61 affectés ce jour" color="slate" />
        <StatStrip icon={Landmark} label="Classes" value="28" detail="Secondaire et primaire" color="gold" />
        <StatStrip icon={BadgeCheck} label="Taux de présence" value="94,2 %" detail="+0,8 point vs. lundi" color="green" />
      </section>

      <section className="admin-main-grid">
        <article className="admin-record academic-record">
          <div className="record-heading"><div><p className="eyebrow">Pilotage académique</p><h2>Situation des évaluations</h2></div><button onClick={() => onNavigate("Évaluations")}>Voir le registre <ChevronRight size={15} /></button></div>
          <div className="academic-status-grid">
            {academics.map((item) => <div className={`academic-status academic-${item.tone}`} key={item.label}><span>{item.label}</span><strong>{item.value}</strong><small>{item.helper}</small><Badge className={`status-badge ${item.tone === "green" ? "success" : item.tone === "gold" ? "warning" : "info"}`}>{item.status}</Badge></div>)}
          </div>
        </article>

        <article className="admin-record finance-record">
          <div className="record-heading"><div><p className="eyebrow">Vue financière</p><h2>Frais scolaires · 2026-2027</h2></div><button onClick={() => onNavigate("Paiements")}>Ouvrir les paiements <ChevronRight size={15} /></button></div>
          <div className="finance-progress"><div className="finance-progress-rail"><i /></div><span><strong>74 %</strong> de l’objectif annuel encaissé</span></div>
          <div className="finance-lines">
            <FinanceLine label="Frais attendus" value="124 800 000 CDF" sub="Objectif annuel consolidé" />
            <FinanceLine label="Montant encaissé" value="92 418 000 CDF" sub="Depuis le début de l’année" emphasis />
            <FinanceLine label="Solde restant" value="32 382 000 CDF" sub="À régulariser" />
            <FinanceLine label="Paiements du jour" value="3 860 000 CDF" sub="26 opérations validées" />
          </div>
        </article>
      </section>

      <section className="admin-analytics-grid">
        <article className="admin-record chart-record attendance-record">
          <div className="record-heading"><div><p className="eyebrow">Assiduité</p><h2>Présence · semaine en cours</h2></div><div className="chart-value"><strong>94,2 %</strong><span>aujourd’hui</span></div></div>
          <div className="chart-note"><span className="chart-legend blue" />Élèves présents sur les cinq derniers jours ouvrés</div>
          <div className="chart-frame" aria-label="Tendance du taux de présence du lundi au vendredi">
            <ResponsiveContainer width="100%" height="100%"><AreaChart data={attendanceData} margin={{ top: 14, right: 7, left: -20, bottom: 0 }}><defs><linearGradient id="attendanceFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#1f4a8a" stopOpacity={0.27} /><stop offset="100%" stopColor="#1f4a8a" stopOpacity={0.02} /></linearGradient></defs><CartesianGrid vertical={false} stroke="#e7edf3" strokeDasharray="3 3" /><XAxis dataKey="day" tick={{ fill: "#7c8a9b", fontSize: 10, fontWeight: 700 }} tickLine={false} axisLine={false} /><YAxis domain={[90, 97]} ticks={[90, 92, 94, 96]} tickFormatter={(value) => `${value} %`} tick={{ fill: "#8b97a6", fontSize: 9 }} tickLine={false} axisLine={false} /><Tooltip formatter={(value: number) => [`${String(value).replace(".", ",")} %`, "Présence"]} labelStyle={{ color: "#526277", fontSize: 11, fontWeight: 700 }} contentStyle={{ border: "1px solid #dbe4ef", borderRadius: "5px", boxShadow: "0 8px 18px rgba(34,52,77,.10)", fontSize: 11 }} /><Area isAnimationActive={false} type="monotone" dataKey="rate" stroke="#1f4a8a" strokeWidth={2.3} fill="url(#attendanceFill)" activeDot={{ r: 4, fill: "#1f4a8a", stroke: "#fff", strokeWidth: 2 }} /></AreaChart></ResponsiveContainer>
          </div>
        </article>

        <article className="admin-record chart-record performance-record">
          <div className="record-heading"><div><p className="eyebrow">Performance académique</p><h2>Moyenne par classe · Secondaire</h2></div><button onClick={() => onNavigate("Résultats")}>Détails <ChevronRight size={15} /></button></div>
          <div className="chart-note"><span className="chart-legend gold" />Moyenne générale sur 20 · évaluation trimestrielle</div>
          <div className="chart-frame" aria-label="Moyenne académique par classe de la section secondaire">
            <ResponsiveContainer width="100%" height="100%"><BarChart data={performanceData} margin={{ top: 12, right: 5, left: -20, bottom: 0 }} barCategoryGap="34%"><CartesianGrid vertical={false} stroke="#e7edf3" strokeDasharray="3 3" /><XAxis dataKey="className" tick={{ fill: "#7c8a9b", fontSize: 10, fontWeight: 700 }} tickLine={false} axisLine={false} /><YAxis domain={[0, 20]} ticks={[0, 5, 10, 15, 20]} tick={{ fill: "#8b97a6", fontSize: 9 }} tickLine={false} axisLine={false} /><Tooltip formatter={(value: number) => [`${String(value).replace(".", ",")} / 20`, "Moyenne"]} labelStyle={{ color: "#526277", fontSize: 11, fontWeight: 700 }} contentStyle={{ border: "1px solid #dbe4ef", borderRadius: "5px", boxShadow: "0 8px 18px rgba(34,52,77,.10)", fontSize: 11 }} /><Bar isAnimationActive={false} dataKey="score" fill="#b7831f" radius={[2, 2, 0, 0]} maxBarSize={25} /></BarChart></ResponsiveContainer>
          </div>
        </article>
      </section>

      <section className="admin-lower-grid">
        <article className="admin-record alerts-record">
          <div className="record-heading"><div><p className="eyebrow">Alertes opérationnelles</p><h2>Éléments nécessitant une décision</h2></div><BellRing size={18} className="record-heading-icon" /></div>
          <div className="alerts-list">{alerts.map((alert) => <button className={`alert-row alert-${alert.level}`} key={alert.text} onClick={() => onNavigate(alert.target)}><span>{alert.level === "risk" ? <CircleAlert size={16} /> : <Clock3 size={16} />}</span><strong>{alert.text}</strong><ChevronRight size={16} /></button>)}</div>
        </article>

        <article className="admin-record activity-record">
          <div className="record-heading"><div><p className="eyebrow">Activité récente</p><h2>Journal de l’établissement</h2></div><button onClick={() => onNavigate("Archives")}>Journal complet <ChevronRight size={15} /></button></div>
          <div className="activity-list">{activities.map((activity) => { const Icon = activity.icon; return <div className="activity-row" key={activity.title}><span className={`activity-icon ${activity.tone}`}><Icon size={15} /></span><div><strong>{activity.title}</strong><small>{activity.detail}</small></div><time>{activity.time}</time></div>; })}</div>
        </article>
      </section>

      <section className="quick-actions-band" aria-label="Actions rapides">
        <div><p className="eyebrow">Actions rapides</p><h2>Créer ou enregistrer sans quitter le poste de pilotage.</h2></div>
        <div className="quick-actions">
          <Button className="primary-action" onClick={() => onAction("Nouvel élève", "Le formulaire d’inscription est prêt à être ouvert.")}><Plus size={15} /> Ajouter un élève</Button>
          <Button variant="outline" className="secondary-action" onClick={() => onNavigate("Paiements")}><WalletCards size={15} /> Enregistrer un paiement</Button>
          <Button variant="outline" className="secondary-action" onClick={() => onNavigate("Affectations")}><GraduationCap size={15} /> Affecter un enseignant</Button>
          <Button variant="outline" className="secondary-action" onClick={() => onNavigate("Notes")}><BookOpenCheck size={15} /> Saisir une note</Button>
          <Button variant="outline" className="secondary-action" onClick={() => onAction("Relevé en préparation", "La génération du relevé a été ajoutée à la file de traitement.")}><ReceiptText size={15} /> Générer un relevé</Button>
        </div>
      </section>
    </section>
  );
}
