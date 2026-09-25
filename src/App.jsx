import { useEffect, useState } from 'react';
import { supabase } from './services/supabaseClient';
import Auth from './components/Auth';

const fmt = (n) => Number(n || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export default function App() {
  const [session, setSession] = useState(null);
  const [sessionCarregando, setSessionCarregando] = useState(true);

  const [transacoes, setTransacoes] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(null);

  const [desc, setDesc] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [type, setType] = useState('despesa');

  // --- Sessão de autenticação ---
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

  // --- Busca de dados na nuvem (Supabase), equivalente ao seu snippet original ---
  useEffect(() => {
    if (!session) {
      setTransacoes([]);
      setCategorias([]);
      setCarregando(false);
      return;
    }

    async function buscarDados() {
      try {
        setCarregando(true);
        setErro(null);

        const { data: txs, error: txError } = await supabase
          .from('transactions')
          .select('*')
          .eq('user_id', session.user.id)
          .order('occurred_at', { ascending: false });

        if (txError) throw txError;

        const { data: cats, error: catError } = await supabase
          .from('categories')
          .select('*')
          .eq('user_id', session.user.id)
          .order('name');

        if (catError) throw catError;

        setTransacoes(txs || []);
        setCategorias(cats || []);
        if (cats && cats.length && !category) setCategory(cats[0].name);
      } catch (err) {
        console.error('Erro na busca:', err.message);
        setErro(err.message);
      } finally {
        setCarregando(false);
      }
    }

    buscarDados();
  }, [session]);

  async function adicionarTransacao(e) {
    e.preventDefault();
    if (!desc.trim() || !amount || !category) return;

    const { data, error } = await supabase
      .from('transactions')
      .insert({
        user_id: session.user.id,
        type,
        description: desc.trim(),
        category,
        amount: parseFloat(amount),
      })
      .select()
      .single();

    if (error) {
      setErro(error.message);
      return;
    }

    setTransacoes([data, ...transacoes]);
    setDesc('');
    setAmount('');
  }

  async function removerTransacao(id) {
    const { error } = await supabase.from('transactions').delete().eq('id', id);
    if (error) {
      setErro(error.message);
      return;
    }
    setTransacoes(transacoes.filter((t) => t.id !== id));
  }

  if (sessionCarregando) return null;
  if (!session) return <Auth />;

  const income = transacoes.filter((t) => t.type === 'receita').reduce((s, t) => s + Number(t.amount), 0);
  const expense = transacoes.filter((t) => t.type === 'despesa').reduce((s, t) => s + Number(t.amount), 0);
  const balance = income - expense;

  return (
    <div className="min-h-screen p-6 max-w-3xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="font-serif text-2xl font-semibold">⚡ Livro-Caixa (Supabase)</h1>
        <button
          onClick={() => supabase.auth.signOut()}
          className="text-xs text-[#9aa3b0] underline"
        >
          Sair
        </button>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="bg-[#212b39] border border-[#3a4658] rounded-xl p-4">
          <p className="text-xs text-[#9aa3b0]">Saldo</p>
          <p className={`font-mono font-semibold ${balance >= 0 ? 'text-[#5fa87a]' : 'text-[#c1594c]'}`}>{fmt(balance)}</p>
        </div>
        <div className="bg-[#212b39] border border-[#3a4658] rounded-xl p-4">
          <p className="text-xs text-[#9aa3b0]">Receitas</p>
          <p className="font-mono font-semibold text-[#5fa87a]">{fmt(income)}</p>
        </div>
        <div className="bg-[#212b39] border border-[#3a4658] rounded-xl p-4">
          <p className="text-xs text-[#9aa3b0]">Despesas</p>
          <p className="font-mono font-semibold text-[#c1594c]">{fmt(expense)}</p>
        </div>
      </div>

      <form onSubmit={adicionarTransacao} className="bg-[#212b39] border border-[#3a4658] rounded-xl p-4 mb-6 space-y-3">
        <div className="flex gap-2">
          <label className="flex items-center gap-1 text-sm">
            <input type="radio" checked={type === 'despesa'} onChange={() => setType('despesa')} /> Despesa
          </label>
          <label className="flex items-center gap-1 text-sm">
            <input type="radio" checked={type === 'receita'} onChange={() => setType('receita')} /> Receita
          </label>
        </div>
        <input
          type="text"
          placeholder="Descrição"
          value={desc}
          onChange={(e) => setDesc(e.target.value)}
          className="w-full bg-[#1c2430] border border-[#3a4658] rounded-lg px-3 py-2 text-sm"
        />
        <div className="flex gap-2">
          <input
            type="number"
            step="0.01"
            placeholder="Valor"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="flex-1 bg-[#1c2430] border border-[#3a4658] rounded-lg px-3 py-2 text-sm"
          />
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="flex-1 bg-[#1c2430] border border-[#3a4658] rounded-lg px-3 py-2 text-sm"
          >
            {categorias.map((c) => (
              <option key={c.id} value={c.name}>{c.name}</option>
            ))}
          </select>
        </div>
        <button type="submit" className="w-full bg-[#c9a24b] text-[#1c2430] font-semibold rounded-lg py-2">
          Lançar
        </button>
      </form>

      {carregando && <p className="text-[#9aa3b0]">Carregando dados da nuvem...</p>}
      {erro && <p className="text-[#c1594c] bg-[#4d3733] p-3 rounded mb-3">Erro: {erro}</p>}

      {!carregando && !erro && (
        <ul className="space-y-2">
          {transacoes.length === 0 && <li className="text-[#9aa3b0]">Nenhuma transação encontrada na nuvem.</li>}
          {transacoes.map((t) => (
            <li key={t.id} className="bg-[#212b39] border border-[#3a4658] rounded-lg p-3 flex justify-between items-center">
              <div>
                <p className="font-medium">{t.description}</p>
                <p className="text-xs text-[#9aa3b0]">{t.category} · {new Date(t.occurred_at).toLocaleDateString('pt-BR')}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className={`font-mono font-semibold ${t.type === 'receita' ? 'text-[#5fa87a]' : 'text-[#c1594c]'}`}>
                  {t.type === 'receita' ? '+' : '−'} {fmt(t.amount)}
                </span>
                <button onClick={() => removerTransacao(t.id)} className="text-xs text-[#9aa3b0] underline">
                  excluir
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
