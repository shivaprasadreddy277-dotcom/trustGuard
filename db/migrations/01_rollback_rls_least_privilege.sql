-- TrustGuard Migration Rollback Script
-- Restores pre-migration table state if required

BEGIN;

-- Disable Row Level Security on all public tables
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.agents DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessions DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.attack_chains DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_events DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.security_decisions DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.alerts DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.simulation_runs DISABLE ROW LEVEL SECURITY;

-- Re-grant standard PostgREST access (if needed)
GRANT ALL ON TABLE public.users TO anon, authenticated;
GRANT ALL ON TABLE public.agents TO anon, authenticated;
GRANT ALL ON TABLE public.sessions TO anon, authenticated;
GRANT ALL ON TABLE public.attack_chains TO anon, authenticated;
GRANT ALL ON TABLE public.agent_events TO anon, authenticated;
GRANT ALL ON TABLE public.security_decisions TO anon, authenticated;
GRANT ALL ON TABLE public.alerts TO anon, authenticated;
GRANT ALL ON TABLE public.simulation_runs TO anon, authenticated;

COMMIT;
