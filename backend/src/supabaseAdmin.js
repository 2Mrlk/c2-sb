import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error(
    'Faltam SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY no .env do backend.'
  );
}

// Cliente admin: usa a service_role key, então ignora RLS.
// Por isso todo o controle de "quem pode ver o quê" é feito
// manualmente nas rotas (sempre filtrando por user_id).
export const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});
