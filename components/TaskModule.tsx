
import React, { useState } from 'react';
import {
  Plus, Clock, CheckCircle2, Circle, Play, X, GripVertical,
  Flag, Calendar, Archive, Trash2, RotateCcw, ChevronDown, ChevronUp
} from 'lucide-react';
import { Task, TaskStatus, TaskPriority } from '../types';

interface TaskModuleProps {
  tasks: Task[];
  onAddTask: (task: Task) => void;
  onUpdateTask: (id: string, updates: Partial<Task>) => void;
  onDeleteTask: (id: string) => void;
}

const TaskModule: React.FC<TaskModuleProps> = ({ tasks, onAddTask, onUpdateTask, onDeleteTask }) => {
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDesc, setNewTaskDesc] = useState('');
  const [newTaskCategory, setNewTaskCategory] = useState('Geral');
  const [newTaskPriority, setNewTaskPriority] = useState<TaskPriority>(TaskPriority.MEDIUM);
  const [newTaskDueDate, setNewTaskDueDate] = useState('');
  const [newTaskEstTime, setNewTaskEstTime] = useState('30');
  const [showModal, setShowModal] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);

  const updateStatus = (id: string, newStatus: TaskStatus) => {
    const task = tasks.find(t => t.id === id);
    if (!task) return;

    const updates: Partial<Task> = { status: newStatus };
    if (newStatus === TaskStatus.IN_PROGRESS && !task.startedAt) {
      updates.startedAt = Date.now();
    } else if (newStatus === TaskStatus.DONE) {
      updates.completedAt = Date.now();
      if (task.startedAt) {
        updates.minutesSpent = Math.max(1, Math.floor((Date.now() - task.startedAt) / 60000));
      } else {
        updates.minutesSpent = task.estimatedMinutes || 15;
      }
    } else if (newStatus === TaskStatus.PENDING) {
      updates.startedAt = undefined as any; // Firestore deleteField if needed, or just undefined
      updates.completedAt = undefined as any;
      updates.minutesSpent = undefined as any;
    }

    onUpdateTask(id, updates);
  };

  const archiveTask = (id: string) => {
    onUpdateTask(id, { isArchived: true });
  };

  const unarchiveTask = (id: string) => {
    onUpdateTask(id, { isArchived: false });
  };

  const deleteTask = (id: string) => {
    if (confirm('Tem certeza que deseja excluir permanentemente esta tarefa? Os dados sumirão do dashboard.')) {
      onDeleteTask(id);
    }
  };

  const addTask = () => {
    if (!newTaskTitle) return;
    const newTask: Task = {
      id: Date.now().toString(),
      title: newTaskTitle,
      description: newTaskDesc || 'Sem descrição adicional.',
      status: TaskStatus.PENDING,
      priority: newTaskPriority,
      category: newTaskCategory,
      estimatedMinutes: parseInt(newTaskEstTime) || 0,
      createdAt: Date.now(),
      dueDate: newTaskDueDate ? new Date(newTaskDueDate).getTime() : undefined,
      isArchived: false
    };

    onAddTask(newTask);
    resetForm();
    setShowModal(false);
  };

  const resetForm = () => {
    setNewTaskTitle('');
    setNewTaskDesc('');
    setNewTaskCategory('Geral');
    setNewTaskPriority(TaskPriority.MEDIUM);
    setNewTaskDueDate('');
    setNewTaskEstTime('30');
  };

  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDraggedTaskId(id);
    e.dataTransfer.setData('taskId', id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, targetStatus: TaskStatus) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData('taskId');
    if (taskId) {
      updateStatus(taskId, targetStatus);
    }
    setDraggedTaskId(null);
  };

  const getPriorityColor = (priority: TaskPriority) => {
    switch (priority) {
      case TaskPriority.HIGH: return 'text-red-500 bg-red-500/10 border-red-500/20';
      case TaskPriority.MEDIUM: return 'text-amber-500 bg-amber-500/10 border-amber-500/20';
      case TaskPriority.LOW: return 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20';
      default: return 'text-hub-muted bg-hub-muted/10 border-hub-muted/20';
    }
  };

  const formatDate = (timestamp?: number) => {
    if (!timestamp) return '';
    return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit' }).format(new Date(timestamp));
  };

  const activeTasks = tasks.filter(t => !t.isArchived);
  const archivedTasks = tasks.filter(t => t.isArchived);

  return (
    <div className="space-y-6 pb-12">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-hub-text">Quadro de Tarefas</h2>
          <p className="text-hub-muted text-xs">Gerencie suas atividades operacionais e prioridades.</p>
        </div>
        <div className="flex space-x-3">
          {archivedTasks.length > 0 && (
            <button
              onClick={() => setShowArchived(!showArchived)}
              className="flex items-center px-4 py-2.5 rounded-xl border border-card-border text-hub-muted hover:text-hub-text hover:bg-white/5 transition-all text-sm font-bold"
            >
              {showArchived ? <ChevronUp size={16} className="mr-2" /> : <Archive size={16} className="mr-2" />}
              {showArchived ? 'Ocultar Arquivo' : `Ver Arquivo (${archivedTasks.length})`}
            </button>
          )}
          <button
            onClick={() => setShowModal(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl flex items-center shadow-lg shadow-blue-600/20 transition-all active:scale-95 font-bold"
          >
            <Plus size={18} className="mr-2" /> Nova Tarefa
          </button>
        </div>
      </div>

      {/* QUADRO KANBAN */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[TaskStatus.PENDING, TaskStatus.IN_PROGRESS, TaskStatus.DONE].map((status) => (
          <div
            key={status}
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, status)}
            className="bg-card/40 border border-card-border rounded-3xl p-4 flex flex-col h-[calc(100vh-16rem)] shadow-sm transition-colors"
          >
            <div className="flex items-center justify-between mb-5 px-2">
              <h3 className="font-black text-[11px] uppercase tracking-[0.15em] text-hub-muted flex items-center">
                {status === TaskStatus.PENDING && <Circle size={14} className="text-amber-500 mr-2" />}
                {status === TaskStatus.IN_PROGRESS && <Play size={14} className="text-blue-500 mr-2" />}
                {status === TaskStatus.DONE && <CheckCircle2 size={14} className="text-emerald-500 mr-2" />}
                {status === TaskStatus.PENDING ? 'Pendente' : status === TaskStatus.IN_PROGRESS ? 'Em Andamento' : 'Concluído'}
              </h3>
              <span className="bg-white/10 text-[10px] font-bold px-2 py-0.5 rounded-full text-hub-muted border border-card-border">
                {activeTasks.filter(t => t.status === status).length}
              </span>
            </div>

            <div className="space-y-4 overflow-y-auto flex-1 pr-1 custom-scrollbar">
              {activeTasks.filter(t => t.status === status).map((task) => (
                <div
                  key={task.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, task.id)}
                  onDragEnd={() => setDraggedTaskId(null)}
                  className={`bg-card border border-card-border rounded-2xl p-4 hover:border-blue-500/50 transition-all shadow-sm animate-task-entry group cursor-grab active:cursor-grabbing ${draggedTaskId === task.id ? 'opacity-30 scale-95 border-blue-500' : 'opacity-100'}`}
                >
                  <div className="flex justify-between items-center mb-3">
                    <div className="flex gap-2">
                      <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-blue-600/10 text-blue-500 uppercase tracking-widest border border-blue-600/10">
                        {task.category}
                      </span>
                      <span className={`text-[9px] font-black px-1.5 py-0.5 rounded uppercase tracking-widest border flex items-center ${getPriorityColor(task.priority)}`}>
                        <Flag size={8} className="mr-1" />
                        {task.priority === TaskPriority.HIGH ? 'Alta' : task.priority === TaskPriority.MEDIUM ? 'Média' : 'Baixa'}
                      </span>
                    </div>
                    <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => archiveTask(task.id)}
                        className="p-1 text-hub-muted hover:text-amber-500 transition-colors"
                        title="Arquivar"
                      >
                        <Archive size={14} />
                      </button>
                      <button
                        onClick={() => deleteTask(task.id)}
                        className="p-1 text-hub-muted hover:text-red-500 transition-colors"
                        title="Excluir Permanentemente"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                  <h4 className="font-bold text-hub-text mb-1 leading-tight">{task.title}</h4>
                  <p className="text-xs text-hub-muted mb-4 line-clamp-2 leading-relaxed">{task.description}</p>

                  <div className="flex items-center justify-between mt-auto pt-3 border-t border-card-border/50">
                    <div className="flex items-center space-x-1.5">
                      {status === TaskStatus.PENDING && (
                        <button
                          onClick={() => updateStatus(task.id, TaskStatus.IN_PROGRESS)}
                          className="p-1.5 bg-blue-600/10 text-blue-500 rounded-lg hover:bg-blue-600 hover:text-white transition-all"
                        >
                          <Play size={14} />
                        </button>
                      )}
                      {(status === TaskStatus.PENDING || status === TaskStatus.IN_PROGRESS) && (
                        <button
                          onClick={() => updateStatus(task.id, TaskStatus.DONE)}
                          className="p-1.5 bg-emerald-600/10 text-emerald-500 rounded-lg hover:bg-emerald-600 hover:text-white transition-all"
                        >
                          <CheckCircle2 size={14} />
                        </button>
                      )}

                      {task.dueDate && (
                        <div className="flex items-center text-[10px] text-hub-muted bg-white/5 px-2 py-1 rounded-lg border border-card-border">
                          <Calendar size={10} className="mr-1 opacity-60" />
                          {formatDate(task.dueDate)}
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col items-end">
                      {status === TaskStatus.DONE ? (
                        <div className="flex items-center text-emerald-500 text-[10px] font-black tracking-wider">
                          <CheckCircle2 size={10} className="mr-1" />
                          {task.minutesSpent} MIN
                        </div>
                      ) : (
                        task.estimatedMinutes && (
                          <div className="flex items-center text-hub-muted text-[10px] font-bold">
                            <Clock size={10} className="mr-1" />
                            {task.estimatedMinutes}m
                          </div>
                        )
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* ARQUIVO (Expansível) */}
      {showArchived && (
        <div className="mt-12 bg-black/10 rounded-3xl p-6 border border-card-border border-dashed animate-in fade-in slide-in-from-top-4">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-black text-hub-muted flex items-center uppercase tracking-widest">
              <Archive size={18} className="mr-3" /> Tarefas Arquivadas
            </h3>
            <span className="text-xs text-hub-muted italic">Dados destas tarefas continuam aparecendo no Dashboard.</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {archivedTasks.map(task => (
              <div key={task.id} className="bg-card border border-card-border rounded-xl p-4 opacity-70 hover:opacity-100 transition-opacity group">
                <div className="flex justify-between items-start mb-2">
                  <span className="text-[8px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded bg-white/5 text-hub-muted border border-card-border">
                    {task.status === TaskStatus.DONE ? 'Concluída' : 'Não finalizada'}
                  </span>
                  <div className="flex space-x-1">
                    <button
                      onClick={() => unarchiveTask(task.id)}
                      className="p-1 hover:text-emerald-500 transition-colors"
                      title="Restaurar para o quadro"
                    >
                      <RotateCcw size={14} />
                    </button>
                    <button
                      onClick={() => deleteTask(task.id)}
                      className="p-1 hover:text-red-500 transition-colors"
                      title="Excluir"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
                <h5 className="text-sm font-bold text-hub-text truncate">{task.title}</h5>
                <p className="text-[10px] text-hub-muted line-clamp-1 mb-2">{task.description}</p>
                {task.minutesSpent && (
                  <div className="text-[9px] font-black text-emerald-500 flex items-center">
                    <CheckCircle2 size={10} className="mr-1" /> {task.minutesSpent} MIN REGISTRADOS
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MODAL NOVA TAREFA */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-card border border-card-border w-full max-w-lg rounded-3xl p-8 shadow-2xl animate-in zoom-in duration-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-2xl font-black text-hub-text">Nova Tarefa</h3>
              <button onClick={() => { setShowModal(false); resetForm(); }} className="text-hub-muted hover:text-hub-text p-1">
                <X size={24} />
              </button>
            </div>

            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-blue-500 uppercase tracking-[0.2em] flex items-center">
                  Título da Atividade
                </label>
                <input
                  type="text"
                  className="w-full bg-black/20 border border-card-border rounded-2xl p-4 text-hub-text focus:outline-none focus:ring-2 focus:ring-blue-600 transition-all placeholder-hub-muted"
                  placeholder="Ex: Auditoria de estoque mensal"
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  autoFocus
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-blue-500 uppercase tracking-[0.2em] flex items-center">
                    Prioridade
                  </label>
                  <select
                    value={newTaskPriority}
                    onChange={(e) => setNewTaskPriority(e.target.value as TaskPriority)}
                    className="w-full bg-black/20 border border-card-border rounded-2xl p-4 text-hub-text focus:outline-none focus:ring-2 focus:ring-blue-600 transition-all appearance-none cursor-pointer"
                  >
                    <option value={TaskPriority.LOW}>Baixa</option>
                    <option value={TaskPriority.MEDIUM}>Média</option>
                    <option value={TaskPriority.HIGH}>Alta</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-blue-500 uppercase tracking-[0.2em] flex items-center">
                    Categoria
                  </label>
                  <select
                    value={newTaskCategory}
                    onChange={(e) => setNewTaskCategory(e.target.value)}
                    className="w-full bg-black/20 border border-card-border rounded-2xl p-4 text-hub-text focus:outline-none focus:ring-2 focus:ring-blue-600 transition-all appearance-none cursor-pointer"
                  >
                    <option value="Geral">Geral</option>
                    <option value="Segurança">Segurança</option>
                    <option value="Admin">Admin</option>
                    <option value="Campo">Campo</option>
                    <option value="Logística">Logística</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-blue-500 uppercase tracking-[0.2em] flex items-center">
                    Data Limite (Opcional)
                  </label>
                  <input
                    type="date"
                    className="w-full bg-black/20 border border-card-border rounded-2xl p-4 text-hub-text focus:outline-none focus:ring-2 focus:ring-blue-600 transition-all"
                    value={newTaskDueDate}
                    onChange={(e) => setNewTaskDueDate(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-blue-500 uppercase tracking-[0.2em] flex items-center">
                    Estimativa (min)
                  </label>
                  <input
                    type="number"
                    className="w-full bg-black/20 border border-card-border rounded-2xl p-4 text-hub-text focus:outline-none focus:ring-2 focus:ring-blue-600 transition-all placeholder-hub-muted"
                    placeholder="30"
                    value={newTaskEstTime}
                    onChange={(e) => setNewTaskEstTime(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-blue-500 uppercase tracking-[0.2em] flex items-center">
                  Descrição Detalhada
                </label>
                <textarea
                  rows={3}
                  className="w-full bg-black/20 border border-card-border rounded-2xl p-4 text-hub-text focus:outline-none focus:ring-2 focus:ring-blue-600 transition-all placeholder-hub-muted resize-none leading-relaxed"
                  placeholder="Descreva os objetivos e requisitos da tarefa..."
                  value={newTaskDesc}
                  onChange={(e) => setNewTaskDesc(e.target.value)}
                />
              </div>
            </div>

            <div className="flex justify-end space-x-4 mt-8">
              <button
                onClick={() => { setShowModal(false); resetForm(); }}
                className="px-6 py-3 text-hub-muted hover:text-hub-text font-bold transition-colors"
              >
                Descartar
              </button>
              <button
                onClick={addTask}
                className="px-10 py-3 bg-blue-600 hover:bg-blue-500 rounded-2xl text-white font-black shadow-xl shadow-blue-600/30 transition-all transform active:scale-95"
              >
                Criar Tarefa
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TaskModule;
