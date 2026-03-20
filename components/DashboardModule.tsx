
import React, { useMemo, useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell } from 'recharts';
import { TrendingUp, Clock, CheckCircle, AlertCircle } from 'lucide-react';
import { Task, TaskStatus } from '../types';

interface DashboardProps {
  tasks: Task[];
}

const COLORS = ['#004488', '#0066cc', '#3399ff', '#66ccff', '#99ccff'];

interface Trend {
  percent: number;
  direction: 'up' | 'down';
}

const StatCard: React.FC<{ title: string; value: string | number; icon: React.ReactNode; color: string; trend?: Trend }> = ({ title, value, icon, trend }) => (
  <div className="bg-card border border-card-border p-6 rounded-2xl shadow-sm">
    <div className="flex items-center justify-between mb-4">
      <span className="text-hub-muted text-sm font-medium">{title}</span>
      <div className={`p-2 rounded-lg bg-blue-500/10 text-blue-500`}>
        {icon}
      </div>
    </div>
    <div className="flex items-baseline space-x-2">
      <span className="text-3xl font-bold text-hub-text">{value}</span>
      {trend && (
        <span className={`text-sm flex items-center font-medium ${
          trend.direction === 'up' ? 'text-emerald-500' : 'text-red-400'
        }`}>
          <TrendingUp size={14} className={`mr-1 ${trend.direction === 'down' ? 'rotate-180' : ''}`} />
          {trend.direction === 'up' ? '+' : '-'}{trend.percent}%
        </span>
      )}
    </div>
  </div>
);

