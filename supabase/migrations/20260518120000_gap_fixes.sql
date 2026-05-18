-- ============================================================
-- GAP-FIX MIGRATION  (run after the original two migrations)
-- Fixes: audit trigger, server-side weightage validation,
--        per-quarter planned targets, cycle create/edit,
--        user management helpers, escalation log enhancements
-- ============================================================

-- ──────────────────────────────────────────────
-- 1. DROP the old audit trigger that only fired
--    when goals were ALREADY locked. Replace with
--    a comprehensive trigger that logs every status
--    change and every field change on any goal.
-- ──────────────────────────────────────────────
DROP TRIGGER IF EXISTS goals_audit ON public.goals;
DROP FUNCTION IF EXISTS public.audit_locked_goal_changes();

CREATE OR REPLACE FUNCTION public.audit_goal_changes()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  actor uuid;
BEGIN
  actor := auth.uid();

  -- Status change (always log regardless of lock state)
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.audit_logs (goal_id, changed_by, field, old_value, new_value, action)
    VALUES (NEW.id, actor, 'status', OLD.status::text, NEW.status::text,
            CASE NEW.status
              WHEN 'APPROVED' THEN 'APPROVE'
              WHEN 'RETURNED' THEN 'RETURN'
              WHEN 'SUBMITTED' THEN 'SUBMIT'
              ELSE 'UPDATE'
            END);
  END IF;

  -- Lock change
  IF OLD.locked IS DISTINCT FROM NEW.locked THEN
    INSERT INTO public.audit_logs (goal_id, changed_by, field, old_value, new_value, action)
    VALUES (NEW.id, actor, 'locked', OLD.locked::text, NEW.locked::text,
            CASE WHEN NEW.locked THEN 'LOCK' ELSE 'UNLOCK' END);
  END IF;

  -- Title change (any state)
  IF OLD.title IS DISTINCT FROM NEW.title THEN
    INSERT INTO public.audit_logs (goal_id, changed_by, field, old_value, new_value, action)
    VALUES (NEW.id, actor, 'title', OLD.title, NEW.title, 'UPDATE');
  END IF;

  -- Target change
  IF OLD.target IS DISTINCT FROM NEW.target THEN
    INSERT INTO public.audit_logs (goal_id, changed_by, field, old_value, new_value, action)
    VALUES (NEW.id, actor, 'target', OLD.target::text, NEW.target::text, 'UPDATE');
  END IF;

  -- Weightage change
  IF OLD.weightage IS DISTINCT FROM NEW.weightage THEN
    INSERT INTO public.audit_logs (goal_id, changed_by, field, old_value, new_value, action)
    VALUES (NEW.id, actor, 'weightage', OLD.weightage::text, NEW.weightage::text, 'UPDATE');
  END IF;

  -- Return comment
  IF OLD.return_comment IS DISTINCT FROM NEW.return_comment AND NEW.return_comment IS NOT NULL THEN
    INSERT INTO public.audit_logs (goal_id, changed_by, field, old_value, new_value, action)
    VALUES (NEW.id, actor, 'return_comment', OLD.return_comment, NEW.return_comment, 'COMMENT');
  END IF;

  RETURN NEW;
END; $$;

CREATE TRIGGER goals_audit
AFTER UPDATE ON public.goals
FOR EACH ROW EXECUTE FUNCTION public.audit_goal_changes();

-- Also log INSERT (goal created)
CREATE OR REPLACE FUNCTION public.audit_goal_created()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.audit_logs (goal_id, changed_by, field, old_value, new_value, action)
  VALUES (NEW.id, auth.uid(), 'status', NULL, 'DRAFT', 'CREATE');
  RETURN NEW;
END; $$;

CREATE TRIGGER goals_audit_insert
AFTER INSERT ON public.goals
FOR EACH ROW EXECUTE FUNCTION public.audit_goal_created();


-- ──────────────────────────────────────────────
-- 2. SERVER-SIDE weightage validation
--    Enforce: each goal weightage >= 10
--    The 100% total is validated per-employee at
--    submission time via a CHECK on a function
--    (we enforce min 10 at column level; total=100
--    is enforced by the approve function below)
-- ──────────────────────────────────────────────
ALTER TABLE public.goals
  ADD CONSTRAINT goal_weightage_min CHECK (weightage >= 10);

