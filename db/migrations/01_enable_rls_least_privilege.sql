-- TrustGuard Database Security Migration
-- Phase 3: Enable RLS and Apply Least-Privilege Policy Model

BEGIN;

-- 1. Enable Row Level Security (RLS) on all exposed public schema tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attack_chains ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.security_decisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.simulation_runs ENABLE ROW LEVEL SECURITY;

-- 2. Revoke all privileges on public schema tables from PostgREST / Data API roles
REVOKE ALL ON TABLE public.users FROM anon, authenticated;
REVOKE ALL ON TABLE public.agents FROM anon, authenticated;
REVOKE ALL ON TABLE public.sessions FROM anon, authenticated;
REVOKE ALL ON TABLE public.attack_chains FROM anon, authenticated;
REVOKE ALL ON TABLE public.agent_events FROM anon, authenticated;
REVOKE ALL ON TABLE public.security_decisions FROM anon, authenticated;
REVOKE ALL ON TABLE public.alerts FROM anon, authenticated;
REVOKE ALL ON TABLE public.simulation_runs FROM anon, authenticated;

COMMIT;
