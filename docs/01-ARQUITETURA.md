# INZO IA MUTALÊ — Arquitetura inicial

## Objetivo
Portal web responsivo e instalável futuramente (PWA), específico para o INZO IA MUTALÊ (AOM, fundado em 1984). A base foi desenhada com `house_id` para futura expansão multi-institucional, **mas ainda não é produto comercial multi-tenant pronto**.

## Tecnologias
- Next.js 15 (App Router), React 19, TypeScript e CSS responsivo
- Supabase Auth / PostgreSQL / RLS (configuração e execução futuras)
- GitHub para versionamento e Vercel para eventual deploy (nenhuma operação remota realizada)

## Módulos mapeados
1. Visão geral / Dashboard
2. Gestão da Casa
3. Filhos da Casa
4. Consulentes
5. Giras e Trabalhos
6. Fila Digital
7. Financeiro e Mensalidades
8. Doações
9. Estoque e Insumos
10. Festas e Eventos
11. Doutrina e Biblioteca
12. Comunicados
13. Relatórios
14. Administração (aprovação e RBAC)
15. Configurações

## Situação real de cada frente
**Estruturado**: arquitetura de componentes e rotas, tema institucional, tela de login + solicitação, validações básicas, fluxo Auth com verificação de aprovação, dashboard condicional, painel de aprovações, SQL inicial com RLS e RBAC, fluxo ilustrativo e documentação.

**Ainda não implementado**: formulários completos e CRUD dos módulos de negócio, pagamentos, geração de PDFs, notificações automáticas, PWA/offline, testes automatizados, importações, multi-tenant comercial, monitoramento e integrações WhatsApp. Telas de negócio mostram explicitamente “Estrutura planejada”.

## Regra provisória de aprovação
- `developer`: pode aprovar perfis abaixo dele (nunca promove outro developer via UI).
- `dirigente`: aprova perfis tesouraria, secretaria, responsável por giras, filho da casa, consulente e consulta.
- `administrador`: não aprova por padrão, até confirmação do responsável.
- Todos os novos usuários entram em `pendente`, independentemente do perfil selecionado na solicitação.
- A permissão efetiva é verificada em PostgreSQL com RLS + RPC. O bloqueio de navegação no frontend é complementar.

## Cuidados de produção
- Finalizar os documentos de termos e privacidade antes de abrir inscrições.
- Estabelecer procedimento seguro de bootstrap, sem colocar credenciais master no código.
- Confirmar política do Supabase Auth: autenticação sem verificação obrigatória de e-mail exige configuração explícita. A aprovação interna não substitui prevenção a cadastros fraudulentos.
- Bloquear anexos sensíveis e elaborar políticas Storage por módulo antes de permitir uploads.
- Revisar LGPD por tratar dados que podem revelar crença religiosa (dados pessoais sensíveis).
- Implementar verificações de integridade entre entidades por `house_id` antes de comercializar multi-tenant.
- Configurar proteção anti-abuso (captcha/rate limiting) antes de produção.
- Executar testes de migrations e de permissões com banco temporário antes de aplicar em produção.