ALTER TABLE public.goals
  ADD CONSTRAINT goal_weightage_max CHECK (weightage <= 100);

-- Server-side approve function: validates 100% before locking
CREATE OR REPLACE FUNCTION public.approve_employee_goals(p_employee_id uuid, p_manager_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  total_weight numeric;
  goal_count   int;
BEGIN
  -- Only the direct manager or admin may approve
  IF NOT (public.is_manager_of(p_manager_id, p_employee_id) OR public.has_role(p_manager_id, 'admin')) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Not authorised to approve these goals');
  END IF;

  SELECT COALESCE(SUM(weightage), 0), COUNT(*)
    INTO total_weight, goal_count
    FROM public.goals
   WHERE employee_id = p_employee_id AND status = 'SUBMITTED';

  IF goal_count = 0 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'No submitted goals found');
  END IF;

  IF total_weight <> 100 THEN
    RETURN jsonb_build_object('ok', false, 'error',
      format('Total weightage must be exactly 100%% (currently %s%%)', total_weight));
  END IF;

  IF goal_count > 8 THEN
    RETURN jsonb_build_object('ok', false, 'error',
      format('Too many goals (%s). Maximum is 8.', goal_count));
  END IF;

  UPDATE public.goals
     SET status = 'APPROVED', locked = true
   WHERE employee_id = p_employee_id AND status = 'SUBMITTED';

  RETURN jsonb_build_object('ok', true, 'approved', goal_count);
END; $$;


-- ──────────────────────────────────────────────
-- 3. Per-quarter planned targets on check_ins
--    Add planned_q1..q4 columns to goals so each
--    quarter can have its own planned milestone.
--    Default splits evenly; employee/manager can
--    edit before Q1 opens.
-- ──────────────────────────────────────────────
ALTER TABLE public.goals
  ADD COLUMN IF NOT EXISTS planned_q1 numeric,
  ADD COLUMN IF NOT EXISTS planned_q2 numeric,
  ADD COLUMN IF NOT EXISTS planned_q3 numeric,
  ADD COLUMN IF NOT EXISTS planned_q4 numeric;

-- Back-fill existing rows with even split
UPDATE public.goals SET
  planned_q1 = target / 4,
  planned_q2 = target / 4,
  planned_q3 = target / 4,
  planned_q4 = target / 4
WHERE planned_q1 IS NULL;


-- ──────────────────────────────────────────────
-- 4. Escalation log: add chain columns so we can
--    track escalation level (1=employee, 2=manager,
--    3=HR) and who was notified
-- ──────────────────────────────────────────────
ALTER TABLE public.escalation_logs
  ADD COLUMN IF NOT EXISTS escalation_level int NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS notified_users   text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS auto_triggered   boolean NOT NULL DEFAULT false;

-- Stored function: run escalation check server-side
-- Called by frontend button AND can be called by a scheduled edge function
CREATE OR REPLACE FUNCTION public.run_escalation_check()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  gs_cycle      record;
  uid           uuid;
  inserted      int := 0;
  reason_text   text;
  existing_key  text;
  g             record;
