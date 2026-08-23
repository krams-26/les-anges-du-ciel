import { CalendarDays, CircleDollarSign, FileText, GraduationCap, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";

export type SearchResultSelection = {
  id: number;
  category: "students" | "staff" | "classes" | "finance" | "documents";
  title: string;
  detail: string;
  fileUrl?: string | null;
};

const configuration = {
  students: { label: "Dossier élève", icon: UserRound, description: "Cette identité élève a été trouvée dans votre périmètre de consultation autorisé." },
  staff: { label: "Fiche personnel", icon: UserRound, description: "Cette fiche du personnel est accessible depuis votre espace administratif." },
  classes: { label: "Registre de classe", icon: GraduationCap, description: "Cette classe appartient à l’année et au périmètre de votre session." },
  finance: { label: "Paiement enregistré", icon: CircleDollarSign, description: "Cette référence financière est affichée uniquement dans le périmètre administratif autorisé." },
  documents: { label: "Document autorisé", icon: FileText, description: "Le document reste soumis aux règles de visibilité qui s’appliquent à votre session." },
} as const;

export function SearchResultPanel({ result, onBack }: { result: SearchResultSelection; onBack: () => void }) {
  const settings = configuration[result.category];
  const Icon = settings.icon;
  return <section className="search-result-panel">
    <div className="search-result-rule" />
    <p className="eyebrow">Recherche globale · {settings.label}</p>
    <div className="search-result-card"><span className="search-result-icon"><Icon size={23} /></span><div><h1>{result.title}</h1><p>{result.detail}</p><small>Référence interne : {settings.label.toUpperCase()} #{result.id}</small></div></div>
    <p className="search-result-description">{settings.description}</p>
    <div className="search-result-actions">{result.category === "documents" && result.fileUrl && <a className="inline-flex h-9 items-center gap-2 rounded-md bg-[#1f4a8a] px-3 text-xs font-bold text-white" href={result.fileUrl} target="_blank" rel="noreferrer"><FileText size={15} /> Voir le document</a>}<Button variant="outline" onClick={onBack}>Retour aux résultats</Button></div>
    <div className="search-result-context"><CalendarDays size={16} /><span>Le contexte de cette ressource est conservé uniquement pour cette consultation ; aucune permission supplémentaire n’est accordée.</span></div>
  </section>;
}
