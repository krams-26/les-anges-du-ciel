/**
 * Direction visuelle : « Registre diocésain contemporain » — une vue de dossier où
 * l’identité élève pérenne reste distincte de l’inscription annuelle et de ses statuts.
 */
import { QuickActionModal } from "@/components/QuickActionModal";
import { StudentCsvImportModal } from "@/components/StudentCsvImportModal";
import type { CsvStudentRow } from "@/components/StudentCsvImportModal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArchiveRestore,
  ArrowDownUp,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  Download,
  Eye,
  FileText,
  Files,
  FolderOpen,
  GraduationCap,
  LoaderCircle,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  SlidersHorizontal,
  Upload,
  UserRound,
  WalletCards,
} from "lucide-react";
import { useMemo, useState } from "react";

export type Student = {
  id: string;
  matricule: string;
  fullName: string;
  initials: string;
  sex: "F" | "M";
  className: string;
  level: string;
  registrationType: "Nouvelle inscription" | "Réinscription";
  status: "Actif" | "En attente" | "Suspendu";
  balance: number;
  birthDate: string;
  parent: string;
  phone: string;
  enrollmentDate: string;
  documents: number;
};

const students: Student[] = [
  { id: "1", matricule: "STU-000145", fullName: "Jean Kabila", initials: "JK", sex: "M", className: "7e A", level: "7e", registrationType: "Réinscription", status: "Actif", balance: 185000, birthDate: "18 mars 2012", parent: "Mme Odette Kabila", phone: "+243 81 430 2290", enrollmentDate: "11 août 2026", documents: 5 },
  { id: "2", matricule: "STU-000146", fullName: "Sarah Mbayo", initials: "SM", sex: "F", className: "7e A", level: "7e", registrationType: "Nouvelle inscription", status: "Actif", balance: 0, birthDate: "27 juillet 2012", parent: "M. Jean-Pierre Mbayo", phone: "+243 89 816 4455", enrollmentDate: "12 août 2026", documents: 6 },
  { id: "3", matricule: "STU-000147", fullName: "Grâce Mulumba", initials: "GM", sex: "F", className: "7e B", level: "7e", registrationType: "Réinscription", status: "Actif", balance: 40000, birthDate: "03 mai 2012", parent: "Mme Sylvia Mulumba", phone: "+243 82 664 1092", enrollmentDate: "12 août 2026", documents: 5 },
  { id: "4", matricule: "STU-000148", fullName: "Yannick Banza", initials: "YB", sex: "M", className: "8e A", level: "8e", registrationType: "Réinscription", status: "Actif", balance: 235000, birthDate: "21 janvier 2011", parent: "M. Patrice Banza", phone: "+243 99 182 4587", enrollmentDate: "13 août 2026", documents: 4 },
  { id: "5", matricule: "STU-000149", fullName: "Bénédicte Nsimba", initials: "BN", sex: "F", className: "8e A", level: "8e", registrationType: "Nouvelle inscription", status: "En attente", balance: 0, birthDate: "14 novembre 2011", parent: "Mme Chantal Nsimba", phone: "+243 84 277 4019", enrollmentDate: "14 août 2026", documents: 3 },
  { id: "6", matricule: "STU-000150", fullName: "Amani Mbuyi", initials: "AM", sex: "M", className: "8e B", level: "8e", registrationType: "Réinscription", status: "Actif", balance: 85000, birthDate: "09 février 2011", parent: "M. David Mbuyi", phone: "+243 97 304 6631", enrollmentDate: "15 août 2026", documents: 5 },
  { id: "7", matricule: "STU-000151", fullName: "Rachel Kanku", initials: "RK", sex: "F", className: "6e A", level: "6e", registrationType: "Nouvelle inscription", status: "Actif", balance: 0, birthDate: "25 septembre 2013", parent: "Mme Marie Kanku", phone: "+243 81 560 8832", enrollmentDate: "16 août 2026", documents: 6 },
];

