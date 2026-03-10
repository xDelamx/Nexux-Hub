
import React, { useState, useEffect, useRef } from 'react';
import {
  LayoutDashboard,
  CheckSquare,
  ShieldAlert,
  Menu,
  X,
  Bell,
  Search,
  User,
  Sun,
  Moon,
  Palette,
  Check,
  Image as ImageIcon,
  Layers,
  Square,
  Book
} from 'lucide-react';
import { ViewType, ThemeConfig, Task, TaskStatus, TaskPriority } from './types';
import DashboardModule from './components/DashboardModule';
import TaskModule from './components/TaskModule';
import OperationalModule from './components/OperationalModule';
import KnowledgeModule from './components/KnowledgeModule';
import AuthScreen from './components/AuthScreen';
import { useAuth } from './contexts/AuthContext';
import { useTasks } from './hooks/useTasks';
import { useTheme } from './hooks/useTheme';

const PRESET_THEMES: ThemeConfig[] = [
  { id: 'midnight', name: 'Midnight Blue', mode: 'dark', backgroundType: 'solid', backgroundValue: '#001122', accentColor: '#3b82f6', glassOpacity: 0.8 },
  { id: 'arctic', name: 'Arctic White', mode: 'light', backgroundType: 'solid', backgroundValue: '#f8fafc', accentColor: '#2563eb', glassOpacity: 0.9 },
  { id: 'aurora', name: 'Aurora Borealis', mode: 'dark', backgroundType: 'gradient', backgroundValue: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #312e81 100%)', accentColor: '#818cf8', glassOpacity: 0.7 },
  { id: 'nebula', name: 'Cyber Nebula', mode: 'dark', backgroundType: 'gradient', backgroundValue: 'linear-gradient(to right bottom, #000000, #0a0118, #110128, #15003a, #15004d)', accentColor: '#c084fc', glassOpacity: 0.6 },
  { id: 'serene', name: 'Serene Mountain', mode: 'dark', backgroundType: 'image', backgroundValue: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&q=80&w=1920', accentColor: '#10b981', glassOpacity: 0.75 },
  { id: 'tech', name: 'Modern Tech', mode: 'dark', backgroundType: 'image', backgroundValue: 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&q=80&w=1920', accentColor: '#0ea5e9', glassOpacity: 0.85 },
];

const App: React.FC = () => {
  const [activeView, setActiveView] = useState<ViewType>('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isThemePanelOpen, setIsThemePanelOpen] = useState(false);

  // User State
  const { user, loading: authLoading, signOut } = useAuth();
  const { tasks, addTask, updateTask, removeTask } = useTasks();
  const { currentTheme, updateTheme, loading: themeLoading } = useTheme();





  if (authLoading || themeLoading) {
    return <div className="flex items-center justify-center h-screen bg-[#001122] text-white">Carregando...</div>;
  }

  if (!user) {
    return <AuthScreen />;
  }


  const navigation = [
    { id: 'dashboard', name: 'Dashboard', icon: LayoutDashboard },
    { id: 'knowledge', name: 'Notas & Estudo', icon: Book },
    { id: 'tasks', name: 'Tarefas', icon: CheckSquare },
    { id: 'operations', name: 'Recursos', icon: ShieldAlert },
  ];

  const applyThemeStyle = () => {
    const style: React.CSSProperties = {
      transition: 'background 0.5s ease'
    };

    if (currentTheme.backgroundType === 'image') {
      style.backgroundImage = `url(${currentTheme.backgroundValue})`;
      style.backgroundSize = 'cover';
      style.backgroundPosition = 'center';
      style.backgroundRepeat = 'no-repeat';
      style.backgroundAttachment = 'fixed';
    } else {
      style.background = currentTheme.backgroundValue;
    }

    return style;
  };



  return (
    <div
      className={`flex h-screen text-hub-text theme-transition overflow-hidden ${currentTheme.mode === 'light' ? 'light-theme' : ''}`}
      style={applyThemeStyle()}
    >
      <div className="fixed inset-0 pointer-events-none bg-black/10 z-0"></div>

      <aside
        style={{ backgroundColor: `rgba(var(--sidebar-rgb), ${currentTheme.glassOpacity})` }}
        className={`fixed inset-y-0 left-0 z-50 w-64 backdrop-blur-xl border-r border-card-border transform transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <div className="flex items-center justify-between h-20 px-6">
          <span className="text-2xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-500">
            NEXUS HUB
          </span>
          <button onClick={() => setIsSidebarOpen(false)} className="lg:hidden text-hub-muted">
            <X size={24} />
          </button>
        </div>

        <nav className="mt-6 px-4 space-y-2">
          {navigation.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveView(item.id as ViewType);
                  setIsSidebarOpen(false);
                }}
                className={`flex items-center w-full px-4 py-3 rounded-xl transition-all ${activeView === item.id
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                  : 'text-hub-muted hover:bg-white/5 hover:text-hub-text'
                  }`}
              >
                <Icon size={20} className="mr-3" />
                <span className="font-semibold">{item.name}</span>
              </button>
            );
          })}
        </nav>

        <div className="absolute bottom-0 w-full p-6 border-t border-card-border bg-black/5">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500 shadow-lg shadow-blue-500/20 flex items-center justify-center text-white font-bold">
              JD
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-bold truncate">{user?.displayName || user?.email || 'Usuário'}</p>
              <button onClick={() => signOut()} className="text-[10px] text-hub-muted uppercase font-black tracking-widest hover:text-red-400 transition-colors text-left">
                Sair / Logout
              </button>
            </div>
          </div>
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative z-10">
        <header
          style={{ backgroundColor: `rgba(var(--sidebar-rgb), ${currentTheme.glassOpacity})` }}
          className="h-20 backdrop-blur-xl border-b border-card-border flex items-center justify-between px-6 sticky top-0 z-40"
        >
          <div className="flex items-center">
            <button onClick={() => setIsSidebarOpen(true)} className="lg:hidden p-2 text-hub-muted mr-4">
              <Menu size={24} />
            </button>
            <h2 className="text-xl font-black capitalize tracking-tight">{activeView.replace('-', ' ')}</h2>
          </div>

          <div className="flex items-center space-x-3">
            <div className="hidden md:flex items-center bg-black/20 border border-card-border rounded-xl px-4 py-2 group focus-within:border-blue-500/50 transition-all">
              <Search size={18} className="text-hub-muted group-focus-within:text-blue-500 transition-colors mr-2" />
              <input
                type="text"
                placeholder="Pesquisar..."
                className="bg-transparent border-none focus:ring-0 text-sm placeholder-hub-muted w-48 text-hub-text"
              />
            </div>

            <button
              onClick={() => setIsThemePanelOpen(true)}
              className="p-3 bg-blue-600/10 border border-blue-500/20 rounded-xl text-blue-500 hover:bg-blue-600 hover:text-white transition-all shadow-lg active:scale-95 flex items-center"
              title="Personalizar Tema"
            >
              <Palette size={20} />
            </button>

            <button className="p-3 bg-white/5 border border-card-border rounded-xl text-hub-muted hover:text-hub-text transition-all relative">
              <Bell size={20} />
              <span className="absolute top-3 right-3 w-2 h-2 bg-red-500 rounded-full border-2 border-app"></span>
            </button>
            <button className="hidden sm:flex p-3 bg-white/5 border border-card-border rounded-xl text-hub-muted hover:text-hub-text transition-all">
              <User size={20} />
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 md:p-8 scroll-smooth">
          <div className="max-w-7xl mx-auto h-full">
            {activeView === 'dashboard' && <DashboardModule tasks={tasks} />}
            {activeView === 'tasks' && (
              <TaskModule
                tasks={tasks}
                onAddTask={addTask}
                onUpdateTask={updateTask}
                onDeleteTask={removeTask}
              />
            )}
            {activeView === 'knowledge' && <KnowledgeModule />}
            {activeView === 'operations' && <OperationalModule />}
          </div>
        </div>
      </main>

      {isThemePanelOpen && (
        <div className="fixed inset-0 z-[100] flex justify-end">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsThemePanelOpen(false)}></div>

          <div className="relative w-full max-w-md h-full bg-sidebar border-l border-card-border shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
            <div className="p-6 border-b border-card-border flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Palette className="text-blue-500" size={24} />
                <h3 className="text-xl font-black">Personalização</h3>
              </div>
              <button onClick={() => setIsThemePanelOpen(false)} className="text-hub-muted hover:text-white p-2">
                <X size={24} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-10">
              <section className="space-y-4">
                <h4 className="text-xs font-black uppercase tracking-[0.2em] text-blue-500">Temas Prontos</h4>
                <div className="grid grid-cols-2 gap-3">
                  {PRESET_THEMES.map(theme => (
                    <button
                      key={theme.id}
                      onClick={() => updateTheme(theme)}
                      className={`relative group h-24 rounded-2xl border-2 transition-all overflow-hidden ${currentTheme.id === theme.id ? 'border-blue-500 scale-95 shadow-lg shadow-blue-500/20' : 'border-card-border hover:border-blue-500/40'
                        }`}
                      style={theme.backgroundType === 'image'
                        ? { backgroundImage: `url(${theme.backgroundValue})`, backgroundSize: 'cover' }
                        : { background: theme.backgroundValue }}
                    >
                      <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                        <span className="text-white text-xs font-bold px-2 text-center">{theme.name}</span>
                      </div>
                      {currentTheme.id === theme.id && (
                        <div className="absolute top-2 right-2 bg-blue-500 text-white p-1 rounded-full shadow-lg">
                          <Check size={12} />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </section>

              <section className="space-y-4">
                <h4 className="text-xs font-black uppercase tracking-[0.2em] text-blue-500">Estilo de Fundo</h4>
                <div className="flex space-x-2">
                  {[
                    { id: 'solid', icon: Square, label: 'Sólido' },
                    { id: 'gradient', icon: Layers, label: 'Gradiente' },
                    { id: 'image', icon: ImageIcon, label: 'Imagem' }
                  ].map(type => (
                    <button
                      key={type.id}
                      onClick={() => updateTheme({ backgroundType: type.id as any, id: 'custom' })}
                      className={`flex-1 flex flex-col items-center justify-center py-4 rounded-xl border transition-all ${currentTheme.backgroundType === type.id ? 'bg-blue-600/10 border-blue-500 text-blue-500' : 'bg-white/5 border-card-border text-hub-muted'
                        }`}
                    >
                      <type.icon size={20} className="mb-2" />
                      <span className="text-[10px] font-bold uppercase tracking-widest">{type.label}</span>
                    </button>
                  ))}
                </div>
              </section>

              <section className="space-y-4">
                <h4 className="text-xs font-black uppercase tracking-[0.2em] text-blue-500">Configuração</h4>

                {currentTheme.backgroundType === 'solid' && (
                  <div className="space-y-4">
                    <label className="text-sm font-medium">Cor de Fundo</label>
                    <div className="flex items-center space-x-4">
                      <input
                        type="color"
                        value={currentTheme.backgroundValue.startsWith('#') ? currentTheme.backgroundValue : '#001122'}
                        onChange={(e) => updateTheme({ backgroundValue: e.target.value, id: 'custom' })}
                        className="w-12 h-12 bg-transparent border-none cursor-pointer"
                      />
                      <span className="text-hub-muted font-mono">{currentTheme.backgroundValue}</span>
                    </div>
                  </div>
                )}

                {currentTheme.backgroundType === 'gradient' && (
                  <div className="space-y-4">
                    <label className="text-sm font-medium">Definição do Gradiente</label>
                    <textarea
                      className="w-full bg-black/20 border border-card-border rounded-xl p-3 text-xs font-mono text-hub-muted focus:ring-1 focus:ring-blue-500 outline-none"
                      rows={3}
                      value={currentTheme.backgroundValue}
                      onChange={(e) => updateTheme({ backgroundValue: e.target.value, id: 'custom' })}
                    />
                  </div>
                )}

                {currentTheme.backgroundType === 'image' && (
                  <div className="space-y-4">
                    <label className="text-sm font-medium">URL da Imagem</label>
                    <input
                      type="text"
                      placeholder="https://exemplo.com/imagem.jpg"
                      className="w-full bg-app border border-card-border rounded-xl p-3 text-sm focus:ring-1 focus:ring-blue-500 outline-none"
                      value={currentTheme.backgroundValue.startsWith('http') ? currentTheme.backgroundValue : ''}
                      onChange={(e) => updateTheme({ backgroundValue: e.target.value, id: 'custom' })}
                    />
                    <div className="p-3 bg-blue-500/5 rounded-xl border border-blue-500/10">
                      <p className="text-[10px] text-blue-400 italic">Dica: Use links do Unsplash ou Pexels para melhores resultados.</p>
                    </div>
                  </div>
                )}
              </section>

              <section className="space-y-4">
                <div className="flex justify-between items-center">
                  <h4 className="text-xs font-black uppercase tracking-[0.2em] text-blue-500">Transparência UI</h4>
                  <span className="text-xs font-bold text-hub-muted">{Math.round(currentTheme.glassOpacity * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0.1"
                  max="0.95"
                  step="0.05"
                  className="w-full h-2 bg-black/20 rounded-lg appearance-none cursor-pointer accent-blue-500"
                  value={currentTheme.glassOpacity}
                  onChange={(e) => updateTheme({ glassOpacity: parseFloat(e.target.value) })}
                />
              </section>

              <section className="space-y-4">
                <h4 className="text-xs font-black uppercase tracking-[0.2em] text-blue-500">Modo de Interface</h4>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => updateTheme({ mode: 'dark' })}
                    className={`flex items-center justify-center py-3 rounded-xl border transition-all ${currentTheme.mode === 'dark' ? 'bg-blue-600/10 border-blue-500 text-blue-500' : 'bg-white/5 border-card-border text-hub-muted'
                      }`}
                  >
                    <Moon size={18} className="mr-2" /> <span className="text-xs font-bold">DARK</span>
                  </button>
                  <button
                    onClick={() => updateTheme({ mode: 'light' })}
                    className={`flex items-center justify-center py-3 rounded-xl border transition-all ${currentTheme.mode === 'light' ? 'bg-blue-600/10 border-blue-500 text-blue-500' : 'bg-white/5 border-card-border text-hub-muted'
                      }`}
                  >
                    <Sun size={18} className="mr-2" /> <span className="text-xs font-bold">LIGHT</span>
                  </button>
                </div>
              </section>
            </div>

            <div className="p-6 border-t border-card-border bg-black/5">
              <button
                onClick={() => setIsThemePanelOpen(false)}
                className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-black shadow-xl shadow-blue-600/30 transition-all active:scale-95"
              >
                APLICAR ALTERAÇÕES
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
