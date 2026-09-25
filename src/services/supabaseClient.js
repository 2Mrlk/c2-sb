import { createClient } from '@supabase/supabase-js';

// Resgatando as variáveis injetadas em tempo de execução pelo Vite
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

// Instanciando e exportando o cliente de dados
if (!supabaseUrl || !supabaseKey) {
  throw new Error('Configure VITE_SUPABASE_URL e VITE_SUPABASE_PUBLISHABLE_KEY no .env.local.');
}

export const supabase = createClient(supabaseUrl, supabaseKey);
