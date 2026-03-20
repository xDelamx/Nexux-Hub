import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import {
  ChevronRight, ChevronDown, Book, FileText, Plus, Trash2,
  Save, Palette, Bold, Italic, AlignLeft, AlignCenter, AlignRight,
  List, FolderPlus, FilePlus, BookOpen, ShieldAlert,
  Upload, ZoomIn, ZoomOut, ChevronLeft, FileUp, X as CloseIcon,
  Underline, ListOrdered, Check, Loader2, Heading1, Heading2, Heading3,
  Type, Highlighter, Eraser, X
} from 'lucide-react';
import { Document, Page as PDFPage, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
// import Canvas from './Canvas'; // Removed pivot to highlighters
import { Notebook, Section, Page } from '../types';
import { useNotebooks } from '../hooks/useNotebooks';
import { useAuth } from '../contexts/AuthContext';
import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { storage, db } from '../lib/firebase';

// Fix PDF.js worker: use CDN pointing to exact installed version (5.4.530)
// new URL(import.meta.url) fails in Vite production builds on Vercel
pdfjs.GlobalWorkerOptions.workerSrc = 'https://unpkg.com/pdfjs-dist@5.4.530/build/pdf.worker.mjs';

type ModalType = 'NOTEBOOK' | 'SECTION' | 'PAGE' | null;
type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

// ─── Rich Text Toolbar ────────────────────────────────────────────────────────
const ToolbarBtn: React.FC<{ onClick: () => void; title: string; children: React.ReactNode }> = ({ onClick, title, children }) => (
  <button
    onMouseDown={(e) => { e.preventDefault(); onClick(); }}
    title={title}
    className="p-2 hover:bg-blue-600/15 active:bg-blue-600/25 rounded-lg text-hub-muted hover:text-blue-400 transition-colors flex items-center justify-center"
  >
    {children}
  </button>
);

const ToolbarSep = () => <div className="h-5 w-px bg-card-border mx-1 shrink-0" />;

const RichToolbar: React.FC = () => {
  const exec = (cmd: string, val?: string) => document.execCommand(cmd, false, val);

  return (
    <div className="bg-sidebar/40 border-b border-card-border px-3 py-1.5 flex items-center gap-0.5 overflow-x-auto scrollbar-none flex-wrap">
      {/* Headings */}
      <ToolbarBtn onClick={() => exec('formatBlock', 'h1')} title="Título H1"><Heading1 size={16} /></ToolbarBtn>
      <ToolbarBtn onClick={() => exec('formatBlock', 'h2')} title="Título H2"><Heading2 size={16} /></ToolbarBtn>
      <ToolbarBtn onClick={() => exec('formatBlock', 'h3')} title="Título H3"><Heading3 size={16} /></ToolbarBtn>
      <ToolbarBtn onClick={() => exec('formatBlock', 'p')} title="Parágrafo Normal"><Type size={16} /></ToolbarBtn>
      <ToolbarSep />

      {/* Text style */}
      <ToolbarBtn onClick={() => exec('bold')} title="Negrito (Ctrl+B)"><Bold size={15} /></ToolbarBtn>
      <ToolbarBtn onClick={() => exec('italic')} title="Itálico (Ctrl+I)"><Italic size={15} /></ToolbarBtn>
      <ToolbarBtn onClick={() => exec('underline')} title="Sublinhado (Ctrl+U)"><Underline size={15} /></ToolbarBtn>
      <ToolbarSep />

      {/* Alignment */}
      <ToolbarBtn onClick={() => exec('justifyLeft')} title="Alinhar Esquerda"><AlignLeft size={15} /></ToolbarBtn>
      <ToolbarBtn onClick={() => exec('justifyCenter')} title="Centralizar"><AlignCenter size={15} /></ToolbarBtn>
      <ToolbarBtn onClick={() => exec('justifyRight')} title="Alinhar Direita"><AlignRight size={15} /></ToolbarBtn>
      <ToolbarSep />

      {/* Lists */}
      <ToolbarBtn onClick={() => exec('insertUnorderedList')} title="Lista com marcadores"><List size={15} /></ToolbarBtn>
      <ToolbarBtn onClick={() => exec('insertOrderedList')} title="Lista numerada"><ListOrdered size={15} /></ToolbarBtn>
      <ToolbarSep />

      {/* Font size */}
      <select
        onMouseDown={(e) => e.stopPropagation()}
        onChange={(e) => exec('fontSize', e.target.value)}
        defaultValue=""
        className="bg-transparent border border-card-border text-hub-muted text-xs rounded-lg px-2 py-1 cursor-pointer hover:border-blue-500 transition-colors outline-none"
        title="Tamanho da fonte"
      >
        <option value="" disabled>Tamanho</option>
        <option value="1">Muito Pequeno</option>
        <option value="2">Pequeno</option>
        <option value="3">Normal</option>
        <option value="4">Médio</option>
        <option value="5">Grande</option>
        <option value="6">Maior</option>
        <option value="7">Máximo</option>
      </select>

      {/* Text color */}
      <label title="Cor do texto" className="flex items-center cursor-pointer ml-1 group">
        <span className="text-hub-muted group-hover:text-blue-400 transition-colors mr-1" style={{ fontSize: 14 }}>A</span>
        <input
          type="color"
          defaultValue="#ffffff"
          onMouseDown={(e) => e.stopPropagation()}
          onChange={(e) => exec('foreColor', e.target.value)}
          className="w-5 h-5 rounded cursor-pointer border-0 bg-transparent"
          title="Cor do texto"
        />
      </label>
      <ToolbarSep />

      {/* Highlighter Markers */}
      <div className="flex items-center gap-1 ml-1 group">
        <Highlighter size={14} className="text-hub-muted mr-1" />
        <button onClick={() => exec('hiliteColor', '#fef08a')} className="w-5 h-5 rounded-md bg-yellow-200 hover:scale-110 transition-transform shadow-sm" title="Marca-texto Amarelo" />
        <button onClick={() => exec('hiliteColor', '#bbf7d0')} className="w-5 h-5 rounded-md bg-green-200 hover:scale-110 transition-transform shadow-sm" title="Marca-texto Verde" />
        <button onClick={() => exec('hiliteColor', '#bfdbfe')} className="w-5 h-5 rounded-md bg-blue-200 hover:scale-110 transition-transform shadow-sm" title="Marca-texto Azul" />
        <button onClick={() => exec('hiliteColor', '#fbcfe8')} className="w-5 h-5 rounded-md bg-pink-200 hover:scale-110 transition-transform shadow-sm" title="Marca-texto Rosa" />
        <button onClick={() => exec('hiliteColor', 'transparent')} className="p-1 text-hub-muted hover:text-red-500 transition-colors" title="Limpar Marcação"><Eraser size={14} /></button>
      </div>
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────
const KnowledgeModule: React.FC = () => {
  const { user } = useAuth();

  // Tab
  const [activeTab, setActiveTab] = useState<'notes' | 'pdf'>('notes');

  // PDF
  const [pdfFile, setPdfFile] = useState<string | null>(null);
  const [isPdfLoading, setIsPdfLoading] = useState(true);
  const [isUploadingPdf, setIsUploadingPdf] = useState(false);
  const [pdfUploadProgress, setPdfUploadProgress] = useState(0);
  const [numPages, setNumPages] = useState<number | null>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [scale, setScale] = useState(1.0);

  // Fetch saved PDF URL
  useEffect(() => {
    const fetchPdfUrl = async () => {
      if (!user) { setIsPdfLoading(false); return; }
      try {
        const docRef = doc(db, 'users', user.uid, 'preferences', 'pdf');
        const docSnap = await getDoc(docRef);
        if (docSnap.exists() && docSnap.data().url) {
          setPdfFile(docSnap.data().url);
        }
      } catch (err) {
        console.error('Failed to fetch PDF URL:', err);
      } finally {
        setIsPdfLoading(false);
      }
    };
    fetchPdfUrl();
  }, [user]);

  // Notebooks
  const { notebooks, saveNotebook, deleteNotebook } = useNotebooks();
  const [activePageId, setActivePageId] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isUserEditing = useRef(false);

  // --- Refs to always have fresh values inside timers (avoids stale closures) ---
  const notebooksRef = useRef(notebooks);
  const activePageIdRef = useRef(activePageId);

  const [modalState, setModalState] = useState<{
    isOpen: boolean; type: ModalType; targetId?: string; secondaryId?: string; inputValue: string;
  }>({ isOpen: false, type: null, inputValue: '' });

  const [deleteModalState, setDeleteModalState] = useState<{
    isOpen: boolean; type: ModalType; targetId?: string; secondaryId?: string; thirdId?: string;
  }>({ isOpen: false, type: null });

  const editorRef = useRef<HTMLDivElement>(null);

  const activePage = useMemo(() => {
    if (!activePageId) return null;
    for (const nb of notebooks) {
      for (const sec of nb.sections) {
        const found = sec.pages.find(p => p.id === activePageId);
        if (found) return found;
      }
    }
    return null;
  }, [notebooks, activePageId]);

  // Keep refs in sync with latest state on every render
  notebooksRef.current = notebooks;
  activePageIdRef.current = activePageId;
  // Sync editor content ONLY when switching pages (not while typing)
  useEffect(() => {
    if (!isUserEditing.current && activePage && editorRef.current) {
      if (editorRef.current.innerHTML !== activePage.content) {
        editorRef.current.innerHTML = activePage.content;
      }
    }
    if (!activePage && editorRef.current) {
      editorRef.current.innerHTML = '';
    }
  }, [activePageId]); // Only trigger on page ID change, not on activePage data changes

  // ── Save logic using saveRef: always has fresh values, zero stale closures ──
  const saveRef = useRef<() => Promise<void>>(async () => {});

  // Update saveRef every render — captures latest notebooks, activePageId, etc. directly
  saveRef.current = async () => {
    if (!activePageId || !editorRef.current) return;

    let targetNb: Notebook | undefined;
    let targetSec: Section | undefined;
    for (const nb of notebooks) {
      for (const sec of nb.sections) {
        if (sec.pages.some(p => p.id === activePageId)) { targetNb = nb; targetSec = sec; break; }
      }
      if (targetNb) break;
    }
    if (!targetNb || !targetSec) return;

    // Utility to remove undefined fields recursively (Firestore hates undefined)
    const cleanObject = (obj: any): any => {
      const newObj: any = Array.isArray(obj) ? [] : {};
      Object.keys(obj).forEach(key => {
        if (obj[key] === undefined) return;
        if (obj[key] !== null && typeof obj[key] === 'object') {
          newObj[key] = cleanObject(obj[key]);
        } else {
          newObj[key] = obj[key];
        }
      });
      return newObj;
    };

    setSaveStatus('saving');
    const content = editorRef.current.innerHTML;
    
    const updatedNb: Notebook = {
      ...targetNb,
      sections: targetNb.sections.map(sec =>
        sec.id === targetSec!.id ? {
          ...sec,
          pages: sec.pages.map(p =>
            p.id === activePageId ? { 
              ...p, 
              content
            } : p
          )
        } : sec
      )
    };

    try {
      const finalNb = cleanObject(updatedNb);
      await saveNotebook(finalNb);
      console.log('Notebook saved successfully:', finalNb.id);
      setSaveStatus('saved');
      isUserEditing.current = false; // Reset editing flag after successful save
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(() => setSaveStatus('idle'), 2500);
    } catch (e: any) {
      console.error('Save failed error:', e);
      setSaveStatus('error');
    }
  };

  const handleSave = () => {
    console.log('Manual save triggered');
    saveRef.current();
  };

  // Auto-save: fires 1.5s after user stops typing
  const handleEditorInput = () => {
    isUserEditing.current = true; // Set editing flag
    console.log('Editor input detected, scheduling auto-save...');
    setSaveStatus('idle');
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    autoSaveTimerRef.current = setTimeout(() => {
      console.log('Auto-save triggered');
      saveRef.current();
    }, 1500);
  };

  // ── Modal helpers ──
  const handleAddNotebook = () => setModalState({ isOpen: true, type: 'NOTEBOOK', inputValue: '' });
  const handleAddSection = (nbId: string) => setModalState({ isOpen: true, type: 'SECTION', inputValue: '', targetId: nbId });
  const handleAddPage = (nbId: string, secId: string) => setModalState({ isOpen: true, type: 'PAGE', inputValue: '', targetId: nbId, secondaryId: secId });

  const handleConfirmCreation = async () => {
    const title = modalState.inputValue.trim();
    if (!title) return;
    if (modalState.type === 'NOTEBOOK') {
      await saveNotebook({ id: 'n' + Date.now(), title, sections: [] });
    } else if (modalState.type === 'SECTION' && modalState.targetId) {
      const nb = notebooks.find(n => n.id === modalState.targetId);
      if (nb) {
        const secId = 's' + Date.now();
        await saveNotebook({ ...nb, sections: [...nb.sections, { id: secId, title, pages: [] }] });
        setExpandedSections(prev => new Set(prev).add(secId));
      }
    } else if (modalState.type === 'PAGE' && modalState.targetId && modalState.secondaryId) {
      const nb = notebooks.find(n => n.id === modalState.targetId);
      if (nb) {
        const pageId = 'p' + Date.now();
        const newPage: Page = { id: pageId, title, content: '<p>Inicie sua anotação...</p>' };
        const updatedNb = { ...nb, sections: nb.sections.map(sec => sec.id === modalState.secondaryId ? { ...sec, pages: [...sec.pages, newPage] } : sec) };
        await saveNotebook(updatedNb);
        setActivePageId(pageId);
        setExpandedSections(prev => new Set(prev).add(modalState.secondaryId!));
      }
    }
    setModalState({ isOpen: false, type: null, inputValue: '' });
  };

  const handleConfirmDelete = async () => {
    const { type, targetId, secondaryId, thirdId } = deleteModalState;
    if (!type || !targetId) return;
    if (type === 'NOTEBOOK') {
      await deleteNotebook(targetId);
      setActivePageId(null);
    } else if (type === 'SECTION' && secondaryId) {
      const nb = notebooks.find(n => n.id === targetId);
      if (nb) { await saveNotebook({ ...nb, sections: nb.sections.filter(s => s.id !== secondaryId) }); setActivePageId(null); }
    } else if (type === 'PAGE' && secondaryId && thirdId) {
      const nb = notebooks.find(n => n.id === targetId);
      if (nb) {
        await saveNotebook({ ...nb, sections: nb.sections.map(sec => sec.id === secondaryId ? { ...sec, pages: sec.pages.filter(p => p.id !== thirdId) } : sec) });
        if (activePageId === thirdId) setActivePageId(null);
      }
    }
    setDeleteModalState({ isOpen: false, type: null });
  };

  const toggleSection = (id: string) => {
    setExpandedSections(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  };

  // ── PDF helpers ──
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;
    if (file.type !== 'application/pdf') { alert('Por favor, selecione apenas arquivos PDF.'); return; }
    setIsUploadingPdf(true);
    setPdfUploadProgress(0);
    const storageRef = ref(storage, `users/${user.uid}/pdfs/course.pdf`);
    const uploadTask = uploadBytesResumable(storageRef, file);
    uploadTask.on('state_changed',
      (snapshot) => setPdfUploadProgress(Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100)),
      (error) => { console.error(error); alert('Erro ao fazer upload do PDF.'); setIsUploadingPdf(false); },
      async () => {
        try {
          const url = await getDownloadURL(uploadTask.snapshot.ref);
          await setDoc(doc(db, 'users', user.uid, 'preferences', 'pdf'), { url });
          setPdfFile(url); setPageNumber(1);
        } catch (err) { console.error(err); }
        finally { setIsUploadingPdf(false); setPdfUploadProgress(0); }
      }
    );
  };

  const handleRemovePDF = async () => {
    if (!user || !confirm('Tem certeza que deseja remover o PDF atual?')) return;
    try {
      await deleteObject(ref(storage, `users/${user.uid}/pdfs/course.pdf`));
      await setDoc(doc(db, 'users', user.uid, 'preferences', 'pdf'), { url: null });
      setPdfFile(null); setNumPages(null); setPageNumber(1); setScale(1.0);
    } catch (err) { console.error(err); alert('Erro ao remover o PDF.'); }
  };

  // ── Save button UI ──
  const SaveButton = () => {
    if (saveStatus === 'saving') return (
      <button disabled className="flex items-center px-4 py-2 bg-white/5 border border-card-border rounded-2xl text-blue-400 text-xs font-bold gap-2 opacity-70">
        <Loader2 size={16} className="animate-spin" /> Salvando...
      </button>
    );
    if (saveStatus === 'saved') return (
      <button disabled className="flex items-center px-4 py-2 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-emerald-400 text-xs font-bold gap-2">
        <Check size={16} /> Salvo!
      </button>
    );
    return (
      <button onClick={handleSave} className="p-2.5 bg-white/5 border border-card-border rounded-2xl text-hub-muted hover:text-blue-500 hover:border-blue-500/40 transition-all active:scale-95" title="Salvar (Ctrl+S)">
        <Save size={18} />
      </button>
    );
  };

  return (
    <div className="flex flex-col h-full bg-card/20 border border-card-border rounded-3xl overflow-hidden shadow-2xl backdrop-blur-xl animate-in zoom-in duration-300">

      {/* TAB NAV */}
      <div className="flex border-b border-card-border bg-sidebar/30">
        {(['notes', 'pdf'] as const).map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`flex-1 flex items-center justify-center py-4 px-6 text-sm font-black uppercase tracking-widest transition-all ${activeTab === tab ? 'bg-blue-600/10 text-blue-500 border-b-2 border-blue-500' : 'text-hub-muted hover:text-hub-text hover:bg-white/5'}`}>
            {tab === 'notes' ? <><Book size={16} className="mr-2" />Notas de Estudo</> : <><FileText size={16} className="mr-2" />Leitor PDF</>}
          </button>
        ))}
      </div>

      {/* CONTENT */}
      <div className="flex flex-1 overflow-hidden">
        {activeTab === 'notes' ? (
          <>
            {/* SIDEBAR */}
            <aside className="w-72 border-r border-card-border flex flex-col bg-sidebar/30 shrink-0">
              <div className="p-5 border-b border-card-border flex items-center justify-between">
                <h3 className="text-xs font-black uppercase tracking-widest text-blue-500 flex items-center">
                  <Book size={14} className="mr-2" /> Biblioteca
                </h3>
                <button onClick={handleAddNotebook} className="p-1.5 bg-blue-600/20 text-blue-500 hover:bg-blue-600 hover:text-white rounded-xl transition-all active:scale-95" title="Novo Caderno">
                  <Plus size={16} />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-3 space-y-6 custom-scrollbar">
                {notebooks.map(nb => (
                  <div key={nb.id} className="space-y-2">
                    <div className="flex items-center justify-between px-2 group">
                      <span className="text-[9px] font-black text-hub-muted uppercase tracking-[0.2em] truncate max-w-[110px]">{nb.title}</span>
                      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => setDeleteModalState({ isOpen: true, type: 'NOTEBOOK', targetId: nb.id })} className="p-1 text-hub-muted hover:text-red-500 transition-colors" title="Excluir Caderno"><Trash2 size={11} /></button>
                        <button onClick={() => handleAddSection(nb.id)} className="p-1 text-hub-muted hover:text-blue-500 transition-colors" title="Nova Seção"><FolderPlus size={13} /></button>
                      </div>
                    </div>
                    <div className="space-y-1">
                      {nb.sections.map(sec => (
                        <div key={sec.id}>
                          <div className={`flex items-center rounded-xl p-2 cursor-pointer transition-all group ${expandedSections.has(sec.id) ? 'bg-blue-500/10' : 'hover:bg-white/5'}`} onClick={() => toggleSection(sec.id)}>
                            <div className="flex-1 flex items-center min-w-0">
                              {expandedSections.has(sec.id) ? <ChevronDown size={13} className="text-blue-500 mr-1.5 shrink-0" /> : <ChevronRight size={13} className="text-hub-muted mr-1.5 shrink-0" />}
                              <span className="text-sm font-semibold truncate text-hub-text">{sec.title}</span>
                            </div>
                            <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button onClick={(e) => { e.stopPropagation(); setDeleteModalState({ isOpen: true, type: 'SECTION', targetId: nb.id, secondaryId: sec.id }); }} className="p-1 text-hub-muted hover:text-red-500 rounded-lg transition-all" title="Excluir Seção"><Trash2 size={11} /></button>
                              <button onClick={(e) => { e.stopPropagation(); handleAddPage(nb.id, sec.id); }} className="p-1 text-blue-500/60 hover:text-blue-400 rounded-lg transition-all" title="Nova Página"><FilePlus size={13} /></button>
                            </div>
                          </div>
                          {expandedSections.has(sec.id) && (
                            <div className="ml-4 border-l border-card-border pl-2 space-y-0.5 mt-1">
                              {sec.pages.map(page => (
                                <button key={page.id} onClick={() => { isUserEditing.current = false; setActivePageId(page.id); }}
                                  className={`w-full flex items-center py-2 px-2.5 text-xs rounded-xl transition-all truncate group ${activePageId === page.id ? 'bg-blue-600 text-white font-bold shadow-lg shadow-blue-600/30' : 'text-hub-muted hover:text-hub-text hover:bg-white/5'}`}>
                                  <FileText size={11} className="mr-2 shrink-0" />
                                  <span className="truncate flex-1 text-left">{page.title}</span>
                                  <div onClick={(e) => { e.stopPropagation(); setDeleteModalState({ isOpen: true, type: 'PAGE', targetId: nb.id, secondaryId: sec.id, thirdId: page.id }); }} className="p-0.5 text-hub-muted hover:text-red-500 transition-all cursor-pointer opacity-0 group-hover:opacity-100" title="Excluir Página">
                                    <Trash2 size={10} />
                                  </div>
                                </button>
                              ))}
                              {sec.pages.length === 0 && <p className="text-[10px] text-hub-muted italic px-2 opacity-30">Sem páginas.</p>}
                            </div>
                          )}
                        </div>
                      ))}
                      {nb.sections.length === 0 && <p className="text-[10px] text-hub-muted italic px-3 opacity-30">Sem seções.</p>}
                    </div>
                  </div>
                ))}
                {notebooks.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-10 text-center">
                    <BookOpen size={32} className="text-blue-500/20 mb-3" />
                    <p className="text-xs text-hub-muted/40">Crie um caderno para começar</p>
                  </div>
                )}
              </div>
            </aside>

            {/* EDITOR */}
            <main className="flex-1 flex flex-col relative min-w-0 overflow-hidden">
              {activePage ? (
                <>
                  {/* Header */}
                  <div className="h-16 border-b border-card-border flex items-center justify-between px-6 bg-black/5 backdrop-blur-md shrink-0">
                    <h2 className="text-lg font-black text-hub-text truncate mr-4">{activePage.title}</h2>
                    <div className="flex items-center space-x-2 shrink-0">
                      {/* Save feedback inline JSX */}
                      {saveStatus === 'saving' ? (
                        <button disabled className="flex items-center px-4 py-2 bg-white/5 border border-card-border rounded-2xl text-blue-400 text-xs font-bold gap-2 opacity-70">
                          <Loader2 size={15} className="animate-spin" /> Salvando...
                        </button>
                      ) : saveStatus === 'saved' ? (
                        <button disabled className="flex items-center px-4 py-2 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-emerald-400 text-xs font-bold gap-2">
                          <Check size={15} /> Salvo!
                        </button>
                      ) : (
                        <button onClick={handleSave} className="p-2.5 bg-white/5 border border-card-border rounded-2xl text-hub-muted hover:text-blue-500 hover:border-blue-500/40 transition-all active:scale-95" title="Salvar (Ctrl+S)">
                          <Save size={18} />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Toolbar */}
                  <RichToolbar />

                  {/* Editor area */}
                  <div className="flex-1 relative overflow-hidden">
                    {/* Text layer */}
                    <div className="absolute inset-0 overflow-y-auto custom-scrollbar">
                      <div className="max-w-3xl mx-auto px-8 py-12 md:px-16">
                        <div
                          ref={editorRef}
                          contentEditable
                          suppressContentEditableWarning
                          onInput={handleEditorInput}
                          onKeyDown={(e) => { if (e.ctrlKey && e.key === 's') { e.preventDefault(); handleSave(); } }}
                          className="knowledge-editor text-base leading-relaxed text-hub-text outline-none min-h-[60vh] focus:ring-0"
                          style={{ fontFamily: "'Inter', 'Segoe UI', sans-serif" }}
                        />
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
                  <BookOpen size={56} className="text-blue-500/15 mb-6 animate-pulse" />
                  <h3 className="text-lg font-black uppercase tracking-[0.3em] text-hub-muted/30 mb-2">Central de Conhecimento</h3>
                  <p className="text-xs text-hub-muted/25">Selecione ou crie um caderno para começar seus estudos.</p>
                </div>
              )}
            </main>
          </>
        ) : (
          /* PDF TAB */
          <div className="flex-1 flex flex-col">
            {!pdfFile ? (
              <div className="flex-1 flex flex-col items-center justify-center p-12">
                {isPdfLoading ? (
                  <><div className="w-10 h-10 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mb-4" /><p className="text-sm font-bold text-hub-muted animate-pulse">Buscando arquivo...</p></>
                ) : isUploadingPdf ? (
                  <div className="flex flex-col items-center w-full max-w-sm">
                    <Upload size={56} className="text-blue-500 mb-5 animate-bounce" />
                    <h3 className="text-lg font-black uppercase tracking-[0.2em] text-hub-text mb-4">Enviando Documento</h3>
                    <div className="w-full h-2 bg-black/20 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-500 transition-all duration-300" style={{ width: `${pdfUploadProgress}%` }} />
                    </div>
                    <p className="text-xs font-bold text-hub-muted mt-3">{pdfUploadProgress}% Completo</p>
                  </div>
                ) : (
                  <>
                    <Upload size={72} className="text-blue-500/25 mb-7 animate-pulse" />
                    <h3 className="text-2xl font-black uppercase tracking-[0.3em] text-hub-text mb-3">Leitor de PDF</h3>
                    <p className="text-sm text-hub-muted mb-8 max-w-md text-center">Faça upload do PDF do seu curso para visualizá-lo diretamente na plataforma.</p>
                    <label className="cursor-pointer">
                      <input type="file" accept="application/pdf" onChange={handleFileUpload} className="hidden" />
                      <div className="px-8 py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-black shadow-xl shadow-blue-600/30 transition-all active:scale-95 flex items-center">
                        <FileUp size={18} className="mr-3" /> SELECIONAR PDF
                      </div>
                    </label>
                  </>
                )}
              </div>
            ) : (
              <>
                {/* PDF Controls */}
                <div className="h-16 border-b border-card-border flex items-center justify-between px-6 bg-sidebar/30 backdrop-blur-md shrink-0">
                  <div className="flex items-center space-x-3">
                    <button onClick={() => setPageNumber(p => Math.max(1, p - 1))} disabled={pageNumber <= 1} className="p-2.5 bg-white/5 border border-card-border rounded-xl text-hub-muted hover:text-blue-500 transition-all disabled:opacity-30 disabled:cursor-not-allowed"><ChevronLeft size={18} /></button>
                    <span className="text-sm font-bold text-hub-text whitespace-nowrap">Pág. {pageNumber} / {numPages || '...'}</span>
                    <button onClick={() => setPageNumber(p => Math.min(numPages || 1, p + 1))} disabled={pageNumber >= (numPages || 1)} className="p-2.5 bg-white/5 border border-card-border rounded-xl text-hub-muted hover:text-blue-500 transition-all disabled:opacity-30 disabled:cursor-not-allowed"><ChevronRight size={18} /></button>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button onClick={() => setScale(p => Math.max(0.5, p - 0.2))} className="p-2.5 bg-white/5 border border-card-border rounded-xl text-hub-muted hover:text-blue-500 transition-all"><ZoomOut size={18} /></button>
                    <span className="text-xs font-bold text-hub-muted min-w-[50px] text-center">{Math.round(scale * 100)}%</span>
                    <button onClick={() => setScale(p => Math.min(2.5, p + 0.2))} className="p-2.5 bg-white/5 border border-card-border rounded-xl text-hub-muted hover:text-blue-500 transition-all"><ZoomIn size={18} /></button>
                    <button onClick={handleRemovePDF} className="p-2.5 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500 hover:bg-red-500 hover:text-white transition-all ml-2" title="Remover PDF"><CloseIcon size={18} /></button>
                  </div>
                </div>

                {/* PDF Display */}
                <div className="flex-1 overflow-auto p-6 flex justify-center bg-black/10">
                  <Document
                    file={pdfFile}
                    onLoadSuccess={({ numPages }) => { setNumPages(numPages); setPageNumber(1); }}
                    onLoadError={(err) => { console.error('PDF load error:', err); alert('Erro ao carregar o PDF. Verifique o arquivo e tente novamente.'); setPdfFile(null); }}
                    loading={<div className="flex flex-col items-center mt-20"><div className="w-10 h-10 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mb-4" /><p className="text-sm text-hub-muted animate-pulse">Carregando PDF...</p></div>}
                    className="shadow-2xl"
                  >
                    <PDFPage
                      pageNumber={pageNumber}
                      scale={scale}
                      renderTextLayer={true}
                      renderAnnotationLayer={true}
                      className="border border-card-border rounded-xl overflow-hidden"
                    />
                  </Document>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* CREATION MODAL */}
      {modalState.isOpen && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-sidebar border border-card-border p-6 rounded-2xl w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200">
            <h3 className="text-lg font-bold text-hub-text mb-4">
              {modalState.type === 'NOTEBOOK' && 'Novo Caderno'}
              {modalState.type === 'SECTION' && 'Nova Seção'}
              {modalState.type === 'PAGE' && 'Nova Página'}
            </h3>
            <input autoFocus type="text"
              className="w-full bg-black/20 border border-card-border rounded-xl p-3 text-hub-text outline-none focus:border-blue-500 transition-colors mb-6"
              placeholder="Digite o nome..."
              value={modalState.inputValue}
              onChange={(e) => setModalState(prev => ({ ...prev, inputValue: e.target.value }))}
              onKeyDown={(e) => e.key === 'Enter' && handleConfirmCreation()}
            />
            <div className="flex justify-end space-x-3">
              <button onClick={() => setModalState({ isOpen: false, type: null, inputValue: '' })} className="px-4 py-2 rounded-xl text-hub-muted hover:bg-white/5 transition-colors text-sm font-medium">Cancelar</button>
              <button onClick={handleConfirmCreation} className="px-6 py-2 rounded-xl bg-blue-600 text-white hover:bg-blue-500 transition-all text-sm font-bold shadow-lg shadow-blue-600/20">Criar</button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE MODAL */}
      {deleteModalState.isOpen && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-sidebar border border-card-border p-6 rounded-2xl w-full max-w-sm shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center space-x-3 mb-4 text-red-500">
              <ShieldAlert size={22} />
              <h3 className="text-lg font-bold">Confirmar Exclusão</h3>
            </div>
            <p className="text-hub-muted text-sm mb-6">
              {deleteModalState.type === 'NOTEBOOK' && 'Tem certeza? Todas as seções e páginas serão perdidas para sempre.'}
              {deleteModalState.type === 'SECTION' && 'Tem certeza? Todas as páginas desta seção serão perdidas.'}
              {deleteModalState.type === 'PAGE' && 'Tem certeza? Esta ação não pode ser desfeita.'}
            </p>
            <div className="flex justify-end space-x-3">
              <button onClick={() => setDeleteModalState({ isOpen: false, type: null })} className="px-4 py-2 rounded-xl text-hub-muted hover:bg-white/5 transition-colors text-sm font-medium">Cancelar</button>
              <button onClick={handleConfirmDelete} className="px-6 py-2 rounded-xl bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-all text-sm font-bold">Excluir</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default KnowledgeModule;
