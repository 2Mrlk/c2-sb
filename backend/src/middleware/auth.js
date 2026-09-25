import { supabaseAdmin } from '../supabaseAdmin.js';

/**
 * Espera um header:  Authorization: Bearer <access_token>
 * O access_token é o mesmo que o supabase-js gera no front (session.access_token).
 * Aqui validamos esse token contra o Supabase e anexamos o usuário em req.user.
 */
export async function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: 'Token de acesso ausente.' });
  }

  const { data, error } = await supabaseAdmin.auth.getUser(token);

  if (error || !data?.user) {
    return res.status(401).json({ error: 'Token inválido ou expirado.' });
  }

  req.user = data.user;
  next();
}
