-- INZO IA MUTALÊ — esquema inicial local. NÃO EXECUTADO em nenhum serviço.
-- Requer: Supabase com extensão pgcrypto (disponível por padrão); email confirmation opcional.
create extension if not exists pgcrypto;

create type public.user_role as enum (
  'developer','dirigente','administrador','tesouraria','secretaria',
  'responsavel_gira','filho_casa','consulente','consulta');
create type public.access_status as enum ('pendente','ativo','recusado','suspenso');

create table public.houses (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 3 and 150),
  acronym text, founded_year integer, logo_path text,
  created_at timestamptz not null default now()
);
-- Primeiro tenant fixo. Futuramente migrar para provisionamento de múltiplas casas.
insert into public.houses (id,name,acronym,founded_year,logo_path)
values ('00000000-0000-4000-8000-000000000001','INZO IA MUTALÊ','AOM',1984,'/brand/logo-inzo-original.jpeg');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  house_id uuid not null references public.houses(id),
  email text not null,
  full_name text not null,
  status public.access_status not null default 'pendente',
  role public.user_role,
  requested_role text not null default 'filho_casa',
  approved_by uuid references auth.users(id),
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.profiles (house_id,status);
create index on public.profiles (role);

create table public.role_permissions (
  role public.user_role not null,
  permission text not null,
  primary key(role, permission)
);
create table public.user_permission_overrides (
  user_id uuid not null references public.profiles(id) on delete cascade,
  permission text not null,
  allowed boolean not null,
  set_by uuid references auth.users(id),
  changed_at timestamptz not null default now(),
  primary key(user_id,permission)
);

create table public.audit_events (
  id uuid primary key default gen_random_uuid(),
  house_id uuid references public.houses(id),
  actor_id uuid references auth.users(id),
  entity_type text not null,
  entity_id uuid,
  action text not null,
  created_at timestamptz not null default now()
);
create index on public.audit_events (house_id,created_at desc);

create function public.create_pending_profile() returns trigger
language plpgsql security definer set search_path = '' as $$
declare req text;
begin
  req := coalesce(new.raw_user_meta_data->>'requested_role','filho_casa');
  if req not in ('tesouraria','secretaria','responsavel_gira','filho_casa','consulente','consulta') then
    req := 'filho_casa';
  end if;
  insert into public.profiles (id,house_id,email,full_name,requested_role)
  values (
    new.id,'00000000-0000-4000-8000-000000000001',
    coalesce(new.email,''),
    left(coalesce(nullif(btrim(new.raw_user_meta_data->>'full_name'),''),'Solicitante'),150),req
  );
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
for each row execute function public.create_pending_profile();

-- SECURITY DEFINER: evita circularidade de RLS ao validar a própria conta.
create function public.current_house_id() returns uuid
language sql stable security definer set search_path = '' as $$
  select p.house_id from public.profiles p
  where p.id = (select auth.uid()) and p.status='ativo'
$$;
create function public.has_permission(requested_permission text) returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce((
    select case
       when p.role='developer' then true
       else coalesce(
         (select o.allowed from public.user_permission_overrides o
            where o.user_id=p.id and o.permission=requested_permission),
         exists (select 1 from public.role_permissions r
            where r.role=p.role and r.permission=requested_permission)
       ) end
    from public.profiles p where p.id=(select auth.uid()) and p.status='ativo'
  ),false)
$$;
create function public.my_permissions() returns table(permission text)
language sql stable security definer set search_path = '' as $$
  select distinct keys.permission
  from (select rp.permission from public.role_permissions rp
        union select o.permission from public.user_permission_overrides o) keys
  where public.has_permission(keys.permission)
$$;
revoke all on function public.current_house_id() from public;
revoke all on function public.has_permission(text) from public;
revoke all on function public.my_permissions() from public;
grant execute on function public.current_house_id() to authenticated;
grant execute on function public.has_permission(text) to authenticated;
grant execute on function public.my_permissions() to authenticated;

