import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  ChevronRight, ChevronDown, Book, FileText, Plus, Trash2,
  Save, Bold, Italic, AlignLeft, AlignCenter, AlignRight,
  List, FolderPlus, FilePlus, BookOpen, ShieldAlert,
  Underline, ListOrdered, Check, Loader2, Heading1, Heading2, Heading3,
  Type, Highlighter, Eraser, X
} from 'lucide-react';
import { Notebook, Section, Page } from '../types';
import { useNotebooks } from '../hooks/useNotebooks';
import { useAuth } from '../contexts/AuthContext';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';

type ModalType = 'NOTEBOOK' | 'SECTION' | 'PAGE' | null;
type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

// ─── Rich Text Toolbar ────────────────────────────────────────────────────────
// ─── Rich Text Toolbar ────────────────────────────────────────────────────────
const ToolbarBtn: React.FC<{ onClick: () => void; title: string; active?: boolean; children: React.ReactNode }> = ({ onClick, title, active, children }) => (
  <button
    onMouseDown={(e) => { e.preventDefault(); onClick(); }}
    title={title}
    className={`p-2 rounded-lg transition-all flex items-center justify-center ${
      active 
        ? 'bg-blue-600/20 text-blue-400 shadow-sm ring-1 ring-blue-500/30' 
        : 'hover:bg-blue-600/10 text-hub-muted hover:text-blue-300'
    }`}
  >
    {children}
  </button>
);

const ToolbarSep = () => <div className="h-6 w-px bg-card-border/60 mx-1 shrink-0" />;

