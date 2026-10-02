import { useState, useEffect } from 'react';

/**
 * Formulário moderno para criar OU editar uma transação.
 */
export default function TransactionForm({ categorias, transacao, onSubmit, onCancel, carregando }) {
  const modoEdicao = !!transacao;

  const [desc, setDesc]         = useState('');
  const [amount, setAmount]     = useState('');
  const [category, setCategory] = useState('');
  const [type, setType]         = useState('despesa');
  const [occurredAt, setOccurredAt] = useState(new Date().toISOString().slice(0, 10));
  const [erro, setErro]         = useState(null);
  const [enviando, setEnviando] = useState(false);

  // Preenche o formulário quando entra em modo edição
  useEffect(() => {
    if (transacao) {
      setDesc(transacao.description || '');
      setAmount(transacao.amount?.toString() || '');
      setCategory(transacao.category || '');
      setType(transacao.type || 'despesa');
      setOccurredAt(transacao.occurred_at ? transacao.occurred_at.slice(0, 10) : new Date().toISOString().slice(0, 10));
    } else {
      setDesc('');
      setAmount('');
      setCategory(categorias.length > 0 ? categorias[0].name : '');
      setType('despesa');
      setOccurredAt(new Date().toISOString().slice(0, 10));
    }
    setErro(null);
  }, [transacao, categorias]);

  function adicionarValor(delta) {
    const atual = parseFloat(amount) || 0;
    const novo = (atual + delta).toFixed(2);
    setAmount(novo);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setErro(null);

    if (!desc.trim()) { setErro('Informe uma descrição.'); return; }
    if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
      setErro('Informe um valor válido (maior que zero).'); return;
    }
    if (!category) { setErro('Selecione uma categoria.'); return; }

    const payload = {
      type,
      description: desc.trim(),
      category,
      amount: parseFloat(parseFloat(amount).toFixed(2)),
      occurred_at: new Date(occurredAt + 'T12:00:00Z').toISOString(),
    };

    setEnviando(true);
    try {
      await onSubmit(payload);
      if (!modoEdicao) {
        setDesc('');
        setAmount('');
        setType('despesa');
      }
    } catch (err) {
      setErro(err.message || 'Erro ao salvar transação.');
    } finally {
      setEnviando(false);
    }
  }

  const inputCls = 'w-full bg-slate-950/60 border border-slate-700/80 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500 transition-all';

  return (
    <form onSubmit={handleSubmit} className="bg-slate-900/80 backdrop-blur-md border border-slate-800/90 rounded-2xl p-5 mb-6 shadow-xl shadow-black/20 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold tracking-wide text-slate-200 flex items-center gap-2">
          <span>{modoEdicao ? '✏️' : '➕'}</span>
          <span>{modoEdicao ? 'Editando Transação' : 'Nova Transação'}</span>
        </h2>
        {modoEdicao && (
          <span className="text-[11px] bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded-full font-medium">
            Modo Edição
          </span>
        )}
      </div>

      {/* Segmented Toggle: Despesa vs Receita */}
      <div className="grid grid-cols-2 gap-2 p-1 bg-slate-950/60 border border-slate-800/80 rounded-xl">
        <button
          type="button"
          onClick={() => setType('despesa')}
          className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs sm:text-sm font-medium transition-all ${
            type === 'despesa'
              ? 'bg-rose-500/15 text-rose-300 border border-rose-500/30 shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <span>📉</span>
          <span>Despesa</span>
        </button>

        <button
          type="button"
          onClick={() => setType('receita')}
          className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs sm:text-sm font-medium transition-all ${
            type === 'receita'
              ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <span>📈</span>
          <span>Receita</span>
        </button>
      </div>

      {/* Descrição */}
      <div>
        <label className="block text-xs font-medium text-slate-400 mb-1">Descrição</label>
        <input
          type="text"
          placeholder="Ex: Almoço no restaurante, Salário mensal, Supermercado..."
          value={desc}
          onChange={(e) => setDesc(e.target.value)}
          className={inputCls}
          required
        />
      </div>

      {/* Valor + Categoria + Data em grid responsivo de 3 colunas */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1">Valor (R$)</label>
          <div className="relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-mono text-slate-400">R$</span>
            <input
              type="number"
              step="0.01"
              min="0.01"
              placeholder="0,00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className={`${inputCls} pl-10 font-mono`}
              required
            />
          </div>
          {/* Quick value chips */}
          <div className="flex gap-1 mt-1.5 overflow-x-auto">
            {[10, 25, 50, 100].map((val) => (
              <button
                key={val}
                type="button"
                onClick={() => adicionarValor(val)}
                className="px-1.5 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded text-[10px] font-mono transition-colors"
                title={`Adicionar +R$${val}`}
              >
                +{val}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1">Categoria</label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className={`${inputCls} cursor-pointer`}
          >
            {categorias.length === 0 && <option value="">Nenhuma categoria cadastrada</option>}
            {categorias.map((c) => (
              <option key={c.id} value={c.name} className="bg-slate-900 text-slate-100">
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1">Data</label>
          <input
            type="date"
            value={occurredAt}
            onChange={(e) => setOccurredAt(e.target.value)}
            className={`${inputCls} cursor-pointer`}
            required
          />
        </div>
      </div>

      {erro && (
        <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
          <span>⚠️</span>
          <span>{erro}</span>
        </div>
      )}

      {/* Botões de Ação */}
      <div className="flex gap-2 pt-1">
        <button
          type="submit"
          disabled={enviando || carregando}
          className={`flex-1 py-2.5 px-4 font-medium text-sm rounded-xl text-white shadow-lg transition-all active:scale-[0.99] disabled:opacity-60 flex items-center justify-center gap-2 ${
            type === 'receita'
              ? 'bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 shadow-emerald-500/20'
              : 'bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-400 hover:to-pink-400 shadow-rose-500/20'
          }`}
        >
          {enviando ? (
            'Salvando transação...'
          ) : modoEdicao ? (
            'Salvar Alterações'
          ) : (
            `Adicionar ${type === 'receita' ? 'Receita' : 'Despesa'}`
          )}
        </button>

        {modoEdicao && (
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 font-medium rounded-xl text-sm transition-colors"
          >
            Cancelar
          </button>
        )}
      </div>
    </form>
  );
}
