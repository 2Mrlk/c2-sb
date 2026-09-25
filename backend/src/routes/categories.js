import { Router } from 'express';
import { supabaseAdmin } from '../supabaseAdmin.js';

const router = Router();

// GET /api/categories
router.get('/', async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from('categories')
    .select('*')
    .eq('user_id', req.user.id)
    .order('name');

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// POST /api/categories
router.post('/', async (req, res) => {
  const { name, color } = req.body;

  if (!name) return res.status(400).json({ error: 'Campo "name" é obrigatório.' });

  const { data, error } = await supabaseAdmin
    .from('categories')
    .insert({ user_id: req.user.id, name, color: color || '#c9a24b' })
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(data);
});

// DELETE /api/categories/:id
router.delete('/:id', async (req, res) => {
  const { id } = req.params;

  const { error } = await supabaseAdmin
    .from('categories')
    .delete()
    .eq('id', id)
    .eq('user_id', req.user.id);

  if (error) return res.status(500).json({ error: error.message });
  res.status(204).send();
});

export default router;
