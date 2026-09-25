import { useState } from 'react';
import { supabase } from '../services/supabaseClient';

export default function Auth() {
  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [erro, setErro] = useState(null);
  const [aviso, setAviso] = useState(null);
  const [carregando, setCarregando] = useState(false);

  async function handleLogin(e) {
    e.preventDefault();
    setErro(null);
    setCarregando(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setErro(error.message);
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
        setAviso('Se o cadastro foi aceito, enviamos um link de confirmação para seu e-mail. Verifique também a caixa de spam.');
      }
    } catch (error) {
      setErro(error.message || 'Não foi possível conectar ao Supabase.');
    } finally {
      setCarregando(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-sm bg-[#212b39] border border-[#3a4658] rounded-2xl p-8">
        <h1 className="font-serif text-2xl font-semibold mb-1">Livro-Caixa</h1>
        <p className="text-[#9aa3b0] text-sm mb-6">
          {mode === 'login' ? 'Entre na sua conta' : 'Crie sua conta'}
        </p>

        <form onSubmit={mode === 'login' ? handleLogin : handleRegister} className="space-y-3">
          {mode === 'register' && (
            <input
              type="text"
              placeholder="Nome"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full bg-[#1c2430] border border-[#3a4658] rounded-lg px-3 py-2 text-sm"
            />
          )}
          <input
            type="email"
            placeholder="E-mail"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full bg-[#1c2430] border border-[#3a4658] rounded-lg px-3 py-2 text-sm"
          />
          <input
            type="password"
            placeholder="Senha"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            className="w-full bg-[#1c2430] border border-[#3a4658] rounded-lg px-3 py-2 text-sm"
          />

          {erro && <p className="text-[#c1594c] text-sm bg-[#4d3733] rounded p-2">{erro}</p>}
          {aviso && <p className="text-[#5fa87a] text-sm bg-[#3a4d40] rounded p-2">{aviso}</p>}

          <button
            type="submit"
            disabled={carregando}
            className="w-full bg-[#c9a24b] text-[#1c2430] font-semibold rounded-lg py-2 disabled:opacity-60"
          >
            {carregando ? 'Aguarde...' : mode === 'login' ? 'Entrar' : 'Cadastrar'}
          </button>
        </form>

        <button
          onClick={() => {
            setMode(mode === 'login' ? 'register' : 'login');
            setErro(null);
            setAviso(null);
          }}
          className="w-full text-center text-xs text-[#9aa3b0] mt-4 underline"
        >
          {mode === 'login' ? 'Não tem conta? Cadastre-se' : 'Já tem conta? Entrar'}
        </button>
      </div>
    </div>
  );
}
