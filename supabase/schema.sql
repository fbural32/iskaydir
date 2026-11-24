-- =========================================================
-- İşKaydır — Supabase şeması
-- Supabase panel > SQL Editor'e yapıştırıp bir kere çalıştır.
-- =========================================================

create extension if not exists pg_trgm;

-- ---------- Tipler ----------
do $$ begin
  create type user_role as enum ('candidate', 'employer');
exception when duplicate_object then null; end $$;

-- ---------- Kullanıcı profilleri (iletişim bilgisi burada, gizli) ----------
create table if not exists public.profiles (
  id uuid primary key references auth.users on delete cascade,
  role user_role not null,
  full_name text,
  phone text,
  email text,
  created_at timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, role, full_name, email)
  values (
    new.id,
    coalesce((new.raw_user_meta_data->>'role')::user_role, 'candidate'),
    new.raw_user_meta_data->>'full_name',
    new.email
  );
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- Aday profili (CV'den çıkarılan bilgiler) ----------
create table if not exists public.candidate_profiles (
  user_id uuid primary key references public.profiles on delete cascade,
  title text,
  sector text,
  skills text[] not null default '{}',
  experience_years int,
  education text,
  city text,
  salary_expectation text,          -- isteğe bağlı
  summary text,
  cv_path text,
  updated_at timestamptz not null default now()
);

-- ---------- Şirketler ----------
create table if not exists public.companies (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null unique references public.profiles on delete cascade,
  name text not null,
  sector text,
  city text,
  tax_no text,
  corporate_email text,
  logo_url text,
  about text,
  verified boolean not null default false,  -- panelden elle onaylanır
  created_at timestamptz not null default now()
);

-- ---------- İlanlar ----------
create table if not exists public.jobs (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies on delete cascade,
  title text not null,
  city text not null,
  work_mode text not null check (work_mode in ('ofis', 'hibrit', 'uzaktan')),
  employment_type text not null check (employment_type in ('tam', 'yari')),
  description text not null,
  requirements text not null,
  min_experience int not null default 0,
  skills text[] not null default '{}',
  benefits text[] not null default '{}',
  benefits_note text,
  salary_min int,                    -- isteğe bağlı
  salary_max int,                    -- isteğe bağlı
  photo_url text not null,           -- zorunlu 1 foto
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  constraint benefits_required check (cardinality(benefits) > 0 or coalesce(benefits_note, '') <> '')
);

-- ---------- Konum / mesafe (Tinder tarzı) ----------
-- İlanın iş yeri konumu
alter table public.jobs add column if not exists address text;
alter table public.jobs add column if not exists lat double precision;
alter table public.jobs add column if not exists lng double precision;
-- Adayın arama ayarı: nerede arıyor, en fazla kaç km
alter table public.candidate_profiles add column if not exists search_label text;   -- örn. 'Merkez, Bartın'
alter table public.candidate_profiles add column if not exists search_city text;    -- il adı, örn. 'Bartın'
alter table public.candidate_profiles add column if not exists search_lat double precision;
alter table public.candidate_profiles add column if not exists search_lng double precision;
alter table public.candidate_profiles add column if not exists max_distance_km int default 50; -- null = tüm Türkiye
alter table public.candidate_profiles add column if not exists include_remote boolean not null default true;

-- ---------- Başvuru kriterleri (bölüm + eğitim seviyesi) ----------
-- İşveren: hangi bölümler başvurabilir (boş = fark etmez) ve en az eğitim seviyesi
alter table public.jobs add column if not exists allowed_departments text[] not null default '{}';
alter table public.jobs add column if not exists min_education text
  check (min_education in ('lise', 'onlisans', 'lisans', 'yukseklisans', 'doktora'));
-- Aday: bölümü ve eğitim seviyesi (CV'den çıkar, profilde düzeltilebilir)
alter table public.candidate_profiles add column if not exists department text;
alter table public.candidate_profiles add column if not exists education_level text
  check (education_level in ('lise', 'onlisans', 'lisans', 'yukseklisans', 'doktora'));
-- Uygun olmadığı ilanları da görmek istiyor mu (görür ama başvuramaz)
alter table public.candidate_profiles add column if not exists show_ineligible boolean not null default false;

create or replace function public.edu_rank(level text)
returns int language sql immutable as $$
  select coalesce(array_position(array['lise', 'onlisans', 'lisans', 'yukseklisans', 'doktora'], level), 0)
$$;

-- Aday bu ilanın kriterlerini karşılıyor mu?
create or replace function public.is_eligible(j_depts text[], j_min text, c_dept text, c_level text)
returns boolean language sql immutable as $$
  select (coalesce(cardinality(j_depts), 0) = 0 or c_dept = any(j_depts))
     and (j_min is null or public.edu_rank(c_level) >= public.edu_rank(j_min))
$$;

-- İki nokta arası kuş uçuşu km (PostGIS gerekmez)
create or replace function public.distance_km(lat1 float8, lng1 float8, lat2 float8, lng2 float8)
returns float8 language sql immutable as $$
  select case when lat1 is null or lng1 is null or lat2 is null or lng2 is null then null
  else 6371 * 2 * asin(sqrt(
    power(sin(radians(lat2 - lat1) / 2), 2)
    + cos(radians(lat1)) * cos(radians(lat2)) * power(sin(radians(lng2 - lng1) / 2), 2)))
  end
$$;

-- ---------- Kaydırmalar (iki taraf da aynı satırda) ----------
create table if not exists public.job_swipes (
  job_id uuid not null references public.jobs on delete cascade,
  candidate_id uuid not null references public.profiles on delete cascade,
  candidate_dir text check (candidate_dir in ('like', 'pass')),
  employer_dir text check (employer_dir in ('like', 'pass')),
  updated_at timestamptz not null default now(),
  primary key (job_id, candidate_id)
);

-- ---------- Eşleşmeler ve mesajlar ----------
create table if not exists public.matches (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.jobs on delete cascade,
  candidate_id uuid not null references public.profiles on delete cascade,
  created_at timestamptz not null default now(),
  unique (job_id, candidate_id)
);

create table if not exists public.messages (
  id bigint generated always as identity primary key,
  match_id uuid not null references public.matches on delete cascade,
  sender_id uuid not null references public.profiles on delete cascade,
  body text not null check (length(trim(body)) > 0),
  created_at timestamptz not null default now()
);
create index if not exists messages_match_idx on public.messages (match_id, created_at);

-- İki taraf da sağa kaydırınca otomatik eşleşme
create or replace function public.make_match()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.candidate_dir = 'like' and new.employer_dir = 'like' then
    insert into public.matches (job_id, candidate_id)
    values (new.job_id, new.candidate_id)
    on conflict do nothing;
  end if;
  return new;
end $$;

drop trigger if exists job_swipes_match on public.job_swipes;
create trigger job_swipes_match
  after insert or update on public.job_swipes
  for each row execute function public.make_match();

-- ---------- Yardımcılar ----------
create or replace function public.my_role()
returns user_role language sql stable security definer set search_path = public as $$
  select role from public.profiles where id = auth.uid()
$$;

create or replace function public.is_match_participant(p_match uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.matches m
    join public.jobs j on j.id = m.job_id
    join public.companies c on c.id = j.company_id
    where m.id = p_match and (m.candidate_id = auth.uid() or c.owner_id = auth.uid())
  )
$$;

-- Bir adayla bir işveren eşleşmiş mi? (iletişim bilgisi görünürlüğü için)
create or replace function public.is_matched_with(p_other uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.matches m
    join public.jobs j on j.id = m.job_id
    join public.companies c on c.id = j.company_id
    where (m.candidate_id = p_other and c.owner_id = auth.uid())
       or (m.candidate_id = auth.uid() and c.owner_id = p_other)
  )
$$;

-- Aday, bu işverenin ilanlarından birini beğendi mi? (beğeni = başvuru; ad ve CV işverene açılır)
create or replace function public.liked_my_job(p_candidate uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.job_swipes s
    join public.jobs j on j.id = s.job_id
    join public.companies c on c.id = j.company_id
    where s.candidate_id = p_candidate and s.candidate_dir = 'like' and c.owner_id = auth.uid()
  )
$$;

-- ---------- RLS ----------
alter table public.profiles enable row level security;
alter table public.candidate_profiles enable row level security;
alter table public.companies enable row level security;
alter table public.jobs enable row level security;
alter table public.job_swipes enable row level security;
alter table public.matches enable row level security;
alter table public.messages enable row level security;

drop policy if exists "profil kendi veya eşleşme" on public.profiles;
create policy "profil kendi veya eşleşme" on public.profiles for select
  using (id = auth.uid() or public.is_matched_with(id));
drop policy if exists "profil kendi güncelle" on public.profiles;
create policy "profil kendi güncelle" on public.profiles for update
  using (id = auth.uid()) with check (id = auth.uid() and role = public.my_role());

drop policy if exists "aday profil okuma" on public.candidate_profiles;
create policy "aday profil okuma" on public.candidate_profiles for select
  using (user_id = auth.uid() or public.my_role() = 'employer');
drop policy if exists "aday profil yazma" on public.candidate_profiles;
create policy "aday profil yazma" on public.candidate_profiles for insert
  with check (user_id = auth.uid() and public.my_role() = 'candidate');
drop policy if exists "aday profil güncelleme" on public.candidate_profiles;
create policy "aday profil güncelleme" on public.candidate_profiles for update
  using (user_id = auth.uid());

drop policy if exists "şirket okuma" on public.companies;
create policy "şirket okuma" on public.companies for select using (owner_id = auth.uid());
-- Adaylar şirketi company_page() ile görür (vergi no hariç her şey herkese açık)
drop policy if exists "şirket ekleme" on public.companies;
create policy "şirket ekleme" on public.companies for insert
  with check (owner_id = auth.uid() and public.my_role() = 'employer' and verified = false);
drop policy if exists "şirket güncelleme" on public.companies;
create policy "şirket güncelleme" on public.companies for update
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid() and verified = (select c.verified from public.companies c where c.owner_id = auth.uid()));

drop policy if exists "ilan okuma" on public.jobs;
create policy "ilan okuma" on public.jobs for select
  using (is_active or exists (select 1 from public.companies c where c.id = company_id and c.owner_id = auth.uid()));
drop policy if exists "ilan yönetimi" on public.jobs;
create policy "ilan yönetimi" on public.jobs for all
  using (exists (select 1 from public.companies c where c.id = company_id and c.owner_id = auth.uid()))
  with check (exists (select 1 from public.companies c where c.id = company_id and c.owner_id = auth.uid()));

drop policy if exists "kaydırma okuma" on public.job_swipes;
create policy "kaydırma okuma" on public.job_swipes for select
  using (candidate_id = auth.uid() or exists (
    select 1 from public.jobs j join public.companies c on c.id = j.company_id
    where j.id = job_id and c.owner_id = auth.uid()));
-- yazma sadece aşağıdaki RPC'lerle

drop policy if exists "eşleşme okuma" on public.matches;
create policy "eşleşme okuma" on public.matches for select using (public.is_match_participant(id));

drop policy if exists "mesaj okuma" on public.messages;
create policy "mesaj okuma" on public.messages for select using (public.is_match_participant(match_id));
drop policy if exists "mesaj gönderme" on public.messages;
create policy "mesaj gönderme" on public.messages for insert
  with check (sender_id = auth.uid() and public.is_match_participant(match_id));

-- ---------- Kaydırma RPC'leri ----------
create or replace function public.candidate_swipe(p_job uuid, p_dir text)
returns boolean language plpgsql security definer set search_path = public as $$
declare v_matched boolean;
begin
  if public.my_role() <> 'candidate' then raise exception 'Sadece adaylar'; end if;
  if p_dir not in ('like', 'pass') then raise exception 'Geçersiz yön'; end if;
  if p_dir = 'like' and not exists (
    select 1 from public.jobs j
    left join public.candidate_profiles cp on cp.user_id = auth.uid()
    where j.id = p_job and public.is_eligible(j.allowed_departments, j.min_education, cp.department, cp.education_level)
  ) then
    raise exception 'KRITER: Bu ilanın kriterlerini karşılamıyorsun, başvuru yapılamaz.';
  end if;
  insert into public.job_swipes (job_id, candidate_id, candidate_dir)
  values (p_job, auth.uid(), p_dir)
  on conflict (job_id, candidate_id)
  do update set candidate_dir = excluded.candidate_dir, updated_at = now();
  select exists (select 1 from public.matches where job_id = p_job and candidate_id = auth.uid()) into v_matched;
  return v_matched;
end $$;

create or replace function public.employer_swipe(p_job uuid, p_candidate uuid, p_dir text)
returns boolean language plpgsql security definer set search_path = public as $$
declare v_matched boolean;
begin
  if not exists (select 1 from public.jobs j join public.companies c on c.id = j.company_id
                 where j.id = p_job and c.owner_id = auth.uid()) then
    raise exception 'Bu ilan size ait değil';
  end if;
  if p_dir not in ('like', 'pass') then raise exception 'Geçersiz yön'; end if;
  insert into public.job_swipes (job_id, candidate_id, employer_dir)
  values (p_job, p_candidate, p_dir)
  on conflict (job_id, candidate_id)
  do update set employer_dir = excluded.employer_dir, updated_at = now();
  select exists (select 1 from public.matches where job_id = p_job and candidate_id = p_candidate) into v_matched;
  return v_matched;
end $$;

-- ---------- Eşleştirme puanı ----------
create or replace function public.fit_score(
  j_title text, j_city text, j_mode text, j_skills text[], j_min_exp int,
  c_title text, c_city text, c_skills text[], c_exp int)
returns numeric language sql immutable as $$
  select
    coalesce(similarity(lower(coalesce(j_title, '')), lower(coalesce(c_title, ''))), 0) * 6
    + case when lower(coalesce(j_city, '')) = lower(coalesce(c_city, '')) and c_city is not null then 2 else 0 end
    + case when j_mode = 'uzaktan' then 1 else 0 end
    + coalesce((select count(*) from unnest(j_skills) s
                where lower(s) in (select lower(x) from unnest(c_skills) x)), 0) * 0.7
    - greatest(coalesce(j_min_exp, 0) - coalesce(c_exp, 0), 0) * 0.4
$$;

-- Adayın destesi: kaydırmadığı aktif ilanlar, mesafe ayarına göre filtreli, uyum + yakınlığa göre sıralı
drop function if exists public.jobs_for_candidate(int);
create or replace function public.jobs_for_candidate(p_limit int default 40)
returns table (
  id uuid, title text, city text, address text, work_mode text, employment_type text,
  description text, requirements text, min_experience int, skills text[],
  benefits text[], benefits_note text, salary_min int, salary_max int, photo_url text,
  company_id uuid, company_name text, company_logo text, company_verified boolean,
  allowed_departments text[], min_education text, eligible boolean,
  distance_km numeric, score numeric)
language sql stable security definer set search_path = public as $$
  select j.id, j.title, j.city, j.address, j.work_mode, j.employment_type,
         j.description, j.requirements, j.min_experience, j.skills,
         j.benefits, j.benefits_note, j.salary_min, j.salary_max, j.photo_url,
         c.id, c.name, c.logo_url, c.verified,
         j.allowed_departments, j.min_education,
         public.is_eligible(j.allowed_departments, j.min_education, cp.department, cp.education_level),
         round(d.km::numeric, 0) as distance_km,
         public.fit_score(j.title, j.city, j.work_mode, j.skills, j.min_experience,
                          cp.title, coalesce(cp.search_city, cp.city), cp.skills, cp.experience_years)
           + case when d.km is null then 0 else greatest(0, 3 - d.km / 40) end as score
  from public.jobs j
  join public.companies c on c.id = j.company_id
  left join public.candidate_profiles cp on cp.user_id = auth.uid()
  cross join lateral (select public.distance_km(cp.search_lat, cp.search_lng, j.lat, j.lng) as km) d
  where j.is_active
    and public.my_role() = 'candidate'
    and not exists (select 1 from public.job_swipes s
                    where s.job_id = j.id and s.candidate_id = auth.uid() and s.candidate_dir is not null)
    and (coalesce(cp.show_ineligible, false)
         or public.is_eligible(j.allowed_departments, j.min_education, cp.department, cp.education_level))
    and (
      cp.max_distance_km is null                                         -- tüm Türkiye
      or (j.work_mode = 'uzaktan' and coalesce(cp.include_remote, true)) -- uzaktan ilanlar
      or (d.km is not null and d.km <= cp.max_distance_km)               -- mesafe içinde
      or (d.km is null and lower(j.city) = lower(coalesce(cp.search_city, cp.city, '')))  -- konum yoksa il eşleşmesi
    )
  order by public.is_eligible(j.allowed_departments, j.min_education, cp.department, cp.education_level) desc,
           score desc, j.created_at desc
  limit p_limit
$$;

-- İşverenin bir ilan için aday destesi: önce ilanı beğenenler, sonra en uygunlar.
-- p_max_km verilirse sadece o mesafedeki adaylar (adayın arama konumuna göre).
drop function if exists public.candidates_for_job(uuid, int);
drop function if exists public.candidates_for_job(uuid, int, int);
drop function if exists public.my_likers();
create or replace function public.candidates_for_job(p_job uuid, p_limit int default 40, p_max_km int default null)
returns table (
  user_id uuid, title text, sector text, skills text[], experience_years int,
  education text, department text, education_level text, city text, salary_expectation text, summary text,
  liked_job boolean, distance_km numeric, score numeric)
language sql stable security definer set search_path = public as $$
  select cp.user_id, cp.title, cp.sector, cp.skills, cp.experience_years,
         cp.education, cp.department, cp.education_level,
         coalesce(cp.search_city, cp.city), cp.salary_expectation, cp.summary,
         coalesce(s.candidate_dir = 'like', false) as liked_job,
         round(d.km::numeric, 0) as distance_km,
         public.fit_score(j.title, j.city, j.work_mode, j.skills, j.min_experience,
                          cp.title, coalesce(cp.search_city, cp.city), cp.skills, cp.experience_years)
           + case when d.km is null then 0 else greatest(0, 3 - d.km / 40) end as score
  from public.jobs j
  join public.companies c on c.id = j.company_id and c.owner_id = auth.uid()
  cross join public.candidate_profiles cp
  left join public.job_swipes s on s.job_id = j.id and s.candidate_id = cp.user_id
  cross join lateral (select public.distance_km(cp.search_lat, cp.search_lng, j.lat, j.lng) as km) d
  where j.id = p_job
    and cp.title is not null
    and coalesce(s.candidate_dir, '') <> 'pass'
    and s.employer_dir is null
    and public.is_eligible(j.allowed_departments, j.min_education, cp.department, cp.education_level)
    and (
      p_max_km is null
      or (d.km is not null and d.km <= p_max_km)
      or (d.km is null and lower(j.city) = lower(coalesce(cp.search_city, cp.city, '')))
    )
  order by liked_job desc, score desc
  limit p_limit
$$;

-- Beğenenler: işverenin ilanlarını beğenen TÜM adaylar (ad, profil, CV dahil; telefon/e-posta eşleşince)
create or replace function public.my_likers()
returns table (
  job_id uuid, job_title text, candidate_id uuid, full_name text,
  title text, sector text, skills text[], experience_years int, education text,
  department text, education_level text,
  city text, salary_expectation text, summary text, cv_path text,
  distance_km numeric, employer_dir text, matched boolean, liked_at timestamptz)
language sql stable security definer set search_path = public as $$
  select j.id, j.title, s.candidate_id, p.full_name,
         cp.title, cp.sector, cp.skills, cp.experience_years, cp.education,
         cp.department, cp.education_level,
         coalesce(cp.search_city, cp.city), cp.salary_expectation, cp.summary, cp.cv_path,
         round(public.distance_km(cp.search_lat, cp.search_lng, j.lat, j.lng)::numeric, 0),
         s.employer_dir,
         exists (select 1 from public.matches m where m.job_id = j.id and m.candidate_id = s.candidate_id),
         s.updated_at
  from public.job_swipes s
  join public.jobs j on j.id = s.job_id
  join public.companies c on c.id = j.company_id and c.owner_id = auth.uid()
  join public.profiles p on p.id = s.candidate_id
  left join public.candidate_profiles cp on cp.user_id = s.candidate_id
  where s.candidate_dir = 'like'
  order by (s.employer_dir is null) desc, s.updated_at desc
$$;

-- Herkese açık şirket sayfası (vergi no hariç) + aktif ilanları
create or replace function public.company_page(p_company uuid)
returns json language sql stable security definer set search_path = public as $$
  select json_build_object(
    'id', c.id, 'name', c.name, 'sector', c.sector, 'city', c.city, 'about', c.about,
    'logo_url', c.logo_url, 'corporate_email', c.corporate_email, 'verified', c.verified,
    'created_at', c.created_at,
    'jobs', coalesce((select json_agg(json_build_object(
        'id', j.id, 'title', j.title, 'city', j.city, 'address', j.address, 'work_mode', j.work_mode,
        'employment_type', j.employment_type, 'salary_min', j.salary_min, 'salary_max', j.salary_max,
        'benefits', j.benefits, 'photo_url', j.photo_url, 'created_at', j.created_at,
        'description', j.description, 'requirements', j.requirements,
        'allowed_departments', j.allowed_departments, 'min_education', j.min_education,
        'eligible', public.is_eligible(j.allowed_departments, j.min_education, cp.department, cp.education_level))
        order by j.created_at desc)
      from public.jobs j
      left join public.candidate_profiles cp on cp.user_id = auth.uid()
      where j.company_id = c.id and j.is_active), '[]'::json))
  from public.companies c where c.id = p_company
$$;

-- Eşleşmelerim (iki taraf için)
create or replace function public.my_matches()
returns table (
  match_id uuid, job_id uuid, job_title text, company_name text, company_logo text,
  candidate_id uuid, candidate_title text, other_name text, other_phone text, other_email text,
  cv_path text, last_message text, last_at timestamptz, created_at timestamptz)
language sql stable security definer set search_path = public as $$
  select m.id, j.id, j.title, c.name, c.logo_url,
         m.candidate_id, cp.title,
         case when m.candidate_id = auth.uid() then op.full_name else cpr.full_name end,
         case when m.candidate_id = auth.uid() then op.phone else cpr.phone end,
         case when m.candidate_id = auth.uid() then coalesce(c.corporate_email, op.email) else cpr.email end,
         case when m.candidate_id = auth.uid() then null else cp.cv_path end,
         lm.body, lm.created_at, m.created_at
  from public.matches m
  join public.jobs j on j.id = m.job_id
  join public.companies c on c.id = j.company_id
  join public.profiles op on op.id = c.owner_id
  join public.profiles cpr on cpr.id = m.candidate_id
  left join public.candidate_profiles cp on cp.user_id = m.candidate_id
  left join lateral (select body, created_at from public.messages
                     where match_id = m.id order by created_at desc limit 1) lm on true
  where m.candidate_id = auth.uid() or c.owner_id = auth.uid()
  order by coalesce(lm.created_at, m.created_at) desc
$$;

-- ---------- Dosya depolama ----------
insert into storage.buckets (id, name, public) values ('cvs', 'cvs', false)
  on conflict (id) do nothing;
insert into storage.buckets (id, name, public) values ('public-media', 'public-media', true)
  on conflict (id) do nothing;

drop policy if exists "cv sahibi yazar" on storage.objects;
create policy "cv sahibi yazar" on storage.objects for insert to authenticated
  with check (bucket_id = 'cvs' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "cv sahibi günceller" on storage.objects;
create policy "cv sahibi günceller" on storage.objects for update to authenticated
  using (bucket_id = 'cvs' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "cv sahibi ve eşleşen işveren okur" on storage.objects;
create policy "cv sahibi ve eşleşen işveren okur" on storage.objects for select to authenticated
  using (bucket_id = 'cvs' and (
    (storage.foldername(name))[1] = auth.uid()::text
    or public.is_matched_with(((storage.foldername(name))[1])::uuid)
    or public.liked_my_job(((storage.foldername(name))[1])::uuid)));

drop policy if exists "medya sahibi yazar" on storage.objects;
create policy "medya sahibi yazar" on storage.objects for insert to authenticated
  with check (bucket_id = 'public-media' and (storage.foldername(name))[1] = auth.uid()::text);

-- ---------- Canlı sohbet ----------
do $$ begin
  alter publication supabase_realtime add table public.messages;
exception when others then null; end $$;