const DashboardModule: React.FC<DashboardProps> = ({ tasks }) => {
  const [timeRange, setTimeRange] = useState<'weekly' | 'monthly'>('weekly');

  // Cálculo de métricas gerais com tendência comparando semana atual vs semana anterior
  const stats = useMemo(() => {
    const now = new Date();
    const startOfThisWeek = new Date(now);
    startOfThisWeek.setDate(now.getDate() - now.getDay());
    startOfThisWeek.setHours(0, 0, 0, 0);

    const startOfLastWeek = new Date(startOfThisWeek);
    startOfLastWeek.setDate(startOfThisWeek.getDate() - 7);

    const thisWeekTasks = tasks.filter(t => t.completedAt && t.completedAt >= startOfThisWeek.getTime());
    const lastWeekTasks = tasks.filter(t => t.completedAt && t.completedAt >= startOfLastWeek.getTime() && t.completedAt < startOfThisWeek.getTime());

    const calcTrend = (current: number, previous: number): Trend | undefined => {
      if (previous === 0) return undefined; // Sem dados anteriores, não exibe tendência
      const diff = current - previous;
      const percent = Math.round(Math.abs((diff / previous) * 100));
      if (percent === 0) return undefined;
      return { percent, direction: diff >= 0 ? 'up' : 'down' };
    };

    const totalMinutes = tasks.reduce((acc, t) => acc + (t.minutesSpent || 0), 0);
    const thisWeekMinutes = thisWeekTasks.reduce((acc, t) => acc + (t.minutesSpent || 0), 0);
    const lastWeekMinutes = lastWeekTasks.reduce((acc, t) => acc + (t.minutesSpent || 0), 0);

    const completed = tasks.filter(t => t.status === TaskStatus.DONE).length;
    const active = tasks.filter(t => t.status === TaskStatus.IN_PROGRESS).length;
    const pending = tasks.filter(t => t.status === TaskStatus.PENDING).length;

    return {
      totalMinutes,
      completed,
      active,
      pending,
      minutesTrend: calcTrend(thisWeekMinutes, lastWeekMinutes),
      completedTrend: calcTrend(thisWeekTasks.length, lastWeekTasks.length),
    };
  }, [tasks]);

  // Agrupamento de dados para o gráfico de área baseado no filtro selecionado
  const areaChartData = useMemo(() => {
    if (timeRange === 'weekly') {
      const days = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];
      return days.map((name, index) => {
        const dayTasks = tasks.filter(t => {
          if (!t.completedAt) return false;
          const d = new Date(t.completedAt).getDay();
          const adjustedDay = d === 0 ? 6 : d - 1; // Ajuste para Seg=0, Dom=6
          return adjustedDay === index;
        });

        return {
          name,
          minutos: dayTasks.reduce((acc, t) => acc + (t.minutesSpent || 0), 0),
          tasks: dayTasks.length
        };
      });
    } else {
      // Agrupamento Mensal por Semanas (Sem 1, Sem 2, Sem 3, Sem 4)
      const weeks = ['Sem 1', 'Sem 2', 'Sem 3', 'Sem 4'];
      const now = new Date();
      
      return weeks.map((name, index) => {
        const weekTasks = tasks.filter(t => {
          if (!t.completedAt) return false;
          const completionDate = new Date(t.completedAt);
          
          // Verifica se é o mês atual
          if (completionDate.getMonth() !== now.getMonth() || completionDate.getFullYear() !== now.getFullYear()) {
            return false;
          }

          const dayOfMonth = completionDate.getDate();
          const weekIndex = Math.floor((dayOfMonth - 1) / 7);
          return weekIndex === index || (index === 3 && weekIndex > 3); // Agrupa dias 22-31 na Sem 4
        });

        return {
          name,
          minutos: weekTasks.reduce((acc, t) => acc + (t.minutesSpent || 0), 0),
          tasks: weekTasks.length
        };
      });
    }
  }, [tasks, timeRange]);

  // Agrupamento por categoria para o gráfico de barras
  const categoryChartData = useMemo(() => {
    const categories: Record<string, number> = {};
    tasks.forEach(t => {
      categories[t.category] = (categories[t.category] || 0) + 1;
    });

    const total = tasks.length || 1;
    return Object.entries(categories).map(([name, count]) => ({
      name,
      value: Math.round((count / total) * 100)
    })).sort((a, b) => b.value - a.value);
  }, [tasks]);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Cards de Estatísticas Principais */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Total de Minutos" value={stats.totalMinutes} icon={<Clock size={20} />} color="blue" trend={stats.minutesTrend} />
        <StatCard title="Tarefas Concluídas" value={stats.completed} icon={<CheckCircle size={20} />} color="emerald" trend={stats.completedTrend} />
        <StatCard title="Tarefas em Andamento" value={stats.active} icon={<TrendingUp size={20} />} color="blue" />
        <StatCard title="Pendências" value={stats.pending} icon={<AlertCircle size={20} />} color="amber" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Gráfico Principal de Métricas */}
        <div className="lg:col-span-2 bg-card border border-card-border rounded-2xl p-6 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
            <h3 className="text-lg font-semibold text-hub-text">Métricas de Eficiência</h3>
            <div className="flex bg-app/50 p-1 rounded-xl border border-card-border">
              <button 
                onClick={() => setTimeRange('weekly')}
                className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${
                  timeRange === 'weekly' 
                    ? 'bg-blue-600 text-white shadow-lg' 
                    : 'text-hub-muted hover:text-hub-text'
                }`}
              >
                Semanal
              </button>
              <button 
                onClick={() => setTimeRange('monthly')}
                className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${
                  timeRange === 'monthly' 
                    ? 'bg-blue-600 text-white shadow-lg' 
                    : 'text-hub-muted hover:text-hub-text'
                }`}
              >
                Mensal
              </button>
            </div>
          </div>
          
          <div className="h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={areaChartData}>
                <defs>
                  <linearGradient id="colorMin" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.1)" vertical={false} />
                <XAxis 
                  dataKey="name" 
                  stroke="var(--color-text-muted)" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{fontSize: 11, fontWeight: 600}} 
                  dy={10} 
                />
                <YAxis 
                  stroke="var(--color-text-muted)" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{fontSize: 11}} 
                />
                <Tooltip 
                  labelStyle={{ color: 'var(--color-text-muted)', marginBottom: '4px', fontWeight: 'bold' }}
                  contentStyle={{ backgroundColor: 'var(--color-bg-card)', borderColor: 'var(--color-border)', borderRadius: '12px', backdropFilter: 'blur(8px)' }}
                  itemStyle={{ color: 'var(--color-text)', fontSize: '12px' }}
                  formatter={(value: any) => [`${value} min`, 'Esforço']}
                />
                <Area 
                  key={timeRange}
                  type="monotone" 
                  dataKey="minutos" 
                  stroke="#3b82f6" 
                  strokeWidth={3}
                  fillOpacity={1} 
                  fill="url(#colorMin)" 
                  animationDuration={1000}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          
          <div className="mt-4 flex items-center justify-center space-x-6 text-[10px] text-hub-muted font-bold uppercase tracking-widest">
            <div className="flex items-center">
              <div className="w-3 h-1 bg-blue-500 rounded-full mr-2"></div>
              Minutos Produzidos
            </div>
            <p className="italic opacity-60">* Baseado em tarefas concluídas</p>
          </div>
        </div>

        {/* Gráfico de Distribuição por Categoria */}
        <div className="bg-card border border-card-border rounded-2xl p-6 shadow-sm">
          <h3 className="text-lg font-semibold mb-8 text-hub-text">Alocação por Categoria</h3>
          <div className="h-[350px] w-full">
            {categoryChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={categoryChartData} layout="vertical">
                  <XAxis type="number" hide />
                  <YAxis dataKey="name" type="category" stroke="var(--color-text-muted)" axisLine={false} tickLine={false} width={85} tick={{fontSize: 10, fontWeight: 700}} />
                  <Tooltip 
                     cursor={{fill: 'rgba(59, 130, 246, 0.05)'}}
                     contentStyle={{ backgroundColor: 'var(--color-bg-card)', borderColor: 'var(--color-border)', borderRadius: '12px' }}
                     formatter={(value: any) => [`${value}%`, 'Volume']}
                  />
                  <Bar dataKey="value" radius={[0, 6, 6, 0]} barSize={20}>
                    {categoryChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-hub-muted text-center p-8">
                <AlertCircle size={32} className="mb-2 opacity-20" />
                <p className="text-sm">Sem dados de categorias disponíveis.</p>
              </div>
            )}
          </div>
          <div className="mt-4 space-y-3">
            {categoryChartData.slice(0, 4).map((item, i) => (
              <div key={item.name} className="flex items-center justify-between group">
                <div className="flex items-center">
                  <div className="w-2.5 h-2.5 rounded-sm mr-2.5" style={{ backgroundColor: COLORS[i % COLORS.length] }}></div>
                  <span className="text-xs text-hub-muted group-hover:text-hub-text transition-colors">{item.name}</span>
                </div>
                <span className="text-xs font-black text-hub-text">{item.value}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardModule;