insert into public.role_permissions(role,permission)
select role::public.user_role, permission from (values
  ('dirigente','dashboard.read'),('dirigente','house.read'),('dirigente','house.write'),
  ('dirigente','people.read'),('dirigente','people.write'),('dirigente','events.read'),('dirigente','events.write'),
  ('dirigente','queue.read'),('dirigente','queue.write'),('dirigente','finance.read'),('dirigente','finance.write'),
  ('dirigente','donations.read'),('dirigente','donations.write'),('dirigente','inventory.read'),('dirigente','inventory.write'),
  ('dirigente','library.read'),('dirigente','library.write'),('dirigente','messages.read'),('dirigente','messages.write'),
  ('dirigente','reports.read'),('dirigente','users.read'),('dirigente','users.approve'),('dirigente','settings.read'),
  ('administrador','dashboard.read'),('administrador','house.read'),('administrador','people.read'),('administrador','people.write'),
  ('administrador','events.read'),('administrador','events.write'),('administrador','queue.read'),('administrador','queue.write'),
  ('administrador','inventory.read'),('administrador','inventory.write'),('administrador','donations.read'),
  ('administrador','library.read'),('administrador','messages.read'),('administrador','messages.write'),
  ('administrador','reports.read'),('administrador','settings.read'),
  ('tesouraria','dashboard.read'),('tesouraria','finance.read'),('tesouraria','finance.write'),
  ('tesouraria','donations.read'),('tesouraria','donations.write'),('tesouraria','reports.read'),
  ('secretaria','dashboard.read'),('secretaria','people.read'),('secretaria','people.write'),
  ('secretaria','events.read'),('secretaria','queue.read'),('secretaria','queue.write'),
  ('secretaria','messages.read'),('secretaria','messages.write'),
  ('responsavel_gira','dashboard.read'),('responsavel_gira','events.read'),('responsavel_gira','events.write'),
  ('responsavel_gira','queue.read'),('responsavel_gira','queue.write'),
  ('responsavel_gira','inventory.read'),('responsavel_gira','messages.read'),('responsavel_gira','library.read'),
  ('filho_casa','dashboard.read'),('filho_casa','events.read'),('filho_casa','library.read'),('filho_casa','messages.read'),
  ('consulente','dashboard.read'),('consulente','events.read'),
  ('consulta','dashboard.read'),('consulta','reports.read')
) as entries(role,permission);

-- É vedado o auto cadastramento como desenvolvedor. Provisionar por procedimento manual.
create function public.review_access_request(target_user uuid, decision text, approved_role text)
returns void language plpgsql security definer set search_path = '' as $$
declare actor public.profiles%rowtype; target public.profiles%rowtype;
begin
  select * into actor from public.profiles where id=(select auth.uid()) and status='ativo';
  if not found or actor.role not in ('developer','dirigente') then
     raise exception 'Sem permissão de aprovação';
  end if;
  select * into target from public.profiles where id=target_user for update;
  if not found or target.house_id <> actor.house_id or target.status <> 'pendente' then
    raise exception 'Solicitação não localizada ou já resolvida';
  end if;
  if decision not in ('aprovar','recusar') then raise exception 'Decisão inválida'; end if;
  if decision='aprovar' then
    if approved_role not in ('dirigente','administrador','tesouraria','secretaria','responsavel_gira','filho_casa','consulente','consulta') then
       raise exception 'Nível de acesso inválido';
    end if;
    if actor.role='dirigente' and approved_role in ('dirigente','administrador') then
       raise exception 'Somente o Desenvolvedor Principal aprova este nível';
    end if;
    update public.profiles set status='ativo',role=approved_role::public.user_role,
       approved_by=actor.id,approved_at=now(),updated_at=now() where id=target_user;
  else
    update public.profiles set status='recusado',approved_by=actor.id,
       approved_at=now(),updated_at=now() where id=target_user;
  end if;
  insert into public.audit_events (house_id,actor_id,entity_type,entity_id,action)
     values (actor.house_id,actor.id,'access_request',target_user,decision);
end $$;
revoke all on function public.review_access_request(uuid,text,text) from public;
grant execute on function public.review_access_request(uuid,text,text) to authenticated;

-- House/people/events/queue/finance/inventory/core tasks
create table public.people (
  id uuid primary key default gen_random_uuid(),house_id uuid not null references public.houses(id),
  category text not null check (category in ('filho_casa','consulente')),
  full_name text not null, email text, phone text,
  auth_user_id uuid references auth.users(id),
  created_by uuid references auth.users(id), created_at timestamptz not null default now()
);
create index on public.people(house_id,category);
create table public.events (
  id uuid primary key default gen_random_uuid(),house_id uuid not null references public.houses(id),
  title text not null,type text not null default 'gira',starts_at timestamptz not null,
  ends_at timestamptz,location text,capacity integer check(capacity is null or capacity >=0),
  notes text,created_by uuid references auth.users(id),created_at timestamptz not null default now()
);
create index on public.events(house_id,starts_at);
create table public.event_attendance (
  id uuid primary key default gen_random_uuid(),house_id uuid not null references public.houses(id),
  event_id uuid not null references public.events(id) on delete cascade,
  person_id uuid not null references public.people(id),
  confirmed boolean not null default false,attended boolean not null default false,
  unique(event_id,person_id)
);
create table public.queue_tickets (
  id uuid primary key default gen_random_uuid(),house_id uuid not null references public.houses(id),
  event_id uuid not null references public.events(id) on delete cascade,
  person_id uuid references public.people(id),number integer not null check(number>0),
  service_type text not null check(service_type in ('consulta','passe','outro')),
  priority boolean not null default false,
  status text not null default 'aguardando' check(status in ('aguardando','chamado','atendido','cancelado')),
  issued_at timestamptz not null default now(),called_at timestamptz,completed_at timestamptz,
  unique(event_id,number)
);
create table public.finance_entries (
  id uuid primary key default gen_random_uuid(),house_id uuid not null references public.houses(id),
  entry_type text not null check(entry_type in ('receita','despesa')),
  category text not null,description text not null,
  amount numeric(12,2) not null check(amount>0),due_on date,paid_on date,
  status text not null default 'pendente' check(status in ('pendente','pago','cancelado')),
  person_id uuid references public.people(id),created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);