const RichToolbar: React.FC<{ activeTools: Set<string> }> = ({ activeTools }) => {
  const exec = (cmd: string, val?: string) => document.execCommand(cmd, false, val);

  return (
    <div className="bg-sidebar/30 backdrop-blur-md border-b border-card-border px-6 py-3 flex items-center gap-1 overflow-x-auto scrollbar-none flex-nowrap shadow-sm">
      <div className="flex items-center gap-0.5 pr-3 border-r border-card-border/50 mr-2">
        <ToolbarBtn onClick={() => exec('formatBlock', 'h1')} title="Título H1"><Heading1 size={16} /></ToolbarBtn>
        <ToolbarBtn onClick={() => exec('formatBlock', 'h2')} title="Título H2"><Heading2 size={16} /></ToolbarBtn>
        <ToolbarBtn onClick={() => exec('formatBlock', 'h3')} title="Título H3"><Heading3 size={16} /></ToolbarBtn>
        <ToolbarBtn onClick={() => exec('formatBlock', 'p')} title="Texto"><Type size={16} /></ToolbarBtn>
      </div>

      <div className="flex items-center gap-0.5">
        <ToolbarBtn onClick={() => exec('bold')} title="Negrito (Ctrl+B)" active={activeTools.has('bold')}><Bold size={15} /></ToolbarBtn>
        <ToolbarBtn onClick={() => exec('italic')} title="Itálico (Ctrl+I)" active={activeTools.has('italic')}><Italic size={15} /></ToolbarBtn>
        <ToolbarBtn onClick={() => exec('underline')} title="Sublinhado (Ctrl+U)" active={activeTools.has('underline')}><Underline size={15} /></ToolbarBtn>
      </div>
      <ToolbarSep />

      <div className="flex items-center gap-0.5">
        <ToolbarBtn onClick={() => exec('justifyLeft')} title="Alinhar Esquerda" active={activeTools.has('left')}><AlignLeft size={15} /></ToolbarBtn>
        <ToolbarBtn onClick={() => exec('justifyCenter')} title="Centralizar" active={activeTools.has('center')}><AlignCenter size={15} /></ToolbarBtn>
        <ToolbarBtn onClick={() => exec('justifyRight')} title="Alinhar Direita" active={activeTools.has('right')}><AlignRight size={15} /></ToolbarBtn>
      </div>
      <ToolbarSep />

      <div className="flex items-center gap-0.5">
        <ToolbarBtn onClick={() => exec('insertUnorderedList')} title="Lista de Marcadores" active={activeTools.has('list')}><List size={15} /></ToolbarBtn>
        <ToolbarBtn onClick={() => exec('insertOrderedList')} title="Lista Numerada" active={activeTools.has('orderedList')}><ListOrdered size={15} /></ToolbarBtn>
      </div>
      <ToolbarSep />

      <div className="flex items-center gap-2 px-2">
        <select
          onMouseDown={(e) => e.stopPropagation()}
          onChange={(e) => exec('fontSize', e.target.value)}
          defaultValue=""
          className="bg-black/20 border border-card-border text-hub-muted text-[10px] font-bold uppercase tracking-wider rounded-lg px-3 py-1.5 cursor-pointer hover:border-blue-500/50 transition-colors outline-none focus:ring-1 focus:ring-blue-500/30 font-sans"
          title="Tamanho da fonte"
        >
          <option value="" disabled>Tamanho</option>
          <option value="1">XS</option>
          <option value="2">SM</option>
          <option value="3">MD</option>
          <option value="4">LG</option>
          <option value="5">XL</option>
          <option value="6">2XL</option>
          <option value="7">3XL</option>
        </select>

        <label title="Cor do texto" className="flex items-center cursor-pointer group bg-black/20 px-2 py-1 rounded-lg border border-card-border hover:border-blue-500/50 transition-all">
          <Type size={12} className="text-hub-muted group-hover:text-blue-400 mr-2" />
          <input
            type="color"
            defaultValue="#ffffff"
            onMouseDown={(e) => e.stopPropagation()}
            onChange={(e) => exec('foreColor', e.target.value)}
            className="w-4 h-4 rounded-sm cursor-pointer border-0 bg-transparent p-0"
          />
        </label>
      </div>

      <div className="flex items-center gap-1.5 ml-3 pl-3 border-l border-card-border/50">
        <Highlighter size={14} className="text-hub-muted mr-1 opacity-50" />
        <button onClick={() => exec('hiliteColor', '#fef08a')} className="w-5 h-5 rounded-full bg-yellow-200 hover:scale-110 transition-transform shadow-lg shadow-yellow-500/20 active:scale-95 border border-white/10" title="Marca-texto Amarelo" />
        <button onClick={() => exec('hiliteColor', '#bbf7d0')} className="w-5 h-5 rounded-full bg-green-200 hover:scale-110 transition-transform shadow-lg shadow-green-500/20 active:scale-95 border border-white/10" title="Marca-texto Verde" />
        <button onClick={() => exec('hiliteColor', '#bfdbfe')} className="w-5 h-5 rounded-full bg-blue-200 hover:scale-110 transition-transform shadow-lg shadow-blue-500/20 active:scale-95 border border-white/10" title="Marca-texto Azul" />
        <button onClick={() => exec('hiliteColor', '#fbcfe8')} className="w-5 h-5 rounded-full bg-pink-200 hover:scale-110 transition-transform shadow-lg shadow-pink-500/20 active:scale-95 border border-white/10" title="Marca-texto Rosa" />
        <button onClick={() => exec('hiliteColor', 'transparent')} className="p-1.5 text-hub-muted hover:text-red-500 transition-colors ml-1 active:scale-90" title="Limpar Marcação"><Eraser size={14} /></button>
      </div>
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────
const KnowledgeModule: React.FC = () => {
  const { user } = useAuth();
  const { notebooks, saveNotebook, deleteNotebook } = useNotebooks();

  const [activePageId, setActivePageId] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isUserEditing = useRef(false);
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

  useEffect(() => {
    if (!isUserEditing.current && activePage && editorRef.current) {
      if (editorRef.current.innerHTML !== activePage.content) {
        editorRef.current.innerHTML = activePage.content;
      }
    }
    if (!activePage && editorRef.current) {
      editorRef.current.innerHTML = '';
    }
  }, [activePageId]);

  const saveRef = useRef<() => Promise<void>>(async () => {});

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
            p.id === activePageId ? { ...p, content } : p
          )
        } : sec
      )
    };

    try {
      const finalNb = cleanObject(updatedNb);
      await saveNotebook(finalNb);
      setSaveStatus('saved');
      isUserEditing.current = false;
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(() => setSaveStatus('idle'), 2500);
    } catch (e: any) {
      console.error('Save failed:', e);
      setSaveStatus('error');
    }
  };

  const handleSave = () => saveRef.current();

  const handleEditorInput = () => {
    isUserEditing.current = true;
    setSaveStatus('idle');
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    autoSaveTimerRef.current = setTimeout(() => saveRef.current(), 1500);
  };

  const [modalState, setModalState] = useState<{
    isOpen: boolean; type: ModalType; targetId?: string; secondaryId?: string; inputValue: string;
  }>({ isOpen: false, type: null, inputValue: '' });

  // ─── Active Tool State ──────────────────────────────────────────────────
  const [activeTools, setActiveTools] = useState<Set<string>>(new Set());

  useEffect(() => {
    const handleSelectionChange = () => {
      if (!editorRef.current) return;
      const tools = new Set<string>();
      try {
        if (document.queryCommandState('bold')) tools.add('bold');
        if (document.queryCommandState('italic')) tools.add('italic');
        if (document.queryCommandState('underline')) tools.add('underline');
        if (document.queryCommandState('insertUnorderedList')) tools.add('list');
        if (document.queryCommandState('insertOrderedList')) tools.add('orderedList');
        // Alignment check
        if (document.queryCommandState('justifyLeft')) tools.add('left');
        if (document.queryCommandState('justifyCenter')) tools.add('center');
        if (document.queryCommandState('justifyRight')) tools.add('right');
      } catch (e) { /* Ignore state errors */ }
      setActiveTools(tools);
    };

    document.addEventListener('selectionchange', handleSelectionChange);
    return () => document.removeEventListener('selectionchange', handleSelectionChange);
  }, []);

  const [deleteModalState, setDeleteModalState] = useState<{
    isOpen: boolean; type: ModalType; targetId?: string; secondaryId?: string; thirdId?: string;
  }>({ isOpen: false, type: null });

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
        const newPage: Page = { id: pageId, title, content: '' };
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

  return (
    <div className="flex flex-col h-full bg-card/20 border border-card-border rounded-3xl overflow-hidden shadow-2xl backdrop-blur-xl animate-in zoom-in duration-300">
      <div className="flex flex-1 overflow-hidden">
        {/* SIDEBAR: Expanded & Polished */}
        <aside className="w-80 border-r border-card-border flex flex-col bg-sidebar/20 shrink-0 shadow-inner">
          <div className="p-6 border-b border-card-border flex items-center justify-between bg-black/5">
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-500 flex items-center">
              <Book size={14} className="mr-2" /> Minha Biblioteca
            </h3>
            <button onClick={handleAddNotebook} className="p-2 bg-blue-600/10 text-blue-500 hover:bg-blue-600 hover:text-white rounded-xl transition-all active:scale-95 shadow-lg shadow-blue-600/5 group" title="Novo Caderno">
              <Plus size={16} className="group-hover:rotate-90 transition-transform" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar">
            {notebooks.map(nb => (
              <div key={nb.id} className="space-y-3">
                <div className="flex items-center justify-between px-2 group">
                  <span className="text-[10px] font-black text-hub-muted/60 uppercase tracking-[0.2em] truncate max-w-[140px]">{nb.title}</span>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => setDeleteModalState({ isOpen: true, type: 'NOTEBOOK', targetId: nb.id })} className="p-1 px-1.5 text-hub-muted hover:text-red-500 transition-colors" title="Excluir"><Trash2 size={11} /></button>
                    <button onClick={() => handleAddSection(nb.id)} className="p-1 px-1.5 text-hub-muted hover:text-blue-500 transition-colors" title="Nova Seção"><FolderPlus size={13} /></button>
                  </div>
                </div>
                <div className="space-y-1.5">
                  {nb.sections.map(sec => (
                    <div key={sec.id}>
                      <div className={`flex items-center rounded-xl p-2.5 cursor-pointer transition-all group ${expandedSections.has(sec.id) ? 'bg-blue-500/10 shadow-sm shadow-blue-500/5' : 'hover:bg-white/5'}`} onClick={() => toggleSection(sec.id)}>
                        <div className="flex-1 flex items-center min-w-0">
                          {expandedSections.has(sec.id) ? <ChevronDown size={14} className="text-blue-500 mr-2 shrink-0" /> : <ChevronRight size={14} className="text-hub-muted mr-2 shrink-0" />}
                          <span className="text-sm font-bold truncate text-hub-text">{sec.title}</span>
                        </div>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={(e) => { e.stopPropagation(); setDeleteModalState({ isOpen: true, type: 'SECTION', targetId: nb.id, secondaryId: sec.id }); }} className="p-1 text-hub-muted hover:text-red-500 transition-all"><Trash2 size={11} /></button>
                          <button onClick={(e) => { e.stopPropagation(); handleAddPage(nb.id, sec.id); }} className="p-1 text-blue-500/60 hover:text-blue-400 transition-all"><FilePlus size={13} /></button>
                        </div>
                      </div>
                      {expandedSections.has(sec.id) && (
                        <div className="ml-5 border-l border-card-border/50 pl-3 space-y-1.5 mt-2 mb-3">
                          {sec.pages.map(page => (
                            <button key={page.id} onClick={() => { isUserEditing.current = false; setActivePageId(page.id); }}
                              className={`w-full flex items-center py-2.5 px-3 text-xs rounded-xl transition-all group ${activePageId === page.id ? 'bg-blue-600 text-white font-black shadow-lg shadow-blue-600/30 ring-2 ring-blue-600/20' : 'text-hub-muted hover:text-hub-text hover:bg-white/5'}`}>
                              <FileText size={12} className="mr-2.5 shrink-0" />
                              <span className="truncate flex-1 text-left">{page.title}</span>
                              <div onClick={(e) => { e.stopPropagation(); setDeleteModalState({ isOpen: true, type: 'PAGE', targetId: nb.id, secondaryId: sec.id, thirdId: page.id }); }} className="p-1 text-hub-muted hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all" title="Excluir">
                                <Trash2 size={11} />
                              </div>
                            </button>
                          ))}
                          {sec.pages.length === 0 && <p className="text-[10px] text-hub-muted italic px-3 opacity-30">Vazio.</p>}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
            {notebooks.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <BookOpen size={40} className="text-blue-500/10 mb-4" />
                <p className="text-xs text-hub-muted/30 font-bold uppercase tracking-widest">Inicie um Caderno</p>
              </div>
            )}
          </div>
        </aside>

        {/* EDITOR: Centered & High Focus */}
        <main className="flex-1 flex flex-col relative min-w-0 overflow-hidden bg-black/10">
          {activePage ? (
            <>
              {/* Header */}
              <div className="h-20 border-b border-card-border flex items-center justify-between px-8 bg-black/20 backdrop-blur-md shrink-0">
                <div className="flex flex-col min-w-0">
                  <span className="text-[10px] font-bold text-blue-500/60 uppercase tracking-widest mb-0.5">Editando agora</span>
                  <h2 className="text-xl font-black text-hub-text truncate">{activePage.title}</h2>
                </div>
                <div className="flex items-center space-x-3 shrink-0">
                  {saveStatus === 'saving' ? (
                    <div className="flex items-center px-5 py-2.5 bg-white/5 border border-card-border rounded-2xl text-blue-400 text-[10px] font-black uppercase tracking-widest gap-2 opacity-70">
                      <Loader2 size={15} className="animate-spin" /> Salvando
                    </div>
                  ) : saveStatus === 'saved' ? (
                    <div className="flex items-center px-5 py-2.5 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-emerald-400 text-[10px] font-black uppercase tracking-widest gap-2">
                      <Check size={15} /> Salvo
                    </div>
                  ) : (
                    <button onClick={handleSave} className="flex items-center gap-2 px-5 py-2.5 bg-white/5 border border-card-border rounded-2xl text-hub-muted hover:text-blue-500 hover:border-blue-500/40 transition-all active:scale-95 text-[10px] font-black uppercase tracking-widest" title="Salvar (Ctrl+S)">
                      <Save size={16} /> Salvar
                    </button>
                  )}
                </div>
              </div>

              {/* Toolbar */}
              <RichToolbar activeTools={activeTools} />

              {/* Writing Area */}
              <div className="flex-1 relative overflow-hidden bg-app/20">
                <div className="absolute inset-0 overflow-y-auto custom-scrollbar">
                  <div className="max-w-4xl mx-auto px-8 py-16 md:px-20 lg:px-28">
                    <div
                      ref={editorRef}
                      contentEditable
                      suppressContentEditableWarning
                      onInput={handleEditorInput}
                      onKeyDown={(e) => { if (e.ctrlKey && e.key === 's') { e.preventDefault(); handleSave(); } }}
                      className="knowledge-editor relative text-lg leading-relaxed text-hub-text outline-none min-h-[75vh] focus:ring-0"
                      style={{ fontFamily: "'Inter', system-ui, sans-serif" }}
                    />
                  </div>
                </div>
              </div>
            </>
          ) : (
            /* EMPTY STATE: Premium Visual */
            <div className="flex-1 flex flex-col items-center justify-center p-12 text-center bg-black/5">
              <div className="relative mb-12">
                <div className="absolute inset-0 bg-blue-500/20 blur-[100px] rounded-full animate-pulse" />
                <BookOpen size={100} className="text-blue-500/10 relative animate-in zoom-in duration-1000" />
              </div>
              <h3 className="text-3xl font-black uppercase tracking-[0.5em] text-hub-muted/20 mb-6 transition-all">Hub de Notas</h3>
              <p className="text-sm text-hub-muted/25 max-w-sm font-medium leading-relaxed">
                Transforme informações em conhecimento. Comece criando seu primeiro caderno na biblioteca à esquerda.
              </p>
              
              <div className="mt-16 grid grid-cols-2 gap-6 w-full max-w-lg opacity-40 hover:opacity-100 transition-opacity duration-700">
                 <div className="p-6 bg-white/5 border border-card-border rounded-3xl flex flex-col items-center shadow-sm">
                    <Save size={24} className="text-blue-500/30 mb-3" />
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-hub-muted">Auto-Save Premium</span>
                 </div>
                 <div className="p-6 bg-white/5 border border-card-border rounded-3xl flex flex-col items-center shadow-sm">
                    <Highlighter size={24} className="text-blue-500/30 mb-3" />
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-hub-muted">Suporte a Destaques</span>
                 </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* MODALS (CREATION & DELETE) */}
      {modalState.isOpen && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md animate-in fade-in duration-200 p-4">
          <div className="bg-sidebar border border-card-border p-8 rounded-[2rem] w-full max-w-lg shadow-[0_0_50px_rgba(0,0,0,0.5)] animate-in zoom-in-95 duration-200">
            <h3 className="text-2xl font-black text-hub-text mb-6">
              {modalState.type === 'NOTEBOOK' && '📦 Novo Caderno'}
              {modalState.type === 'SECTION' && '📂 Nova Seção'}
              {modalState.type === 'PAGE' && '📄 Nova Página'}
            </h3>
            <input autoFocus type="text"
              className="w-full bg-black/40 border border-card-border rounded-2xl p-5 text-hub-text outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-600/10 transition-all mb-8 placeholder-hub-muted/40"
              placeholder="Digite o nome..."
              value={modalState.inputValue}
              onChange={(e) => setModalState(prev => ({ ...prev, inputValue: e.target.value }))}
              onKeyDown={(e) => e.key === 'Enter' && handleConfirmCreation()}
            />
            <div className="flex justify-end space-x-4">
              <button onClick={() => setModalState({ isOpen: false, type: null, inputValue: '' })} className="px-6 py-3 rounded-2xl text-hub-muted hover:text-hub-text hover:bg-white/5 transition-all text-sm font-bold">Cancelar</button>
              <button onClick={handleConfirmCreation} className="px-8 py-3 rounded-2xl bg-blue-600 text-white hover:bg-blue-500 transition-all text-sm font-black shadow-xl shadow-blue-600/30">Criar Agora</button>
            </div>
          </div>
        </div>
      )}

      {deleteModalState.isOpen && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md animate-in fade-in duration-200 p-4">
          <div className="bg-sidebar border border-card-border p-8 rounded-[2rem] w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center space-x-4 mb-6 text-red-500">
              <ShieldAlert size={30} />
              <h3 className="text-2xl font-black">Confirmar Exclusão</h3>
            </div>
            <p className="text-hub-muted text-base mb-8 leading-relaxed font-medium">
              {deleteModalState.type === 'NOTEBOOK' && 'Esta ação é irreversível. Todas as seções e páginas internas serão excluídas permanentemente.'}
              {deleteModalState.type === 'SECTION' && 'Deseja realmente excluir esta seção? Todas as páginas internas serão perdidas.'}
              {deleteModalState.type === 'PAGE' && 'Tem certeza que deseja apagar esta página? O conteúdo não poderá ser recuperado.'}
            </p>
            <div className="flex justify-end space-x-4">
              <button onClick={() => setDeleteModalState({ isOpen: false, type: null })} className="px-6 py-3 rounded-2xl text-hub-muted hover:text-hub-text hover:bg-white/5 transition-all text-sm font-bold">Voltar</button>
              <button onClick={handleConfirmDelete} className="px-8 py-3 rounded-2xl bg-red-500/10 text-red-500 hover:bg-red-600 hover:text-white transition-all text-sm font-black">Sim, Excluir</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default KnowledgeModule;
