# Cases backend — Supabase setup (already done, kept for reference)

This replaced the earlier Google Apps Script backend (abandoned — corporate
Zscaler proxy blocked `script.google.com` traffic). Supabase's API isn't
blocked, is genuinely live (no caching delay to fight), and needs no per-user
token to read or write.

## What's already set up

1. **Project created** at supabase.com (region: closest to India).
2. **`cases` table** created via the SQL Editor:
   ```sql
   create table cases (
     key text primary key,
     vertical text not null,
     eval_id bigint,
     store_code text,
     store_name text,
     unmapped boolean default false,
     rom text,
     sd text,
     rm text,
     date date,
     score numeric,
     stage text default 'flagged',
     trigger_reason text,
     employees jsonb default '[]'::jsonb,
     history jsonb default '[]'::jsonb,
     updated_at timestamptz default now()
   );

   alter table cases enable row level security;

   create policy "Allow public read" on cases
     for select using (true);

   create policy "Allow public write" on cases
     for all using (true) with check (true);
   ```
3. **Project URL** and **anon public key** (from Settings → API) are wired
   into `assets/js/config.js` as `SUPABASE_URL` and `SUPABASE_ANON_KEY`.

That's the whole setup — nothing else to deploy, no ongoing manual steps.
Every read (Overview's tracker, opening Cases/ROM/HRBP) and every write
(Trigger / Add Employee / Send to HR / Close) talks straight to this table,
live, automatically. There's no export/upload step for case actions — only
the underlying audit data (`assets/data/*.json`, via Admin's Publish button)
still works that way.

## Security note, honestly stated

The `anon` key is Supabase's intentionally-public key — safe to ship in
client-side code, same as the page password is a shared secret rather than
per-user login. The two policies above mean **anyone with the key can read
or write any row** — there's no per-person distinction between L&D, ROM, and
HRBP at the database level; the page password gates *who can open the page
at all*, not who can do what once they're in. That's the right tradeoff for
a small internal team without building real user accounts, but worth being
clear-eyed about: it's a shared-trust model, not real per-user security.

## If you ever need to reset all case data

Supabase dashboard → **Table Editor** → `cases` table → select all rows →
delete. There's no "Reset local uploads" button for this anymore, because
there's no local copy to reset — the table itself *is* the single source of
truth for everyone.

## If something looks wrong

Supabase dashboard → **Logs** (left sidebar) → **API logs** shows every
request hitting the table, including failed ones with the actual error —
the fastest way to see what a broken read/write actually did.
