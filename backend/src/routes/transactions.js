import { Router } from 'express';
import { supabaseAdmin } from '../supabaseAdmin.js';

const router = Router();

// GET /api/transactions
router.get('/', async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from('transactions')
    .select('*')
    .eq('user_id', req.user.id)
    .order('occurred_at', { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// POST /api/transactions
router.post('/', async (req, res) => {
  const { type, description, category, amount } = req.body;

  if (!type || !description || !category || amount === undefined) {
    return res.status(400).json({ error: 'Campos obrigatórios: type, description, category, amount.' });
  }
  if (!['receita', 'despesa'].includes(type)) {
    return res.status(400).json({ error: "type deve ser 'receita' ou 'despesa'." });
  }
  if (Number(amount) < 0) {
    return res.status(400).json({ error: 'amount não pode ser negativo.' });
  }

  const { data, error } = await supabaseAdmin
    .from('transactions')
    .insert({
      user_id: req.user.id,
      type,
      description,
      category,
      amount,
    })
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(data);
});

// PATCH /api/transactions/:id
router.patch('/:id', async (req, res) => {
  const { id } = req.params;
  const { description, category, amount, type } = req.body;

  const updates = {};
  if (description !== undefined) updates.description = description;
  if (category !== undefined) updates.category = category;
  if (amount !== undefined) updates.amount = amount;
  if (type !== undefined) updates.type = type;

  const { data, error } = await supabaseAdmin
    .from('transactions')
    .update(updates)
    .eq('id', id)
    .eq('user_id', req.user.id) // garante que só edita o que é dele
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  if (!data) return res.status(404).json({ error: 'Transação não encontrada.' });
  res.json(data);
});

// DELETE /api/transactions/:id
router.delete('/:id', async (req, res) => {
  const { id } = req.params;

  const { error } = await supabaseAdmin
    .from('transactions')
    .delete()
    .eq('id', id)
    .eq('user_id', req.user.id);

  if (error) return res.status(500).json({ error: error.message });
  res.status(204).send();
});

// GET /api/transactions/summary — totais prontos (evita recalcular no front)
router.get('/summary', async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from('transactions')
    .select('type, amount')
    .eq('user_id', req.user.id);

  if (error) return res.status(500).json({ error: error.message });

  const income = data.filter((t) => t.type === 'receita').reduce((s, t) => s + Number(t.amount), 0);
  const expense = data.filter((t) => t.type === 'despesa').reduce((s, t) => s + Number(t.amount), 0);

  res.json({ income, expense, balance: income - expense });
});

export default router;
