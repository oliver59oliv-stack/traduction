import React, { useState, useEffect, useRef } from "react";
import { supabase, isSupabaseConfigured } from "./lib/supabase";
import { 
  Trash2, 
  RefreshCw, 
  AlertCircle, 
  Check, 
  FileJson, 
  Clipboard, 
  UploadCloud, 
  BookOpen
} from "lucide-react";

interface VocabularyRecord {
  id: string;
  word: string; // French expression or word
  translation: string; // Arabic translation
  created_at: string;
}

const FIXED_JSON_TEMPLATE = `[
  {"word": "le mot français", "translation": "الترجمة بالعربية"},
  ...
]`;

const FIXED_INSTRUCTIONS = `Génère 20 mots français de niveau intermédiaire (vocabulaire général) avec leur traduction en arabe en respectant exactement le format JSON ci-dessus.
Règles :

20 objets exactement
Mots variés (noms, verbes, adjectifs, adverbes)
Niveau intermédiaire B1/B2
Aucun texte en dehors du JSON`;

export default function App() {
  // Navigation: state to toggle between views
  const [activeTab, setActiveTab] = useState<"exercises" | "json-import">("exercises");

  // Core state
  const [vocabList, setVocabList] = useState<VocabularyRecord[]>([]);
  const [fetching, setFetching] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorStatus, setErrorStatus] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // JSON Import Page states (Used purely for pasting the generated JSON)
  const [rawJson, setRawJson] = useState(() => {
    return localStorage.getItem("lughati_paste_json") || "";
  });

  const [jsonError, setJsonError] = useState<string | null>(null);
  const [copyFeedback, setCopyFeedback] = useState(false);

  const rawJsonRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize the paste textarea according to its contents
  useEffect(() => {
    if (activeTab === "json-import") {
      const timer = setTimeout(() => {
        if (rawJsonRef.current) {
          rawJsonRef.current.style.height = "auto";
          rawJsonRef.current.style.height = `${rawJsonRef.current.scrollHeight}px`;
        }
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [rawJson, activeTab]);

  // Load vocabulary and exercises from Supabase
  const loadData = async () => {
    setFetching(true);
    setErrorStatus(null);
    try {
      if (!isSupabaseConfigured || !supabase) {
        setErrorStatus("La base de données Supabase n'est pas ou est mal configurée.");
        // Attempt to load from localStorage as fallback
        const local = localStorage.getItem("lughati_all_records");
        if (local) {
          setVocabList(JSON.parse(local));
        }
        setFetching(false);
        return;
      }

      const { data, error } = await supabase
        .from("vocabulary_words")
        .select("id, word, translation, created_at")
        .order("created_at", { ascending: false });

      if (error) {
        throw error;
      }

      if (data) {
        const mapped: VocabularyRecord[] = data.map((d: any) => ({
          id: d.id,
          word: d.word,
          translation: d.translation,
          created_at: d.created_at
        }));
        setVocabList(mapped);
        localStorage.setItem("lughati_all_records", JSON.stringify(mapped));
      }
    } catch (err: any) {
      console.error("Error loading voice records:", err);
      setErrorStatus("Erreur lors de la synchronisation en ligne. Chargement des données locales.");
      const local = localStorage.getItem("lughati_all_records");
      if (local) {
        setVocabList(JSON.parse(local));
      }
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Delete record from Database
  const handleDeleteRecord = async (id: string) => {
    if (!window.confirm("Êtes-vous sûr de vouloir supprimer cet élément ?")) {
      return;
    }

    try {
      if (isSupabaseConfigured && supabase) {
        const { error } = await supabase
          .from("vocabulary_words")
          .delete()
          .eq("id", id);

        if (error) throw error;
        setSuccessMessage("Élément supprimé de la base de données !");
      } else {
        const updated = vocabList.filter(item => item.id !== id);
        setVocabList(updated);
        localStorage.setItem("lughati_all_records", JSON.stringify(updated));
        setSuccessMessage("Élément supprimé localement !");
      }
      loadData();
    } catch (err: any) {
      console.error("Delete error:", err);
      setErrorStatus("Impossible d'effectuer la suppression.");
    }
  };

  const handleRawJsonChange = (val: string) => {
    setRawJson(val);
    localStorage.setItem("lughati_paste_json", val);
  };

  // Copy raw JSON structure and custom instructions to clipboard together for presentation to AI
  const handleCopyJson = () => {
    const copyText = `=== CONSIGNES ET CONTEXTE IA ===\n${FIXED_INSTRUCTIONS}\n\n=== EXEMPLE / STRUCTURE DE DONNÉES JSON ===\n${FIXED_JSON_TEMPLATE}`;

    navigator.clipboard.writeText(copyText);
    setCopyFeedback(true);
    setTimeout(() => {
      setCopyFeedback(false);
    }, 2000);
  };

  // Envoyer action: Process JSON array paste containing vocabulary words
  const handleImportJsonSubmit = async () => {
    setLoading(true);
    setJsonError(null);
    setSuccessMessage(null);

    try {
      // Parse pasted text
      const parsed = JSON.parse(rawJson);
      const items = Array.isArray(parsed) ? parsed : [parsed];

      if (items.length === 0) {
        throw new Error("Le fichier JSON est vide.");
      }

      const payloadsToInsert = [];

      for (const item of items) {
        // Standard word fields dictionary format (French & Arabic keys)
        const frVal = item.word || item.french || item.fr || item.ex || "";
        const arVal = item.translation || item.arabic || item.ar || item.meaning || "";

        if (frVal && arVal) {
          payloadsToInsert.push({
            word: String(frVal).trim(),
            translation: String(arVal).trim()
          });
        }
      }

      if (payloadsToInsert.length === 0) {
        throw new Error("Aucun élément de vocabulaire valide n'a pu être extrait. Vérifiez le format.");
      }

      // Add to online database or local backup state
      if (isSupabaseConfigured && supabase) {
        const { error } = await supabase
          .from("vocabulary_words")
          .insert(payloadsToInsert);

        if (error) {
          throw error;
        }
        setSuccessMessage(`Importation réussie ! ${payloadsToInsert.length} élément(s) synchronisé(s) dans Supabase ! 🎉`);
      } else {
        // Local implementation backup
        const newRecords = payloadsToInsert.map(p => ({
          id: Math.random().toString(36).substr(2, 9),
          ...p,
          created_at: new Date().toISOString()
        }));

        const updated = [...newRecords, ...vocabList];
        setVocabList(updated);
        localStorage.setItem("lughati_all_records", JSON.stringify(updated));
        setSuccessMessage(`Importation locale réussie avec ${payloadsToInsert.length} éléments !`);
      }

      // Reload list
      loadData();

      // Soft redirect to dashboard after success
      setTimeout(() => {
        setActiveTab("exercises");
      }, 1500);

    } catch (err: any) {
      console.error("Importation error:", err);
      setJsonError(err.message || "Erreur de format JSON ou de connection Supabase.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div 
      id="lughati-step3-root" 
      className="min-h-screen bg-[#08090b] text-[#f4f4f5] font-sans pb-20 selection:bg-indigo-900 selection:text-white"
    >
      
      {/* Sleek App Header */}
      <header className="border-b border-[#18191f] bg-[#0c0d12] py-4 px-6 sticky top-0 z-40 backdrop-blur-md">
        <div className="max-w-4xl mx-auto flex justify-center items-center">
          
          {/* Core Tab Switching */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setActiveTab("exercises");
                setSuccessMessage(null);
                setErrorStatus(null);
              }}
              className={`px-4 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                activeTab === "exercises" 
                  ? "bg-indigo-600 text-white shadow-md border border-indigo-500" 
                  : "bg-[#16171d] hover:bg-[#1f202a] text-zinc-400"
              }`}
            >
              Dictionnaire de Vocabulaire
            </button>

            <button
              onClick={() => {
                setActiveTab("json-import");
                setSuccessMessage(null);
                setErrorStatus(null);
              }}
              className={`px-4 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === "json-import" 
                  ? "bg-amber-600 text-white shadow-md border border-amber-500" 
                  : "bg-[#16171d] hover:bg-[#1f202a] text-zinc-400"
              }`}
            >
              <FileJson className="w-3.5 h-3.5" />
              Importer JSON (IA)
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-4xl mx-auto px-4 mt-8 space-y-6">

        {/* Global Alert Notification Drawer */}
        {errorStatus && (
          <div className="p-4 bg-rose-950/40 border border-rose-500/30 text-rose-300 text-xs rounded-xl flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
            <p className="font-semibold">{errorStatus}</p>
          </div>
        )}

        {successMessage && (
          <div className="p-4 bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 text-xs rounded-xl flex items-center gap-2.5">
            <Check className="w-4 h-4 text-emerald-500 shrink-0" />
            <p className="font-semibold">{successMessage}</p>
          </div>
        )}

        {/* ================= TAB 1: EXECUTIVE EXERCISES & DICTIONARY ================= */}
        {activeTab === "exercises" && (
          <div className="space-y-6">
            
            {/* List / Table Grid showcasing entered records parsed dynamically */}
            <section className="space-y-4">
              {fetching ? (
                <div className="py-16 text-center text-zinc-500 space-y-2 bg-[#0d0e12] rounded-2xl border border-[#1c1d27]">
                  <RefreshCw className="w-7 h-7 animate-spin mx-auto text-indigo-500" />
                  <p className="text-xs">Récupération des données cloud...</p>
                </div>
              ) : vocabList.length === 0 ? (
                <div className="py-16 text-center text-zinc-500 space-y-3 bg-[#0d0e12] rounded-2xl border border-[#1a1b23]">
                  <BookOpen className="w-10 h-10 mx-auto text-zinc-700" />
                  <div>
                    <p className="text-xs text-white font-semibold">Aucun mot enregistré dans le dictionnaire.</p>
                    <p className="text-[10px] text-zinc-500 mt-1">Utilisez l'Importateur JSON IA pour ajouter votre liste de vocabulaire.</p>
                  </div>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-[#222435] bg-[#0d0e12]">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-[#222435] bg-[#111218]">
                        <th className="py-3 px-4 text-[11px] font-bold uppercase tracking-wider text-zinc-400 font-mono w-16">n°</th>
                        <th className="py-3 px-4 text-[11px] font-bold uppercase tracking-wider text-zinc-400">Français</th>
                        <th className="py-3 px-4 text-[11px] font-bold uppercase tracking-wider text-zinc-400 text-right">Arabe</th>
                        <th className="py-3 px-4 text-[11px] font-bold uppercase tracking-wider text-zinc-400 text-center w-20">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#1e202e]">
                      {vocabList.map((item, index) => (
                        <tr key={item.id} className="hover:bg-[#14151f] transition-colors">
                          <td className="py-3.5 px-4 text-xs font-mono text-zinc-500">
                            {vocabList.length - index}
                          </td>
                          <td className="py-3.5 px-4 text-xs font-semibold text-white select-text">
                            {item.word}
                          </td>
                          <td className="py-3.5 px-4 text-sm font-extrabold text-indigo-400 select-text text-right" dir="rtl">
                            {item.translation}
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <button
                              onClick={() => handleDeleteRecord(item.id)}
                              className="p-2 bg-[#2c1319]/50 hover:bg-rose-950 text-rose-400 transition-colors rounded-lg cursor-pointer inline-flex items-center justify-center"
                              title="Supprimer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </div>
        )}

        {/* ================= TAB 2: RICH SPECIFIC JSON IMPORT PAGE ================= */}
        {activeTab === "json-import" && (
          <div className="space-y-6">
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start" dir="ltr">
              
              {/* Left Column: AI Prompt & Static Templates */}
              <div className="space-y-4 font-sans">
                
                <div className="space-y-1.5">
                  <span className="text-xs font-bold text-zinc-400 block">Instructions pour l'IA (Consigne) :</span>
                  <div className="w-full p-4 bg-[#f06a22]/5 text-[#f06a22] font-semibold text-xs leading-relaxed rounded-xl border border-dashed border-[1.5px] border-[#da5a22]/70 whitespace-pre-wrap select-text">
                    {FIXED_INSTRUCTIONS}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <span className="text-xs font-bold text-zinc-400 block">Modèle de structure requis (JSON) :</span>
                  <pre className="w-full p-4 bg-[#111218] text-[#eceff4] font-mono text-xs leading-relaxed rounded-xl border border-[#222435] shadow-inner overflow-x-auto whitespace-pre select-text">
                    {FIXED_JSON_TEMPLATE}
                  </pre>
                </div>

                <div className="pt-1">
                  <button
                    type="button"
                    onClick={handleCopyJson}
                    className="w-full bg-[#007fff] hover:bg-[#0070df] text-white py-3 px-4 rounded-xl text-xs font-bold font-sans transition-all active:scale-95 text-center cursor-pointer flex items-center justify-center gap-1.5 shadow-md font-sans"
                  >
                    <Clipboard className="w-3.5 h-3.5" />
                    <span>{copyFeedback ? "Copié !" : "Copier le prompt et le modèle"}</span>
                  </button>
                </div>

              </div>

              {/* Right Column: Paste & Import Zone */}
              <div className="space-y-3 font-sans">
                
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-zinc-400 block">Coller le JSON généré par l'IA ici :</span>
                  <span className="text-[10px] text-emerald-500 font-bold font-mono">Prêt pour l'import</span>
                </div>
                
                <textarea
                  ref={rawJsonRef}
                  value={rawJson}
                  onChange={(e) => handleRawJsonChange(e.target.value)}
                  dir="ltr"
                  className="w-full min-h-[160px] p-4 bg-[#0d0e12] text-zinc-300 font-mono text-xs leading-relaxed rounded-xl border border-[#222435] focus:outline-none focus:ring-1 focus:ring-emerald-500/50 shadow-inner resize-none overflow-y-hidden select-text placeholder:text-zinc-600"
                  placeholder={`Collez l'un ou l'autre format JSON ici pour importer... Ex:
[
  {"word": "ordinateur", "translation": "حاسوب"}
]`}
                />

                {/* Submitting error display */}
                {jsonError && (
                  <div className="p-3 bg-red-950/60 text-red-400 text-[11px] rounded-lg border border-red-500/20 leading-relaxed font-mono">
                    ⚠️ {jsonError}
                  </div>
                )}

                <div className="pt-1">
                  <button
                    type="button"
                    onClick={handleImportJsonSubmit}
                    disabled={loading || !rawJson.trim()}
                    className="w-full bg-[#1ea955] hover:bg-[#198d47] disabled:bg-[#16171d] disabled:text-zinc-600 disabled:border-zinc-800 text-white py-3 px-4 rounded-xl text-xs font-bold font-sans transition-all active:scale-95 text-center cursor-pointer flex items-center justify-center gap-1.5 shadow-md"
                  >
                    {loading ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <UploadCloud className="w-3.5 h-3.5" />
                    )}
                    <span>Importer dans le dictionnaire</span>
                  </button>
                </div>

              </div>

            </div>

            {/* Bottom link to return back */}
            <div className="text-center pt-4 border-t border-[#181921]">
              <button
                onClick={() => setActiveTab("exercises")}
                className="text-zinc-500 hover:text-white transition-colors text-xs font-semibold inline-flex items-center gap-1 cursor-pointer hover:underline"
              >
                ← Retour au dictionnaire principal
              </button>
            </div>

          </div>
        )}

      </main>
    </div>
  );
}
