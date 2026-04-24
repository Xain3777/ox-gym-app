-- Staff seed — 1 manager, 5 reception, 10 coach.
-- Run against a clean DB (members + auth.users empty). Passwords are
-- bcrypt-hashed for Supabase Auth; the same plaintext is mirrored into
-- members.temp_password for admin visibility in the table editor.
--
-- Login: username is "<First> <Last>" (spaces allowed) OR phone (0911000001…).

WITH staff(full_name, username, phone_local, role, pwd) AS (
  VALUES
    ('Manager OX',     'Manager OX',     '0911000001', 'manager',   'Manager#OX2026'),
    ('Reception One',  'Reception One',  '0911000002', 'reception', 'Reception1#OX2026'),
    ('Reception Two',  'Reception Two',  '0911000003', 'reception', 'Reception2#OX2026'),
    ('Reception Three','Reception Three','0911000004', 'reception', 'Reception3#OX2026'),
    ('Reception Four', 'Reception Four', '0911000005', 'reception', 'Reception4#OX2026'),
    ('Reception Five', 'Reception Five', '0911000006', 'reception', 'Reception5#OX2026'),
    ('Coach One',      'Coach One',      '0911000007', 'coach',     'Coach1#OX2026'),
    ('Coach Two',      'Coach Two',      '0911000008', 'coach',     'Coach2#OX2026'),
    ('Coach Three',    'Coach Three',    '0911000009', 'coach',     'Coach3#OX2026'),
    ('Coach Four',     'Coach Four',     '0911000010', 'coach',     'Coach4#OX2026'),
    ('Coach Five',     'Coach Five',     '0911000011', 'coach',     'Coach5#OX2026'),
    ('Coach Six',      'Coach Six',      '0911000012', 'coach',     'Coach6#OX2026'),
    ('Coach Seven',    'Coach Seven',    '0911000013', 'coach',     'Coach7#OX2026'),
    ('Coach Eight',    'Coach Eight',    '0911000014', 'coach',     'Coach8#OX2026'),
    ('Coach Nine',     'Coach Nine',     '0911000015', 'coach',     'Coach9#OX2026'),
    ('Coach Ten',      'Coach Ten',      '0911000016', 'coach',     'Coach10#OX2026')
),
prepared AS (
  SELECT
    gen_random_uuid() AS auth_id,
    full_name,
    username,
    '963' || substr(phone_local, 2) AS phone_canonical,
    '963' || substr(phone_local, 2) || '@member.oxgym.app' AS email_internal,
    role::user_role AS role,
    pwd
  FROM staff
),
ins_auth AS (
  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, created_at, updated_at,
    raw_app_meta_data, raw_user_meta_data, is_super_admin
  )
  SELECT
    '00000000-0000-0000-0000-000000000000',
    auth_id, 'authenticated', 'authenticated', email_internal,
    crypt(pwd, gen_salt('bf')),
    now(), now(), now(),
    jsonb_build_object('provider','email','providers',ARRAY['email']),
    jsonb_build_object('full_name', full_name),
    false
  FROM prepared
  RETURNING id
),
ins_identity AS (
  INSERT INTO auth.identities (
    id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at
  )
  SELECT gen_random_uuid(), p.auth_id,
         jsonb_build_object('sub', p.auth_id::text, 'email', p.email_internal),
         'email', p.email_internal, now(), now(), now()
  FROM prepared p
  RETURNING user_id
)
INSERT INTO public.members (auth_id, full_name, username, phone, role, status, temp_password)
SELECT auth_id, full_name, username, phone_canonical, role, 'active'::member_status, pwd
FROM prepared;