create index on public.finance_entries(house_id,due_on);
create table public.donations (
  id uuid primary key default gen_random_uuid(),house_id uuid not null references public.houses(id),
  description text not null,donor_id uuid references public.people(id),
  quantity numeric(12,2) check(quantity>=0),unit text,
  monetary_amount numeric(12,2) check(monetary_amount>=0),
  received_on date,created_by uuid references auth.users(id),created_at timestamptz not null default now()
);
create table public.inventory_items (
  id uuid primary key default gen_random_uuid(),house_id uuid not null references public.houses(id),
  name text not null,unit text not null default 'un',minimum numeric(12,2) not null default 0 check(minimum>=0),
  active boolean not null default true,created_at timestamptz not null default now(),
  unique(house_id,name)
);
create table public.inventory_movements (
  id uuid primary key default gen_random_uuid(),house_id uuid not null references public.houses(id),
  item_id uuid not null references public.inventory_items(id),
  movement text not null check(movement in ('entrada','saida','ajuste')),
  quantity numeric(12,2) not null check(quantity>0),
  note text,created_by uuid references auth.users(id),created_at timestamptz not null default now()
);
create table public.tasks (
  id uuid primary key default gen_random_uuid(),house_id uuid not null references public.houses(id),
  event_id uuid references public.events(id),title text not null,description text,
  assignee_id uuid references auth.users(id),due_at timestamptz,
  status text not null default 'pendente' check(status in ('pendente','em_andamento','concluida')),
  created_by uuid references auth.users(id),created_at timestamptz not null default now()
);
create table public.library_items (
  id uuid primary key default gen_random_uuid(),house_id uuid not null references public.houses(id),
  title text not null,category text not null default 'doutrina',storage_path text,
  visible_to_members boolean not null default false,
  created_by uuid references auth.users(id),created_at timestamptz not null default now()
);
create table public.messages (
  id uuid primary key default gen_random_uuid(),house_id uuid not null references public.houses(id),
  title text not null,body text not null,published boolean not null default false,
  created_by uuid references auth.users(id),created_at timestamptz not null default now()
);

alter table public.houses enable row level security;
alter table public.profiles enable row level security;
alter table public.role_permissions enable row level security;
alter table public.user_permission_overrides enable row level security;
alter table public.audit_events enable row level security;

-- Somente pessoas ativas veem os dados da própria casa; conta pendente só vê o próprio status.
create policy houses_read on public.houses for select to authenticated
 using (id=public.current_house_id());
create policy houses_update on public.houses for update to authenticated
 using (id=public.current_house_id() and public.has_permission('house.write'))
 with check (id=public.current_house_id() and public.has_permission('house.write'));
create policy profiles_read on public.profiles for select to authenticated
 using (id=(select auth.uid()) or (house_id=public.current_house_id() and public.has_permission('users.read')));
-- Nunca oferecer UPDATE direto em profiles. Aprovação só via função revisada.
create policy role_permissions_read on public.role_permissions for select to authenticated
 using (public.has_permission('users.read'));
create policy user_overrides_read on public.user_permission_overrides for select to authenticated
 using (user_id=(select auth.uid()) or public.has_permission('users.read'));
create policy audit_events_read on public.audit_events for select to authenticated
 using (house_id=public.current_house_id() and public.has_permission('audit.read'));

-- RLS automatizada por módulo. Para toda escrita, o usuário precisa pertencer à mesma casa.
do $$
declare item record;
begin
 for item in select * from (values
  ('people','people'),('events','events'),('event_attendance','events'),
  ('queue_tickets','queue'),('finance_entries','finance'),('donations','donations'),
  ('inventory_items','inventory'),('inventory_movements','inventory'),('tasks','events'),
  ('library_items','library'),('messages','messages')
 ) t(table_name,permission_prefix) loop
  execute format('alter table public.%I enable row level security',item.table_name);
  execute format('create policy scoped_read on public.%I for select to authenticated using (house_id=public.current_house_id() and public.has_permission(%L))',item.table_name,item.permission_prefix||'.read');
  execute format('create policy scoped_insert on public.%I for insert to authenticated with check (house_id=public.current_house_id() and public.has_permission(%L))',item.table_name,item.permission_prefix||'.write');
  execute format('create policy scoped_update on public.%I for update to authenticated using (house_id=public.current_house_id() and public.has_permission(%L)) with check (house_id=public.current_house_id() and public.has_permission(%L))',item.table_name,item.permission_prefix||'.write',item.permission_prefix||'.write');
  -- Não permitir DELETE direto na primeira versão (preservação e auditoria).
 end loop;
end $$;
-- Pessoas comuns veem somente eventos públicos da sua casa; demais dados exigem permissão.
-- Validar consistência house_id nas relações (events/people/inventory) antes da produção multi-tenant.
-- Armazenamento privado: criar políticas de storage específicas após definir documentos.
