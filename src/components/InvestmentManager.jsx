import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '../services/supabaseClient';

const fmt = (n) =>
  Number(n || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const TIPOS_INVESTIMENTO = [
  { id: 'renda_fixa', label: 'Renda Fixa / CDB', icon: '🏦', cor: 'from-blue-500 to-cyan-500', badge: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
  { id: 'acoes', label: 'Ações (Bolsa)', icon: '📈', cor: 'from-emerald-500 to-teal-500', badge: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
  { id: 'fiis', label: 'Fundos Imobiliários', icon: '🏢', cor: 'from-amber-500 to-orange-500', badge: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
  { id: 'tesouro', label: 'Tesouro Direto', icon: '🏛️', cor: 'from-indigo-500 to-violet-500', badge: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' },
  { id: 'cripto', label: 'Criptomoedas', icon: '🪙', cor: 'from-yellow-400 to-amber-500', badge: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' },
  { id: 'outros', label: 'Outros Ativos', icon: '💼', cor: 'from-slate-400 to-slate-500', badge: 'bg-slate-500/10 text-slate-400 border-slate-500/20' },
];

export default function InvestmentManager({ userId }) {
  const [investimentos, setInvestimentos] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(null);
  const [tabelaAusente, setTabelaAusente] = useState(false);

  // Form states
  const [formAberto, setFormAberto] = useState(false);
  const [editandoId, setEditandoId] = useState(null);
  const [nome, setNome] = useState('');
  const [tipo, setTipo] = useState('renda_fixa');
  const [valorInvestido, setValorInvestido] = useState('');
  const [valorAtual, setValorAtual] = useState('');
  const [notas, setNotas] = useState('');
  const [salvando, setSalvando] = useState(false);

  // Simulador de Juros Compostos
  const [simAporteMensal, setSimAporteMensal] = useState(500);
  const [simTaxaAnual, setSimTaxaAnual] = useState(11);
  const [simAnos, setSimAnos] = useState(5);
  const [mostrarSimulador, setMostrarSimulador] = useState(false);

  // ================================================================
  // Carregar investimentos (Supabase com fallback LocalStorage)
  // ================================================================
  const carregarInvestimentos = useCallback(async () => {
    try {
      setCarregando(true);
      setErro(null);

      const { data, error } = await supabase
        .from('investments')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        // Se a tabela não foi criada ainda no Supabase (código 42P01)
        if (error.code === '42P01' || error.message.includes('relation "public.investments" does not exist')) {
          setTabelaAusente(true);
          const salvosLocais = localStorage.getItem(`c2_investments_${userId}`);
          if (salvosLocais) {
            setInvestimentos(JSON.parse(salvosLocais));
          } else {
            // Exemplos iniciais para já ter visual
            const mock = [
              { id: '1', user_id: userId, name: 'CDB 110% CDI (Reserva)', type: 'renda_fixa', amount_invested: 5000, current_value: 5350, notes: 'Liquidez diária' },
              { id: '2', user_id: userId, name: 'Tesouro Selic 2029', type: 'tesouro', amount_invested: 3000, current_value: 3180, notes: 'Segurança e juros' },
              { id: '3', user_id: userId, name: 'Fundo Imobiliário MXRF11', type: 'fiis', amount_invested: 2000, current_value: 2120, notes: 'Dividendos mensais' },
            ];
            setInvestimentos(mock);
            localStorage.setItem(`c2_investments_${userId}`, JSON.stringify(mock));
          }
          return;
        }
        throw error;
      }

      setTabelaAusente(false);
      setInvestimentos(data || []);
    } catch (err) {
      console.error('Erro ao carregar investimentos:', err.message);
      setErro(err.message);
    } finally {
      setCarregando(false);
    }
  }, [userId]);

  useEffect(() => {
    carregarInvestimentos();

    const channel = supabase
      .channel('realtime:investments')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'investments',
          filter: `user_id=eq.${userId}`,
        },
        () => {
          carregarInvestimentos();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [carregarInvestimentos, userId]);

  // ================================================================
  // Inserir / Atualizar
  // ================================================================
  async function handleSubmit(e) {
    e.preventDefault();
    if (!nome.trim()) return;
    const invVal = parseFloat(valorInvestido) || 0;
    const curVal = valorAtual ? parseFloat(valorAtual) : invVal;

    if (invVal <= 0) {
      setErro('Informe um valor investido válido.');
      return;
    }

    setSalvando(true);
    setErro(null);

    const payload = {
      user_id: userId,
      name: nome.trim(),
      type,
      amount_invested: invVal,
      current_value: curVal,
      notes: notas.trim() || null,
    };

    try {
      if (!tabelaAusente) {
        if (editandoId) {
          const { error } = await supabase
            .from('investments')
            .update(payload)
            .eq('id', editandoId)
            .eq('user_id', userId);
          if (error) throw error;
        } else {
          const { error } = await supabase.from('investments').insert(payload);
          if (error) throw error;
        }
        await carregarInvestimentos();
      } else {
        // Fallback LocalStorage
        let novaLista;
        if (editandoId) {
          novaLista = investimentos.map(i => i.id === editandoId ? { ...i, ...payload } : i);
        } else {
          novaLista = [{ id: String(Date.now()), ...payload, created_at: new Date().toISOString() }, ...investimentos];
        }
        setInvestimentos(novaLista);
        localStorage.setItem(`c2_investments_${userId}`, JSON.stringify(novaLista));
      }

      // Reset
      setNome('');
      setValorInvestido('');
      setValorAtual('');
      setNotas('');
      setTipo('renda_fixa');
      setEditandoId(null);
      setFormAberto(false);
    } catch (err) {
      setErro(err.message);
    } finally {
      setSalvando(false);
    }
  }

  // ================================================================
  // Excluir
  // ================================================================
  async function handleExcluir(id) {
    if (!window.confirm('Excluir este ativo da sua carteira de investimentos?')) return;
    try {
      if (!tabelaAusente) {
        const { error } = await supabase.from('investments').delete().eq('id', id).eq('user_id', userId);
        if (error) throw error;
        carregarInvestimentos();
      } else {
        const nova = investimentos.filter(i => i.id !== id);
        setInvestimentos(nova);
        localStorage.setItem(`c2_investments_${userId}`, JSON.stringify(nova));
      }
    } catch (err) {
      setErro(err.message);
    }
  }

  // ================================================================
  // Métricas da Carteira
  // ================================================================
  const totalInvestido = useMemo(() => investimentos.reduce((s, i) => s + Number(i.amount_invested || 0), 0), [investimentos]);
  const totalAtual     = useMemo(() => investimentos.reduce((s, i) => s + Number(i.current_value || 0), 0), [investimentos]);
  const lucroTotal     = totalAtual - totalInvestido;
  const rentabilidade  = totalInvestido > 0 ? ((lucroTotal / totalInvestido) * 100) : 0;

  // Distribuição por classe de ativo
  const distribuicao = useMemo(() => {
    const mapa = {};
    investimentos.forEach(i => {
      mapa[i.type] = (mapa[i.type] || 0) + Number(i.current_value || 0);
    });

    return TIPOS_INVESTIMENTO.map(t => {
      const valor = mapa[t.id] || 0;
      const pct = totalAtual > 0 ? Math.round((valor / totalAtual) * 100) : 0;
      return { ...t, valor, pct };
    }).filter(t => t.valor > 0);
  }, [investimentos, totalAtual]);

  // Cálculo da simulação de juros compostos
  const resultadoSimulacao = useMemo(() => {
    const meses = simAnos * 12;
    const taxaMensal = Math.pow(1 + simTaxaAnual / 100, 1 / 12) - 1;
    let totalAcumulado = 0;
    let totalAportado = 0;

    for (let m = 1; m <= meses; m++) {
      totalAportado += Number(simAporteMensal);
      totalAcumulado = (totalAcumulado + Number(simAporteMensal)) * (1 + taxaMensal);
    }

    const jurosGanhos = totalAcumulado - totalAportado;
    return { totalAportado, totalAcumulado, jurosGanhos };
  }, [simAporteMensal, simTaxaAnual, simAnos]);

  const inputCls = 'w-full bg-slate-950/60 border border-slate-700/80 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500 transition-all';

  return (
    <div className="space-y-6">
      {/* ── Aviso se a tabela ainda não foi criada no Supabase ── */}
      {tabelaAusente && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs sm:text-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xl">💡</span>
            <span>
              <strong>Modo Ativo:</strong> Seus investimentos estão sendo salvos localmente. Para sincronizar na nuvem do Supabase, basta rodar o comando SQL no painel.
            </span>
          </div>
          <button
            onClick={() => {
              navigator.clipboard?.writeText(`
create table if not exists investments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  type text not null,
  amount_invested numeric(12, 2) not null,
  current_value numeric(12, 2) not null,
  notes text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);
alter table investments enable row level security;
create policy "Usuários gerenciam investimentos" on investments for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
              `);
              alert('Script SQL copiado para a área de transferência!');
            }}
            className="px-3 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/30 text-amber-200 rounded-xl text-xs font-medium transition-colors shrink-0"
          >
            Copiar SQL do Supabase 📋
          </button>
        </div>
      )}

      {/* ── Cards de Patrimônio e Rentabilidade ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Patrimônio Atual */}
        <div className="bg-slate-900/80 backdrop-blur-md border border-slate-800/80 rounded-2xl p-5 shadow-xl shadow-black/10 relative overflow-hidden">
          <div className="flex justify-between items-start mb-2">
            <span className="text-xs font-medium uppercase tracking-wider text-slate-400">Patrimônio Investido</span>
            <span className="text-lg">💼</span>
          </div>
          <p className="font-mono font-bold text-2xl sm:text-3xl tracking-tight text-white">
            {fmt(totalAtual)}
          </p>
          <p className="text-[11px] text-slate-400 mt-2">
            Total aplicado: <span className="font-mono text-slate-300">{fmt(totalInvestido)}</span>
          </p>
        </div>

        {/* Rendimento / Lucro */}
        <div className="bg-slate-900/80 backdrop-blur-md border border-slate-800/80 rounded-2xl p-5 shadow-xl shadow-black/10">
          <div className="flex justify-between items-start mb-2">
            <span className="text-xs font-medium uppercase tracking-wider text-slate-400">Lucro / Rendimento</span>
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
              lucroTotal >= 0 ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
            }`}>
              {lucroTotal >= 0 ? '↗' : '↘'}
            </div>
          </div>
          <p className={`font-mono font-bold text-2xl sm:text-3xl tracking-tight ${lucroTotal >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            {lucroTotal >= 0 ? '+' : ''}{fmt(lucroTotal)}
          </p>
          <span className={`inline-block mt-2 text-[11px] px-2 py-0.5 rounded-md font-medium font-mono ${
            lucroTotal >= 0 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
          }`}>
            {rentabilidade >= 0 ? '+' : ''}{rentabilidade.toFixed(2)}% de retorno
          </span>
        </div>

        {/* Total de Ativos */}
        <div className="bg-slate-900/80 backdrop-blur-md border border-slate-800/80 rounded-2xl p-5 shadow-xl shadow-black/10 flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-start mb-2">
              <span className="text-xs font-medium uppercase tracking-wider text-slate-400">Carteira</span>
              <span className="text-lg">🎯</span>
            </div>
            <p className="font-mono font-bold text-2xl sm:text-3xl tracking-tight text-amber-400">
              {investimentos.length} <span className="text-sm font-normal text-slate-400">ativos</span>
            </p>
          </div>
          <button
            onClick={() => { setFormAberto(true); setEditandoId(null); setNome(''); setValorInvestido(''); setValorAtual(''); setNotas(''); }}
            className="mt-3 w-full py-2 bg-gradient-to-r from-amber-400 via-amber-500 to-yellow-600 hover:from-amber-300 hover:to-amber-500 text-slate-950 font-bold text-xs rounded-xl shadow-md shadow-amber-500/20 transition-all flex items-center justify-center gap-1.5"
          >
            <span>➕</span>
            <span>Adicionar Ativo</span>
          </button>
        </div>
      </div>

      {/* ── Gráfico / Barra de Alocação de Ativos ── */}
      {distribuicao.length > 0 && (
        <div className="bg-slate-900/60 backdrop-blur-md border border-slate-800/80 rounded-2xl p-5 shadow-xl shadow-black/10">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-2">
              <span>📊</span>
              <span>Alocação da Carteira</span>
            </h3>
            <span className="text-xs text-slate-400 font-mono">100% alocado</span>
          </div>

          {/* Barra segmentada */}
          <div className="h-3 w-full bg-slate-950 rounded-full overflow-hidden flex p-0.5 gap-0.5 border border-slate-800 mb-4">
            {distribuicao.map(d => (
              <div
                key={d.id}
                style={{ width: `${Math.max(d.pct, 4)}%` }}
                className={`h-full rounded-sm bg-gradient-to-r ${d.cor}`}
                title={`${d.label}: ${d.pct}% (${fmt(d.valor)})`}
              />
            ))}
          </div>

          {/* Tags de classes */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
            {distribuicao.map(d => (
              <div key={d.id} className="flex items-center justify-between p-2 rounded-xl bg-slate-950/40 border border-slate-800/60 text-xs">
                <span className="flex items-center gap-1.5 text-slate-300 font-medium">
                  <span>{d.icon}</span>
                  <span className="truncate">{d.label}</span>
                </span>
                <span className="font-mono text-slate-400 font-semibold">{d.pct}%</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Formulário de Adicionar / Editar Ativo ── */}
      {formAberto && (
        <form onSubmit={handleSubmit} className="bg-slate-900/90 backdrop-blur-xl border border-amber-500/30 rounded-2xl p-5 shadow-2xl shadow-black/30 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <span>{editandoId ? '✏️' : '➕'}</span>
              <span>{editandoId ? 'Editar Ativo' : 'Adicionar Novo Ativo à Carteira'}</span>
            </h3>
            <button
              type="button"
              onClick={() => { setFormAberto(false); setEditandoId(null); }}
              className="text-xs text-slate-400 hover:text-white"
            >
              ✕ Fechar
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Nome do Ativo</label>
              <input
                type="text"
                placeholder="Ex: CDB Nubank 110%, PETR4, Tesouro Selic..."
                value={nome}
                onChange={e => setNome(e.target.value)}
                className={inputCls}
                required
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Tipo de Aplicação</label>
              <select
                value={tipo}
                onChange={e => setTipo(e.target.value)}
                className={`${inputCls} cursor-pointer`}
              >
                {TIPOS_INVESTIMENTO.map(t => (
                  <option key={t.id} value={t.id} className="bg-slate-900 text-slate-100">
                    {t.icon} {t.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Valor Total Aplicado (R$)</label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                placeholder="0,00"
                value={valorInvestido}
                onChange={e => setValorInvestido(e.target.value)}
                className={`${inputCls} font-mono`}
                required
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Valor Atual / Saldo (R$)</label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                placeholder="Mesmo do aplicado se recente"
                value={valorAtual}
                onChange={e => setValorAtual(e.target.value)}
                className={`${inputCls} font-mono`}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Observações / Meta (Opcional)</label>
            <input
              type="text"
              placeholder="Ex: Reserva de emergência, Vencimento 2029, Dividendos..."
              value={notas}
              onChange={e => setNotas(e.target.value)}
              className={inputCls}
            />
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="submit"
              disabled={salvando}
              className="flex-1 py-2.5 px-4 bg-gradient-to-r from-amber-400 via-amber-500 to-yellow-600 hover:from-amber-300 hover:to-amber-500 text-slate-950 font-bold text-sm rounded-xl shadow-lg shadow-amber-500/20 transition-all disabled:opacity-60"
            >
              {salvando ? 'Salvando...' : editandoId ? 'Atualizar Ativo' : 'Salvar Ativo na Carteira'}
            </button>
            <button
              type="button"
              onClick={() => { setFormAberto(false); setEditandoId(null); }}
              className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-sm font-medium transition-colors"
            >
              Cancelar
            </button>
          </div>
        </form>
      )}

      {/* ── Lista de Ativos Cadastrados ── */}
      <section className="bg-slate-900/60 backdrop-blur-md border border-slate-800/80 rounded-2xl p-5 shadow-xl shadow-black/10 space-y-3">
        <div className="flex justify-between items-center pb-3 border-b border-slate-800">
          <h3 className="text-base font-semibold text-white flex items-center gap-2">
            <span>📈</span>
            <span>Meus Ativos</span>
          </h3>
          <span className="text-xs text-slate-400">
            {investimentos.length} investimento{investimentos.length === 1 ? '' : 's'}
          </span>
        </div>

        {carregando && (
          <div className="py-8 text-center text-xs text-slate-400 animate-pulse">
            Carregando sua carteira...
          </div>
        )}

        {!carregando && investimentos.length === 0 && (
          <div className="py-10 text-center border-2 border-dashed border-slate-800/80 rounded-2xl my-2">
            <span className="text-4xl block mb-2">💎</span>
            <p className="text-sm font-medium text-slate-300">Sua carteira está vazia</p>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              Clique no botão "Adicionar Ativo" acima para começar a acompanhar seu patrimônio!
            </p>
          </div>
        )}

        {!carregando && investimentos.length > 0 && (
          <div className="space-y-2.5">
            {investimentos.map(item => {
              const tipoMeta = TIPOS_INVESTIMENTO.find(t => t.id === item.type) || TIPOS_INVESTIMENTO[0];
              const lucroItem = Number(item.current_value) - Number(item.amount_invested);
              const pctItem = Number(item.amount_invested) > 0 ? (lucroItem / Number(item.amount_invested)) * 100 : 0;

              return (
                <div
                  key={item.id}
                  className="bg-slate-950/40 hover:bg-slate-950/80 border border-slate-800/80 hover:border-slate-700 rounded-2xl p-4 flex flex-col sm:flex-row justify-between sm:items-center gap-3 transition-all group"
                >
                  {/* Informações do Ativo */}
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-lg shrink-0">
                      {tipoMeta.icon}
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-sm text-slate-100 truncate">{item.name}</p>
                      <div className="flex items-center gap-2 mt-1 text-xs text-slate-400 flex-wrap">
                        <span className={`px-2 py-0.5 rounded-md font-medium text-[11px] border ${tipoMeta.badge}`}>
                          {tipoMeta.label}
                        </span>
                        {item.notes && (
                          <span className="text-slate-500 text-[11px] truncate max-w-xs">
                            💬 {item.notes}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Valores & Ações */}
                  <div className="flex items-center justify-between sm:justify-end gap-5 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-800/60">
                    <div className="text-right">
                      <p className="font-mono font-bold text-base text-slate-100">
                        {fmt(item.current_value)}
                      </p>
                      <p className="text-[11px] font-mono flex items-center justify-end gap-1.5">
                        <span className="text-slate-500">Aplicado: {fmt(item.amount_invested)}</span>
                        <span className={`font-semibold ${lucroItem >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                          ({lucroItem >= 0 ? '+' : ''}{pctItem.toFixed(1)}%)
                        </span>
                      </p>
                    </div>

                    <div className="flex items-center gap-1 opacity-70 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => {
                          setEditandoId(item.id);
                          setNome(item.name);
                          setTipo(item.type);
                          setValorInvestido(String(item.amount_invested));
                          setValorAtual(String(item.current_value));
                          setNotas(item.notes || '');
                          setFormAberto(true);
                          window.scrollTo({ top: 120, behavior: 'smooth' });
                        }}
                        className="p-2 text-slate-400 hover:text-amber-400 hover:bg-slate-800 rounded-xl text-xs transition-colors"
                        title="Editar Ativo"
                      >
                        ✏️
                      </button>
                      <button
                        onClick={() => handleExcluir(item.id)}
                        className="p-2 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-xl text-xs transition-colors"
                        title="Excluir Ativo"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ── Simulador Interativo de Juros Compostos ── */}
      <section className="bg-slate-900/60 backdrop-blur-md border border-slate-800/80 rounded-2xl p-5 shadow-xl shadow-black/10">
        <div className="flex justify-between items-center cursor-pointer" onClick={() => setMostrarSimulador(!mostrarSimulador)}>
          <div className="flex items-center gap-2">
            <span className="text-lg">🧮</span>
            <div>
              <h3 className="text-sm font-semibold text-slate-200">Simulador de Aportes & Juros Compostos</h3>
              <p className="text-xs text-slate-400">Descubra quanto seu dinheiro pode render ao longo do tempo</p>
            </div>
          </div>
          <button className="text-xs text-slate-400 hover:text-slate-200">
            {mostrarSimulador ? 'Ocultar ▲' : 'Simular ▼'}
          </button>
        </div>

        {mostrarSimulador && (
          <div className="mt-5 pt-4 border-t border-slate-800 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Aporte Mensal (R$)</label>
                <input
                  type="number"
                  step="50"
                  min="10"
                  value={simAporteMensal}
                  onChange={e => setSimAporteMensal(Number(e.target.value))}
                  className={inputCls}
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Taxa Estimada (% ao ano)</label>
                <input
                  type="number"
                  step="0.5"
                  min="1"
                  max="50"
                  value={simTaxaAnual}
                  onChange={e => setSimTaxaAnual(Number(e.target.value))}
                  className={inputCls}
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Prazo (Anos)</label>
                <input
                  type="number"
                  min="1"
                  max="40"
                  value={simAnos}
                  onChange={e => setSimAnos(Number(e.target.value))}
                  className={inputCls}
                />
              </div>
            </div>

            {/* Resultado da Simulação */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 bg-slate-950/60 border border-slate-800 rounded-xl">
              <div>
                <span className="text-[11px] text-slate-500 block">Total Aportado do Bolso</span>
                <span className="font-mono font-bold text-base text-slate-300">
                  {fmt(resultadoSimulacao.totalAportado)}
                </span>
              </div>

              <div>
                <span className="text-[11px] text-amber-400 block">Juros Compostos Acumulados</span>
                <span className="font-mono font-bold text-base text-amber-400">
                  +{fmt(resultadoSimulacao.jurosGanhos)}
                </span>
              </div>

              <div>
                <span className="text-[11px] text-amber-300 block">Patrimônio Final Estimado</span>
                <span className="font-mono font-bold text-lg text-amber-200">
                  {fmt(resultadoSimulacao.totalAcumulado)}
                </span>
              </div>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
