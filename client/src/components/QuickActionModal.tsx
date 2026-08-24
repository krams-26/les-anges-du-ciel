/**
 * Direction visuelle : « Registre diocésain contemporain » — les formulaires rapides
 * reprennent les contrôles existants et écrivent exclusivement dans les registres persistants.
 */
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { BookOpenCheck, CreditCard, FileSpreadsheet, GraduationCap, LoaderCircle, Plus, UserPlus } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

export type QuickActionKey = "student" | "payment" | "assignment" | "grade" | "report";
type FormValues = Record<string, string | boolean>;

const actionMeta: Record<QuickActionKey, { title: string; description: string; submit: string; icon: LucideIcon }> = {
  student: { title: "Ajouter un élève", description: "Créez un dossier permanent et son inscription annuelle dans la classe sélectionnée.", submit: "Créer le dossier élève", icon: UserPlus },
  payment: { title: "Enregistrer un paiement", description: "Saisissez un règlement en attente de validation dans le registre financier.", submit: "Enregistrer le paiement", icon: CreditCard },
  assignment: { title: "Affecter un enseignant", description: "Associez un enseignant à un cours déjà configuré dans une classe annuelle.", submit: "Confirmer l’affectation", icon: GraduationCap },
  grade: { title: "Saisir une note", description: "Enregistrez une note brouillon dans une affectation et une période autorisées.", submit: "Enregistrer la note", icon: BookOpenCheck },
  report: { title: "Générer un relevé", description: "Ouvrez le relevé calculé depuis le moteur académique, sans créer de donnée artificielle.", submit: "Ouvrir le relevé", icon: FileSpreadsheet },
};

const initialValues: Record<QuickActionKey, FormValues> = {
  student: { lastName: "", firstName: "", sex: "", classId: "", birthDate: "", parentPhone: "" },
  payment: { enrollmentId: "", amount: "", paymentDate: new Date().toISOString().slice(0, 10), reference: "" },
  assignment: { teacherId: "", classId: "", classCourseId: "" },
  grade: { assignmentId: "", enrollmentId: "", periodId: "", grade: "" },
  report: { classId: "", includeSignature: true },
};

function ModalField({ label, required, error, children }: { label: string; required?: boolean; error?: string; children: React.ReactNode }) {
  return <label className={`quick-form-field ${error ? "has-error" : ""}`}><span>{label}{required && <em> *</em>}</span>{children}{error && <small>{error}</small>}</label>;
}

