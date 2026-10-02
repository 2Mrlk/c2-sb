import { useEffect, useState, useCallback, useMemo } from 'react';
import { supabase } from './services/supabaseClient';
import Auth from './components/Auth';
import TransactionForm from './components/TransactionForm';
import CategoryManager from './components/CategoryManager';
import InvestmentManager from './components/InvestmentManager';

// Formata valor para Real Brasileiro
const fmt = (n) =>
  Number(n || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export default function App() {
  // --- Autenticação ---
  const [session, setSession] = useState(null);
  const [sessionCarregando, setSessionCarregando] = useState(true);

  // --- Navegação Principal ---
  const [abaPrincipal, setAbaPrincipal] = useState('livro-caixa'); // 'livro-caixa' | 'investimentos'

  // --- Dados de Transações ---
  const [transacoes, setTransacoes] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(null);

  // --- UI: edição de transação ---
  const [transacaoEditando, setTransacaoEditando] = useState(null);

  // --- UI: filtros e busca ---
  const [filtroTipo, setFiltroTipo] = useState('todos'); // 'todos' | 'receita' | 'despesa'
  const [filtroCategoria, setFiltroCategoria] = useState('');
  const [termoBusca, setTermoBusca] = useState('');
  const [mostrarGrafico, setMostrarGrafico] = useState(true);

  // --- Toast de notificação em tempo real ---
  const [toastMsg, setToastMsg] = useState(null);

  // ================================================================
  // Sessão de autenticação
  // ================================================================
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setSessionCarregando(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  // ================================================================
  // Busca de dados (Read)
  // ================================================================
  const buscarDados = useCallback(async () => {
    if (!session) return;
    try {
      setCarregando(true);
      setErro(null);

      const [{ data: txs, error: txError }, { data: cats, error: catError }] = await Promise.all([
        supabase
          .from('transactions')
          .select('*')
          .eq('user_id', session.user.id)
          .order('occurred_at', { ascending: false }),
        supabase
          .from('categories')
          .select('*')
          .eq('user_id', session.user.id)
          .order('name'),
      ]);

      if (txError) throw txError;
      if (catError) throw catError;

      setTransacoes(txs || []);
      setCategorias(cats || []);
    } catch (err) {
      console.error('Erro ao buscar dados:', err.message);
      setErro(err.message);
    } finally {
      setCarregando(false);
    }
  }, [session]);

  useEffect(() => {
    if (session) {
      buscarDados();
    } else {
      setTransacoes([]);
      setCategorias([]);
      setCarregando(false);
    }
  }, [session, buscarDados]);

  // ================================================================
  // Supabase Realtime – sincronização em tempo real
  // ================================================================
  useEffect(() => {
    if (!session) return;

    function showToast(msg) {
      setToastMsg(msg);
      setTimeout(() => setToastMsg(null), 3500);
    }

    const channelTx = supabase
      .channel('realtime:transactions')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'transactions',
          filter: `user_id=eq.${session.user.id}`,
        },
        (payload) => {
          const { eventType, new: novo, old: antigo } = payload;

          if (eventType === 'INSERT') {
            setTransacoes((prev) => {
              if (prev.some((t) => t.id === novo.id)) return prev;
              showToast('⚡ Nova transação sincronizada!');
              return [novo, ...prev].sort(
                (a, b) => new Date(b.occurred_at) - new Date(a.occurred_at)
              );
            });
          }

          if (eventType === 'UPDATE') {
            setTransacoes((prev) =>
              prev.map((t) => (t.id === novo.id ? novo : t))
            );
            showToast('🔄 Transação atualizada em tempo real!');
          }

          if (eventType === 'DELETE') {
            setTransacoes((prev) => prev.filter((t) => t.id !== antigo.id));
            showToast('🗑️ Transação removida!');
          }
        }
      )
      .subscribe();

    const channelCat = supabase
      .channel('realtime:categories')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'categories',
          filter: `user_id=eq.${session.user.id}`,
        },
        () => {
          supabase
            .from('categories')
            .select('*')
            .eq('user_id', session.user.id)
            .order('name')
            .then(({ data }) => {
              if (data) setCategorias(data);
            });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channelTx);
      supabase.removeChannel(channelCat);
    };
  }, [session]);

  // ================================================================
  // CRUD Handlers
  // ================================================================
  async function criarTransacao(payload) {
    const { data, error } = await supabase
      .from('transactions')
      .insert({ ...payload, user_id: session.user.id })
      .select()
      .single();

    if (error) throw new Error(error.message);

    setTransacoes((prev) => {
      if (prev.some((t) => t.id === data.id)) return prev;
      return [data, ...prev];
    });
  }

  async function atualizarTransacao(payload) {
    if (!transacaoEditando) return;
    const { data, error } = await supabase
      .from('transactions')
      .update(payload)
      .eq('id', transacaoEditando.id)
      .eq('user_id', session.user.id)
      .select()
      .single();

    if (error) throw new Error(error.message);

    setTransacoes((prev) => prev.map((t) => (t.id === data.id ? data : t)));
    setTransacaoEditando(null);
  }

  async function removerTransacao(id) {
    if (!window.confirm('Tem certeza que deseja excluir esta transação?')) return;
    const { error } = await supabase
      .from('transactions')
      .delete()
      .eq('id', id)
      .eq('user_id', session.user.id);

    if (error) { setErro(error.message); return; }
    setTransacoes((prev) => prev.filter((t) => t.id !== id));
  }

  // ================================================================
  // Exportar dados para CSV
  // ================================================================
  function exportarCSV() {
    if (transacoes.length === 0) return;
    const headers = ['Data', 'Tipo', 'Descrição', 'Categoria', 'Valor (R$)'];
    const rows = transacoes.map((t) => [
      t.occurred_at ? new Date(t.occurred_at).toLocaleDateString('pt-BR') : '',
      t.type === 'receita' ? 'Receita' : 'Despesa',
      `"${(t.description || '').replace(/"/g, '""')}"`,
      `"${(t.category || '').replace(/"/g, '""')}"`,
      Number(t.amount || 0).toFixed(2).replace('.', ','),
    ]);
    const csvContent =
      'data:text/csv;charset=utf-8,\uFEFF' +
      [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `livro-caixa-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  // ================================================================
  // Cálculos & Métricas Financeiras
  // ================================================================
  const income  = useMemo(() => transacoes.filter((t) => t.type === 'receita').reduce((s, t) => s + Number(t.amount), 0), [transacoes]);
  const expense = useMemo(() => transacoes.filter((t) => t.type === 'despesa').reduce((s, t) => s + Number(t.amount), 0), [transacoes]);
  const balance = income - expense;
  const taxaEconomia = income > 0 ? Math.max(0, Math.round((balance / income) * 100)) : 0;

  // Distribuição de Despesas por Categoria
  const distribuicaoCategorias = useMemo(() => {
    const mapa = {};
    transacoes
      .filter((t) => t.type === 'despesa')
      .forEach((t) => {
        const cat = t.category || 'Outros';
        mapa[cat] = (mapa[cat] || 0) + Number(t.amount);
      });

    return Object.entries(mapa)
      .map(([name, total]) => ({
        name,
        total,
        percent: expense > 0 ? Math.round((total / expense) * 100) : 0,
      }))
      .sort((a, b) => b.total - a.total);
  }, [transacoes, expense]);

  // Filtragem e busca local
  const transacoesFiltradas = useMemo(() => {
    return transacoes.filter((t) => {
      const matchTipo = filtroTipo === 'todos' || t.type === filtroTipo;
      const matchCat  = !filtroCategoria || t.category === filtroCategoria;
      const matchBusca = !termoBusca.trim() ||
        t.description.toLowerCase().includes(termoBusca.toLowerCase()) ||
        t.category.toLowerCase().includes(termoBusca.toLowerCase()) ||
        String(t.amount).includes(termoBusca);
      return matchTipo && matchCat && matchBusca;
    });
  }, [transacoes, filtroTipo, filtroCategoria, termoBusca]);

  // Contadores para as abas
  const countReceitas = useMemo(() => transacoes.filter(t => t.type === 'receita').length, [transacoes]);
  const countDespesas = useMemo(() => transacoes.filter(t => t.type === 'despesa').length, [transacoes]);

  // Cores para as barras de progresso do gráfico
  const coresBarras = [
    'from-amber-400 to-yellow-500',
    'from-yellow-500 to-amber-600',
    'from-orange-400 to-amber-500',
    'from-emerald-400 to-teal-500',
    'from-blue-400 to-indigo-500',
    'from-purple-400 to-pink-500',
  ];

  // ================================================================
  // Renderização
  // ================================================================
  if (sessionCarregando) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3">
        <div className="w-12 h-12 border-4 border-amber-500/20 border-t-amber-500 rounded-full animate-spin" />
        <p className="text-amber-300 text-sm font-medium animate-pulse">Carregando Private Banking...</p>
      </div>
    );
  }

  if (!session) return <Auth />;

  return (
    <div className="min-h-screen p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto space-y-6">
      {/* ── Top Bar / Header ── */}
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-900/70 backdrop-blur-md border border-slate-800/80 rounded-2xl p-4 sm:px-6 shadow-xl shadow-black/30">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-amber-400 via-amber-500 to-yellow-600 flex items-center justify-center text-slate-950 text-xl font-bold shadow-lg shadow-amber-500/25">
            💳
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-white">Livro-Caixa</h1>
              <span className="flex items-center gap-1 text-[10px] font-semibold bg-amber-500/10 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                Black Edition
              </span>
            </div>
            <p className="text-xs text-slate-400 truncate max-w-xs">{session.user.email}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          {transacoes.length > 0 && abaPrincipal === 'livro-caixa' && (
            <button
              onClick={exportarCSV}
              className="px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 rounded-xl transition-all shadow-sm flex items-center gap-1.5"
              title="Baixar planilha CSV de lançamentos"
            >
              <span>📥</span>
              <span className="hidden sm:inline">Exportar CSV</span>
            </button>
          )}

          <button
            onClick={buscarDados}
            disabled={carregando}
            className="px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-amber-300 bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 rounded-xl transition-all shadow-sm flex items-center gap-1.5 disabled:opacity-50"
            title="Atualizar dados da nuvem"
          >
            <span className={carregando ? 'animate-spin inline-block' : ''}>🔄</span>
            <span className="hidden sm:inline">Atualizar</span>
          </button>

          <button
            onClick={() => supabase.auth.signOut()}
            className="px-3 py-1.5 text-xs font-medium text-slate-400 hover:text-rose-300 bg-slate-800/80 hover:bg-slate-800 border border-slate-700 rounded-xl transition-all shadow-sm flex items-center gap-1.5"
          >
            <span>Sair</span>
            <span>🚪</span>
          </button>
        </div>
      </header>

      {/* ── Navegação entre Módulos: Livro-Caixa vs Investimentos ── */}
      <nav className="flex p-1.5 bg-slate-900/80 backdrop-blur-md border border-slate-800/80 rounded-2xl shadow-lg">
        <button
          onClick={() => setAbaPrincipal('livro-caixa')}
          className={`flex-1 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center justify-center gap-2 ${
            abaPrincipal === 'livro-caixa'
              ? 'bg-gradient-to-r from-amber-400 via-amber-500 to-yellow-600 text-slate-950 font-bold shadow-md shadow-amber-500/20'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <span>💳</span>
          <span>Livro-Caixa & Gastos</span>
        </button>

        <button
          onClick={() => setAbaPrincipal('investimentos')}
          className={`flex-1 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center justify-center gap-2 ${
            abaPrincipal === 'investimentos'
              ? 'bg-gradient-to-r from-amber-400 via-amber-500 to-yellow-600 text-slate-950 font-bold shadow-md shadow-amber-500/20'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <span>📈</span>
          <span>Área de Investimentos</span>
          <span className="text-[10px] bg-slate-950/60 px-2 py-0.5 rounded-full border border-amber-400/30 text-amber-300 font-medium">
            Carteira
          </span>
        </button>
      </nav>

      {/* ── Toast de sincronização Realtime ── */}
      {toastMsg && (
        <div className="fixed bottom-6 right-6 bg-slate-900/95 backdrop-blur-xl border border-amber-500/40 text-amber-300 rounded-2xl px-4 py-3 text-xs sm:text-sm shadow-2xl shadow-amber-950/60 z-50 flex items-center gap-2.5 animate-bounce">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* ============================================================== */}
      {/* ── SEÇÃO INVESTIMENTOS OU LIVRO-CAIXA ── */}
      {/* ============================================================== */}
      {abaPrincipal === 'investimentos' ? (
        <InvestmentManager userId={session.user.id} />
      ) : (
        <>
          {/* ── Cards de Resumo Financeiro ── */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Card Saldo */}
            <div className="bg-slate-900/80 backdrop-blur-md border border-slate-800/80 hover:border-amber-500/30 rounded-2xl p-5 shadow-xl shadow-black/10 relative overflow-hidden group transition-all">
              <div className="flex justify-between items-start mb-2">
                <span className="text-xs font-medium uppercase tracking-wider text-slate-400">Saldo Geral</span>
                <span className="text-lg">💰</span>
              </div>
              <p className={`font-mono font-bold text-2xl sm:text-3xl tracking-tight ${balance >= 0 ? 'text-amber-400' : 'text-rose-400'}`}>
                {fmt(balance)}
              </p>
              <div className="flex items-center justify-between mt-3">
                <span className={`text-[11px] px-2 py-0.5 rounded-md font-medium ${
                  balance >= 0 ? 'bg-amber-500/10 text-amber-400 border border-amber-500/25' : 'bg-rose-500/10 text-rose-400 border border-rose-500/25'
                }`}>
                  {balance >= 0 ? '● Saldo Positivo' : '● Em Débito'}
                </span>
                {income > 0 && (
                  <span className="text-[11px] text-slate-400 font-mono">
                    {taxaEconomia}% guardado
                  </span>
                )}
              </div>
            </div>

            {/* Card Receitas */}
            <div className="bg-slate-900/80 backdrop-blur-md border border-slate-800/80 rounded-2xl p-5 shadow-xl shadow-black/10 hover:border-emerald-500/30 transition-all">
              <div className="flex justify-between items-start mb-2">
                <span className="text-xs font-medium uppercase tracking-wider text-slate-400">Entradas</span>
                <div className="w-6 h-6 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 text-xs font-bold">
                  ↗
                </div>
              </div>
              <p className="font-mono font-bold text-2xl sm:text-3xl tracking-tight text-emerald-400">
                {fmt(income)}
              </p>
              <p className="text-[11px] text-slate-400 mt-3 flex items-center justify-between">
                <span>Total recebido</span>
                <span className="font-mono text-slate-500">{countReceitas} lançamentos</span>
              </p>
            </div>

            {/* Card Despesas */}
            <div className="bg-slate-900/80 backdrop-blur-md border border-slate-800/80 rounded-2xl p-5 shadow-xl shadow-black/10 hover:border-rose-500/30 transition-all">
              <div className="flex justify-between items-start mb-2">
                <span className="text-xs font-medium uppercase tracking-wider text-slate-400">Saídas</span>
                <div className="w-6 h-6 rounded-full bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 text-xs font-bold">
                  ↘
                </div>
              </div>
              <p className="font-mono font-bold text-2xl sm:text-3xl tracking-tight text-rose-400">
                {fmt(expense)}
              </p>
              <p className="text-[11px] text-slate-400 mt-3 flex items-center justify-between">
                <span>Total despendido</span>
                <span className="font-mono text-slate-500">{countDespesas} lançamentos</span>
              </p>
            </div>
          </div>

          {/* ── Widget: Distribuição de Despesas por Categoria (Analytics) ── */}
          {distribuicaoCategorias.length > 0 && (
            <div className="bg-slate-900/60 backdrop-blur-md border border-slate-800/80 rounded-2xl p-5 shadow-xl shadow-black/10">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <span className="text-base">📊</span>
                  <h3 className="text-sm font-semibold text-slate-200">
                    Distribuição de Gastos por Categoria
                  </h3>
                </div>
                <button
                  onClick={() => setMostrarGrafico(!mostrarGrafico)}
                  className="text-xs text-amber-400/80 hover:text-amber-300"
                >
                  {mostrarGrafico ? 'Ocultar ▲' : 'Ver gráfico ▼'}
                </button>
              </div>

              {mostrarGrafico && (
                <div className="space-y-3">
                  {/* Barra segmentada geral */}
                  <div className="h-3 w-full bg-slate-950 rounded-full overflow-hidden flex p-0.5 gap-0.5 border border-slate-800">
                    {distribuicaoCategorias.slice(0, 6).map((item, idx) => (
                      <div
                        key={item.name}
                        style={{ width: `${Math.max(item.percent, 3)}%` }}
                        className={`h-full rounded-sm bg-gradient-to-r ${coresBarras[idx % coresBarras.length]}`}
                        title={`${item.name}: ${item.percent}% (${fmt(item.total)})`}
                      />
                    ))}
                  </div>

                  {/* Lista com porcentagens e valores */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2">
                    {distribuicaoCategorias.slice(0, 6).map((item, idx) => (
                      <div
                        key={item.name}
                        className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950/40 border border-slate-800/60 text-xs"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className={`w-2.5 h-2.5 rounded-full shrink-0 bg-gradient-to-r ${coresBarras[idx % coresBarras.length]}`} />
                          <span className="font-medium text-slate-200 truncate">{item.name}</span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0 font-mono">
                          <span className="text-amber-400 font-semibold">{item.percent}%</span>
                          <span className="text-slate-300 font-bold">{fmt(item.total)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── Gerenciador de Categorias ── */}
          <CategoryManager
            userId={session.user.id}
            categorias={categorias}
            onUpdate={buscarDados}
          />

          {/* ── Formulário (Criar / Editar Transação) ── */}
          <TransactionForm
            categorias={categorias}
            transacao={transacaoEditando}
            onSubmit={transacaoEditando ? atualizarTransacao : criarTransacao}
            onCancel={() => setTransacaoEditando(null)}
            carregando={carregando}
          />

          {/* ── Alerta de Erro Global ── */}
          {erro && (
            <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-sm flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span>⚠️</span>
                <span>{erro}</span>
              </div>
              <button onClick={() => setErro(null)} className="text-xs underline text-rose-300 hover:text-white">
                Fechar
              </button>
            </div>
          )}

          {/* ── Seção de Transações (Histórico) ── */}
          <section className="bg-slate-900/60 backdrop-blur-md border border-slate-800/80 rounded-2xl p-5 shadow-xl shadow-black/10 space-y-4">
            {/* Cabeçalho da Seção + Busca Rápida */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 pb-3 border-b border-slate-800">
              <div>
                <h2 className="text-base font-semibold text-white flex items-center gap-2">
                  <span>📋</span>
                  <span>Histórico de Lançamentos</span>
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  {transacoesFiltradas.length} de {transacoes.length} transaç{transacoes.length === 1 ? 'ão' : 'ões'}
                </p>
              </div>

              {/* Campo de Busca Rápida */}
              <div className="relative w-full md:w-64">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-amber-400">🔍</span>
                <input
                  type="text"
                  placeholder="Buscar descrição ou valor..."
                  value={termoBusca}
                  onChange={(e) => setTermoBusca(e.target.value)}
                  className="w-full bg-slate-950/60 border border-slate-800 text-slate-200 placeholder-slate-500 rounded-xl pl-8 pr-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500 transition-all"
                />
                {termoBusca && (
                  <button
                    onClick={() => setTermoBusca('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-white"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>

            {/* Toolbar de Filtros */}
            <div className="flex items-center justify-between gap-2 flex-wrap">
              {/* Abas Tipo: Todas / Receitas / Despesas com contadores */}
              <div className="flex bg-slate-950/60 p-1 rounded-xl border border-slate-800 text-xs">
                {[
                  { id: 'todos', label: 'Todas', count: transacoes.length },
                  { id: 'receita', label: 'Receitas', count: countReceitas },
                  { id: 'despesa', label: 'Despesas', count: countDespesas },
                ].map((tipo) => (
                  <button
                    key={tipo.id}
                    onClick={() => setFiltroTipo(tipo.id)}
                    className={`px-3 py-1 rounded-lg font-medium transition-all flex items-center gap-1.5 ${
                      filtroTipo === tipo.id
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30 shadow-sm'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <span>{tipo.label}</span>
                    <span className="text-[10px] bg-slate-900 text-slate-400 px-1.5 py-0.2 rounded-full font-mono">
                      {tipo.count}
                    </span>
                  </button>
                ))}
              </div>

              {/* Filtro por Categoria */}
              <div className="flex items-center gap-2">
                <select
                  value={filtroCategoria}
                  onChange={(e) => setFiltroCategoria(e.target.value)}
                  className="bg-slate-950/60 border border-slate-800 text-slate-300 rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:border-amber-500 cursor-pointer"
                >
                  <option value="">Todas as categorias</option>
                  {categorias.map((c) => (
                    <option key={c.id} value={c.name}>{c.name}</option>
                  ))}
                </select>

                {(filtroTipo !== 'todos' || filtroCategoria || termoBusca) && (
                  <button
                    onClick={() => {
                      setFiltroTipo('todos');
                      setFiltroCategoria('');
                      setTermoBusca('');
                    }}
                    className="text-xs text-amber-400 hover:text-amber-300 underline ml-1"
                  >
                    Limpar filtros
                  </button>
                )}
              </div>
            </div>

            {/* Loading State */}
            {carregando && (
              <div className="py-12 text-center">
                <div className="w-8 h-8 border-2 border-amber-500/20 border-t-amber-500 rounded-full animate-spin mx-auto mb-2" />
                <p className="text-xs text-amber-300">Sincronizando dados...</p>
              </div>
            )}

            {/* Lista de Transações */}
            {!carregando && (
              <>
                {transacoesFiltradas.length === 0 ? (
                  <div className="py-12 text-center border-2 border-dashed border-slate-800/60 rounded-2xl my-2">
                    <span className="text-4xl block mb-2">💸</span>
                    <p className="text-sm font-medium text-slate-300">
                      {transacoes.length === 0
                        ? 'Nenhum lançamento cadastrado ainda'
                        : 'Nenhum lançamento encontrado para a busca ou filtro'}
                    </p>
                    <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                      {transacoes.length === 0
                        ? 'Cadastre uma receita ou despesa no formulário acima!'
                        : 'Tente limpar a busca ou selecionar outra categoria.'}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {transacoesFiltradas.map((t) => (
                      <div
                        key={t.id}
                        className={`bg-slate-950/40 hover:bg-slate-950/80 border rounded-2xl p-4 flex flex-col sm:flex-row justify-between sm:items-center gap-3 transition-all duration-200 group ${
                          transacaoEditando?.id === t.id
                            ? 'border-amber-500 ring-2 ring-amber-500/25 shadow-lg shadow-amber-500/10'
                            : 'border-slate-800/80 hover:border-slate-700'
                        }`}
                      >
                        {/* Lado Esquerdo: Ícone + Descrição + Tag */}
                        <div className="flex items-center gap-3.5 min-w-0">
                          <div
                            className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-base font-bold shadow-sm ${
                              t.type === 'receita'
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                            }`}
                          >
                            {t.type === 'receita' ? '↗' : '↘'}
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-sm text-slate-100 truncate">
                              {t.description}
                            </p>
                            <div className="flex items-center gap-2 mt-1 text-xs text-slate-400 flex-wrap">
                              <span className="bg-slate-800/90 border border-slate-700/80 px-2.5 py-0.5 rounded-lg font-medium text-[11px] text-slate-300">
                                {t.category}
                              </span>
                              {t.occurred_at && (
                                <span className="text-slate-500 text-[11px]">
                                  📅 {new Date(t.occurred_at).toLocaleDateString('pt-BR', {
                                    day: '2-digit',
                                    month: 'short',
                                    year: 'numeric',
                                  })}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Lado Direito: Valor + Ações */}
                        <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-800/60">
                          <span
                            className={`font-mono font-bold text-base sm:text-lg tracking-tight ${
                              t.type === 'receita' ? 'text-emerald-400' : 'text-rose-400'
                            }`}
                          >
                            {t.type === 'receita' ? '+' : '−'} {fmt(t.amount)}
                          </span>

                          <div className="flex items-center gap-1 opacity-70 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => {
                                setTransacaoEditando(t);
                                window.scrollTo({ top: 180, behavior: 'smooth' });
                              }}
                              className="p-2 text-slate-400 hover:text-amber-400 hover:bg-slate-800 rounded-xl text-xs transition-colors"
                              title="Editar lançamento"
                            >
                              ✏️
                            </button>
                            <button
                              onClick={() => removerTransacao(t.id)}
                              className="p-2 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-xl text-xs transition-colors"
                              title="Excluir lançamento"
                            >
                              🗑️
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </section>
        </>
      )}
    </div>
  );
}
