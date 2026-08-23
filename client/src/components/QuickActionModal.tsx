/**
 * Direction visuelle : « Registre diocésain contemporain » — formulaires administratifs
 * explicites, sobres et vérifiables, avec une hiérarchie de dossier plutôt qu’un style marketing.
 */
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
import { BookOpenCheck, CreditCard, FileSpreadsheet, GraduationCap, Plus, UserPlus } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useEffect, useState } from "react";

export type QuickActionKey = "student" | "payment" | "assignment" | "grade" | "report";

type FormValues = Record<string, string | boolean>;

const classes = ["7e A", "7e B", "8e A", "8e B", "6e A"];
const students = ["Mireille Kalume · 7e A", "Jean-Marc Mbuyi · 7e A", "Chantal Ngalula · 7e A", "Patrick Kabasele · 7e A"];

const actionMeta: Record<QuickActionKey, { title: string; description: string; submit: string; icon: LucideIcon }> = {
  student: { title: "Ajouter un élève", description: "Créez un dossier d’admission pour l’année scolaire 2026-2027.", submit: "Créer le dossier élève", icon: UserPlus },
  payment: { title: "Enregistrer un paiement", description: "Saisissez un règlement et préparez le reçu correspondant.", submit: "Enregistrer le paiement", icon: CreditCard },
  assignment: { title: "Affecter un enseignant", description: "Associez un enseignant à une classe et à une matière du secondaire.", submit: "Confirmer l’affectation", icon: GraduationCap },
  grade: { title: "Saisir une note", description: "Ajoutez une note d’évaluation au registre de la classe concernée.", submit: "Enregistrer la note", icon: BookOpenCheck },
  report: { title: "Générer un relevé", description: "Préparez un relevé académique à partir des notes déjà validées.", submit: "Préparer le relevé", icon: FileSpreadsheet },
};

const initialValues: Record<QuickActionKey, FormValues> = {
  student: { lastName: "", firstName: "", sex: "", className: "", birthDate: "", parentPhone: "" },
  payment: { student: "", amount: "", feeType: "", paymentDate: "2026-08-27", paymentMode: "", reference: "" },
  assignment: { teacher: "", className: "", subject: "", schedule: "" },
  grade: { student: "", subject: "", assessment: "", grade: "" },
  report: { className: "", period: "", format: "", includeSignature: true },
};

function ModalField({ label, required, error, children }: { label: string; required?: boolean; error?: string; children: React.ReactNode }) {
  return <label className={`quick-form-field ${error ? "has-error" : ""}`}><span>{label}{required && <em> *</em>}</span>{children}{error && <small>{error}</small>}</label>;
}

