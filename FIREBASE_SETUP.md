# Configuração do Firebase — 3dXess

Esta integração mantém **todos os dados no Firebase**. O Cloudflare Worker é somente uma API serverless e chama o Firestore pela API REST. Não há Cloudflare D1, KV ou outro banco.

## 1. Ativar serviços no Firebase

No projeto `xesss-2fcbf`:

1. Em **Authentication → Sign-in method**, habilite **Email/Password**. Não habilite Google Sign-In.
2. Em **Firestore Database**, crie o banco em modo de produção.
3. Em **Firestore Database → Rules**, publique o conteúdo de `firestore.rules`.
4. Não habilite verificação obrigatória de e-mail.
5. Confirme que a API **Cloud Firestore API** está habilitada no projeto Google Cloud.

O Firebase Authentication só armazena a credencial (e-mail e senha). O documento público do perfil é criado pelo Worker no Firestore.

### Realtime Database (opcional)

O SDK já aceita a variável `VITE_FIREBASE_DATABASE_URL`, mas a presença ainda é opcional. Para habilitá-la:

1. Crie uma instância em **Realtime Database**.
2. Publique `database.rules.json` na aba **Rules**.
3. Cadastre a URL exibida pelo Firebase em `VITE_FIREBASE_DATABASE_URL`, tanto no ambiente local quanto em GitHub Actions → Variables.

As partidas atuais continuam usando a implementação P2P existente; esta integração não migra o protocolo de partida para Realtime Database.

## 2. Variáveis do frontend

Copie `.env.example` para `.env.local` e preencha as variáveis vazias. O arquivo `.env.local` é ignorado pelo Git.

No GitHub, em **Settings → Secrets and variables → Actions → Variables**, configure:

- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`
- `VITE_ACCOUNT_API_URL` (depois de publicar o Worker)
- `VITE_FIREBASE_DATABASE_URL` (somente se criar o Realtime Database)

A configuração Web do Firebase é enviada ao navegador pelo próprio SDK. A API Key Web não substitui regras de segurança e não é uma credencial administrativa. Nunca coloque uma chave privada de conta de serviço no `.env.local` do frontend, no GitHub Pages ou em qualquer arquivo `VITE_*`.

## 3. Preparar uma conta de serviço para o Worker

O Worker precisa gravar documentos privados e criar custom tokens. Para isso, use uma conta de serviço do **mesmo projeto Firebase**:

1. Abra **Google Cloud Console → IAM e administrador → Contas de serviço** no projeto `xesss-2fcbf`.
2. Crie uma conta de serviço dedicada ao 3dXess.
3. Conceda a função **Cloud Datastore User** (`roles/datastore.user`), que dá acesso aos documentos do Firestore.
4. Gere uma chave JSON e guarde-a fora do repositório. Ela contém uma chave privada e nunca deve ser enviada ao GitHub ou ao frontend.

## 4. Publicar o Worker sem D1

Pré-requisitos: conta Cloudflare gratuita, Node.js e acesso ao terminal.

Na raiz do projeto:

```bash
npx wrangler@4 login
npx wrangler@4 deploy --config cloudflare/worker/wrangler.toml
```

Depois, configure os três secrets. O Wrangler solicitará os valores no terminal:

```bash
npx wrangler@4 secret put FIREBASE_SERVICE_ACCOUNT_JSON --config cloudflare/worker/wrangler.toml
npx wrangler@4 secret put FIREBASE_API_KEY --config cloudflare/worker/wrangler.toml
npx wrangler@4 secret put TOTP_ENCRYPTION_KEY --config cloudflare/worker/wrangler.toml
```

- Em `FIREBASE_SERVICE_ACCOUNT_JSON`, cole o conteúdo completo do JSON da conta de serviço.
- Em `FIREBASE_API_KEY`, cole a API Key Web do Firebase.
- Para `TOTP_ENCRYPTION_KEY`, gere uma chave aleatória com `openssl rand -base64 32` e cole o resultado. Guarde uma cópia segura: perder essa chave impede descriptografar os segredos TOTP salvos no Firestore.

Após configurar os secrets, faça novo deploy:

```bash
npx wrangler@4 deploy --config cloudflare/worker/wrangler.toml
```

O endpoint de saúde deve responder em `https://3dxess-account-api.<seu-subdominio>.workers.dev/health`.

Cadastre a URL base do Worker como variável **`VITE_ACCOUNT_API_URL`** em GitHub Actions → Variables. No ambiente local, adicione a mesma URL ao `.env.local`. Execute novamente o workflow **Build e deploy no GitHub Pages** para recompilar o frontend com a URL.

## 5. Fluxo de conta implementado

- Cadastro com username exclusivo, e-mail e senha.
- Login com e-mail/senha ou username/senha.
- Sem login Google e sem verificação de e-mail.
- Configuração obrigatória de TOTP (Google Authenticator ou outro aplicativo compatível) antes de liberar o perfil.
- Recuperação de senha exclusivamente por username/e-mail e um código TOTP válido.
- Segredo TOTP criptografado com AES-GCM antes de ser salvo no Firestore; a chave AES fica apenas nos secrets do Worker.
- Códigos TOTP usados na confirmação e recuperação não podem ser reutilizados.
- Os índices de username/e-mail, e-mail privado e segredo TOTP não podem ser lidos pelo navegador, conforme `firestore.rules`.

**Atenção:** não existe recuperação alternativa por e-mail. Oriente os jogadores a manterem o autenticador e uma cópia de recuperação do segredo em local seguro. Quem perder o autenticador e o segredo não conseguirá recuperar a conta.

## 6. Dados e classificação

O Firestore usa estas coleções:

- `users/{uid}`: perfil público, username, rating, nível, XP, patente e estatísticas agregadas.
- `privateUsers/{uid}`: e-mail privado.
- `usernameIndex/{usernameNormalizado}`: associação privada entre username e UID.
- `emailIndex/{sha256DoEmail}`: índice privado para recuperação.
- `totpSecrets/{uid}`: segredo TOTP cifrado e contador anti-replay.

Os perfis começam com rating 1000, nível 1, XP 0 e patente Bronze. A tela lê os dez primeiros perfis do ranking. **Os resultados das partidas ainda não alteram Elo, XP, nível ou estatísticas**: o modo online atual é P2P e ainda não há validação confiável de resultados no backend. Não libere escrita dessas pontuações pelo navegador.

## 7. Proteção contra abuso

Antes de anunciar publicamente o cadastro, configure regras de rate limiting no Cloudflare para `/auth/username-login` e `/auth/recover`. O Worker inclui uma limitação simples em memória por instância, que não substitui uma regra distribuída da plataforma.

A proteção CORS limita as origens do frontend publicado e do Vite local. Isso não substitui autenticação, validação de tokens ou as regras do Firestore.