BEGIN
  -- (a) Goal-setting cycle open 7+ days: employees with no SUBMITTED/APPROVED goal
  SELECT * INTO gs_cycle FROM public.cycles
   WHERE phase = 'GOAL_SETTING' AND is_active = true LIMIT 1;

  IF FOUND AND (now() - gs_cycle.opens_at) >= interval '7 days' THEN
    FOR uid IN
      SELECT ur.user_id FROM public.user_roles ur
       WHERE ur.role = 'employee'
         AND NOT EXISTS (
           SELECT 1 FROM public.goals g2
            WHERE g2.employee_id = ur.user_id
              AND g2.status IN ('SUBMITTED','APPROVED')
         )
    LOOP
      reason_text := format('No goals submitted 7+ days after %s goal-setting cycle opened', gs_cycle.year);
      IF NOT EXISTS (
        SELECT 1 FROM public.escalation_logs el
         WHERE el.user_id = uid AND el.reason = reason_text AND el.resolved = false
      ) THEN
        INSERT INTO public.escalation_logs (user_id, reason, auto_triggered, escalation_level)
        VALUES (uid, reason_text, true, 1);
        inserted := inserted + 1;
      END IF;
    END LOOP;
  END IF;

  -- (b) SUBMITTED goals not approved within 5 days
  FOR g IN
    SELECT * FROM public.goals
     WHERE status = 'SUBMITTED'
       AND (now() - updated_at) >= interval '5 days'
  LOOP
    reason_text := format('Goal pending manager approval 5+ days (goal %s)', left(g.id::text, 8));
    IF NOT EXISTS (
      SELECT 1 FROM public.escalation_logs el
       WHERE el.user_id = g.employee_id AND el.reason = reason_text AND el.resolved = false
    ) THEN
      INSERT INTO public.escalation_logs (user_id, reason, auto_triggered, escalation_level)
      VALUES (g.employee_id, reason_text, true, 2);
      inserted := inserted + 1;
    END IF;
  END LOOP;

  -- (c) Q check-in window open but employee hasn't submitted a check-in yet (3 days grace)
  FOR g IN
    SELECT DISTINCT gx.employee_id, cy.phase
      FROM public.cycles cy
      JOIN public.goals gx ON gx.status IN ('APPROVED', 'LOCKED') OR gx.locked = true
     WHERE cy.is_active = true
       AND cy.phase IN ('Q1','Q2','Q3','Q4')
       AND (now() - cy.opens_at) >= interval '3 days'
       AND NOT EXISTS (
         SELECT 1 FROM public.check_ins ci
          WHERE ci.goal_id = gx.id AND ci.quarter::text = cy.phase
       )
  LOOP
    reason_text := format('No %s check-in submitted 3+ days after window opened', g.phase);
    IF NOT EXISTS (
      SELECT 1 FROM public.escalation_logs el
       WHERE el.user_id = g.employee_id AND el.reason = reason_text AND el.resolved = false
    ) THEN
      INSERT INTO public.escalation_logs (user_id, reason, auto_triggered, escalation_level)
      VALUES (g.employee_id, reason_text, true, 1);
      inserted := inserted + 1;
    END IF;
  END LOOP;

  RETURN jsonb_build_object('ok', true, 'inserted', inserted);
END; $$;

GRANT EXECUTE ON FUNCTION public.run_escalation_check() TO authenticated;
GRANT EXECUTE ON FUNCTION public.approve_employee_goals(uuid, uuid) TO authenticated;


-- ──────────────────────────────────────────────
-- 5. Admin helper: update user role & manager
-- ──────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.admin_set_user_role(
  p_user_id uuid,
  p_role    public.app_role,
  p_add     boolean DEFAULT true
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Admin only';
  END IF;
  IF p_add THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (p_user_id, p_role)
    ON CONFLICT DO NOTHING;
  ELSE
    DELETE FROM public.user_roles WHERE user_id = p_user_id AND role = p_role;
  END IF;
END; $$;

CREATE OR REPLACE FUNCTION public.admin_set_manager(
  p_employee_id uuid,
  p_manager_id  uuid
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Admin only';
  END IF;
  UPDATE public.profiles SET manager_id = p_manager_id WHERE id = p_employee_id;
END; $$;

GRANT EXECUTE ON FUNCTION public.admin_set_user_role(uuid, public.app_role, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_set_manager(uuid, uuid) TO authenticated;


-- ──────────────────────────────────────────────
-- 6. Allow admins to INSERT/UPDATE cycles
--    (policy already covers admin all, but add
--     explicit insert for clarity)
-- ──────────────────────────────────────────────
-- Already covered by "cycles_admin" policy (FOR ALL).
-- Just ensure profiles insert is allowed for admin
CREATE POLICY "profiles_admin_insert" ON public.profiles
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));


-- ──────────────────────────────────────────────
-- 7. Ensure audit_logs allows service role too
--    (for edge function calls)
-- ──────────────────────────────────────────────
DROP POLICY IF EXISTS "audit_insert_any" ON public.audit_logs;
CREATE POLICY "audit_insert_auth" ON public.audit_logs
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "audit_manager_read" ON public.audit_logs
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'));
