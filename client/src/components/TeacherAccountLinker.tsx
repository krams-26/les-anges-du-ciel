import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { ShieldCheck } from "lucide-react";
import { useState } from "react";

export function TeacherAccountLinker({ onToast }: { onToast: (title: string, detail: string) => void }) {
  const [teacherId, setTeacherId] = useState("");
  const [userId, setUserId] = useState("");
  const utils = trpc.useUtils();
  const teachersQuery = trpc.school.teachers.list.useQuery();
  const usersQuery = trpc.school.teachers.linkableUsers.useQuery();
  const linkMutation = trpc.school.teachers.linkAccount.useMutation({
    onSuccess: async () => {
      await utils.school.teachers.list.invalidate();
      setTeacherId("");
      setUserId("");
      onToast("Compte enseignant lié", "Cet utilisateur accède maintenant uniquement à ses affectations pédagogiques.");
    },
    onError: (error) => onToast("Liaison impossible", error.message),
  });

  const teachers = teachersQuery.data ?? [];
  const users = usersQuery.data ?? [];

  return <section className="academic-panel teacher-account-linker">
    <div className="academic-panel-head"><div><p className="eyebrow">Accès pédagogique</p><h2>Lier un compte enseignant</h2></div><Badge className="status-badge info">Administrateur</Badge></div>
    <div className="catalog-principle"><ShieldCheck size={16} /><span><strong>Liaison unique et contrôlée.</strong> Chaque compte enseignant est rattaché à une seule fiche, puis limité côté serveur à ses affectations actives.</span></div>
    <div className="academic-form">
      <label>Fiche enseignant<Select value={teacherId || undefined} onValueChange={setTeacherId}><SelectTrigger><SelectValue placeholder="Choisir une fiche" /></SelectTrigger><SelectContent>{teachers.filter((teacher) => !teacher.userId).map((teacher) => <SelectItem key={teacher.id} value={String(teacher.id)}>{teacher.fullName} · {teacher.employeeCode}</SelectItem>)}</SelectContent></Select></label>
      <label>Compte utilisateur<Select value={userId || undefined} onValueChange={setUserId}><SelectTrigger><SelectValue placeholder="Choisir un compte" /></SelectTrigger><SelectContent>{users.map((user) => <SelectItem key={user.id} value={String(user.id)}>{user.name || `Compte #${user.id}`}{user.email ? ` · ${user.email}` : ""}</SelectItem>)}</SelectContent></Select></label>
    </div>
    <div className="teacher-submit"><Button className="primary-action" disabled={!teacherId || !userId || linkMutation.isPending} onClick={() => linkMutation.mutate({ teacherId: Number(teacherId), userId: Number(userId) })}>{linkMutation.isPending ? "Liaison…" : "Lier le compte"}</Button></div>
    <div className="academic-table-wrap"><table className="academic-table"><thead><tr><th>Enseignant</th><th>Code</th><th>Compte lié</th></tr></thead><tbody>{teachersQuery.isLoading ? <tr><td colSpan={3}>Chargement des fiches…</td></tr> : teachers.map((teacher) => <tr key={teacher.id}><td><strong>{teacher.fullName}</strong></td><td>{teacher.employeeCode}</td><td>{teacher.userId ? `Compte #${teacher.userId}` : "Non lié"}</td></tr>)}</tbody></table></div>
  </section>;
}
