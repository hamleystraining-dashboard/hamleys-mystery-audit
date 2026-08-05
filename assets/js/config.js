/* Supabase connection for the Cases/ROM/HRBP backend — shared, live data
   instead of each browser's own local storage. Both values below are safe
   to expose publicly: the URL is just the project's address, and the
   "anon" key is Supabase's public key, meant to be embedded in client-side
   code (same trust model as the page password — one shared secret, not
   per-user login). Row-level security policies on the `cases` table (see
   the SQL from setup) control what that key is actually allowed to do. */
const SUPABASE_URL = "https://aageffnmjkgxrxsqfncf.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFhZ2VmZm5tamtneHJ4c3FmbmNmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU5MTExMzcsImV4cCI6MjEwMTQ4NzEzN30.kR6jQ9BBWiGAmzDvFXXrZaA4jEi19zOAGYh-RHkAzsQ";
