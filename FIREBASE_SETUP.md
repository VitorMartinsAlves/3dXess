# Configuração do Firebase — 3dXess

A arquitetura desta versão é inteiramente estática no GitHub Pages, com **Firebase Authentication** para contas e **Cloud Firestore** para perfis e ranking. Não há servidor próprio, Cloudflare Worker, Cloudflare D1 ou conta de serviço necessária.

## 1. Firebase Authentication

No projeto `xesss-2fcbf`:

1. Em **Authentication → Método de login**, habilite **E-mail/senha**.
2. Não habilite o login Google.
3. Não é necessário exigir verificação de e-mail.
4. Em **Authentication → Configurações → Domínios autorizados**, mantenha `vitormartinsalves.github.io`.

O cadastro e o login usam o e-mail e a senha do Firebase Authentication. O nome de jogador é apenas um identificador público de exibição; não é usado para autenticação e pode se repetir.

## 2. Recuperação de senha

A página usa a função nativa `sendPasswordResetEmail` do Firebase Authentication. O Firebase envia um e-mail com o link para redefinir a senha. Não é necessário TOTP, Cloudflare, backend ou serviço de envio de e-mail próprio.

O modelo da mensagem pode ser ajustado em **Authentication → Modelos → Redefinição de senha**. Confirme que o domínio do GitHub Pages está autorizado para que os links de ação funcionem.

## 3. Cloud Firestore

O aplicativo usa a coleção:

- `users/{uid}`: nome público, rating, nível, XP, patente e estatísticas agregadas.

O e-mail fica no Firebase Authentication e não é copiado para o perfil público. O cadastro cria o próprio documento do usuário no Firestore, e as regras limitam os valores iniciais a rating 1000, nível 1, XP 0, patente Bronze e estatísticas zeradas.

Publique as regras atuais do arquivo `firestore.rules` em **Firestore Database → Regras**. Elas permitem ler perfis públicos, criar apenas o próprio perfil com valores iniciais fixos e impedem alterações no rating, XP, nível e estatísticas pelo navegador.

**Atenção à região:** o banco existente foi criado em `nam5` (América do Norte). O Firestore não permite alterar a região de um banco já criado. Ele continua funcionando, mas novos dados permanecerão nessa localização.

## 4. Variáveis do frontend

Em GitHub → **Settings → Secrets and variables → Actions → Variables**, configure:

- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`

A configuração Web do Firebase é usada pelo SDK no navegador. A API Key Web não é uma credencial administrativa; a segurança dos dados depende das regras do Firestore. Nunca coloque chaves privadas em variáveis `VITE_*`.

Não configure `VITE_ACCOUNT_API_URL`. O aplicativo não chama APIs externas para criar contas ou recuperar senhas.

## 5. Dados e classificação

Os perfis começam com rating 1000, nível 1, XP 0 e patente Bronze. A tela consulta os dez primeiros perfis no ranking.

**Os resultados das partidas ainda não alteram Elo, XP, nível ou estatísticas.** O modo online atual é P2P e ainda não possui validação confiável de resultados. As regras impedem que o navegador altere essas pontuações diretamente.

## 6. Serviços que não são necessários

Não é necessário criar conta de serviço do Google Cloud, chave JSON, Worker, D1, KV ou secrets de backend. A recuperação de senha é enviada pelo próprio Firebase Authentication.