function StatusBadge({ status }: { status: Student["status"] }) {
  const className = status === "Actif" ? "success" : status === "En attente" ? "warning" : "error";
  return <Badge className={`status-badge ${className}`}>{status}</Badge>;
}

function SortHeader({ children }: { children: React.ReactNode }) {
  return <button className="student-sort" aria-label={`Trier par ${String(children)}`}>{children}<ArrowDownUp size={12} /></button>;
}

export function StudentManagement({ onToast, onSuccess }: { onToast: (title: string, description: string) => void; onSuccess: (title: string, description: string) => void }) {
  const [search, setSearch] = useState("");
  const [section, setSection] = useState("Secondaire");
  const [level, setLevel] = useState("Tous");
  const [classFilter, setClassFilter] = useState("Toutes");
  const [status, setStatus] = useState("Actif");
  const [registration, setRegistration] = useState("Toutes");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState("1");
  const [isLoading, setIsLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [studentModal, setStudentModal] = useState(false);
  const [importModal, setImportModal] = useState(() => new URLSearchParams(window.location.search).get("import") === "csv");
  const [importedStudents, setImportedStudents] = useState<Student[]>([]);
  const pageSize = 5;

  const filteredStudents = useMemo(() => {
    const normalized = search.trim().toLowerCase();
    return [...importedStudents, ...students].filter((student) => {
      const matchesSearch = !normalized || [student.fullName, student.matricule].some((value) => value.toLowerCase().includes(normalized));
      const matchesLevel = level === "Tous" || student.level === level;
      const matchesClass = classFilter === "Toutes" || student.className === classFilter;
      const matchesStatus = status === "Tous" || student.status === status;
      const matchesRegistration = registration === "Toutes" || student.registrationType === registration;
      return matchesSearch && matchesLevel && matchesClass && matchesStatus && matchesRegistration;
    });
  }, [search, level, classFilter, status, registration]);

  const visibleStudents = filteredStudents.slice((page - 1) * pageSize, page * pageSize);
  const totalPages = Math.max(1, Math.ceil(filteredStudents.length / pageSize));
  const selectedStudent = [...importedStudents, ...students].find((student) => student.id === selectedStudentId) ?? null;
  const allVisibleSelected = visibleStudents.length > 0 && visibleStudents.every((student) => selectedIds.includes(student.id));

  const toggleSelection = (id: string) => setSelectedIds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  const toggleAll = (checked: boolean) => setSelectedIds(checked ? Array.from(new Set([...selectedIds, ...visibleStudents.map((student) => student.id)])) : selectedIds.filter((id) => !visibleStudents.some((student) => student.id === id)));
  const resetFilters = () => { setSearch(""); setSection("Secondaire"); setLevel("Tous"); setClassFilter("Toutes"); setStatus("Actif"); setRegistration("Toutes"); setPage(1); };
  const refresh = () => { setIsLoading(true); window.setTimeout(() => { setIsLoading(false); onToast("Liste actualisée", "Les inscriptions de l’année 2026-2027 ont été synchronisées."); }, 650); };
  const importRows = (rows: CsvStudentRow[]) => {
    const newStudents = rows.map((row, index) => ({ id: `import-${Date.now()}-${index}`, matricule: `STU-${String(152 + importedStudents.length + index).padStart(6, "0")}`, fullName: `${row.firstName} ${row.lastName}`, initials: `${row.firstName.charAt(0)}${row.lastName.charAt(0)}`.toUpperCase(), sex: row.sex, className: row.className, level: row.className.split(" ")[0] ?? "", registrationType: row.registrationType, status: "Actif" as const, balance: 0, birthDate: "À compléter", parent: "À compléter", phone: row.parentPhone, enrollmentDate: "27 août 2026", documents: 0 }));
    setImportedStudents((current) => [...newStudents, ...current]);
    if (newStudents[0]) setSelectedStudentId(newStudents[0].id);
    setPage(1);
  };

  return (
    <section className="student-management" aria-label="Gestion des élèves">
      <header className="student-page-heading">
        <div><p className="eyebrow">Scolarité · registre annuel</p><h1>Élèves</h1><p>Recherchez une identité élève et pilotez son inscription pour l’année scolaire en cours.</p></div>
        <div className="student-header-actions"><div className="student-context"><span>Année scolaire : <strong>2026-2027</strong></span><span>Section : <strong>{section}</strong></span></div><Button variant="outline" className="secondary-action" onClick={() => setImportModal(true)}><Upload size={16} /> Importer CSV</Button><Button className="primary-action" onClick={() => setStudentModal(true)}><Plus size={16} /> Ajouter un élève</Button></div>
      </header>

      <section className="identity-enrollment-notice"><span className="notice-number">01</span><div><strong>Identité élève et inscription annuelle sont distinctes.</strong><p>Le matricule, l’état civil et les responsables légaux appartiennent au dossier permanent. La classe, le type d’inscription, le statut et le solde correspondent à l’année 2026-2027.</p></div><FileText size={20} /></section>

      <section className="student-controls" aria-label="Recherche et filtres">
        <div className="student-search"><Search size={18} /><Input value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="Rechercher un élève par nom, prénom ou matricule..." /></div>
        <div className="student-filter-row"><span className="filter-label"><SlidersHorizontal size={15} /> Filtres</span><Select value={section} onValueChange={setSection}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Secondaire">Section : Secondaire</SelectItem><SelectItem value="Primaire">Section : Primaire</SelectItem></SelectContent></Select><Select value={level} onValueChange={(value) => { setLevel(value); setPage(1); }}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Tous">Niveau : Tous</SelectItem><SelectItem value="6e">Niveau : 6e</SelectItem><SelectItem value="7e">Niveau : 7e</SelectItem><SelectItem value="8e">Niveau : 8e</SelectItem></SelectContent></Select><Select value={classFilter} onValueChange={(value) => { setClassFilter(value); setPage(1); }}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Toutes">Classe : Toutes</SelectItem>{["6e A", "7e A", "7e B", "8e A", "8e B"].map((item) => <SelectItem key={item} value={item}>Classe : {item}</SelectItem>)}</SelectContent></Select><Select value={status} onValueChange={(value) => { setStatus(value); setPage(1); }}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Tous">Statut : Tous</SelectItem><SelectItem value="Actif">Statut : Actif</SelectItem><SelectItem value="En attente">Statut : En attente</SelectItem><SelectItem value="Suspendu">Statut : Suspendu</SelectItem></SelectContent></Select><Select value={registration} onValueChange={(value) => { setRegistration(value); setPage(1); }}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Toutes">Inscription : Toutes</SelectItem><SelectItem value="Nouvelle inscription">Nouvelle inscription</SelectItem><SelectItem value="Réinscription">Réinscription</SelectItem></SelectContent></Select><button className="clear-filters" onClick={resetFilters}>Réinitialiser</button></div>
      </section>

      <section className="student-workspace">
        <article className="student-register">
          <div className="student-register-heading"><div><p className="eyebrow">Inscriptions · {section} · 2026-2027</p><h2>Registre des élèves</h2><span>{filteredStudents.length} élève{filteredStudents.length > 1 ? "s" : ""} correspondant aux critères</span></div><div className="register-heading-actions"><Button variant="outline" className="secondary-action" onClick={refresh}>{isLoading ? <LoaderCircle className="spin-icon" size={15} /> : <Files size={15} />} Actualiser</Button><Button variant="outline" className="secondary-action" onClick={() => onToast("Export préparé", `${filteredStudents.length} inscription(s) sont prêtes pour l’export.`)}><Download size={15} /> Exporter</Button></div></div>
          {selectedIds.length > 0 && <div className="bulk-bar"><span><strong>{selectedIds.length}</strong> inscription{selectedIds.length > 1 ? "s" : ""} sélectionnée{selectedIds.length > 1 ? "s" : ""}</span><button onClick={() => onToast("Export groupé préparé", "Les dossiers sélectionnés sont prêts à être exportés.")}>Exporter la sélection</button><button onClick={() => setSelectedIds([])}>Effacer la sélection</button></div>}
          {isLoading ? <div className="student-loading-state"><LoaderCircle className="spin-icon" size={23} /><strong>Actualisation du registre</strong><span>Les inscriptions annuelles sont en cours de consolidation.</span><div className="loading-lines"><i /><i /><i /></div></div> : filteredStudents.length === 0 ? <div className="student-empty-state"><div><Search size={21} /></div><h3>Aucun élève ne correspond à ces critères</h3><p>Modifiez ou réinitialisez les filtres pour retrouver une inscription annuelle.</p><Button variant="outline" className="secondary-action" onClick={resetFilters}>Réinitialiser les filtres</Button></div> : <div className="student-table-wrap"><table className="student-table"><thead><tr className="student-group-head"><th colSpan={4}>Dossier permanent de l’élève</th><th colSpan={4}>Inscription annuelle · 2026-2027</th><th>Opérations</th></tr><tr><th><Checkbox checked={allVisibleSelected} onCheckedChange={(value) => toggleAll(value === true)} aria-label="Sélectionner toutes les inscriptions visibles" /></th><th>Photo</th><th><SortHeader>Matricule</SortHeader></th><th><SortHeader>Nom complet</SortHeader></th><th>Sexe</th><th><SortHeader>Classe</SortHeader></th><th>Type d’inscription</th><th><SortHeader>Statut</SortHeader></th><th><SortHeader>Solde</SortHeader></th><th aria-label="Actions" /></tr></thead><tbody>{visibleStudents.map((student) => <tr key={student.id} className={selectedStudentId === student.id ? "is-selected" : ""} onClick={() => setSelectedStudentId(student.id)}><td><Checkbox checked={selectedIds.includes(student.id)} onClick={(event) => event.stopPropagation()} onCheckedChange={() => toggleSelection(student.id)} aria-label={`Sélectionner ${student.fullName}`} /></td><td><span className={`student-photo student-photo-${student.sex.toLowerCase()}`}>{student.initials}</span></td><td><strong className="student-code">{student.matricule}</strong></td><td><div className="student-name-cell"><strong>{student.fullName}</strong><small>Dossier permanent</small></div></td><td>{student.sex}</td><td><strong>{student.className}</strong></td><td><span className="registration-type">{student.registrationType}</span></td><td><StatusBadge status={student.status} /></td><td><strong className={student.balance > 100000 ? "balance balance-high" : "balance"}>{student.balance === 0 ? "À jour" : `${student.balance.toLocaleString("fr-FR")} CDF`}</strong></td><td onClick={(event) => event.stopPropagation()}><DropdownMenu><DropdownMenuTrigger asChild><button className="row-action" aria-label={`Actions pour ${student.fullName}`}><MoreHorizontal size={18} /></button></DropdownMenuTrigger><DropdownMenuContent align="end" className="student-action-menu"><DropdownMenuLabel>{student.fullName}</DropdownMenuLabel><DropdownMenuSeparator /><DropdownMenuItem onClick={() => onToast("Dossier élève", `Ouverture du dossier permanent de ${student.fullName}.`)}><Eye size={15} /> Voir le dossier</DropdownMenuItem><DropdownMenuItem onClick={() => onToast("Modification", `La fiche de ${student.fullName} est prête à être modifiée.`)}><Pencil size={15} /> Modifier</DropdownMenuItem><DropdownMenuItem onClick={() => onToast("Réinscription", `L’inscription 2027-2028 de ${student.fullName} peut être préparée.`)}><ArchiveRestore size={15} /> Réinscrire</DropdownMenuItem><DropdownMenuItem onClick={() => onToast("Documents", `${student.documents} document(s) sont disponibles dans ce dossier.`)}><FolderOpen size={15} /> Gérer les documents</DropdownMenuItem><DropdownMenuItem onClick={() => onToast("Situation financière", `Consultation du solde de ${student.fullName}.`)}><WalletCards size={15} /> Voir les finances</DropdownMenuItem></DropdownMenuContent></DropdownMenu></td></tr>)}</tbody></table></div>}
          {!isLoading && filteredStudents.length > 0 && <footer className="student-pagination"><span>{(page - 1) * pageSize + 1}–{Math.min(page * pageSize, filteredStudents.length)} sur {filteredStudents.length} inscriptions</span><div><button className="mini-page" disabled={page === 1} onClick={() => setPage((current) => Math.max(1, current - 1))} aria-label="Page précédente"><ChevronLeft size={16} /></button>{Array.from({ length: totalPages }, (_, index) => index + 1).map((item) => <button key={item} className={`mini-page ${page === item ? "is-current" : ""}`} onClick={() => setPage(item)}>{item}</button>)}<button className="mini-page" disabled={page === totalPages} onClick={() => setPage((current) => Math.min(totalPages, current + 1))} aria-label="Page suivante"><ChevronRight size={16} /></button></div></footer>}
        </article>

        <aside className="student-summary" aria-label="Synthèse de l’élève sélectionné">{selectedStudent ? <><div className="summary-heading"><div><p className="eyebrow">Élève sélectionné</p><h2>Synthèse du dossier</h2></div><UserRound size={18} /></div><div className="summary-person"><span className={`student-photo student-photo-${selectedStudent.sex.toLowerCase()}`}>{selectedStudent.initials}</span><div><strong>{selectedStudent.fullName}</strong><small>{selectedStudent.matricule}</small></div></div><div className="summary-section"><p>Identité permanente</p><dl><div><dt>Date de naissance</dt><dd>{selectedStudent.birthDate}</dd></div><div><dt>Responsable légal</dt><dd>{selectedStudent.parent}</dd></div><div><dt>Contact</dt><dd>{selectedStudent.phone}</dd></div></dl></div><div className="summary-section annual"><p>Inscription 2026-2027</p><dl><div><dt>Classe actuelle</dt><dd>{selectedStudent.className}</dd></div><div><dt>Type</dt><dd>{selectedStudent.registrationType}</dd></div><div><dt>Statut</dt><dd><StatusBadge status={selectedStudent.status} /></dd></div><div><dt>Solde</dt><dd className={selectedStudent.balance > 100000 ? "balance balance-high" : "balance"}>{selectedStudent.balance === 0 ? "À jour" : `${selectedStudent.balance.toLocaleString("fr-FR")} CDF`}</dd></div></dl></div><div className="summary-documents"><FileText size={16} /><span><strong>{selectedStudent.documents} documents au dossier</strong><small>Inscription enregistrée le {selectedStudent.enrollmentDate}</small></span></div><div className="summary-actions"><button onClick={() => onToast("Dossier élève", `Ouverture du dossier permanent de ${selectedStudent.fullName}.`)}><Eye size={15} /> Voir le dossier</button><button onClick={() => onToast("Finances", `La situation financière de ${selectedStudent.fullName} est prête à être consultée.`)}><WalletCards size={15} /> Voir les finances</button></div></> : <div className="summary-empty"><CircleAlert size={22} /><h3>Aucun élève sélectionné</h3><p>Sélectionnez une ligne du registre pour afficher la synthèse de son dossier.</p></div>}</aside>
      </section>
      <QuickActionModal action={studentModal ? "student" : null} onClose={() => setStudentModal(false)} onSuccess={onSuccess} />
      <StudentCsvImportModal open={importModal} onClose={() => setImportModal(false)} onImport={importRows} onSuccess={onSuccess} />
    </section>
  );
}
