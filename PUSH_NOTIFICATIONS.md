# Configuração de notificações push

O envio quando o site está fechado usa Firebase Cloud Messaging (FCM) e uma Cloud Function. A configuração precisa ser feita no projeto Firebase antes de publicar o app.

1. No Firebase Console, abra **Configurações do projeto > Cloud Messaging > Configuração da Web Push**, crie/consulte o par de chaves e copie a **chave pública Web Push (VAPID)**. Não use a API key do Firebase nem a chave privada. A chave pública deve ser um ponto P-256 não comprimido (65 bytes; normalmente começa com `B`).
2. Na Vercel, abra o projeto em **Settings > Environment Variables** e crie `VITE_FIREBASE_VAPID_KEY` com esse valor, sem aspas nem espaços. Marque os ambientes em que publica (Production e Preview, se aplicável) e faça um novo deploy: variáveis Vite são incorporadas durante o build, então só salvar a variável não atualiza um deploy existente. Para desenvolvimento local, use a mesma variável no `.env`.
3. No Firebase Console, habilite o Cloud Messaging para o app Web e confirme que Authentication e Firestore estão ativos.
4. Nas regras atuais do Firestore, permita que cada usuário autenticado leia e escreva somente os próprios tokens:

   ```text
   match /pushTokens/{uid}/devices/{deviceId} {
     allow read, write: if request.auth != null && request.auth.uid == uid;
   }
   ```

   Acrescente esse bloco às regras existentes sem substituir as regras das outras coleções.
   As regras da coleção `notificacoes` também devem permitir exclusão para usuários autenticados, respeitando a política de acesso já usada pelo app.
5. No terminal, selecione o projeto Firebase e publique a função:

   ```sh
   firebase use SEU_PROJECT_ID
   npm install --prefix functions
   firebase deploy --only functions:sendNotificationPush
   ```

   A implantação de Cloud Functions exige que o projeto Firebase tenha o faturamento/plano necessário habilitado.
6. Publique o site em HTTPS, faça login em cada PC/celular e abra o menu de notificações. Escolha **Aceitar** para solicitar a permissão nativa do navegador e registrar o dispositivo, ou **Recusar** para não receber push nesse dispositivo. A escolha fica salva por conta e dispositivo; pode ser alterada depois. No iPhone, o site precisa ser adicionado à Tela de Início para receber notificações push.

O botão de lixeira exclui a notificação do Firestore. Os avisos push são enviados para os dispositivos que ativaram notificações para a conta.
