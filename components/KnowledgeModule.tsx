import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  ChevronRight, ChevronDown, Book, FileText, Plus, Trash2,
  Save, Palette, Bold, Italic, AlignLeft, AlignCenter,
  List, FolderPlus, FilePlus, BookOpen, PenTool, Eraser, ShieldAlert,
  Upload, ZoomIn, ZoomOut, ChevronLeft, FileUp, X as CloseIcon
} from 'lucide-react';
import { Document, Page as PDFPage, pdfjs } from 'react-pdf';
import Canvas from './Canvas';
import { Notebook, Section, Page } from '../types';
import { useNotebooks } from '../hooks/useNotebooks';
import { useAuth } from '../contexts/AuthContext';
import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { storage, db } from '../lib/firebase';

// Configure PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

type ModalType = 'NOTEBOOK' | 'SECTION' | 'PAGE' | null;

const KnowledgeModule: React.FC = () => {
  // Auth state
  const { user } = useAuth();

  // Tab state
  const [activeTab, setActiveTab] = useState<'notes' | 'pdf'>('notes');

  // PDF state
  const [pdfFile, setPdfFile] = useState<string | null>(null);
  const [isPdfLoading, setIsPdfLoading] = useState(true);
  const [isUploadingPdf, setIsUploadingPdf] = useState(false);
  const [pdfUploadProgress, setPdfUploadProgress] = useState(0);

  // Fetch PDF URL on mount
  useEffect(() => {
    const fetchPdfUrl = async () => {
      if (!user) {
        setIsPdfLoading(false);
        return;
      }
      try {
        const docRef = doc(db, 'users', user.uid, 'preferences', 'pdf');
        const docSnap = await getDoc(docRef);
        if (docSnap.exists() && docSnap.data().url) {
          setPdfFile(docSnap.data().url);
        }
      } catch (error) {
        console.error('Failed to fetch PDF URL from Firestore:', error);
      } finally {
        setIsPdfLoading(false);
      }
    };
    fetchPdfUrl();
  }, [user]);
  const [numPages, setNumPages] = useState<number | null>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [scale, setScale] = useState(1.0);

  // Firestore Data
  const { notebooks, saveNotebook, deleteNotebook } = useNotebooks();

  const [activePageId, setActivePageId] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const [isDrawingMode, setIsDrawingMode] = useState(false);
  const [tempDrawingData, setTempDrawingData] = useState<string | null>(null);
  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    type: ModalType;
    targetId?: string;
    secondaryId?: string;
    inputValue: string;
  }>({
    isOpen: false,
    type: null,
    inputValue: ''
  });
  const [deleteModalState, setDeleteModalState] = useState<{
    isOpen: boolean;
    type: ModalType;
    targetId?: string;
    secondaryId?: string;
    thirdId?: string;
  }>({
    isOpen: false,
    type: null
  });

  const editorRef = useRef<HTMLDivElement>(null);

  // Encontra a página ativa
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

  // Sincroniza conteúdo do editor
  useEffect(() => {
    if (activePage) {
      setTempDrawingData(activePage.drawingData || null);
      if (editorRef.current && editorRef.current.innerHTML !== activePage.content) {
        editorRef.current.innerHTML = activePage.content;
      }
    } else {
      setTempDrawingData(null);
      if (editorRef.current) editorRef.current.innerHTML = '';
    }
  }, [activePageId, activePage]); // Depend on activePage object to refresh if it changes from DB

  const handleAddNotebook = () => {
    setModalState({
      isOpen: true,
      type: 'NOTEBOOK',
      inputValue: '',
      targetId: undefined
    });
  };

  const handleAddSection = (nbId: string) => {
    setModalState({
      isOpen: true,
      type: 'SECTION',
      inputValue: '',
      targetId: nbId
    });
  };

  const handleAddPage = (nbId: string, secId: string) => {
    setModalState({
      isOpen: true,
      type: 'PAGE',
      inputValue: '',
      targetId: nbId,
      secondaryId: secId
    });
  };

  const handleConfirmCreation = async () => {
    const title = modalState.inputValue.trim();
    if (!title) return;

    if (modalState.type === 'NOTEBOOK') {
      const newNotebook: Notebook = { id: 'n' + Date.now(), title, sections: [] };
      await saveNotebook(newNotebook);
    }
    else if (modalState.type === 'SECTION' && modalState.targetId) {
      const nb = notebooks.find(n => n.id === modalState.targetId);
      if (nb) {
        const secId = 's' + Date.now();
        const updatedNb = { ...nb, sections: [...nb.sections, { id: secId, title, pages: [] }] };
        await saveNotebook(updatedNb);
        setExpandedSections(prev => new Set(prev).add(secId));
      }
    }
    else if (modalState.type === 'PAGE' && modalState.targetId && modalState.secondaryId) {
      const nb = notebooks.find(n => n.id === modalState.targetId);
      if (nb) {
        const pageId = 'p' + Date.now();
        const newPage: Page = { id: pageId, title, content: '<div>Inicie sua anotação...</div>' };
        const updatedNb = {
          ...nb,
          sections: nb.sections.map(sec =>
            sec.id === modalState.secondaryId ? { ...sec, pages: [...sec.pages, newPage] } : sec
          )
        };
        await saveNotebook(updatedNb);
        setActivePageId(pageId);
        setExpandedSections(prev => new Set(prev).add(modalState.secondaryId!));
      }
    }

    setModalState({ isOpen: false, type: null, inputValue: '' });
  };

  const handleDeleteNotebook = (nbId: string) => {
    setDeleteModalState({
      isOpen: true,
      type: 'NOTEBOOK',
      targetId: nbId
    });
  };

  const handleDeleteSection = (nbId: string, secId: string) => {
    setDeleteModalState({
      isOpen: true,
      type: 'SECTION',
      targetId: nbId,
      secondaryId: secId
    });
  };

  const handleDeletePage = (nbId: string, secId: string, pageId: string) => {
    setDeleteModalState({
      isOpen: true,
      type: 'PAGE',
      targetId: nbId,
      secondaryId: secId,
      thirdId: pageId
    });
  };

  const handleConfirmDelete = async () => {
    const { type, targetId, secondaryId, thirdId } = deleteModalState;
    if (!type || !targetId) return;

    if (type === 'NOTEBOOK') {
      await deleteNotebook(targetId);
      // Logic to clear active page if it was in this notebook
      if (activePageId) {
        // Optimization: just clear if we can't find it effectively or just let it clear naturally
        // But here we might want to be explicit
        setActivePageId(null);
      }
    } else if (type === 'SECTION' && secondaryId) {
      const nb = notebooks.find(n => n.id === targetId);
      if (nb) {
        const updatedNb = { ...nb, sections: nb.sections.filter(s => s.id !== secondaryId) };
        await saveNotebook(updatedNb);
        setActivePageId(null); // Simple safety clear
      }
    } else if (type === 'PAGE' && secondaryId && thirdId) {
      const nb = notebooks.find(n => n.id === targetId);
      if (nb) {
        const updatedNb = {
          ...nb,
          sections: nb.sections.map(sec =>
            sec.id === secondaryId ? { ...sec, pages: sec.pages.filter(p => p.id !== thirdId) } : sec
          )
        };
        await saveNotebook(updatedNb);
        if (activePageId === thirdId) setActivePageId(null);
      }
    }
    setDeleteModalState({ isOpen: false, type: null });
  };

  const handleSave = async () => {
    if (!activePageId || !editorRef.current) return;

    // Find the notebook containing activePageId
    let targetNb: Notebook | undefined;
    let targetSec: Section | undefined;

    for (const nb of notebooks) {
      for (const sec of nb.sections) {
        if (sec.pages.some(p => p.id === activePageId)) {
          targetNb = nb;
          targetSec = sec;
          break;
        }
      }
      if (targetNb) break;
    }

    if (!targetNb || !targetSec) return;

    const content = editorRef.current.innerHTML;

    const updatedNb: Notebook = {
      ...targetNb,
      sections: targetNb.sections.map(sec =>
        sec.id === targetSec!.id ? {
          ...sec,
          pages: sec.pages.map(p =>
            p.id === activePageId ? { ...p, content, drawingData: tempDrawingData || undefined } : p
          )
        } : sec
      )
    };

    await saveNotebook(updatedNb);
    console.log('Conteúdo salvo no Firestore.');
  };

  const toggleSection = (id: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    if (file.type !== 'application/pdf') {
      alert('Por favor, selecione apenas arquivos PDF.');
      return;
    }

    setIsUploadingPdf(true);
    setPdfUploadProgress(0);

    const storageRef = ref(storage, `users/${user.uid}/pdfs/course.pdf`);
    const uploadTask = uploadBytesResumable(storageRef, file);

    uploadTask.on(
      'state_changed',
      (snapshot) => {
        const progress = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
        setPdfUploadProgress(progress);
      },
      (error) => {
        console.error('Error uploading PDF:', error);
        alert('Erro ao fazer upload do PDF. Tente novamente.');
        setIsUploadingPdf(false);
      },
      async () => {
        try {
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
          // Save URL in Firestore
          await setDoc(doc(db, 'users', user.uid, 'preferences', 'pdf'), { url: downloadURL });

          setPdfFile(downloadURL);
          setPageNumber(1);
        } catch (error) {
          console.error('Error saving PDF URL to Firestore:', error);
        } finally {
          setIsUploadingPdf(false);
          setPdfUploadProgress(0);
        }
      }
    );
  };

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setPageNumber(1);
  };

  const handlePreviousPage = () => {
    setPageNumber(prev => Math.max(1, prev - 1));
  };

  const handleNextPage = () => {
    setPageNumber(prev => Math.min(numPages || 1, prev + 1));
  };

  const handleZoomIn = () => {
    setScale(prev => Math.min(2.5, prev + 0.2));
  };

  const handleZoomOut = () => {
    setScale(prev => Math.max(0.5, prev - 0.2));
  };

  const handleRemovePDF = async () => {
    if (!user) return;
    if (confirm('Tem certeza que deseja remover o PDF atual?')) {
      try {
        const storageRef = ref(storage, `users/${user.uid}/pdfs/course.pdf`);
        await deleteObject(storageRef);
        await setDoc(doc(db, 'users', user.uid, 'preferences', 'pdf'), { url: null });

        setPdfFile(null);
        setNumPages(null);
        setPageNumber(1);
        setScale(1.0);
      } catch (error) {
        console.error('Error removing PDF:', error);
        alert('Erro ao remover o PDF. Tente novamente.');
      }
    }
  };

  return (
    <div className="flex flex-col h-full bg-card/20 border border-card-border rounded-3xl overflow-hidden shadow-2xl backdrop-blur-xl animate-in zoom-in duration-300">
      {/* TAB NAVIGATION */}
      <div className="flex border-b border-card-border bg-sidebar/30">
        <button
          onClick={() => setActiveTab('notes')}
          className={`flex-1 flex items-center justify-center py-4 px-6 text-sm font-black uppercase tracking-widest transition-all ${activeTab === 'notes'
            ? 'bg-blue-600/10 text-blue-500 border-b-2 border-blue-500'
            : 'text-hub-muted hover:text-hub-text hover:bg-white/5'
            }`}
        >
          <Book size={18} className="mr-2" />
          Notas de Estudo
        </button>
        <button
          onClick={() => setActiveTab('pdf')}
          className={`flex-1 flex items-center justify-center py-4 px-6 text-sm font-black uppercase tracking-widest transition-all ${activeTab === 'pdf'
            ? 'bg-blue-600/10 text-blue-500 border-b-2 border-blue-500'
            : 'text-hub-muted hover:text-hub-text hover:bg-white/5'
            }`}
        >
          <FileText size={18} className="mr-2" />
          Leitor PDF
        </button>
      </div>

      {/* CONTENT AREA */}
      <div className="flex flex-1 overflow-hidden">
        {activeTab === 'notes' ? (
          <>
            {/* SIDEBAR ORGANIZACIONAL */}
            <aside className="w-80 border-r border-card-border flex flex-col bg-sidebar/30 shrink-0">
              <div className="p-6 border-b border-card-border flex items-center justify-between">
                <h3 className="text-sm font-black uppercase tracking-widest text-blue-500 flex items-center">
                  <Book size={16} className="mr-2" /> Biblioteca
                </h3>
                <button
                  onClick={handleAddNotebook}
                  className="p-2 bg-blue-600/20 text-blue-500 hover:bg-blue-600 hover:text-white rounded-xl transition-all shadow-md active:scale-95"
                  title="Novo Tema/Caderno"
                >
                  <Plus size={18} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-8 custom-scrollbar">
                {notebooks.map(nb => (
                  <div key={nb.id} className="space-y-3">
                    <div className="flex items-center justify-between px-2 group">
                      <span className="text-[10px] font-black text-hub-muted uppercase tracking-[0.2em] truncate max-w-[120px]">{nb.title}</span>
                      <div className="flex items-center">
                        <button onClick={() => handleDeleteNotebook(nb.id)} className="p-1.5 text-hub-muted hover:text-red-500 transition-colors mr-1" title="Excluir Caderno">
                          <Trash2 size={12} />
                        </button>
                        <button onClick={() => handleAddSection(nb.id)} className="p-1.5 text-hub-muted hover:text-blue-500 transition-colors" title="Nova Seção">
                          <FolderPlus size={14} />
                        </button>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      {nb.sections.map(sec => (
                        <div key={sec.id} className="space-y-1">
                          <div
                            className={`flex items-center rounded-xl p-2 cursor-pointer transition-all group ${expandedSections.has(sec.id) ? 'bg-blue-500/10' : 'hover:bg-white/5'}`}
                            onClick={() => toggleSection(sec.id)}
                          >
                            <div className="flex-1 flex items-center min-w-0">
                              {expandedSections.has(sec.id) ?
                                <ChevronDown size={14} className="text-blue-500 mr-2 shrink-0" /> :
                                <ChevronRight size={14} className="text-hub-muted mr-2 shrink-0" />
                              }
                              <span className="text-sm font-bold truncate text-hub-text">{sec.title}</span>
                            </div>
                            <div className="flex items-center">
                              <button
                                onClick={(e) => { e.stopPropagation(); handleDeleteSection(nb.id, sec.id); }}
                                className="p-1.5 text-hub-muted hover:text-red-500 rounded-lg transition-all mr-1"
                                title="Excluir Seção"
                              >
                                <Trash2 size={12} />
                              </button>
                              <button
                                onClick={(e) => { e.stopPropagation(); handleAddPage(nb.id, sec.id); }}
                                className="p-1.5 text-blue-500 hover:bg-blue-500/20 rounded-lg transition-all"
                                title="Nova Página"
                              >
                                <FilePlus size={14} />
                              </button>
                            </div>
                          </div>

                          {expandedSections.has(sec.id) && (
                            <div className="ml-5 border-l border-card-border pl-2 space-y-1">
                              {sec.pages.map(page => (
                                <button
                                  key={page.id}
                                  onClick={() => setActivePageId(page.id)}
                                  className={`w-full flex items-center py-2 px-3 text-xs rounded-xl transition-all truncate group ${activePageId === page.id ? 'bg-blue-600 text-white font-bold shadow-lg shadow-blue-600/20' : 'text-hub-muted hover:text-hub-text hover:bg-white/5'}`}
                                >
                                  <FileText size={12} className="mr-3 shrink-0" />
                                  <span className="truncate flex-1 text-left">{page.title}</span>
                                  <div
                                    onClick={(e) => { e.stopPropagation(); handleDeletePage(nb.id, sec.id, page.id); }}
                                    className="p-1 text-hub-muted hover:text-red-500 transition-all cursor-pointer"
                                    title="Excluir Página"
                                  >
                                    <Trash2 size={10} />
                                  </div>
                                </button>
                              ))}
                              {sec.pages.length === 0 && <p className="text-[10px] text-hub-muted italic px-3 opacity-40">Sem páginas.</p>}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </aside>

            {/* ÁREA DO EDITOR PRINCIPAL */}
            <main className="flex-1 flex flex-col relative min-w-0">
              {activePage ? (
                <>
                  <div className="h-20 border-b border-card-border flex items-center justify-between px-8 bg-black/5 backdrop-blur-md">
                    <h2 className="text-xl font-black text-hub-text truncate mr-4">{activePage.title}</h2>
                    <div className="flex items-center space-x-3 shrink-0">
                      <button
                        onClick={() => setIsDrawingMode(!isDrawingMode)}
                        className={`flex items-center px-5 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${isDrawingMode ? 'bg-blue-600 text-white shadow-xl shadow-blue-600/40' : 'bg-white/5 text-hub-muted hover:text-hub-text border border-card-border'}`}
                      >
                        <Palette size={14} className="mr-2" />
                        {isDrawingMode ? 'Concluir Desenho' : 'Modo Canvas'}
                      </button>
                      <button
                        onClick={handleSave}
                        className="p-3 bg-white/5 border border-card-border rounded-2xl text-hub-muted hover:text-blue-500 transition-all active:scale-95"
                        title="Salvar"
                      >
                        <Save size={20} />
                      </button>
                    </div>
                  </div>

                  {/* BARRA DE FORMATAÇÃO */}
                  <div className="bg-sidebar/20 border-b border-card-border p-2 flex items-center gap-1 overflow-x-auto scrollbar-none">
                    <button onClick={() => document.execCommand('bold')} className="p-2.5 hover:bg-blue-600/10 rounded-xl text-hub-muted hover:text-blue-500 transition-colors"><Bold size={18} /></button>
                    <button onClick={() => document.execCommand('italic')} className="p-2.5 hover:bg-blue-600/10 rounded-xl text-hub-muted hover:text-blue-500 transition-colors"><Italic size={18} /></button>
                    <div className="h-6 w-px bg-card-border mx-2"></div>
                    <button onClick={() => document.execCommand('justifyLeft')} className="p-2.5 hover:bg-blue-600/10 rounded-xl text-hub-muted hover:text-blue-500"><AlignLeft size={18} /></button>
                    <button onClick={() => document.execCommand('justifyCenter')} className="p-2.5 hover:bg-blue-600/10 rounded-xl text-hub-muted hover:text-blue-500"><AlignCenter size={18} /></button>
                    <button onClick={() => document.execCommand('insertUnorderedList')} className="p-2.5 hover:bg-blue-600/10 rounded-xl text-hub-muted hover:text-blue-500"><List size={18} /></button>
                  </div>

                  <div className="flex-1 relative overflow-hidden bg-black/10">
                    {/* CAMADA DE CANVAS (DESENHO LIVRE) */}
                    <div className={`absolute inset-0 z-10 pointer-events-none ${isDrawingMode ? 'pointer-events-auto bg-blue-500/5 cursor-crosshair' : ''}`}>
                      <Canvas
                        key={activePageId}
                        isDrawingEnabled={isDrawingMode}
                        initialData={activePage.drawingData}
                        onSave={(data) => setTempDrawingData(data)}
                      />
                    </div>

                    {/* CAMADA DE TEXTO (EDITOR) */}
                    <div className="absolute inset-0 p-8 md:p-16 lg:p-20 overflow-y-auto custom-scrollbar">
                      <div className="max-w-4xl mx-auto">
                        <div
                          ref={editorRef}
                          contentEditable
                          suppressContentEditableWarning
                          className="text-lg leading-relaxed text-hub-text outline-none min-h-[60vh] prose prose-invert max-w-none focus:ring-0"
                        />
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center p-12 text-center bg-black/10">
                  <BookOpen size={64} className="text-blue-500/20 mb-6 animate-pulse" />
                  <h3 className="text-xl font-black uppercase tracking-[0.3em] text-hub-muted/40 mb-2">Central de Conhecimento</h3>
                  <p className="text-xs text-hub-muted/30">Selecione ou crie um caderno e página para começar seus estudos.</p>
                </div>
              )}
            </main>

          </>
        ) : (
          // PDF READER TAB
          <div className="flex-1 flex flex-col bg-black/10">
            {!pdfFile ? (
              // Upload Interface
              <div className="flex-1 flex flex-col items-center justify-center p-12">
                {isPdfLoading ? (
                  <div className="flex flex-col items-center">
                    <div className="w-12 h-12 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mb-4"></div>
                    <p className="text-sm font-bold text-hub-muted animate-pulse">Buscando arquivo...</p>
                  </div>
                ) : isUploadingPdf ? (
                  <div className="flex flex-col items-center w-full max-w-sm">
                    <Upload size={64} className="text-blue-500 mb-6 animate-bounce" />
                    <h3 className="text-lg font-black uppercase tracking-[0.2em] text-hub-text mb-4">Enviando Documento</h3>
                    <div className="w-full h-2 bg-black/20 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-500 transition-all duration-300"
                        style={{ width: `${pdfUploadProgress}%` }}
                      ></div>
                    </div>
                    <p className="text-xs font-bold text-hub-muted mt-3">{pdfUploadProgress}% Completo</p>
                    <p className="text-[10px] text-hub-muted/50 mt-2 text-center">Por favor, não feche esta página enquanto o arquivo é carregado para a nuvem.</p>
                  </div>
                ) : (
                  <>
                    <Upload size={80} className="text-blue-500/30 mb-8 animate-pulse" />
                    <h3 className="text-2xl font-black uppercase tracking-[0.3em] text-hub-text mb-4">
                      Leitor de PDF do Curso
                    </h3>
                    <p className="text-sm text-hub-muted mb-8 max-w-md text-center">
                      Faça upload do PDF exclusivo do seu curso para visualizá-lo diretamente na plataforma.
                    </p>
                    <label className="cursor-pointer">
                      <input
                        type="file"
                        accept="application/pdf"
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                      <div className="px-8 py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-black shadow-xl shadow-blue-600/30 transition-all active:scale-95 flex items-center">
                        <FileUp size={20} className="mr-3" />
                        SELECIONAR PDF
                      </div>
                    </label>
                  </>
                )}
              </div>
            ) : (
              // PDF Viewer
              <>
                {/* PDF Controls */}
                <div className="h-20 border-b border-card-border flex items-center justify-between px-8 bg-sidebar/30 backdrop-blur-md">
                  <div className="flex items-center space-x-4">
                    <button
                      onClick={handlePreviousPage}
                      disabled={pageNumber <= 1}
                      className="p-3 bg-white/5 border border-card-border rounded-xl text-hub-muted hover:text-blue-500 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                      title="Página Anterior"
                    >
                      <ChevronLeft size={20} />
                    </button>
                    <span className="text-sm font-bold text-hub-text">
                      Página {pageNumber} de {numPages || '...'}
                    </span>
                    <button
                      onClick={handleNextPage}
                      disabled={pageNumber >= (numPages || 1)}
                      className="p-3 bg-white/5 border border-card-border rounded-xl text-hub-muted hover:text-blue-500 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                      title="Próxima Página"
                    >
                      <ChevronRight size={20} />
                    </button>
                  </div>

                  <div className="flex items-center space-x-3">
                    <button
                      onClick={handleZoomOut}
                      className="p-3 bg-white/5 border border-card-border rounded-xl text-hub-muted hover:text-blue-500 transition-all"
                      title="Diminuir Zoom"
                    >
                      <ZoomOut size={20} />
                    </button>
                    <span className="text-xs font-bold text-hub-muted min-w-[60px] text-center">
                      {Math.round(scale * 100)}%
                    </span>
                    <button
                      onClick={handleZoomIn}
                      className="p-3 bg-white/5 border border-card-border rounded-xl text-hub-muted hover:text-blue-500 transition-all"
                      title="Aumentar Zoom"
                    >
                      <ZoomIn size={20} />
                    </button>
                    <button
                      onClick={handleRemovePDF}
                      className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500 hover:bg-red-500 hover:text-white transition-all ml-4"
                      title="Remover PDF"
                    >
                      <CloseIcon size={20} />
                    </button>
                  </div>
                </div>

                {/* PDF Display */}
                <div className="flex-1 overflow-auto p-8 flex justify-center items-start bg-black/20">
                  <Document
                    file={pdfFile}
                    onLoadSuccess={onDocumentLoadSuccess}
                    className="shadow-2xl"
                  >
                    <PDFPage
                      pageNumber={pageNumber}
                      scale={scale}
                      className="border border-card-border rounded-lg"
                    />
                  </Document>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* MODAL DE CRIAÇÃO */}
      {modalState.isOpen && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-sidebar border border-card-border p-6 rounded-2xl w-full max-w-md shadow-2xl scale-100 animate-in zoom-in-95 duration-200">
            <h3 className="text-lg font-bold text-hub-text mb-4">
              {modalState.type === 'NOTEBOOK' && 'Novo Caderno'}
              {modalState.type === 'SECTION' && 'Nova Seção'}
              {modalState.type === 'PAGE' && 'Nova Página'}
            </h3>
            <input
              type="text"
              autoFocus
              className="w-full bg-black/20 border border-card-border rounded-xl p-3 text-hub-text outline-none focus:border-blue-500 transition-colors mb-6"
              placeholder="Digite o nome..."
              value={modalState.inputValue}
              onChange={(e) => setModalState(prev => ({ ...prev, inputValue: e.target.value }))}
              onKeyDown={(e) => e.key === 'Enter' && handleConfirmCreation()}
            />
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setModalState({ isOpen: false, type: null, inputValue: '' })}
                className="px-4 py-2 rounded-xl text-hub-muted hover:bg-white/5 transition-colors text-sm font-medium"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmCreation}
                className="px-6 py-2 rounded-xl bg-blue-600 text-white hover:bg-blue-500 transition-all text-sm font-bold shadow-lg shadow-blue-600/20"
              >
                Criar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE EXCLUSÃO */}
      {deleteModalState.isOpen && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-sidebar border border-card-border p-6 rounded-2xl w-full max-w-sm shadow-2xl scale-100 animate-in zoom-in-95 duration-200">
            <div className="flex items-center space-x-3 mb-4 text-red-500">
              <ShieldAlert size={24} />
              <h3 className="text-lg font-bold">Confirmar Exclusão</h3>
            </div>
            <p className="text-hub-muted text-sm mb-6">
              {deleteModalState.type === 'NOTEBOOK' && 'Tem certeza que deseja excluir este caderno? Todas as seções e páginas serão perdidas para sempre.'}
              {deleteModalState.type === 'SECTION' && 'Tem certeza que deseja excluir esta seção? Todas as páginas contidas nela serão perdidas.'}
              {deleteModalState.type === 'PAGE' && 'Tem certeza que deseja excluir esta página? Esta ação não pode ser desfeita.'}
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setDeleteModalState({ isOpen: false, type: null })}
                className="px-4 py-2 rounded-xl text-hub-muted hover:bg-white/5 transition-colors text-sm font-medium"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmDelete}
                className="px-6 py-2 rounded-xl bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-all text-sm font-bold shadow-lg shadow-red-500/10"
              >
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default KnowledgeModule;
