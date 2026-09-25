# Livro-Caixa (React + Capacitor + Supabase)

## Configuração

O projeto já inclui `@supabase/supabase-js`. Copie `.env.example` para `.env.local` na raiz e preencha `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY` com os valores do painel do seu projeto Supabase. Reinicie o Vite após alterar o arquivo.

Use apenas a **chave publicável** no aplicativo. Variáveis `VITE_*` entram no bundle e podem ser lidas por quem instala o app. O `.env.local` é ignorado pelo Git, mas não torna a chave secreta. Nunca coloque `service_role`, `sb_secret_*` ou senha de banco no frontend. A chave administrativa pertence somente ao backend.

## Banco e acesso

A tela autentica o usuário e consulta `transactions` e `categories` diretamente com `select`. As consultas filtram `user_id` pelo usuário da sessão. Ative Row Level Security (RLS) nas duas tabelas e crie políticas de `SELECT`, `INSERT` e `DELETE` que permitam acesso apenas quando `auth.uid() = user_id`. O filtro no React melhora a consulta; a política RLS é o controle de acesso efetivo.

As tabelas esperadas são `transactions` (`id`, `user_id`, `type`, `description`, `category`, `amount`, `occurred_at`) e `categories` (`id`, `user_id`, `name`).

## Executar

1. `npm install`
2. `npm run dev`
3. Abra o endereço mostrado pelo Vite, entre com uma conta e confira no DevTools se as consultas a `transactions` e `categories` retornam dados.
4. Para Android: `npm run build` e `npx cap sync android`. Depois execute o projeto no Android Studio.

Se a lista estiver vazia, confira se há registros do usuário autenticado e se as políticas RLS permitem a leitura. A consulta inicial carrega dados atuais da nuvem ao entrar; ela não assina alterações posteriores via Supabase Realtime.
