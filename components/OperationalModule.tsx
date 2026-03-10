import React, { useState, useRef, useEffect } from 'react';
import { X, Plus, MoreVertical, Globe, ExternalLink, Trash2, Edit2, LayoutGrid, Image as ImageIcon, Upload, GripVertical } from 'lucide-react';
import { Resource } from '../types';
import { useResources } from '../hooks/useResources';

const OperationalModule: React.FC = () => {
  const { resources: dbResources, addResource: dbAdd, removeResource: dbRemove, updateResources: dbUpdate, loading } = useResources();
  const [localResources, setLocalResources] = useState<Resource[]>([]);

  useEffect(() => {
    setLocalResources(dbResources);
  }, [dbResources]);

  const [showResourceModal, setShowResourceModal] = useState(false);
  const [newResTitle, setNewResTitle] = useState('');
  const [newResUrl, setNewResUrl] = useState('');
  const [newResCategory, setNewResCategory] = useState('Educação');
  const [newResImage, setNewResImage] = useState<string | null>(null);

  const [draggedItemIndex, setDraggedItemIndex] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewResImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const addResource = async () => {
    if (!newResTitle || !newResUrl) return;

    let formattedUrl = newResUrl;
    if (!/^https?:\/\//i.test(newResUrl)) {
      formattedUrl = 'https://' + newResUrl;
    }

    try {
      let finalImageUrl = newResImage;
      if (!finalImageUrl) {
        const hostname = new URL(formattedUrl).hostname;
        finalImageUrl = `https://logo.clearbit.com/${hostname}`;
      }

      const newRes: Resource = {
        id: Date.now().toString(),
        title: newResTitle,
        category: newResCategory,
        url: formattedUrl,
        imageUrl: finalImageUrl,
        order: localResources.length
      };

      await dbAdd(newRes);
      closeModal();
    } catch (e) {
      alert("Por favor, insira uma URL válida.");
    }
  };

  const closeModal = () => {
    setShowResourceModal(false);
    setNewResTitle('');
    setNewResUrl('');
    setNewResCategory('Educação');
    setNewResImage(null);
  };

  const removeResource = async (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (confirm('Tem certeza que deseja remover este atalho?')) {
      await dbRemove(id);
    }
  };

  const onDragStart = (e: React.DragEvent, index: number) => {
    setDraggedItemIndex(index);
    e.dataTransfer.effectAllowed = "move";
  };

  const onDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
  };

  const onDragEnter = (e: React.DragEvent, targetIndex: number) => {
    if (draggedItemIndex === null || draggedItemIndex === targetIndex) return;
    const newResources = [...localResources];
    const itemToMove = newResources.splice(draggedItemIndex, 1)[0];
    newResources.splice(targetIndex, 0, itemToMove);
    setDraggedItemIndex(targetIndex);
    setLocalResources(newResources);
  };

  const onDragEnd = () => {
    setDraggedItemIndex(null);
    dbUpdate(localResources);
  };

  if (loading && localResources.length === 0) {
    return <div className="p-10 text-center text-hub-muted animate-pulse">Carregando recursos...</div>;
  }

  return (
    <div className="space-y-6 pb-10 animate-in fade-in slide-in-from-bottom-4 duration-500">

      {/* HEADER & ACTIONS */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-card p-5 rounded-3xl border border-card-border shadow-xl">
        <div>
          <h2 className="text-xl font-bold text-hub-text flex items-center">
            <LayoutGrid className="mr-3 text-blue-500" size={20} />
            Hub de Recursos & Atalhos
          </h2>
          <p className="text-hub-muted text-xs mt-0.5">Organize seus sistemas favoritos arrastando os cards.</p>
        </div>
        <button
          onClick={() => setShowResourceModal(true)}
          className="flex items-center justify-center bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-lg shadow-blue-900/40 transition-all active:scale-95 group"
        >
          <Plus size={18} className="mr-2 group-hover:rotate-90 transition-transform" />
          Novo Atalho
        </button>
      </div>

      {/* RESOURCES GRID */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4">
        {localResources.map((res, index) => (
          <div
            key={res.id}
            className={`group relative transition-all duration-300 ${draggedItemIndex === index ? 'opacity-40 scale-95' : 'opacity-100'}`}
            draggable
            onDragStart={(e) => onDragStart(e, index)}
            onDragOver={(e) => onDragOver(e, index)}
            onDragEnter={(e) => onDragEnter(e, index)}
            onDragEnd={onDragEnd}
          >
            <a
              href={res.url}
              target="_blank"
              rel="noopener noreferrer"
              className="block h-full bg-card border border-card-border hover:border-blue-500/50 rounded-2xl overflow-hidden transition-all hover:shadow-xl hover:shadow-blue-900/10 hover:-translate-y-1 active:scale-95 flex flex-col cursor-pointer"
            >
              <div className="relative h-32 w-full overflow-hidden bg-app">
                <img
                  src={res.imageUrl}
                  alt={res.title}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                  onError={(e) => { (e.target as HTMLImageElement).src = 'https://api.dicebear.com/7.x/initials/svg?seed=' + res.title }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent opacity-70"></div>

                <div className="absolute top-2 left-2 bg-app/60 backdrop-blur-sm p-1 rounded-lg text-hub-muted opacity-0 group-hover:opacity-100 transition-opacity">
                  <GripVertical size={14} />
                </div>

                <div className="absolute top-2 right-2 flex space-x-1">
                  <div className="bg-app/80 backdrop-blur-md p-1.5 rounded-lg text-hub-muted group-hover:text-blue-500 transition-colors border border-card-border">
                    <ExternalLink size={14} />
                  </div>
                </div>
              </div>

              <div className="p-4 flex-1 flex flex-col">
                <div className="mb-2">
                  <span className="inline-block px-1.5 py-0.5 rounded bg-blue-600/10 text-blue-600 text-[9px] font-bold uppercase tracking-widest border border-blue-600/20">
                    {res.category}
                  </span>
                </div>

                <h4 className="text-hub-text font-bold text-sm mb-1.5 group-hover:text-blue-600 transition-colors line-clamp-1">
                  {res.title}
                </h4>

                <div className="mt-auto flex items-center text-hub-muted text-[10px] font-medium truncate opacity-60 group-hover:opacity-100 transition-opacity">
                  <Globe size={10} className="mr-1 flex-shrink-0" />
                  <span className="truncate">{res.url.replace(/^https?:\/\//, '')}</span>
                </div>
              </div>
            </a>

            <button
              onClick={(e) => removeResource(res.id, e)}
              className="absolute -top-1.5 -right-1.5 w-7 h-7 bg-red-600 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all shadow-xl hover:bg-red-500 z-10 border-2 border-app transform scale-75 group-hover:scale-100"
              title="Remover Link"
            >
              <Trash2 size={12} />
            </button>
          </div>
        ))}

        {localResources.length === 0 && (
          <button
            onClick={() => setShowResourceModal(true)}
            className="flex flex-col items-center justify-center h-48 border-2 border-dashed border-card-border rounded-2xl text-hub-muted hover:text-blue-500 hover:border-blue-500/50 hover:bg-blue-600/5 transition-all"
          >
            <Plus size={32} className="mb-2 opacity-20" />
            <span className="text-xs font-bold">Adicionar</span>
          </button>
        )}
      </div>

      {showResourceModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-card border border-card-border w-full max-w-md rounded-3xl p-8 shadow-2xl animate-in zoom-in duration-200 overflow-y-auto max-h-[95vh]">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-2xl font-bold text-hub-text">Novo Atalho</h3>
              <button
                onClick={closeModal}
                className="text-hub-muted hover:text-hub-text transition-colors p-1"
              >
                <X size={24} />
              </button>
            </div>

            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-xs font-bold text-blue-500 uppercase tracking-widest block">Imagem de Capa</label>
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="relative group cursor-pointer aspect-video bg-app rounded-2xl border-2 border-dashed border-card-border flex flex-col items-center justify-center overflow-hidden hover:border-blue-600 transition-all shadow-inner"
                >
                  {newResImage ? (
                    <>
                      <img src={newResImage} className="w-full h-full object-cover" alt="Preview" />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                        <Upload className="text-white" size={32} />
                      </div>
                    </>
                  ) : (
                    <div className="flex flex-col items-center text-hub-muted group-hover:text-blue-600 transition-colors px-6 text-center">
                      <ImageIcon size={32} className="mb-2 opacity-20 group-hover:opacity-100" />
                      <span className="text-xs font-semibold">Selecione uma imagem para o card</span>
                      <span className="text-xs opacity-40 mt-1 italic">Recomendado: 800x400px</span>
                    </div>
                  )}
                  <input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    accept="image/*"
                    onChange={handleImageUpload}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-blue-500 uppercase tracking-widest block">Título</label>
                <input
                  autoFocus
                  className="w-full bg-app border border-card-border rounded-xl p-4 text-hub-text focus:ring-2 focus:ring-blue-600 focus:outline-none transition-all placeholder-hub-muted"
                  placeholder="Ex: Portal do Aluno"
                  value={newResTitle}
                  onChange={(e) => setNewResTitle(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-blue-500 uppercase tracking-widest block">Endereço (URL)</label>
                <div className="relative">
                  <Globe className="absolute left-4 top-1/2 -translate-y-1/2 text-hub-muted" size={18} />
                  <input
                    className="w-full bg-app border border-card-border rounded-xl p-4 pl-12 text-hub-text focus:ring-2 focus:ring-blue-600 focus:outline-none transition-all placeholder-hub-muted"
                    placeholder="https://meusite.com"
                    value={newResUrl}
                    onChange={(e) => setNewResUrl(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-blue-500 uppercase tracking-widest block">Categoria</label>
                <select
                  className="w-full bg-app border border-card-border rounded-xl p-4 text-hub-text focus:ring-2 focus:ring-blue-600 focus:outline-none transition-all appearance-none cursor-pointer"
                  value={newResCategory}
                  onChange={(e) => setNewResCategory(e.target.value)}
                >
                  <option value="Educação">Educação</option>
                  <option value="Profissional">Profissional</option>
                  <option value="Concursos">Concursos</option>
                  <option value="Dados">Dados</option>
                  <option value="Sistemas">Sistemas</option>
                  <option value="Geral">Geral</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mt-10">
              <button
                onClick={closeModal}
                className="py-3 text-hub-muted hover:text-hub-text font-bold transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={addResource}
                className="bg-blue-600 text-white py-4 rounded-2xl font-bold hover:bg-blue-500 shadow-xl shadow-blue-900/40 transition-all active:scale-95"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OperationalModule;
