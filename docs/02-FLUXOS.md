# Fluxos do Sistema

## Login
1. Usuário informa e-mail/senha.
2. Supabase valida credenciais.
3. Consulta de `profiles.status`.
4. Se `ativo`, segue ao `/painel`; caso contrário, encerra a sessão e apresenta aviso.
5. RLS impõe autorizações efetivas de leitura/escrita por módulo.

## Primeiro acesso
1. Na mesma tela, usuário abre a guia “Solicitar primeiro acesso”.
2. Informa nome, e-mail, vínculo pretendido e senha forte.
3. Supabase Auth registra a conta; trigger cria `profiles` com status `pendente`.
4. Dirigente ou Desenvolvedor autorizado analisa a solicitação no módulo Administração.
5. RPC `review_access_request` valida hierarquia e registra a ação.
6. Aprovado: situação `ativo`; recusado: `recusado`.

## Recuperação de senha
Supabase Auth envia instruções de redefinição. **Antes de produção**: adicionar tela de confirmação com código/token e troca de senha usando o fluxo recomendado pela versão adotada do Supabase.

## Segurança e governança
- Nenhum usuário escolhe efetivamente seu próprio nível de acesso: ele apenas solicita o vínculo.
- Desenvolvedor só pode ser criado por procedimento administrativo seguro e auditado.
- Senha não é guardada na tabela de perfis.
- Dados financeiros e de consulentes exigem permissão específica.
- Solicitações nunca tornam um perfil ativo automaticamente.
