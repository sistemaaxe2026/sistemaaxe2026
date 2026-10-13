'use client';
import { FormEvent, useState } from 'react';
import { ArrowRight, CheckCircle2, Eye, EyeOff, KeyRound, Leaf, LockKeyhole, Mail, ShieldCheck, UserRound, AlertCircle, Moon, Sun } from 'lucide-react';
import { supabaseClient } from '@/lib/supabase';
import { REQUESTABLE_ROLES } from '@/lib/roles';

type Tab = 'entrar'|'solicitar';
type Message = {type:'error'|'success'|'info'; content:string} | null;
export default function AuthScreen() {
  const [tab,setTab] = useState<Tab>('entrar');
  const [dark,setDark] = useState(false);
  const [showPassword,setShowPassword] = useState(false);
  const [loading,setLoading] = useState(false);
  const [message,setMessage] = useState<Message>(null);
  const [name,setName] = useState('');
  const [email,setEmail] = useState('');
  const [password,setPassword] = useState('');
  const [passwordConfirm,setPasswordConfirm] = useState('');
  const [requestedRole,setRequestedRole] = useState('filho_casa');
  const [accepted,setAccepted] = useState(false);
  const [resetMode,setResetMode] = useState(false);
  const changeTab = (value:Tab) => {setTab(value); setMessage(null); setResetMode(false)};
  const onSubmit = async (event:FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setMessage(null);
    const sb = supabaseClient();
    if (!sb) {setMessage({type:'info', content:'Prévia local: configure o Supabase no arquivo .env.local para habilitar autenticação e solicitações reais.'});return;}
    setLoading(true);
    try {
      if(resetMode) {
        const {error} = await sb.auth.resetPasswordForEmail(email,{redirectTo:`${window.location.origin}/login`});
        if(error) throw error;
        setMessage({type:'success',content:'Caso o e-mail esteja cadastrado, você receberá orientações para redefinir sua senha.'});
      } else if(tab==='entrar') {
        const { data,error } = await sb.auth.signInWithPassword({email,password});
        if(error) throw error;
        const {data:profile,error:profileError} = await sb.from('profiles').select('status').eq('id',data.user.id).single();
        if(profileError || !profile || profile.status!=='ativo') {
          await sb.auth.signOut();
          setMessage({type:'info',content:'O cadastro ainda não foi liberado ou está indisponível. Aguarde a aprovação da casa.'});
          return;
        }
        window.location.assign('/painel');
      } else {
        if(password.length<10 || !/[A-Z]/.test(password) || !/[^a-zA-Z0-9]/.test(password)) throw new Error('Use ao menos 10 caracteres, uma letra maiúscula e um símbolo.');
        if(password !== passwordConfirm) throw new Error('A confirmação de senha não corresponde.');
        if(!accepted) throw new Error('É necessário aceitar os termos e o aviso de privacidade.');
        const {data,error} = await sb.auth.signUp({email,password,options:{data:{full_name:name,requested_role:requestedRole,terms_accepted:true,terms_version:'draft_2026_10'}}});
        if(error) throw error;
        if(data.session) await sb.auth.signOut();
        setPassword(''); setPasswordConfirm('');
        setMessage({type:'success',content:'Solicitação recebida, se o cadastro foi criado. O acesso permanecerá pendente até aprovação da administração.'});
      }
    } catch(error) {
      const detail = error instanceof Error ? error.message : '';
      const friendly = /failed to fetch|fetch failed|networkerror|network request failed/i.test(detail)
        ? 'Não foi possível conectar ao Supabase. Confira no Vercel se NEXT_PUBLIC_SUPABASE_URL contém o Project URL correto e se NEXT_PUBLIC_SUPABASE_ANON_KEY contém a chave pública (publishable/anon) deste mesmo projeto. Depois, publique novamente.'
        : detail || 'Não foi possível concluir a solicitação. Tente novamente.';
      setMessage({type:'error',content:friendly});
    } finally {setLoading(false)}
  };
  return <main className="auth-layout">
    <section className="auth-brand" aria-label="Identidade visual INZO IA MUTALÊ">
      <div className="brand-glow" />
      <img src="/brand/logo-inzo-original.jpeg" alt="Logomarca oficial INZO IA MUTALÊ, AOM, fundado em 1984" className="brand-image" />
      <div className="brand-bottom"><span className="brand-line"/><p>Tradição que permanece. Gestão que evolui.</p><span className="brand-line"/></div>
    </section>
    <section className={`auth-right ${dark ? 'dark-mode' : ''}`}>
      <div className="auth-topline"><span className="tiny-mark"><Leaf size={16}/></span><span>INZO IA MUTALÊ</span><button type="button" className="theme-toggle" onClick={()=>setDark(!dark)} aria-label={dark?'Ativar modo claro':'Ativar modo escuro'}>{dark?<Sun size={15}/>:<Moon size={15}/>}<span>{dark?'Modo claro':'Modo escuro'}</span></button></div>
      <div className="auth-main">
        <div className="auth-heading"><span className="auth-icon"><LockKeyhole size={23}/></span><div className="eyebrow">GESTÃO INTEGRADA • AOM</div><h1>{resetMode?'Recuperar acesso':tab==='entrar'?'Bem-vindo à nossa casa':'Primeiro acesso'}</h1><p>{resetMode?'Informe seu e-mail para solicitar a redefinição da senha.':tab==='entrar'?'Entre com suas credenciais para acessar o portal.':'Preencha os dados e aguarde a análise do responsável.'}</p></div>
        {!resetMode && <div className="auth-tabs" role="tablist" aria-label="Entrar ou solicitar acesso"><button type="button" className={tab==='entrar'?'selected':''} onClick={()=>changeTab('entrar')}>Entrar</button><button type="button" className={tab==='solicitar'?'selected':''} onClick={()=>changeTab('solicitar')}>Solicitar primeiro acesso</button></div>}
        <form className="auth-form" onSubmit={onSubmit}>
          {tab==='solicitar' && !resetMode && <><label htmlFor="full_name">Nome completo</label><div className="field"><UserRound size={17}/><input id="full_name" type="text" autoComplete="name" placeholder="Nome completo" minLength={3} required value={name} onChange={e=>setName(e.target.value)} /></div></>}
          <label htmlFor="email">E-mail</label><div className="field"><Mail size={17}/><input id="email" type="email" autoComplete="email" placeholder="seuemail@exemplo.com" required value={email} onChange={e=>setEmail(e.target.value)} /></div>
          {!resetMode && <><div className="label-row"><label htmlFor="password">Senha</label>{tab==='entrar'&&<button type="button" className="text-button" onClick={()=>{setResetMode(true);setMessage(null)}}>Esqueceu a senha?</button>}</div><div className="field"><KeyRound size={17}/><input id="password" type={showPassword?'text':'password'} autoComplete={tab==='entrar'?'current-password':'new-password'} placeholder="Digite sua senha" required minLength={tab==='solicitar'?10:1} value={password} onChange={e=>setPassword(e.target.value)}/><button type="button" aria-label={showPassword?'Ocultar senha':'Mostrar senha'} className="eye-button" onClick={()=>setShowPassword(!showPassword)}>{showPassword?<EyeOff size={18}/>:<Eye size={18}/>}</button></div></>}
          {tab==='solicitar'&&!resetMode&&<><label htmlFor="password_confirm">Confirmar senha</label><div className="field"><KeyRound size={17}/><input id="password_confirm" type={showPassword?'text':'password'} autoComplete="new-password" placeholder="Confirme sua senha" required value={passwordConfirm} onChange={e=>setPasswordConfirm(e.target.value)}/></div><label htmlFor="role">Vínculo com a casa</label><div className="field"><UserRound size={17}/><select id="role" value={requestedRole} onChange={e=>setRequestedRole(e.target.value)}>{REQUESTABLE_ROLES.map(r=><option key={r.value} value={r.value}>{r.label}</option>)}</select></div><p className="password-hint">Senha com pelo menos 10 caracteres, uma maiúscula e um símbolo.</p><label className="accept"><input type="checkbox" checked={accepted} onChange={e=>setAccepted(e.target.checked)}/><span>Declaro que li e aceito os termos de uso e o aviso de privacidade <em>(textos institucionais a aprovar antes da ativação).</em></span></label></>}
          {message && <div className={`auth-alert ${message.type}`} role="status">{message.type==='success'?<CheckCircle2 size={17}/>:<AlertCircle size={17}/>}<span>{message.content}</span></div>}
          <button className="primary-button" type="submit" disabled={loading}>{loading?'Aguarde...':resetMode?'Enviar orientações':tab==='entrar'?'Acessar o sistema':'Enviar solicitação'}<ArrowRight size={18}/></button>
        </form>
        {resetMode && <button className="reset-back text-button" type="button" onClick={()=>{setResetMode(false);setMessage(null)}}>Voltar à tela de login</button>}
        <p className="security-note"><ShieldCheck size={17}/> Acesso protegido e sujeito à autorização da casa.</p>
      </div>
      <footer className="auth-footer"><span>© 2026 INZO IA MUTALÊ • Todos os direitos reservados.</span><span>Fundado em 1984</span></footer>
    </section>
  </main>;
}