export function QuickActionModal({ action, onClose, onSuccess, onNavigate }: { action: QuickActionKey | null; onClose: () => void; onSuccess: (title: string, detail: string) => void; onNavigate?: (label: string) => void }) {
  const [values, setValues] = useState<FormValues>(initialValues.student);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const meta = action ? actionMeta[action] : actionMeta.student;
  const Icon = meta.icon;
  const utils = trpc.useUtils();
  const yearsQuery = trpc.school.years.list.useQuery();
  const activeYear = yearsQuery.data?.find((year) => year.code === "2026-2027") ?? yearsQuery.data?.find((year) => year.status === "active") ?? yearsQuery.data?.[0];
  const classesQuery = trpc.school.classes.list.useQuery({ academicYearId: activeYear?.id ?? 0 }, { enabled: Boolean(activeYear) });
  const teachersQuery = trpc.school.teachers.list.useQuery();
  const assignmentsQuery = trpc.school.assignments.list.useQuery();
  const studentsQuery = trpc.school.students.list.useQuery({ academicYearId: activeYear?.id ?? 0 }, { enabled: Boolean(activeYear) });
  const selectedClassId = Number(values.classId || 0);
  const configuredCoursesQuery = trpc.school.courses.configured.useQuery({ classId: selectedClassId }, { enabled: selectedClassId > 0 && (action === "assignment") });
  const selectedAssignmentId = Number(values.assignmentId || 0);
  const rosterQuery = trpc.teaching.roster.useQuery({ assignmentId: selectedAssignmentId }, { enabled: selectedAssignmentId > 0 && action === "grade" });
  const periodsQuery = trpc.teaching.periods.useQuery({ assignmentId: selectedAssignmentId }, { enabled: selectedAssignmentId > 0 && action === "grade" });
  const createStudent = trpc.school.students.create.useMutation();
  const createPayment = trpc.finance.payments.create.useMutation();
  const createAssignment = trpc.school.assignments.create.useMutation();
  const saveGrade = trpc.teaching.grades.saveDraft.useMutation();
  const saving = createStudent.isPending || createPayment.isPending || createAssignment.isPending || saveGrade.isPending;
  const annualStudents = useMemo(() => (studentsQuery.data ?? []).filter((student): student is typeof student & { enrollmentId: number; className: string | null } => "enrollmentId" in student), [studentsQuery.data]);

  useEffect(() => { if (action) { setValues(initialValues[action]); setErrors({}); } }, [action]);
  const updateValue = (field: string, value: string | boolean) => setValues((current) => ({ ...current, [field]: value }));
  const validate = () => {
    if (!action) return false;
    const required: Record<QuickActionKey, string[]> = { student: ["lastName", "firstName", "sex", "classId", "parentPhone"], payment: ["enrollmentId", "amount", "paymentDate"], assignment: ["teacherId", "classId", "classCourseId"], grade: ["assignmentId", "enrollmentId", "periodId", "grade"], report: ["classId"] };
    const nextErrors: Record<string, string> = {};
    required[action].forEach((field) => { if (!values[field]) nextErrors[field] = "Ce champ est requis."; });
    if (!activeYear) nextErrors.form = "Aucune année scolaire active n’est disponible.";
    if (action === "payment" && Number(values.amount) <= 0) nextErrors.amount = "Saisissez un montant supérieur à 0.";
    if (action === "grade" && (Number(values.grade) < 0 || !Number.isFinite(Number(values.grade)))) nextErrors.grade = "Saisissez une note valide.";
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };
  const finish = async (title: string, detail: string, invalidate: () => Promise<unknown>) => { await invalidate(); onSuccess(title, detail); onClose(); };
  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!action || !validate() || !activeYear) return;
    try {
      if (action === "student") {
        const code = `LAC-${activeYear.code.replace(/\D/g, "").slice(-4)}-${Date.now().toString().slice(-6)}`;
        await createStudent.mutateAsync({ studentCode: code, lastName: String(values.lastName), firstName: String(values.firstName), sex: String(values.sex) as "F" | "M", birthDate: values.birthDate ? new Date(String(values.birthDate)) : undefined, phone: String(values.parentPhone), academicYearId: activeYear.id, classId: Number(values.classId), enrollmentType: "new", guardians: [{ fullName: `Responsable de ${String(values.firstName)} ${String(values.lastName)}`, relationship: "guardian", phone: String(values.parentPhone), isPrimary: true, receivesCommunications: true, canViewResults: true, canMakePayments: false }] });
        await finish("Dossier élève créé", `${values.firstName} ${values.lastName} est inscrit(e) dans l’année ${activeYear.code}.`, async () => { await utils.school.students.list.invalidate(); await utils.school.classes.list.invalidate(); });
      }
      if (action === "payment") {
        const reference = String(values.reference || `PAY-${Date.now()}`);
        const student = annualStudents.find((item) => item.enrollmentId === Number(values.enrollmentId));
        await createPayment.mutateAsync({ enrollmentId: Number(values.enrollmentId), reference, payerName: student ? `${student.firstName} ${student.lastName}` : "Payeur à confirmer", sourceCurrency: "CDF", sourceAmount: Number(values.amount), paidAt: new Date(String(values.paymentDate)) });
        await finish("Paiement enregistré", `Le paiement ${reference} est en attente de validation.`, async () => { await utils.annualControl.summary.invalidate(); });
      }
      if (action === "assignment") {
        await createAssignment.mutateAsync({ teacherId: Number(values.teacherId), classCourseId: Number(values.classCourseId) });
        await finish("Affectation confirmée", "L’affectation est désormais disponible dans la classe sélectionnée.", async () => { await utils.school.assignments.list.invalidate(); await utils.school.classes.list.invalidate(); });
      }
      if (action === "grade") {
        await saveGrade.mutateAsync({ assignmentId: Number(values.assignmentId), periodId: Number(values.periodId), scores: [{ enrollmentId: Number(values.enrollmentId), score: Number(values.grade) }] });
        await finish("Note enregistrée", "La note est enregistrée en brouillon dans le registre pédagogique.", async () => { await utils.annualControl.summary.invalidate(); });
      }
      if (action === "report") { onClose(); onNavigate?.("Relevé de côtes"); }
    } catch (error) { setErrors({ form: error instanceof Error ? error.message : "L’opération n’a pas pu être enregistrée." }); }
  };
  const renderStudentForm = () => <div className="quick-form-grid two"><ModalField label="Nom" required error={errors.lastName}><Input value={String(values.lastName)} onChange={(event) => updateValue("lastName", event.target.value)} placeholder="Ex. Mukendi" /></ModalField><ModalField label="Prénom" required error={errors.firstName}><Input value={String(values.firstName)} onChange={(event) => updateValue("firstName", event.target.value)} placeholder="Ex. David" /></ModalField><ModalField label="Sexe" required error={errors.sex}><Select value={String(values.sex)} onValueChange={(value) => updateValue("sex", value)}><SelectTrigger><SelectValue placeholder="Sélectionner" /></SelectTrigger><SelectContent><SelectItem value="F">Féminin</SelectItem><SelectItem value="M">Masculin</SelectItem></SelectContent></Select></ModalField><ModalField label="Classe d’admission" required error={errors.classId}><Select value={String(values.classId)} onValueChange={(value) => updateValue("classId", value)}><SelectTrigger><SelectValue placeholder="Sélectionner une classe" /></SelectTrigger><SelectContent>{(classesQuery.data ?? []).map((item) => <SelectItem value={String(item.id)} key={item.id}>{item.name}</SelectItem>)}</SelectContent></Select></ModalField><ModalField label="Date de naissance"><Input type="date" value={String(values.birthDate)} onChange={(event) => updateValue("birthDate", event.target.value)} /></ModalField><ModalField label="Téléphone du responsable" required error={errors.parentPhone}><Input type="tel" value={String(values.parentPhone)} onChange={(event) => updateValue("parentPhone", event.target.value)} placeholder="Ex. +243 81 234 5678" /></ModalField></div>;
  const renderPaymentForm = () => <div className="quick-form-grid two"><ModalField label="Élève" required error={errors.enrollmentId}><Select value={String(values.enrollmentId)} onValueChange={(value) => updateValue("enrollmentId", value)}><SelectTrigger><SelectValue placeholder="Sélectionner un élève" /></SelectTrigger><SelectContent>{annualStudents.map((item) => <SelectItem value={String(item.enrollmentId)} key={item.enrollmentId}>{item.firstName} {item.lastName} · {item.className ?? "Sans classe"}</SelectItem>)}</SelectContent></Select></ModalField><ModalField label="Date de paiement" required error={errors.paymentDate}><Input type="date" value={String(values.paymentDate)} onChange={(event) => updateValue("paymentDate", event.target.value)} /></ModalField><ModalField label="Montant (CDF)" required error={errors.amount}><div className="currency-input"><Input type="number" min="1" value={String(values.amount)} onChange={(event) => updateValue("amount", event.target.value)} placeholder="Ex. 185000" /><b>CDF</b></div></ModalField><ModalField label="Référence bancaire"><Input value={String(values.reference)} onChange={(event) => updateValue("reference", event.target.value)} placeholder="Générée si absente" /></ModalField></div>;
  const renderAssignmentForm = () => <div className="quick-form-grid two"><ModalField label="Enseignant" required error={errors.teacherId}><Select value={String(values.teacherId)} onValueChange={(value) => updateValue("teacherId", value)}><SelectTrigger><SelectValue placeholder="Sélectionner un enseignant" /></SelectTrigger><SelectContent>{(teachersQuery.data ?? []).filter((teacher) => teacher.status === "active").map((teacher) => <SelectItem value={String(teacher.id)} key={teacher.id}>{teacher.fullName}</SelectItem>)}</SelectContent></Select></ModalField><ModalField label="Classe" required error={errors.classId}><Select value={String(values.classId)} onValueChange={(value) => { updateValue("classId", value); updateValue("classCourseId", ""); }}><SelectTrigger><SelectValue placeholder="Sélectionner une classe" /></SelectTrigger><SelectContent>{(classesQuery.data ?? []).map((item) => <SelectItem value={String(item.id)} key={item.id}>{item.name}</SelectItem>)}</SelectContent></Select></ModalField><ModalField label="Cours configuré" required error={errors.classCourseId}><Select value={String(values.classCourseId)} onValueChange={(value) => updateValue("classCourseId", value)} disabled={!selectedClassId}><SelectTrigger><SelectValue placeholder="Sélectionner un cours" /></SelectTrigger><SelectContent>{(configuredCoursesQuery.data ?? []).filter((course) => course.status === "configured").map((course) => <SelectItem value={String(course.id)} key={course.id}>{course.courseName}</SelectItem>)}</SelectContent></Select></ModalField></div>;
  const renderGradeForm = () => <div className="quick-form-grid two"><ModalField label="Affectation" required error={errors.assignmentId}><Select value={String(values.assignmentId)} onValueChange={(value) => { updateValue("assignmentId", value); updateValue("enrollmentId", ""); updateValue("periodId", ""); }}><SelectTrigger><SelectValue placeholder="Classe · cours" /></SelectTrigger><SelectContent>{(assignmentsQuery.data ?? []).filter((assignment) => assignment.status === "active").map((assignment) => <SelectItem value={String(assignment.id)} key={assignment.id}>{assignment.className} · {assignment.courseName}</SelectItem>)}</SelectContent></Select></ModalField><ModalField label="Élève" required error={errors.enrollmentId}><Select value={String(values.enrollmentId)} onValueChange={(value) => updateValue("enrollmentId", value)} disabled={!selectedAssignmentId}><SelectTrigger><SelectValue placeholder="Sélectionner un élève" /></SelectTrigger><SelectContent>{(rosterQuery.data ?? []).map((student) => <SelectItem value={String(student.enrollmentId)} key={student.enrollmentId}>{student.firstName} {student.lastName}</SelectItem>)}</SelectContent></Select></ModalField><ModalField label="Période" required error={errors.periodId}><Select value={String(values.periodId)} onValueChange={(value) => updateValue("periodId", value)} disabled={!selectedAssignmentId}><SelectTrigger><SelectValue placeholder="Sélectionner une période" /></SelectTrigger><SelectContent>{(periodsQuery.data ?? []).map((period) => <SelectItem value={String(period.id)} key={period.id}>{period.label} · /{period.maximum}</SelectItem>)}</SelectContent></Select></ModalField><ModalField label="Note" required error={errors.grade}><Input type="number" min="0" value={String(values.grade)} onChange={(event) => updateValue("grade", event.target.value)} placeholder="Ex. 15" /></ModalField></div>;
  const renderReportForm = () => <div className="quick-form-grid two"><ModalField label="Classe" required error={errors.classId}><Select value={String(values.classId)} onValueChange={(value) => updateValue("classId", value)}><SelectTrigger><SelectValue placeholder="Sélectionner une classe" /></SelectTrigger><SelectContent>{(classesQuery.data ?? []).map((item) => <SelectItem value={String(item.id)} key={item.id}>{item.name}</SelectItem>)}</SelectContent></Select></ModalField><div className="quick-form-option"><Checkbox id="signature" checked={values.includeSignature === true} onCheckedChange={(value) => updateValue("includeSignature", value === true)} /><label htmlFor="signature"><strong>Inclure la signature de direction</strong><small>Le relevé est calculé depuis les notes validées du moteur académique.</small></label></div></div>;
  const form = action === "student" ? renderStudentForm() : action === "payment" ? renderPaymentForm() : action === "assignment" ? renderAssignmentForm() : action === "grade" ? renderGradeForm() : renderReportForm();

  return <Dialog open={action !== null} onOpenChange={(open) => { if (!open) onClose(); }}><DialogContent className="quick-action-dialog"><DialogHeader><div className="quick-dialog-title"><span><Icon size={18} /></span><div><DialogTitle>{meta.title}</DialogTitle><DialogDescription>{meta.description}</DialogDescription></div></div></DialogHeader><form onSubmit={submit}><div className="quick-form-context"><span>Année scolaire {activeYear?.code ?? "—"}</span><span>Registres persistants</span></div>{form}{errors.form && <p className="quick-form-error">{errors.form}</p>}<DialogFooter><Button type="button" variant="outline" className="secondary-action" onClick={onClose} disabled={saving}>Annuler</Button><Button type="submit" className="primary-action" disabled={saving}>{saving ? <LoaderCircle className="spin-icon" size={15} /> : <Plus size={15} />}{meta.submit}</Button></DialogFooter></form></DialogContent></Dialog>;
}
