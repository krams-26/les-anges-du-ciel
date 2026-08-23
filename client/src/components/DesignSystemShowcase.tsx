/**
 * Direction visuelle : « Registre diocésain contemporain » — composants de travail
 * contrastés, états explicites, support mobile et respect d’une hiérarchie documentaire.
 */
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  AlertTriangle,
  Check,
  CircleAlert,
  ClipboardCheck,
  Download,
  LoaderCircle,
  Mail,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import { useState } from "react";

const attendanceImage = "/manus-storage/attendance-empty_806768d6.png";

export function DesignSystemShowcase({ onToast }: { onToast: (title: string, description: string) => void }) {
  const [enabled, setEnabled] = useState(true);
  const [checked, setChecked] = useState(true);
  const [tab, setTab] = useState("composants");

  return (
    <section className="design-system-area">
      <div className="system-intro">
        <div><p className="eyebrow">Fondations réutilisables</p><h2>Composants conçus pour le travail administratif</h2><p>Des contrôles robustes, des retours d’état lisibles et une densité pensée pour les équipes de gestion scolaire.</p></div>
        <div className="system-version"><span>DS</span><div><strong>Version 1.0</strong><small>Référentiel 2026</small></div></div>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="system-tabs"><TabsTrigger value="composants">Composants</TabsTrigger><TabsTrigger value="etats">États</TabsTrigger><TabsTrigger value="donnees">Données</TabsTrigger></TabsList>
        <TabsContent value="composants" className="showcase-panel">
          <div className="component-grid two-column">
            <article className="showcase-card"><div className="showcase-card-heading"><span className="component-index">01</span><div><h3>Actions</h3><p>Des niveaux d’importance explicites.</p></div></div><div className="button-set"><Button className="primary-action" onClick={() => onToast("Action enregistrée", "La nouvelle fiche a été ajoutée.")}><Plus size={16} /> Ajouter un élève</Button><Button variant="outline" className="secondary-action" onClick={() => onToast("Export lancé", "Le fichier sera préparé dans quelques instants.")}><Download size={16} /> Exporter</Button><Button variant="outline" className="destructive-action" onClick={() => onToast("Action sensible", "La confirmation est demandée avant suppression.")}><Trash2 size={16} /> Supprimer</Button><Button disabled className="disabled-action">Indisponible</Button></div></article>
            <article className="showcase-card"><div className="showcase-card-heading"><span className="component-index">02</span><div><h3>Champs et sélections</h3><p>Des libellés visibles et une aide contextualisée.</p></div></div><div className="field-showcase"><label>Nom complet<Input placeholder="Ex. Pierre Kasongo" /></label><label>Section<Select defaultValue="secondaire"><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="maternelle">Maternelle</SelectItem><SelectItem value="primaire">Primaire</SelectItem><SelectItem value="secondaire">Secondaire</SelectItem></SelectContent></Select></label><label>Recherche rapide<div className="input-with-icon"><Search size={16} /><Input placeholder="Référence ou élève" /></div></label></div></article>
            <article className="showcase-card"><div className="showcase-card-heading"><span className="component-index">03</span><div><h3>Choix et préférences</h3><p>Contrôles accessibles pour les réglages courants.</p></div></div><div className="control-showcase"><label className="control-line"><Checkbox checked={checked} onCheckedChange={(value) => setChecked(value === true)} /><span><strong>Envoyer une notification</strong><small>Informer le parent après validation.</small></span></label><label className="control-line"><Switch checked={enabled} onCheckedChange={setEnabled} /><span><strong>Rappel de paiement</strong><small>{enabled ? "Actif le 5 de chaque mois" : "Désactivé"}</small></span></label><div className="radio-line"><span><strong>Mode de publication</strong><small>Choisissez un niveau de visibilité.</small></span><RadioGroup defaultValue="interne" className="radio-options"><label><RadioGroupItem value="interne" /> Interne</label><label><RadioGroupItem value="familles" /> Familles</label></RadioGroup></div></div></article>
            <article className="showcase-card"><div className="showcase-card-heading"><span className="component-index">04</span><div><h3>Badges et alertes</h3><p>La couleur porte une seule signification.</p></div></div><div className="badge-showcase"><Badge className="status-badge success"><Check size={13} /> Validé</Badge><Badge className="status-badge warning"><AlertTriangle size={13} /> À vérifier</Badge><Badge className="status-badge error"><CircleAlert size={13} /> Impayé</Badge><Badge className="status-badge info"><Mail size={13} /> Informé</Badge></div><div className="inline-notice"><ClipboardCheck size={18} /><span><strong>Présences validées</strong><small>Le registre de 7e A a été confirmé par l’enseignante.</small></span></div></article>
          </div>
        </TabsContent>
        <TabsContent value="etats" className="showcase-panel">
          <div className="state-grid">
            <article className="state-card empty-state"><img src={attendanceImage} alt="Registre de présence stylisé" /><div><p className="eyebrow">État vide</p><h3>Aucune présence à valider</h3><p>Les feuilles de présence de ce jour apparaîtront ici.</p><Button variant="outline" className="secondary-action" onClick={() => onToast("Feuille créée", "Une feuille de présence vierge a été ouverte.")}>Créer une feuille</Button></div></article>
            <article className="state-card"><div className="state-icon loading"><LoaderCircle size={23} /></div><p className="eyebrow">Chargement</p><h3>Actualisation des résultats</h3><p>Les données de la classe 7e A sont en cours de consolidation.</p><div className="loading-lines"><i /><i /><i /></div></article>
            <article className="state-card error-state"><div className="state-icon error"><CircleAlert size={23} /></div><p className="eyebrow">Erreur</p><h3>Le relevé n’a pas été généré</h3><p>Réessayez ou vérifiez que les notes de toutes les matières sont validées.</p><Button variant="outline" className="secondary-action" onClick={() => onToast("Nouvel essai lancé", "La génération du relevé est relancée.")}>Réessayer</Button></article>
            <article className="state-card confirmation-state"><p className="eyebrow">Confirmation</p><h3>Une décision mérite une étape explicite.</h3><p>Les suppressions et validations définitives appellent une confirmation, jamais une simple notification.</p><Dialog><DialogTrigger asChild><Button variant="outline" className="destructive-action">Ouvrir la confirmation</Button></DialogTrigger><DialogContent><DialogHeader><DialogTitle>Supprimer cette évaluation ?</DialogTitle><DialogDescription>Cette action supprimera les résultats saisis pour « Mathématiques — 7e A ». Elle ne peut pas être annulée.</DialogDescription></DialogHeader><DialogFooter><Button variant="outline">Annuler</Button><Button variant="destructive" onClick={() => toast("Évaluation supprimée", { description: "La liste des évaluations a été mise à jour." })}>Supprimer</Button></DialogFooter></DialogContent></Dialog></article>
          </div>
        </TabsContent>
        <TabsContent value="donnees" className="showcase-panel">
          <article className="showcase-card data-pattern-card"><div className="showcase-card-heading"><span className="component-index">05</span><div><h3>Modèle de tableau</h3><p>Actions contextuelles, lecture dense et hiérarchie des colonnes.</p></div></div><div className="mini-table"><div className="mini-table-row mini-table-head"><span>Document</span><span>Responsable</span><span>État</span><span /></div><div className="mini-table-row"><span><strong>Relevé T1 · 7e A</strong><small>Publié le 22 août</small></span><span>Claudine Lunda</span><span><Badge className="status-badge success">Publié</Badge></span><button onClick={() => onToast("Document ouvert", "Le relevé du premier trimestre est prêt à être consulté.")}>Ouvrir</button></div><div className="mini-table-row"><span><strong>Registre des présences</strong><small>26 août 2026</small></span><span>Aline Mbuyi</span><span><Badge className="status-badge warning">À valider</Badge></span><button onClick={() => onToast("Registre ouvert", "Le registre est accessible en lecture seule.")}>Ouvrir</button></div></div></article>
        </TabsContent>
      </Tabs>
    </section>
  );
}
