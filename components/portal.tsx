'use client';
import { useEffect,useState, type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Archive, ArrowUpRight, Bell, BookOpen, Building2, CalendarDays, ChartColumn, CheckCircle2, ClipboardCheck, HandHeart, LayoutDashboard, ListOrdered, Loader2, LockKeyhole, LogOut, Megaphone, PackageSearch, PartyPopper, Settings2, ShieldCheck, UserRound, Users, Wallet, type LucideIcon } from 'lucide-react';
import { supabaseClient } from '@/lib/supabase';
import { getCurrentAccess, type Profile } from '@/lib/access';
import { MODULES,GROUPS,type ModuleItem } from '@/lib/modules';
import { ROLE_LABELS,ROLES } from '@/lib/roles';
const ICONS:Record<string,LucideIcon>={Archive,ArrowUpRight,Bell,BookOpen,Building2,CalendarDays,ChartColumn,CheckCircle2,ClipboardCheck,HandHeart,LayoutDashboard,ListOrdered,Loader2,LockKeyhole,LogOut,Megaphone,PackageSearch,PartyPopper,Settings2,ShieldCheck,UserRound,Users,Wallet};
function Icon({name,size=17}:{name:string;size?:number}){const Target=ICONS[name]||Archive;return <Target size={size}/>}
export default function Portal({moduleSlug}:{moduleSlug?:string}) {
  const [profile,setProfile] = useState<Profile|null>(null);
  const [permissions,setPermissions] = useState<string[]>([]);
  const [ready,setReady] = useState(false);
  const path=usePathname();
  useEffect(()=>{let live=true; (async()=>{const sb=supabaseClient();if(!sb){if(live)setReady(true);return;}
    const access=await getCurrentAccess(sb);if(!live)return;
    if(!access){window.location.replace('/login');return;}
    setProfile(access.profile);setPermissions(access.permissions);setReady(true);
  })();return()=>{live=false}},[]);
  const allowed=(permission:string)=> profile?.role==='developer'||permissions.includes(permission);
  const visible=MODULES.filter(m=>allowed(m.permission));
  const selected=MODULES.find(m=>m.slug===moduleSlug);
  const signOut=async()=>{await supabaseClient()?.auth.signOut();window.location.replace('/login')};
  if(!ready)return <div style={{display:'grid',placeItems:'center',minHeight:'100vh',color:'#37654c'}}><Loader2 size={28}/><p>Carregando perfil...</p></div>;
  if(!profile)return <div className="error-note" style={{margin:30}}>Ambiente demonstrativo sem autenticação configurada. Para acesso real, configure o Supabase e conclua a aprovação do perfil. <Link href="/login">Voltar</Link></div>;
  return <div className="portal-layout"><aside className="side"><div className="side-logo"><img src="/brand/logo-inzo-original.jpeg" alt="Logo INZO IA MUTALÊ"/><span><strong>INZO IA MUTALÊ</strong><small>AOM • FUNDADO EM 1984</small></span></div><div className="side-nav">
    {GROUPS.map(group=>{const groupModules=visible.filter(m=>m.group===group);return groupModules.length?<div key={group}><div className="side-group">{group}</div>{groupModules.map(m=><Link className={`side-link ${path===`/painel/${m.slug}`?'active':''}`} href={`/painel/${m.slug}`} key={m.slug}><Icon name={m.icon}/>{m.title}</Link>)}</div>:null;})}
  </div><div className="side-spacer"/><button className="side-out" onClick={signOut}><LogOut size={16}/> Sair da conta</button></aside>
  <section className="portal-body"><header className="portal-head"><div><strong>Portal de gestão</strong><small>INZO IA MUTALÊ • AOM</small></div><div style={{textAlign:'right'}}><strong>{profile.full_name}</strong><small>{ROLE_LABELS[profile.role||'']||'Integrante'}</small></div></header>
  <div className="portal-content">{selected ? !allowed(selected.permission) ? <Restricted/> : selected.slug==='administracao' ? <Approvals profile={profile}/> : selected.slug==='visao-geral' ? <Dashboard modules={visible} profile={profile}/> : <ModuleView module={selected}/> : <Dashboard modules={visible} profile={profile}/>}</div></section></div>;
}
function Restricted(){return <div className="info-panel"><h2>Acesso restrito</h2><p>Seu perfil não possui permissão para visualizar este módulo.</p></div>}
function Dashboard({modules,profile}:{modules:ModuleItem[];profile:Profile}){return <><span className="tag">PAINEL ADMINISTRATIVO</span><h1 style={{marginTop:16}}>Bem-vindo ao INZO IA MUTALÊ</h1><p className="lead">Olá, {profile.full_name}. Aqui estão as ferramentas liberadas para seu perfil.</p><div className="metrics"><div className="metric"><span>Módulos autorizados</span><strong>{modules.length}</strong><small>Conforme as permissões atribuídas</small></div><div className="metric"><span>Situação do acesso</span><strong style={{fontSize:20}}>Ativo</strong><small>Perfil verificado no Supabase</small></div><div className="metric"><span>Ambiente atual</span><strong style={{fontSize:19}}>Estrutura inicial</strong><small>Cadastros e indicadores em implementação</small></div></div><h2 style={{fontSize:17}}>Seus módulos</h2><div className="module-grid">{modules.map(m=><Link href={`/painel/${m.slug}`} className="module-card" key={m.slug}><span style={{color:'#317c54'}}><Icon name={m.icon} size={23}/></span><strong>{m.title} <ArrowUpRight size={13}/></strong><p>{m.description}</p><small>{m.phase}</small></Link>)}</div></>}
function ModuleView({module}:{module:ModuleItem}){return <><span className="tag">MÓDULO • {module.group.toUpperCase()}</span><h1 style={{marginTop:16}}>{module.title}</h1><p className="lead">{module.description}</p><div className="phase-note">Estrutura planejada — {module.phase}. Este módulo ainda não executa operações de cadastro/financeiras. Não há dados fictícios nem operações simuladas.</div><h2 style={{fontSize:17,marginTop:28}}>Funcionalidades previstas</h2><ul className="placeholder-list">{module.features.map(f=><li key={f}>{f}</li>)}</ul></>}
function Approvals({profile}:{profile:Profile}){
 const [items,setItems]=useState<Profile[]>([]);const [loading,setLoading]=useState(true);
 const [busy,setBusy]=useState<string|null>(null);const [error,setError]=useState('');
 const [roles,setRoles]=useState<Record<string,string>>({});
 const canApproveRole=(role:string)=>profile.role==='developer' ? role!=='developer' : !['developer','dirigente','administrador'].includes(role);
 async function load(){const sb=supabaseClient();if(!sb)return;const {data,error}=await sb.from('profiles').select('id,full_name,status,role,house_id,requested_role,email').eq('status','pendente').order('created_at',{ascending:true});setLoading(false);if(error){setError(error.message);return;}setItems((data||[]) as Profile[])}
 useEffect(()=>{void load()},[]);
 async function decide(userId:string,action:'aprovar'|'recusar'){
  const sb=supabaseClient();if(!sb)return;setError('');setBusy(userId);
  const role=roles[userId]||items.find(x=>x.id===userId)?.requested_role||'filho_casa';
  if(action==='aprovar'&&!canApproveRole(role)){setError('Seu perfil não pode atribuir este nível.');setBusy(null);return;}
  const {error}=await sb.rpc('review_access_request',{target_user:userId,decision:action,approved_role:role});
  if(error)setError(error.message);else await load();setBusy(null);
 }
 return <><span className="tag">CONTROLE DE ACESSO</span><h1 style={{marginTop:16}}>Solicitações pendentes</h1><p className="lead">Apenas perfis autorizados podem liberar solicitações. Todas as decisões são registradas em auditoria.</p><div className="info-panel"><h3>Fila de aprovação</h3>{error&&<p className="error-note">{error}</p>}{loading?<p>Carregando solicitações...</p>:items.length===0?<p>Nenhuma solicitação pendente.</p>:<div className="table-wrap"><table className="admin-table"><thead><tr><th>Nome</th><th>E-mail</th><th>Perfil solicitado</th><th>Decisão</th></tr></thead><tbody>{items.map(item=><tr key={item.id}><td>{item.full_name}</td><td>{item.email}</td><td><select aria-label={`Perfil de ${item.full_name}`} value={roles[item.id]||item.requested_role} onChange={e=>setRoles(prev=>({...prev,[item.id]:e.target.value}))}>{ROLES.filter(r=>canApproveRole(r.value)).map(r=><option key={r.value} value={r.value}>{r.label}</option>)}</select></td><td><div style={{display:'flex',gap:7}}><button className="btn-small" disabled={busy===item.id} onClick={()=>decide(item.id,'aprovar')}>Aprovar</button><button className="btn-small" style={{background:'#9b5b48'}} disabled={busy===item.id} onClick={()=>decide(item.id,'recusar')}>Recusar</button></div></td></tr>)}</tbody></table></div>}</div><p className="phase-note" style={{marginTop:20}}>Regra provisória: o Desenvolvedor Principal aprova dirigentes e administradores; o Dirigente pode aprovar os demais perfis. O privilégio Desenvolvedor Principal nunca pode ser concedido por esta tela.</p></>;
}
