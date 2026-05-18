
-- ENUMS
CREATE TYPE public.app_role AS ENUM ('employee', 'manager', 'admin');
CREATE TYPE public.uom_type AS ENUM ('MIN', 'MAX', 'TIMELINE', 'ZERO');
CREATE TYPE public.goal_status AS ENUM ('DRAFT', 'SUBMITTED', 'APPROVED', 'RETURNED', 'LOCKED');
CREATE TYPE public.progress_status AS ENUM ('NOT_STARTED', 'ON_TRACK', 'COMPLETED');
CREATE TYPE public.quarter AS ENUM ('Q1', 'Q2', 'Q3', 'Q4');
CREATE TYPE public.cycle_phase AS ENUM ('GOAL_SETTING', 'Q1', 'Q2', 'Q3', 'Q4', 'CLOSED');

-- PROFILES
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  email text NOT NULL UNIQUE,
  manager_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  department text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- USER ROLES
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role public.app_role NOT NULL,
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- HAS_ROLE security definer
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role); $$;

-- IS_MANAGER_OF helper
CREATE OR REPLACE FUNCTION public.is_manager_of(_manager_id uuid, _employee_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = _employee_id AND manager_id = _manager_id); $$;

-- THRUST AREAS
CREATE TABLE public.thrust_areas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.thrust_areas ENABLE ROW LEVEL SECURITY;

-- CYCLES
CREATE TABLE public.cycles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  year int NOT NULL,
  phase public.cycle_phase NOT NULL,
  opens_at timestamptz NOT NULL,
  closes_at timestamptz NOT NULL,
  is_active boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.cycles ENABLE ROW LEVEL SECURITY;

-- GOALS
CREATE TABLE public.goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  cycle_id uuid REFERENCES public.cycles(id) ON DELETE SET NULL,
  thrust_area text NOT NULL,
  title text NOT NULL,
  description text DEFAULT '',
  uom_type public.uom_type NOT NULL,
  target numeric NOT NULL,
  weightage numeric NOT NULL,
  status public.goal_status NOT NULL DEFAULT 'DRAFT',
  is_shared boolean NOT NULL DEFAULT false,
  parent_goal_id uuid REFERENCES public.goals(id) ON DELETE SET NULL,
  locked boolean NOT NULL DEFAULT false,
  return_comment text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_goals_employee ON public.goals(employee_id);
CREATE INDEX idx_goals_status ON public.goals(status);

-- CHECK INS
CREATE TABLE public.check_ins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id uuid NOT NULL REFERENCES public.goals(id) ON DELETE CASCADE,
  quarter public.quarter NOT NULL,
  planned_target numeric NOT NULL,
  actual_achievement numeric NOT NULL DEFAULT 0,
  progress_status public.progress_status NOT NULL DEFAULT 'NOT_STARTED',
  manager_comment text,
  manager_id uuid REFERENCES public.profiles(id),
  computed_score numeric,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (goal_id, quarter)
);
ALTER TABLE public.check_ins ENABLE ROW LEVEL SECURITY;

-- AUDIT LOGS
CREATE TABLE public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id uuid REFERENCES public.goals(id) ON DELETE CASCADE,
  changed_by uuid REFERENCES public.profiles(id),
  field text NOT NULL,
  old_value text,
  new_value text,
  action text NOT NULL DEFAULT 'UPDATE',
  timestamp timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- =================== RLS POLICIES ===================

