
import React, { useState, useRef, useEffect } from 'react';
import {
    Book,
    ChevronRight,
    ChevronDown,
    Plus,
    Trash2,
    FileText,
    Save,
    MoreVertical,
    FolderOpen
} from 'lucide-react';
import { Notebook, Section, Page } from '../types';

const NotebookModule: React.FC = () => {
    const [notebooks, setNotebooks] = useState<Notebook[]>([
        {
            id: 'nb1',
            title: 'Meu Caderno',
            sections: [
                {
                    id: 'sec1',
                    title: 'Geral',
                    pages: [
                        { id: 'page1', title: 'Bem-vindo', content: '<div>Comece suas anotações aqui...</div>' }
                    ]
                }
            ]
        }
    ]);

    const [activeNotebookId, setActiveNotebookId] = useState<string>('nb1');
    const [activeSectionId, setActiveSectionId] = useState<string>('sec1');
    const [activePageId, setActivePageId] = useState<string>('page1');
    const editorRef = useRef<HTMLDivElement>(null);

    // Helper to get active objects
    const activeNotebook = notebooks.find(n => n.id === activeNotebookId);
    const activeSection = activeNotebook?.sections.find(s => s.id === activeSectionId);
    const activePage = activeSection?.pages.find(p => p.id === activePageId);

    useEffect(() => {
        if (activePage && editorRef.current) {
            if (editorRef.current.innerHTML !== activePage.content) {
                editorRef.current.innerHTML = activePage.content;
            }
        } else if (editorRef.current) {
            editorRef.current.innerHTML = '';
        }
    }, [activePageId, activePage]);

    const handleCreateNotebook = () => {
        const title = prompt('Nome do novo caderno:');
        if (!title) return;
        const newId = Date.now().toString();
        setNotebooks([...notebooks, { id: newId, title, sections: [] }]);
        setActiveNotebookId(newId);
    };

    const handleCreateSection = () => {
        if (!activeNotebookId) return;
        const title = prompt('Nome da nova seção:');
        if (!title) return;
        const newSection: Section = { id: Date.now().toString(), title, pages: [] };
        setNotebooks(notebooks.map(nb =>
            nb.id === activeNotebookId
                ? { ...nb, sections: [...nb.sections, newSection] }
                : nb
        ));
        setActiveSectionId(newSection.id);
    };

    const handleCreatePage = () => {
        if (!activeNotebookId || !activeSectionId) return;
        const title = prompt('Título da página:');
        if (!title) return;
        const newPage: Page = { id: Date.now().toString(), title, content: '<div>...</div>' };
        setNotebooks(notebooks.map(nb =>
            nb.id === activeNotebookId
                ? {
                    ...nb,
                    sections: nb.sections.map(sec =>
                        sec.id === activeSectionId
                            ? { ...sec, pages: [...sec.pages, newPage] }
                            : sec
                    )
                }
                : nb
        ));
        setActivePageId(newPage.id);
    };

    const handleSavePage = () => {
        if (!activeNotebookId || !activeSectionId || !activePageId || !editorRef.current) return;
        const newContent = editorRef.current.innerHTML;
        setNotebooks(notebooks.map(nb =>
            nb.id === activeNotebookId
                ? {
                    ...nb,
                    sections: nb.sections.map(sec =>
                        sec.id === activeSectionId
                            ? {
                                ...sec,
                                pages: sec.pages.map(p =>
                                    p.id === activePageId ? { ...p, content: newContent } : p
                                )
                            }
                            : sec
                    )
                }
                : nb
        ));
    };

    const handleDeleteNotebook = (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        if (confirm('Tem certeza que deseja excluir este caderno?')) {
            setNotebooks(notebooks.filter(n => n.id !== id));
            if (activeNotebookId === id) setActiveNotebookId('');
        }
    }

    return (
        <div className="flex h-full gap-4 animate-in fade-in duration-500">
            {/* Sidebar - Notebooks & Sections Navigation */}
            <div className="w-80 flex flex-col gap-4">
                {/* Notebooks List */}
                <div className="bg-card border border-card-border rounded-2xl overflow-hidden flex flex-col max-h-[40%] shadow-lg">
                    <div className="p-4 bg-black/10 border-b border-card-border flex justify-between items-center">
                        <h3 className="font-bold text-hub-text flex items-center gap-2">
                            <Book size={18} className="text-blue-500" /> Cadernos
                        </h3>
                        <button onClick={handleCreateNotebook} className="p-1.5 hover:bg-blue-600/20 text-blue-500 rounded-lg transition-colors">
                            <Plus size={18} />
                        </button>
                    </div>
                    <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
                        {notebooks.map(nb => (
                            <div
                                key={nb.id}
                                onClick={() => setActiveNotebookId(nb.id)}
                                className={`group flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all border ${activeNotebookId === nb.id ? 'bg-blue-600/10 border-blue-500/50 text-blue-500' : 'border-transparent hover:bg-white/5 text-hub-muted hover:text-hub-text'}`}
                            >
                                <span className="font-semibold truncate">{nb.title}</span>
                                {activeNotebookId === nb.id && (
                                    <button onClick={(e) => handleDeleteNotebook(e, nb.id)} className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-500 transition-opacity">
                                        <Trash2 size={14} />
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Categories/Sections & Pages of Active Notebook */}
                <div className="flex-1 bg-card border border-card-border rounded-2xl overflow-hidden flex flex-col shadow-lg">
                    <div className="p-4 bg-black/10 border-b border-card-border flex justify-between items-center">
                        <h3 className="font-bold text-hub-text flex items-center gap-2">
                            <FolderOpen size={18} className="text-orange-500" /> Seções
                        </h3>
                        <button onClick={handleCreateSection} disabled={!activeNotebookId} className="p-1.5 hover:bg-orange-600/20 text-orange-500 rounded-lg transition-colors disabled:opacity-50">
                            <Plus size={18} />
                        </button>
                    </div>
                    <div className="flex-1 overflow-y-auto p-2 space-y-4 custom-scrollbar">
                        {activeNotebook ? (
                            activeNotebook.sections.map(sec => (
                                <div key={sec.id} className="space-y-1">
                                    <div
                                        onClick={() => setActiveSectionId(sec.id)}
                                        className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition-all ${activeSectionId === sec.id ? 'bg-white/10 text-hub-text font-bold' : 'text-hub-muted hover:text-hub-text'}`}
                                    >
                                        <span className="text-sm">{sec.title}</span>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); setActiveSectionId(sec.id); handleCreatePage(); }}
                                            className="p-1 hover:bg-white/10 rounded"
                                            title="Nova Página"
                                        >
                                            <Plus size={14} />
                                        </button>
                                    </div>

                                    {/* Pages List */}
                                    {sec.pages.length > 0 && (
                                        <div className="ml-3 pl-3 border-l border-card-border space-y-1">
                                            {sec.pages.map(page => (
                                                <div
                                                    key={page.id}
                                                    onClick={() => { setActiveSectionId(sec.id); setActivePageId(page.id); }}
                                                    className={`p-2 rounded-lg cursor-pointer text-xs flex items-center gap-2 transition-all ${activePageId === page.id ? 'bg-blue-600 text-white shadow-md' : 'text-hub-muted hover:bg-white/5'}`}
                                                >
                                                    <FileText size={12} />
                                                    <span className="truncate">{page.title}</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ))
                        ) : (
                            <div className="text-center p-4 text-hub-muted text-xs opacity-50">
                                Selecione um caderno
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Editor Area */}
            <div className="flex-1 bg-card border border-card-border rounded-2xl overflow-hidden flex flex-col shadow-2xl relative">
                {activePage ? (
                    <>
                        <div className="h-16 border-b border-card-border flex items-center justify-between px-6 bg-black/5 bg-opacity-50 backdrop-blur-sm z-10">
                            <h2 className="text-2xl font-black text-hub-text truncate">{activePage.title}</h2>
                            <button
                                onClick={handleSavePage}
                                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-xl font-bold transition-all active:scale-95 shadow-lg shadow-blue-900/20"
                            >
                                <Save size={18} /> Salvar
                            </button>
                        </div>
                        <div className="flex-1 p-8 overflow-y-auto">
                            <div
                                ref={editorRef}
                                contentEditable
                                className="w-full h-full outline-none prose prose-invert max-w-none text-lg leading-relaxed empty:before:content-['Digite_aqui...'] empty:before:text-gray-500"
                            />
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-hub-muted opacity-30">
                        <FileText size={64} className="mb-4" />
                        <p className="font-bold text-lg">Selecione uma página para editar</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default NotebookModule;
