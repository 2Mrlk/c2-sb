import 'dotenv/config';
import express from 'express';
import cors from 'cors';

import { requireAuth } from './middleware/auth.js';
import transactionsRouter from './routes/transactions.js';
import categoriesRouter from './routes/categories.js';

const app = express();

app.use(cors({ origin: process.env.CORS_ORIGIN || '*' }));
app.use(express.json());

// Healthcheck (não exige login, útil pra saber se o servidor está de pé)
app.get('/health', (req, res) => res.json({ ok: true }));

// Tudo em /api/* exige um token válido do Supabase (Authorization: Bearer <token>)
app.use('/api/transactions', requireAuth, transactionsRouter);
app.use('/api/categories', requireAuth, categoriesRouter);

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Erro interno do servidor.' });
});

const port = process.env.PORT || 3333;
app.listen(port, () => {
  console.log(`Backend rodando em http://localhost:${port}`);
});
