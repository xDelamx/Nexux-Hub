import React, { useState } from 'react';
import { User, Lock, Mail, ArrowRight, ShieldCheck, Zap, Key } from 'lucide-react';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';

const AuthScreen: React.FC = () => {
    const [isLogin, setIsLogin] = useState(true);
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        inviteCode: ''
    });
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setLoading(true);

        try {
            if (isLogin) {
                await signInWithEmailAndPassword(auth, formData.email, formData.password);
            } else {
                // Validate invite code first
                if (!formData.inviteCode) {
                    setError('O código de convite é obrigatório para cadastro.');
                    setLoading(false);
                    return;
                }

                const inviteRef = doc(db, 'invites', formData.inviteCode.trim().toUpperCase());
                const inviteSnap = await getDoc(inviteRef);

                if (!inviteSnap.exists() || !inviteSnap.data().valid) {
                    setError('Código de convite inválido ou já utilizado.');
                    setLoading(false);
                    return;
                }

                // Code is valid, create user
                const userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password);

                // Invalidate code
                await updateDoc(inviteRef, {
                    valid: false,
                    usedBy: userCredential.user.uid,
                    usedAt: new Date().toISOString()
                });

                if (formData.name) {
                    await updateProfile(userCredential.user, {
                        displayName: formData.name
                    });
                }
            }
        } catch (err: any) {
            console.error(err);
            if (err.code === 'auth/invalid-credential' || err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
                setError('Email ou senha incorretos.');
            } else if (err.code === 'auth/email-already-in-use') {
                setError('Este email já está em uso.');
            } else if (err.code === 'auth/weak-password') {
                setError('A senha é muito fraca.');
            } else {
                setError('Ocorreu um erro ao autenticar. Tente novamente.');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#001122] flex items-center justify-center p-4 relative overflow-hidden">
            {/* Background Effects */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-600/20 rounded-full blur-[120px] animate-pulse"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-purple-600/20 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '2s' }}></div>
            </div>

            <div className="w-full max-w-md bg-white/5 backdrop-blur-xl border border-white/10 p-8 rounded-3xl shadow-2xl z-10 relative">
                <div className="text-center mb-8">
                    <h1 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-500 mb-2">
                        NEXUS HUB
                    </h1>
                    <p className="text-blue-200/60 font-medium">Sua central de produtividade e conhecimento.</p>
                </div>

                <div className="flex bg-black/20 p-1 rounded-xl mb-8">
                    <button
                        onClick={() => { setIsLogin(true); setError(null); }}
                        className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${isLogin ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
                    >
                        Login
                    </button>
                    <button
                        onClick={() => { setIsLogin(false); setError(null); }}
                        className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${!isLogin ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
                    >
                        Cadastro
                    </button>
                </div>

                {error && (
                    <div className="mb-4 p-3 bg-red-500/20 border border-red-500/50 rounded-xl text-red-200 text-sm font-medium text-center">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    {!isLogin && (
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">Nome</label>
                            <div className="relative group">
                                <User className="absolute left-3 top-3 text-slate-500 group-focus-within:text-blue-500 transition-colors" size={20} />
                                <input
                                    type="text"
                                    required
                                    placeholder="Seu nome completo"
                                    className="w-full bg-black/20 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                />
                            </div>
                        </div>
                    )}

                    <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">Email</label>
                        <div className="relative group">
                            <Mail className="absolute left-3 top-3 text-slate-500 group-focus-within:text-blue-500 transition-colors" size={20} />
                            <input
                                type="email"
                                required
                                placeholder="seu@email.com"
                                className="w-full bg-black/20 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">Senha</label>
                        <div className="relative group">
                            <Lock className="absolute left-3 top-3 text-slate-500 group-focus-within:text-blue-500 transition-colors" size={20} />
                            <input
                                type="password"
                                required
                                placeholder="••••••••"
                                className="w-full bg-black/20 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                                value={formData.password}
                                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                            />
                        </div>
                    </div>

                    {!isLogin && (
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1 flex items-center justify-between">
                                Código de Convite
                                <span className="text-[10px] text-blue-400/70 font-normal normal-case tracking-normal">Obrigatório</span>
                            </label>
                            <div className="relative group">
                                <Key className="absolute left-3 top-3 text-slate-500 group-focus-within:text-blue-500 transition-colors" size={20} />
                                <input
                                    type="text"
                                    required
                                    placeholder="NEXUS-XXXXX"
                                    className="w-full bg-black/20 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all uppercase"
                                    value={formData.inviteCode}
                                    onChange={(e) => setFormData({ ...formData, inviteCode: e.target.value })}
                                />
                            </div>
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold py-4 rounded-xl shadow-lg shadow-blue-600/20 transform transition-all active:scale-[0.98] mt-4 flex items-center justify-center group disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? 'Processando...' : (isLogin ? 'Entrar na Plataforma' : 'Criar Conta com Convite')}
                        {!loading && <ArrowRight className="ml-2 group-hover:translate-x-1 transition-transform" size={20} />}
                    </button>
                </form>

                <div className="mt-8 pt-8 border-t border-white/5 flex items-center justify-center space-x-6 text-slate-500">
                    <div className="flex items-center space-x-2">
                        <ShieldCheck size={16} />
                        <span className="text-xs font-medium">Dados Seguros</span>
                    </div>
                    <div className="flex items-center space-x-2">
                        <Zap size={16} />
                        <span className="text-xs font-medium">Alta Performance</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AuthScreen;
