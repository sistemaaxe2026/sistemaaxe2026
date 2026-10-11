import type { SupabaseClient } from '@supabase/supabase-js';
export type Profile = {id:string;full_name:string;status:string;role:string|null;house_id:string;requested_role:string;email:string};
export async function getCurrentAccess(sb:SupabaseClient):Promise<{profile:Profile; permissions:string[]} | null> {
  const {data:auth,error} = await sb.auth.getUser();
  if(error||!auth.user)return null;
  const {data:profile,error:profileError} = await sb.from('profiles').select('id,full_name,status,role,house_id,requested_role,email').eq('id',auth.user.id).single();
  if(profileError||!profile||profile.status!=='ativo')return null;
  const {data:permissionData,error:permissionError} = await sb.rpc('my_permissions');
  if(permissionError) return {profile:profile as Profile,permissions:[]};
  return {profile:profile as Profile,permissions:(permissionData||[]).map((p:{permission:string})=>p.permission)};
}