-- profiles: everyone authenticated can read; users can update own; admins all
CREATE POLICY "profiles_read_all" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid());
CREATE POLICY "profiles_admin_all" ON public.profiles FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- user_roles: read own + admins read all; admin manages
CREATE POLICY "roles_read_own" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'));
CREATE POLICY "roles_admin_manage" ON public.user_roles FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- thrust_areas
CREATE POLICY "thrust_read" ON public.thrust_areas FOR SELECT TO authenticated USING (true);
CREATE POLICY "thrust_admin" ON public.thrust_areas FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- cycles
CREATE POLICY "cycles_read" ON public.cycles FOR SELECT TO authenticated USING (true);
CREATE POLICY "cycles_admin" ON public.cycles FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- goals
CREATE POLICY "goals_employee_own" ON public.goals FOR SELECT TO authenticated USING (employee_id = auth.uid());
CREATE POLICY "goals_manager_read" ON public.goals FOR SELECT TO authenticated USING (public.is_manager_of(auth.uid(), employee_id) OR public.has_role(auth.uid(), 'manager'));
CREATE POLICY "goals_admin_read" ON public.goals FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "goals_employee_insert" ON public.goals FOR INSERT TO authenticated WITH CHECK (employee_id = auth.uid());
CREATE POLICY "goals_employee_update" ON public.goals FOR UPDATE TO authenticated USING (employee_id = auth.uid() AND locked = false);
CREATE POLICY "goals_employee_delete" ON public.goals FOR DELETE TO authenticated USING (employee_id = auth.uid() AND locked = false);
CREATE POLICY "goals_manager_update" ON public.goals FOR UPDATE TO authenticated USING (public.is_manager_of(auth.uid(), employee_id));
CREATE POLICY "goals_admin_all" ON public.goals FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- check_ins
CREATE POLICY "checkins_employee_select" ON public.check_ins FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.goals g WHERE g.id = goal_id AND g.employee_id = auth.uid()));
CREATE POLICY "checkins_manager_select" ON public.check_ins FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.goals g JOIN public.profiles p ON p.id = g.employee_id WHERE g.id = goal_id AND p.manager_id = auth.uid()));
CREATE POLICY "checkins_admin_select" ON public.check_ins FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "checkins_employee_write" ON public.check_ins FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM public.goals g WHERE g.id = goal_id AND g.employee_id = auth.uid()));
CREATE POLICY "checkins_employee_update" ON public.check_ins FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM public.goals g WHERE g.id = goal_id AND g.employee_id = auth.uid()));
CREATE POLICY "checkins_manager_update" ON public.check_ins FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM public.goals g JOIN public.profiles p ON p.id = g.employee_id WHERE g.id = goal_id AND p.manager_id = auth.uid()));
CREATE POLICY "checkins_admin_all" ON public.check_ins FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- audit_logs
CREATE POLICY "audit_admin_read" ON public.audit_logs FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "audit_insert_any" ON public.audit_logs FOR INSERT TO authenticated WITH CHECK (true);

-- =================== TRIGGERS ===================

-- handle_new_user trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)), NEW.email)
  ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'employee') ON CONFLICT DO NOTHING;
  RETURN NEW;
END; $$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- updated_at
CREATE OR REPLACE FUNCTION public.touch_updated_at() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;
CREATE TRIGGER goals_touch BEFORE UPDATE ON public.goals FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER checkins_touch BEFORE UPDATE ON public.check_ins FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Audit trigger for locked goals
CREATE OR REPLACE FUNCTION public.audit_locked_goal_changes() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF OLD.locked = true THEN
    IF OLD.title IS DISTINCT FROM NEW.title THEN
      INSERT INTO public.audit_logs (goal_id, changed_by, field, old_value, new_value)
      VALUES (NEW.id, auth.uid(), 'title', OLD.title, NEW.title);
    END IF;
    IF OLD.target IS DISTINCT FROM NEW.target THEN
      INSERT INTO public.audit_logs (goal_id, changed_by, field, old_value, new_value)
      VALUES (NEW.id, auth.uid(), 'target', OLD.target::text, NEW.target::text);
    END IF;
    IF OLD.weightage IS DISTINCT FROM NEW.weightage THEN
      INSERT INTO public.audit_logs (goal_id, changed_by, field, old_value, new_value)
      VALUES (NEW.id, auth.uid(), 'weightage', OLD.weightage::text, NEW.weightage::text);
    END IF;
    IF OLD.locked IS DISTINCT FROM NEW.locked THEN
      INSERT INTO public.audit_logs (goal_id, changed_by, field, old_value, new_value, action)
      VALUES (NEW.id, auth.uid(), 'locked', OLD.locked::text, NEW.locked::text, 'UNLOCK');
    END IF;
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER goals_audit AFTER UPDATE ON public.goals FOR EACH ROW EXECUTE FUNCTION public.audit_locked_goal_changes();

-- =================== SEED ===================
INSERT INTO public.thrust_areas (name) VALUES
  ('Revenue Growth'), ('Customer Satisfaction'), ('Operational Excellence'),
  ('Innovation'), ('Compliance');

INSERT INTO public.cycles (year, phase, opens_at, closes_at, is_active) VALUES
  (2026, 'GOAL_SETTING', now() - interval '7 days', now() + interval '30 days', true),
  (2026, 'Q1', now() + interval '60 days', now() + interval '90 days', false),
  (2026, 'Q2', now() + interval '150 days', now() + interval '180 days', false),
  (2026, 'Q3', now() + interval '240 days', now() + interval '270 days', false),
  (2026, 'Q4', now() + interval '330 days', now() + interval '360 days', false);
