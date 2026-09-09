// As duas funções abaixo leem `process.env.NEXT_PUBLIC_*` por acesso
// direto (nunca `process.env[nome]`) de propósito: o Next só consegue
// substituir essas variáveis no bundle do navegador quando o acesso é
// estático (`process.env.X`) — acesso dinâmico via variável vira
// `undefined` no cliente mesmo com o `.env.local` correto.

export function supabaseUrl(): string {
  const valor = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!valor) {
    throw new Error(
      "Variável de ambiente NEXT_PUBLIC_SUPABASE_URL não definida. Copie .env.example para .env.local e preencha com os valores de Project Settings > Data API no Supabase."
    );
  }
  return valor;
}

export function supabaseAnonKey(): string {
  const valor = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!valor) {
    throw new Error(
      "Variável de ambiente NEXT_PUBLIC_SUPABASE_ANON_KEY não definida. Copie .env.example para .env.local e preencha com os valores de Project Settings > Data API no Supabase."
    );
  }
  return valor;
}
