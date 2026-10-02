import { useState } from 'react';
import { supabase } from '../services/supabaseClient';

/**
 * Gerenciador moderno de Categorias (CRUD).
 */
export default function CategoryManager({ userId, categorias, onUpdate }) {
  const [aberto, setAberto]         = useState(false);
  const [novaCateg, setNovaCateg]   = useState('');
  const [editandoId, setEditandoId] = useState(null);
  const [editNome, setEditNome]     = useState('');
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro]             = useState(null);

  const CATEGORIAS_PADRAO = [
    '🍔 Alimentação',
    '🚗 Transporte',
    '🏠 Moradia',
    '💊 Saúde',
    '🎓 Educação',
    '🎮 Lazer',
    '💼 Salário',
    '📈 Investimentos',
    '🛍️ Compras',
    '💡 Contas & Serviços',
  ];

  async function handleGerarPadroes() {
    setCarregando(true);
    setErro(null);
    try {
      const novas = CATEGORIAS_PADRAO.filter(
        (padrao) => !categorias.some((c) => c.name.toLowerCase() === padrao.toLowerCase())
      );
      if (novas.length === 0) {
        setErro('Todas as categorias padrão já foram adicionadas!');
        setCarregando(false);
        return;
      }
      const registros = novas.map((nome) => ({
        user_id: userId,
        name: nome,
      }));
      const { error } = await supabase.from('categories').insert(registros);
      if (error) throw error;
      onUpdate();
    } catch (err) {
      setErro(err.message);
    } finally {
      setCarregando(false);
    }
  }

  const inputCls = 'flex-1 bg-slate-950/60 border border-slate-700/80 rounded-xl px-3.5 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500 transition-all';

  // --- CREATE ---
  async function handleCriar(e) {
    e.preventDefault();
    const nome = novaCateg.trim();
    if (!nome) return;
    if (categorias.some((c) => c.name.toLowerCase() === nome.toLowerCase())) {
      setErro('Já existe uma categoria com esse nome.');
      return;
    }
    setCarregando(true);
    setErro(null);
    const { error } = await supabase
      .from('categories')
      .insert({ user_id: userId, name: nome });
    if (error) {
      setErro(error.message);
    } else {
      setNovaCateg('');
      onUpdate();
    }
    setCarregando(false);
  }

  // --- UPDATE ---
  async function handleAtualizar(id) {
    const nome = editNome.trim();
    if (!nome) return;
    if (categorias.some((c) => c.id !== id && c.name.toLowerCase() === nome.toLowerCase())) {
      setErro('Já existe uma categoria com esse nome.');
      return;
    }
    setCarregando(true);
    setErro(null);
    const { error } = await supabase
      .from('categories')
      .update({ name: nome })
      .eq('id', id)
      .eq('user_id', userId);
    if (error) {
      setErro(error.message);
    } else {
      setEditandoId(null);
      setEditNome('');
      onUpdate();
    }
    setCarregando(false);
  }

  // --- DELETE ---
  async function handleDeletar(id) {
    if (!window.confirm('Remover esta categoria? As transações existentes com ela permanecerão salvas.')) return;
    setCarregando(true);
    setErro(null);
    const { error } = await supabase
      .from('categories')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);
    if (error) {
      setErro(error.message);
    } else {
      onUpdate();
    }
    setCarregando(false);
  }

  return (
    <div className="bg-slate-900/60 backdrop-blur-md border border-slate-800/80 rounded-2xl p-4 mb-6 transition-all">
      <button
        onClick={() => { setAberto(!aberto); setErro(null); }}
        className="w-full flex justify-between items-center text-sm font-semibold text-slate-200 hover:text-white transition-colors"
      >
        <span className="flex items-center gap-2">
          <span>🏷️</span>
          <span>Categorias</span>
          <span className="text-xs bg-slate-800 text-slate-400 font-mono px-2 py-0.5 rounded-full border border-slate-700">
            {categorias.length}
          </span>
        </span>
        <span className="text-xs text-slate-400 flex items-center gap-1">
          {aberto ? 'Ocultar ▲' : 'Gerenciar ▼'}
        </span>
      </button>

      {aberto && (
        <div className="mt-4 pt-3 border-t border-slate-800/80 space-y-3">
          {/* Criar nova categoria */}
          <form onSubmit={handleCriar} className="flex gap-2">
            <input
              type="text"
              placeholder="Criar nova categoria..."
              value={novaCateg}
              onChange={(e) => setNovaCateg(e.target.value)}
              className={inputCls}
            />
            <button
              type="submit"
              disabled={carregando || !novaCateg.trim()}
              className="px-4 py-2 bg-gradient-to-r from-amber-400 via-amber-500 to-yellow-600 hover:from-amber-300 hover:to-amber-500 text-slate-950 font-bold rounded-xl text-sm disabled:opacity-60 transition-colors shadow-sm"
            >
              Criar
            </button>
          </form>

          {/* Botão de gerar padrões */}
          <button
            type="button"
            onClick={handleGerarPadroes}
            disabled={carregando}
            className="w-full py-2 px-3 bg-slate-800/80 hover:bg-slate-800 border border-slate-700 hover:border-amber-500/50 text-slate-300 hover:text-amber-300 text-xs font-medium rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-60"
          >
            <span>✨</span>
            <span>Gerar 10 categorias padrão com emojis</span>
          </button>

          {erro && (
            <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs">
              {erro}
            </div>
          )}

          {/* Lista de categorias */}
          {categorias.length === 0 ? (
            <p className="text-slate-500 text-xs text-center py-2">
              Nenhuma categoria criada. Clique acima para gerar as padrões!
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 max-h-60 overflow-y-auto pr-1">
              {categorias.map((c) => (
                <div
                  key={c.id}
                  className="flex items-center justify-between gap-2 bg-slate-950/40 border border-slate-800/80 rounded-xl px-3 py-2 text-xs"
                >
                  {editandoId === c.id ? (
                    <div className="flex items-center gap-1.5 w-full">
                      <input
                        type="text"
                        value={editNome}
                        onChange={(e) => setEditNome(e.target.value)}
                        className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
                        autoFocus
                      />
                      <button
                        onClick={() => handleAtualizar(c.id)}
                        disabled={carregando}
                        className="text-emerald-400 hover:text-emerald-300 font-medium px-1"
                      >
                        ✓
                      </button>
                      <button
                        onClick={() => { setEditandoId(null); setEditNome(''); }}
                        className="text-slate-400 hover:text-slate-300 px-1"
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <>
                      <span className="font-medium text-slate-200 truncate">{c.name}</span>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          onClick={() => { setEditandoId(c.id); setEditNome(c.name); setErro(null); }}
                          className="text-slate-400 hover:text-slate-200 p-1 transition-colors"
                          title="Editar"
                        >
                          ✏️
                        </button>
                        <button
                          onClick={() => handleDeletar(c.id)}
                          disabled={carregando}
                          className="text-rose-400/80 hover:text-rose-300 p-1 transition-colors"
                          title="Excluir"
                        >
                          🗑️
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