export function QuickActionModal({ action, onClose, onSuccess }: { action: QuickActionKey | null; onClose: () => void; onSuccess: (title: string, detail: string) => void }) {
  const [values, setValues] = useState<FormValues>(initialValues.student);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const meta = action ? actionMeta[action] : actionMeta.student;
  const Icon = meta.icon;

  useEffect(() => {
    if (action) {
      setValues(initialValues[action]);
      setErrors({});
    }
  }, [action]);

  const updateValue = (field: string, value: string | boolean) => setValues((current) => ({ ...current, [field]: value }));

  const validate = () => {
    if (!action) return false;
    const nextErrors: Record<string, string> = {};
    const required: Record<QuickActionKey, string[]> = {
      student: ["lastName", "firstName", "sex", "className", "birthDate", "parentPhone"],
      payment: ["student", "amount", "feeType", "paymentDate", "paymentMode"],
      assignment: ["teacher", "className", "subject", "schedule"],
      grade: ["student", "subject", "assessment", "grade"],
      report: ["className", "period", "format"],
    };
    required[action].forEach((field) => { if (!values[field]) nextErrors[field] = "Ce champ est requis."; });
    if (action === "payment" && Number(values.amount) <= 0) nextErrors.amount = "Saisissez un montant supérieur à 0 CDF.";
    if (action === "grade" && (Number(values.grade) < 0 || Number(values.grade) > 20)) nextErrors.grade = "La note doit être comprise entre 0 et 20.";
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!action || !validate()) return;
    const successCopy: Record<QuickActionKey, [string, string]> = {
      student: ["Dossier élève créé", `${values.firstName} ${values.lastName} a été ajouté(e) à la classe ${values.className}.`],
      payment: ["Paiement enregistré", `${Number(values.amount).toLocaleString("fr-FR")} CDF ont été enregistrés pour ${values.student}.`],
      assignment: ["Affectation confirmée", `${values.teacher} est affecté(e) à ${values.subject} · ${values.className}.`],
      grade: ["Note enregistrée", `${values.grade}/20 a été ajoutée au registre de ${values.subject}.`],
      report: ["Relevé en préparation", `Le relevé ${values.period} de ${values.className} est prêt à être généré.`],
    };
    onSuccess(...successCopy[action]);
    onClose();
  };

  const renderStudentForm = () => <div className="quick-form-grid two"><ModalField label="Nom" required error={errors.lastName}><Input value={String(values.lastName)} onChange={(event) => updateValue("lastName", event.target.value)} placeholder="Ex. Mukendi" /></ModalField><ModalField label="Prénom" required error={errors.firstName}><Input value={String(values.firstName)} onChange={(event) => updateValue("firstName", event.target.value)} placeholder="Ex. David" /></ModalField><ModalField label="Sexe" required error={errors.sex}><Select value={String(values.sex)} onValueChange={(value) => updateValue("sex", value)}><SelectTrigger><SelectValue placeholder="Sélectionner" /></SelectTrigger><SelectContent><SelectItem value="F">Féminin</SelectItem><SelectItem value="M">Masculin</SelectItem></SelectContent></Select></ModalField><ModalField label="Classe d’admission" required error={errors.className}><Select value={String(values.className)} onValueChange={(value) => updateValue("className", value)}><SelectTrigger><SelectValue placeholder="Sélectionner une classe" /></SelectTrigger><SelectContent>{classes.map((item) => <SelectItem value={item} key={item}>{item}</SelectItem>)}</SelectContent></Select></ModalField><ModalField label="Date de naissance" required error={errors.birthDate}><Input type="date" value={String(values.birthDate)} onChange={(event) => updateValue("birthDate", event.target.value)} /></ModalField><ModalField label="Téléphone du parent" required error={errors.parentPhone}><Input type="tel" value={String(values.parentPhone)} onChange={(event) => updateValue("parentPhone", event.target.value)} placeholder="Ex. +243 81 234 5678" /></ModalField></div>;

  const renderPaymentForm = () => <div className="quick-form-grid two"><ModalField label="Élève" required error={errors.student}><Select value={String(values.student)} onValueChange={(value) => updateValue("student", value)}><SelectTrigger><SelectValue placeholder="Sélectionner un élève" /></SelectTrigger><SelectContent>{students.map((item) => <SelectItem value={item} key={item}>{item}</SelectItem>)}</SelectContent></Select></ModalField><ModalField label="Date de paiement" required error={errors.paymentDate}><Input type="date" value={String(values.paymentDate)} onChange={(event) => updateValue("paymentDate", event.target.value)} /></ModalField><ModalField label="Nature du frais" required error={errors.feeType}><Select value={String(values.feeType)} onValueChange={(value) => updateValue("feeType", value)}><SelectTrigger><SelectValue placeholder="Sélectionner" /></SelectTrigger><SelectContent><SelectItem value="Frais de scolarité">Frais de scolarité</SelectItem><SelectItem value="Frais d’examen">Frais d’examen</SelectItem><SelectItem value="Frais d’inscription">Frais d’inscription</SelectItem></SelectContent></Select></ModalField><ModalField label="Mode de paiement" required error={errors.paymentMode}><Select value={String(values.paymentMode)} onValueChange={(value) => updateValue("paymentMode", value)}><SelectTrigger><SelectValue placeholder="Sélectionner" /></SelectTrigger><SelectContent><SelectItem value="Espèces">Espèces</SelectItem><SelectItem value="Mobile Money">Mobile Money</SelectItem><SelectItem value="Virement">Virement</SelectItem></SelectContent></Select></ModalField><ModalField label="Montant (CDF)" required error={errors.amount}><div className="currency-input"><Input type="number" min="0" value={String(values.amount)} onChange={(event) => updateValue("amount", event.target.value)} placeholder="Ex. 185000" /><b>CDF</b></div></ModalField><ModalField label="Référence interne"><Input value={String(values.reference)} onChange={(event) => updateValue("reference", event.target.value)} placeholder="Optionnel" /></ModalField></div>;

  const renderAssignmentForm = () => <div className="quick-form-grid two"><ModalField label="Enseignant" required error={errors.teacher}><Select value={String(values.teacher)} onValueChange={(value) => updateValue("teacher", value)}><SelectTrigger><SelectValue placeholder="Sélectionner un enseignant" /></SelectTrigger><SelectContent><SelectItem value="Mme Nathalie Lumbala">Mme Nathalie Lumbala</SelectItem><SelectItem value="M. Alain Kanku">M. Alain Kanku</SelectItem><SelectItem value="Mme Clarisse Mwana">Mme Clarisse Mwana</SelectItem></SelectContent></Select></ModalField><ModalField label="Classe" required error={errors.className}><Select value={String(values.className)} onValueChange={(value) => updateValue("className", value)}><SelectTrigger><SelectValue placeholder="Sélectionner une classe" /></SelectTrigger><SelectContent>{classes.map((item) => <SelectItem value={item} key={item}>{item}</SelectItem>)}</SelectContent></Select></ModalField><ModalField label="Cours / matière" required error={errors.subject}><Select value={String(values.subject)} onValueChange={(value) => updateValue("subject", value)}><SelectTrigger><SelectValue placeholder="Sélectionner une matière" /></SelectTrigger><SelectContent><SelectItem value="Mathématiques">Mathématiques</SelectItem><SelectItem value="Sciences">Sciences</SelectItem><SelectItem value="Français">Français</SelectItem><SelectItem value="Histoire">Histoire</SelectItem></SelectContent></Select></ModalField><ModalField label="Période d’affectation" required error={errors.schedule}><Select value={String(values.schedule)} onValueChange={(value) => updateValue("schedule", value)}><SelectTrigger><SelectValue placeholder="Sélectionner une période" /></SelectTrigger><SelectContent><SelectItem value="Année complète">Année complète</SelectItem><SelectItem value="Premier trimestre">Premier trimestre</SelectItem><SelectItem value="Deuxième trimestre">Deuxième trimestre</SelectItem></SelectContent></Select></ModalField></div>;

  const renderGradeForm = () => <div className="quick-form-grid two"><ModalField label="Élève" required error={errors.student}><Select value={String(values.student)} onValueChange={(value) => updateValue("student", value)}><SelectTrigger><SelectValue placeholder="Sélectionner un élève" /></SelectTrigger><SelectContent>{students.map((item) => <SelectItem value={item} key={item}>{item}</SelectItem>)}</SelectContent></Select></ModalField><ModalField label="Matière" required error={errors.subject}><Select value={String(values.subject)} onValueChange={(value) => updateValue("subject", value)}><SelectTrigger><SelectValue placeholder="Sélectionner une matière" /></SelectTrigger><SelectContent><SelectItem value="Mathématiques">Mathématiques</SelectItem><SelectItem value="Sciences">Sciences</SelectItem><SelectItem value="Français">Français</SelectItem><SelectItem value="Histoire">Histoire</SelectItem></SelectContent></Select></ModalField><ModalField label="Évaluation" required error={errors.assessment}><Input value={String(values.assessment)} onChange={(event) => updateValue("assessment", event.target.value)} placeholder="Ex. Contrôle continu 2" /></ModalField><ModalField label="Note sur 20" required error={errors.grade}><Input type="number" min="0" max="20" step="0.5" value={String(values.grade)} onChange={(event) => updateValue("grade", event.target.value)} placeholder="Ex. 15,5" /></ModalField></div>;

  const renderReportForm = () => <div className="quick-form-grid two"><ModalField label="Classe" required error={errors.className}><Select value={String(values.className)} onValueChange={(value) => updateValue("className", value)}><SelectTrigger><SelectValue placeholder="Sélectionner une classe" /></SelectTrigger><SelectContent>{classes.map((item) => <SelectItem value={item} key={item}>{item}</SelectItem>)}</SelectContent></Select></ModalField><ModalField label="Période" required error={errors.period}><Select value={String(values.period)} onValueChange={(value) => updateValue("period", value)}><SelectTrigger><SelectValue placeholder="Sélectionner une période" /></SelectTrigger><SelectContent><SelectItem value="Premier trimestre">Premier trimestre</SelectItem><SelectItem value="Deuxième trimestre">Deuxième trimestre</SelectItem><SelectItem value="Troisième trimestre">Troisième trimestre</SelectItem></SelectContent></Select></ModalField><ModalField label="Format de sortie" required error={errors.format}><Select value={String(values.format)} onValueChange={(value) => updateValue("format", value)}><SelectTrigger><SelectValue placeholder="Sélectionner un format" /></SelectTrigger><SelectContent><SelectItem value="PDF institutionnel">PDF institutionnel</SelectItem><SelectItem value="Impression A4">Impression A4</SelectItem></SelectContent></Select></ModalField><div className="quick-form-option"><Checkbox id="signature" checked={values.includeSignature === true} onCheckedChange={(value) => updateValue("includeSignature", value === true)} /><label htmlFor="signature"><strong>Inclure la signature de direction</strong><small>Le relevé portera le visa administratif.</small></label></div></div>;

  const form = action === "student" ? renderStudentForm() : action === "payment" ? renderPaymentForm() : action === "assignment" ? renderAssignmentForm() : action === "grade" ? renderGradeForm() : renderReportForm();

  return <Dialog open={action !== null} onOpenChange={(open) => { if (!open) onClose(); }}><DialogContent className="quick-action-dialog"><DialogHeader><div className="quick-dialog-title"><span><Icon size={18} /></span><div><DialogTitle>{meta.title}</DialogTitle><DialogDescription>{meta.description}</DialogDescription></div></div></DialogHeader><form onSubmit={submit}><div className="quick-form-context"><span>Année scolaire 2026-2027</span><span>Section : Secondaire</span></div>{form}<DialogFooter><Button type="button" variant="outline" className="secondary-action" onClick={onClose}>Annuler</Button><Button type="submit" className="primary-action"><Plus size={15} /> {meta.submit}</Button></DialogFooter></form></DialogContent></Dialog>;
}
