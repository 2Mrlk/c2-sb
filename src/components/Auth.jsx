import { useState } from 'react';
import { supabase } from '../services/supabaseClient';

export default function Auth() {
  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [erro, setErro] = useState(null);
  const [aviso, setAviso] = useState(null);
  const [carregando, setCarregando] = useState(false);

  async function handleLogin(e) {
    e.preventDefault();
    setErro(null);
    setCarregando(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      if (error.message.includes('Invalid login credentials')) {
        setErro('E-mail ou senha incorretos. Verifique suas credenciais.');
      } else {
        setErro(error.message);
      }
    }
    setCarregando(false);
  }

  async function handleRegister(e) {
    e.preventDefault();
    setErro(null);
    setAviso(null);
    setCarregando(true);
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { name } },
      });
      if (error) {
        setErro(error.message);
      } else {
        setAviso('Conta criada com sucesso! Se o Supabase exigir confirmação por e-mail, verifique sua caixa de entrada.');
      }
    } catch (error) {
      setErro(error.message || 'Não foi possível conectar ao Supabase.');
    } finally {
      setCarregando(false);
    }
  }

  // Preenchimento de teste rápido (útil no desenvolvimento)
  function preencherTeste() {
    setEmail('admin@livrocaixa.com');
    setPassword('123456');
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 sm:p-6 lg:p-12 relative overflow-hidden">
      {/* Luzes de fundo / Ambient Gold Glows */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-amber-500/10 rounded-full blur-[130px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-yellow-600/10 rounded-full blur-[130px] pointer-events-none" />
      <div className="absolute top-1/2 right-1/3 w-64 h-64 bg-amber-600/5 rounded-full blur-[100px] pointer-events-none" />

      <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-12 gap-8 items-center z-10">
        {/* ── LADO ESQUERDO: Apresentação da Plataforma (Hero) ── */}
        <div className="lg:col-span-6 space-y-6 text-left hidden lg:block pr-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/25 text-amber-300 text-xs font-semibold">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            <span>Black Edition • Private Banking</span>
          </div>

          <h1 className="text-4xl xl:text-5xl font-extrabold tracking-tight text-white leading-tight">
            Gestão exclusiva do seu <br />
            <span className="bg-gradient-to-r from-amber-200 via-amber-400 to-yellow-500 bg-clip-text text-transparent">
              dinheiro e patrimônio.
            </span>
          </h1>

          <p className="text-slate-400 text-sm xl:text-base leading-relaxed">
            Acompanhe fluxo de caixa, despesas por categoria em tempo real e evolução da sua carteira de investimentos com segurança bancária na nuvem.
          </p>

          {/* Cards de Demonstração Flutuantes */}
          <div className="grid grid-cols-2 gap-3 pt-2">
            <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-amber-500/20 backdrop-blur-md shadow-lg shadow-black/30">
              <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                <span>Rendimento Médio</span>
                <span className="text-amber-400 font-bold">↗</span>
              </div>
              <p className="font-mono text-xl font-bold text-amber-400">+14,8% a.a.</p>
              <p className="text-[11px] text-slate-500 mt-1">Superando o CDI e inflação</p>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 backdrop-blur-md shadow-lg shadow-black/30">
              <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                <span>Sincronização</span>
                <span className="text-amber-300">⚡</span>
              </div>
              <p className="font-mono text-xl font-bold text-white">0,0 seg</p>
              <p className="text-[11px] text-slate-500 mt-1">Supabase Realtime ativo</p>
            </div>
          </div>

          {/* Vantagens */}
          <div className="space-y-2.5 pt-2 text-xs text-slate-300">
            <div className="flex items-center gap-2.5">
              <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold text-[10px]">✓</span>
              <span>Row Level Security (RLS) protegendo suas transações individuais</span>
            </div>
            <div className="flex items-center gap-2.5">
              <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold text-[10px]">✓</span>
              <span>Calculadora integrada de juros compostos e alocação de ativos</span>
            </div>
            <div className="flex items-center gap-2.5">
              <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold text-[10px]">✓</span>
              <span>Exportação de relatórios em formato CSV com 1 clique</span>
            </div>
          </div>
        </div>

        {/* ── LADO DIREITO: Card de Autenticação ── */}
        <div className="lg:col-span-6 w-full max-w-md mx-auto">
          <div className="bg-slate-900/90 backdrop-blur-2xl border border-slate-800/90 hover:border-amber-500/30 transition-colors shadow-2xl shadow-black/60 rounded-3xl p-6 sm:p-8 relative overflow-hidden">
            {/* Top Glow sutil */}
            <div className="absolute -top-16 -right-16 w-36 h-36 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />

            {/* Header */}
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-400 via-amber-500 to-yellow-600 text-slate-950 shadow-xl shadow-amber-500/25 mb-3 text-2xl font-bold">
                💳
              </div>
              <h2 className="text-2xl font-bold tracking-tight text-white">
                {mode === 'login' ? 'Acesse sua Carteira' : 'Criar Conta Exclusiva'}
              </h2>
              <p className="text-slate-400 text-xs mt-1">
                {mode === 'login'
                  ? 'Entre para visualizar seu saldo e investimentos'
                  : 'Comece seu planejamento financeiro de elite'}
              </p>
            </div>

            {/* Alternador de Modo (Abas) */}
            <div className="flex bg-slate-950/70 p-1 rounded-2xl border border-slate-800/90 mb-6">
              <button
                type="button"
                onClick={() => { setMode('login'); setErro(null); setAviso(null); }}
                className={`flex-1 py-2 text-xs sm:text-sm font-semibold rounded-xl transition-all ${
                  mode === 'login'
                    ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 shadow-md shadow-amber-500/20'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Entrar
              </button>
              <button
                type="button"
                onClick={() => { setMode('register'); setErro(null); setAviso(null); }}
                className={`flex-1 py-2 text-xs sm:text-sm font-semibold rounded-xl transition-all ${
                  mode === 'register'
                    ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 shadow-md shadow-amber-500/20'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Criar conta
              </button>
            </div>

            {/* Formulário */}
            <form onSubmit={mode === 'login' ? handleLogin : handleRegister} className="space-y-4">
              {mode === 'register' && (
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5 flex items-center gap-1.5">
                    <span>👤</span>
                    <span>Seu Nome</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Maria Silva"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    className="w-full bg-slate-950/60 border border-slate-700/80 rounded-xl px-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500 transition-all"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5 flex items-center gap-1.5">
                  <span>✉️</span>
                  <span>E-mail</span>
                </label>
                <input
                  type="email"
                  placeholder="exemplo@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full bg-slate-950/60 border border-slate-700/80 rounded-xl px-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500 transition-all"
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
                    <span>🔒</span>
                    <span>Senha</span>
                  </label>
                  {mode === 'login' && (
                    <button
                      type="button"
                      onClick={preencherTeste}
                      className="text-[11px] text-amber-400 hover:text-amber-300 underline"
                      title="Preenche login de teste"
                    >
                      Preencher teste
                    </button>
                  )}
                </div>

                <div className="relative">
                  <input
                    type={mostrarSenha ? 'text' : 'password'}
                    placeholder="Mínimo 6 caracteres"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                    className="w-full bg-slate-950/60 border border-slate-700/80 rounded-xl pl-4 pr-11 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500 transition-all font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setMostrarSenha(!mostrarSenha)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 text-xs p-1"
                    title={mostrarSenha ? 'Ocultar senha' : 'Ver senha'}
                  >
                    {mostrarSenha ? '🙈' : '👁️'}
                  </button>
                </div>
              </div>

              {erro && (
                <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/25 text-rose-300 text-xs leading-relaxed flex items-start gap-2.5">
                  <span className="text-sm shrink-0">⚠️</span>
                  <span>{erro}</span>
                </div>
              )}

              {aviso && (
                <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-300 text-xs leading-relaxed flex items-start gap-2.5">
                  <span className="text-sm shrink-0">✅</span>
                  <span>{aviso}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={carregando}
                className="w-full mt-2 py-3 px-4 bg-gradient-to-r from-amber-400 via-amber-500 to-yellow-600 hover:from-amber-300 hover:to-amber-500 text-slate-950 font-bold text-sm rounded-xl shadow-lg shadow-amber-500/20 hover:shadow-amber-500/30 transition-all duration-200 active:scale-[0.99] disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {carregando ? (
                  <>
                    <svg className="animate-spin h-4 w-4 text-slate-950" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                    </svg>
                    <span>Autenticando...</span>
                  </>
                ) : mode === 'login' ? (
                  'Acessar Minha Carteira →'
                ) : (
                  'Criar Minha Conta Grátis →'
                )}
              </button>
            </form>

            <div className="mt-6 pt-4 border-t border-slate-800 text-center">
              <p className="text-xs text-slate-500">
                {mode === 'login' ? 'Novo por aqui? ' : 'Já possui uma conta? '}
                <button
                  type="button"
                  onClick={() => {
                    setMode(mode === 'login' ? 'register' : 'login');
                    setErro(null);
                    setAviso(null);
                  }}
                  className="text-amber-400 hover:text-amber-300 font-semibold underline ml-1"
                >
                  {mode === 'login' ? 'Cadastre-se gratuitamente' : 'Faça login'}
                </button>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
