/**
 * Direction visuelle : « Registre diocésain contemporain » — importation contrôlée,
 * transparente et documentaire, avec validation avant toute création d’inscriptions annuelles.
 */
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AlertCircle, CheckCircle2, Download, FileSpreadsheet, LoaderCircle, Trash2, Upload, X } from "lucide-react";
import { useRef, useState } from "react";

export type CsvStudentRow = {
  line: number;
  lastName: string;
  firstName: string;
  sex: "F" | "M";
  className: string;
  parentPhone: string;
  registrationType: "Nouvelle inscription" | "Réinscription";
};

type ParsedRow = CsvStudentRow & { errors: string[] };

const requiredColumns = ["nom", "prenom", "sexe", "classe", "telephone_parent", "type_inscription"];

function parseLine(line: string, delimiter: string) {
  const values: string[] = [];
  let value = "";
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    if (character === '"') {
      if (quoted && line[index + 1] === '"') { value += '"'; index += 1; } else quoted = !quoted;
    } else if (character === delimiter && !quoted) { values.push(value.trim()); value = ""; } else value += character;
  }
  values.push(value.trim());
  return values;
}

function normalize(value: string) { return value.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, ""); }

export function StudentCsvImportModal({ open, onClose, onImport, onSuccess }: { open: boolean; onClose: () => void; onImport: (rows: CsvStudentRow[]) => Promise<void> | void; onSuccess: (title: string, description: string) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState("");
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [globalError, setGlobalError] = useState("");
  const [isImporting, setIsImporting] = useState(false);

  const reset = () => { setFileName(""); setRows([]); setGlobalError(""); setIsImporting(false); if (inputRef.current) inputRef.current.value = ""; };
  const close = () => { reset(); onClose(); };
  const validRows = rows.filter((row) => row.errors.length === 0);
  const invalidRows = rows.filter((row) => row.errors.length > 0);

  const downloadTemplate = () => {
    const content = "nom;prenom;sexe;classe;telephone_parent;type_inscription\nKabila;Jean;M;7e A;+243 81 430 2290;Réinscription\nMbayo;Sarah;F;7e A;+243 89 816 4455;Nouvelle inscription";
    const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "modele_import_eleves.csv";
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const analyzeFile = async (file?: File) => {
    if (!file) return;
    reset();
    if (!file.name.toLowerCase().endsWith(".csv")) { setGlobalError("Le fichier sélectionné doit être au format CSV."); return; }
    const text = await file.text();
    const lines = text.replace(/^\uFEFF/, "").split(/\r?\n/).filter((line) => line.trim().length > 0);
    if (lines.length < 2) { setGlobalError("Le fichier doit contenir une ligne d’en-tête et au moins un élève."); return; }
    const delimiter = lines[0].includes(";") ? ";" : ",";
    const headers = parseLine(lines[0], delimiter).map(normalize);
    const missing = requiredColumns.filter((column) => !headers.includes(column));
    if (missing.length > 0) { setGlobalError(`Colonnes manquantes : ${missing.join(", ")}. Téléchargez le modèle pour respecter le format attendu.`); return; }
    const indexOf = (column: string) => headers.indexOf(column);
    const parsed = lines.slice(1).map((line, offset) => {
      const values = parseLine(line, delimiter);
      const sex = values[indexOf("sexe")]?.toUpperCase() as "F" | "M";
      const registrationType = values[indexOf("type_inscription")] as CsvStudentRow["registrationType"];
      const item: ParsedRow = { line: offset + 2, lastName: values[indexOf("nom")] ?? "", firstName: values[indexOf("prenom")] ?? "", sex, className: values[indexOf("classe")] ?? "", parentPhone: values[indexOf("telephone_parent")] ?? "", registrationType, errors: [] };
      if (!item.lastName || !item.firstName) item.errors.push("Nom et prénom requis");
      if (item.sex !== "F" && item.sex !== "M") item.errors.push("Sexe : F ou M");
      if (!item.className) item.errors.push("Classe requise");
      if (!item.parentPhone) item.errors.push("Téléphone du parent requis");
      if (item.registrationType !== "Nouvelle inscription" && item.registrationType !== "Réinscription") item.errors.push("Type d’inscription invalide");
      return item;
    });
    setFileName(file.name);
    setRows(parsed);
  };

  const confirmImport = async () => {
    if (validRows.length === 0) return;
    setIsImporting(true);
    try {
      await onImport(validRows.map(({ errors, ...row }) => row));
      onSuccess("Importation terminée", `${validRows.length} élève${validRows.length > 1 ? "s ont" : " a"} été ajouté${validRows.length > 1 ? "s" : ""} au registre 2026-2027.${invalidRows.length > 0 ? ` ${invalidRows.length} ligne(s) restent à corriger.` : ""}`);
      close();
    } catch (error) { setGlobalError(error instanceof Error ? error.message : "Les élèves n’ont pas pu être importés."); setIsImporting(false); }
  };

  return <Dialog open={open} onOpenChange={(value) => { if (!value) close(); }}><DialogContent className="csv-import-dialog"><DialogHeader><div className="csv-dialog-title"><span><Upload size={18} /></span><div><DialogTitle>Importer des élèves depuis un CSV</DialogTitle><DialogDescription>Créez plusieurs inscriptions annuelles après vérification des données du fichier.</DialogDescription></div></div></DialogHeader><div className="csv-format-band"><span>Format requis</span><code>nom · prenom · sexe · classe · telephone_parent · type_inscription</code><button onClick={downloadTemplate}><Download size={14} /> Télécharger le modèle</button></div>{!fileName ? <div className="csv-dropzone"><input ref={inputRef} type="file" accept=".csv,text/csv" onChange={(event) => analyzeFile(event.target.files?.[0])} /><FileSpreadsheet size={27} /><h3>Déposez un fichier CSV ou sélectionnez-le</h3><p>Un fichier CSV avec séparateur <strong>;</strong> ou <strong>,</strong> est accepté.</p><Button variant="outline" className="secondary-action" onClick={() => inputRef.current?.click()}><Upload size={15} /> Choisir un fichier CSV</Button>{globalError && <div className="csv-global-error"><AlertCircle size={16} /> {globalError}</div>}</div> : <div className="csv-preview"><div className="csv-file-row"><span><FileSpreadsheet size={17} /></span><div><strong>{fileName}</strong><small>{rows.length} ligne{rows.length > 1 ? "s" : ""} analysée{rows.length > 1 ? "s" : ""}</small></div><button onClick={reset} aria-label="Supprimer le fichier"><Trash2 size={16} /></button></div><div className="csv-result-summary"><div className="csv-result valid"><CheckCircle2 size={16} /><span><strong>{validRows.length}</strong> prêt{validRows.length > 1 ? "s" : ""} à importer</span></div><div className="csv-result invalid"><AlertCircle size={16} /><span><strong>{invalidRows.length}</strong> ligne{invalidRows.length > 1 ? "s" : ""} à corriger</span></div></div><div className="csv-preview-table-wrap"><table className="csv-preview-table"><thead><tr><th>Ligne</th><th>Élève</th><th>Sexe</th><th>Classe</th><th>Inscription</th><th>État</th></tr></thead><tbody>{rows.slice(0, 6).map((row) => <tr key={row.line} className={row.errors.length > 0 ? "has-error" : ""}><td>{row.line}</td><td><strong>{row.firstName} {row.lastName}</strong><small>{row.parentPhone}</small></td><td>{row.sex || "—"}</td><td>{row.className || "—"}</td><td>{row.registrationType || "—"}</td><td>{row.errors.length > 0 ? <span className="csv-row-error" title={row.errors.join(", ")}><AlertCircle size={14} /> {row.errors[0]}</span> : <Badge className="status-badge success">Valide</Badge>}</td></tr>)}</tbody></table>{rows.length > 6 && <p className="csv-more-rows">Aperçu des 6 premières lignes sur {rows.length}.</p>}</div>{invalidRows.length > 0 && <p className="csv-correction-note"><AlertCircle size={15} /> Les lignes invalides ne seront pas importées. Corrigez-les dans le fichier et relancez l’analyse si nécessaire.</p>}</div>}<DialogFooter><Button type="button" variant="outline" className="secondary-action" onClick={close}>Annuler</Button>{fileName && <Button type="button" className="primary-action" onClick={confirmImport} disabled={validRows.length === 0 || isImporting}>{isImporting ? <LoaderCircle className="spin-icon" size={15} /> : <Upload size={15} />} Importer {validRows.length} élève{validRows.length > 1 ? "s" : ""}</Button>}</DialogFooter></DialogContent></Dialog>;
}
