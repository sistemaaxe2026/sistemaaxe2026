export const ROLE_LABELS: Record<string,string> = {
  developer:'Desenvolvedor Principal', dirigente:'Dirigente Espiritual', administrador:'Administrador da Casa',
  tesouraria:'Tesouraria', secretaria:'Secretaria', responsavel_gira:'Responsável por Giras',
  filho_casa:'Filho da Casa', consulente:'Consulente', consulta:'Consulta',
};
export const ROLES = Object.entries(ROLE_LABELS).map(([value,label])=>({value,label}));
export const REQUESTABLE_ROLES = ROLES.filter(role=>!['developer','dirigente','administrador'].includes(role.value));
export type ApprovalStatus = 'pendente'|'ativo'|'recusado'|'suspenso';
