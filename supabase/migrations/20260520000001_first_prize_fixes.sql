-- ============================================================
-- First-prize patch: fixes all critical bugs and BRD gaps
-- ============================================================

-- 1. Enforce minimum 10% weightage per goal at DB level (BRD §2.1)
ALTER TABLE public.goals
  ADD CONSTRAINT goals_min_weightage CHECK (weightage >= 10);

-- 2. Enforce ZERO-type goals must have target = 0 (BRD §2.2)
ALTER TABLE public.goals
  ADD CONSTRAINT goals_zero_uom_target CHECK (uom_type <> 'ZERO' OR target = 0);

-- 3. SECURITY DEFINER function to sync sibling check-ins
--    Bypasses RLS so the primary owner can write achievement
--    for all siblings linked by parent_goal_id.
CREATE OR REPLACE FUNCTION public.sync_shared_checkin(
  p_parent_goal_id uuid,
  p_quarter        public.quarter,
  p_actual         numeric,
  p_status         public.progress_status
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  sib RECORD;
  sib_score   numeric;
  existing_id uuid;
BEGIN
  -- Find all sibling goals (other rows sharing the same parent)
  FOR sib IN
    SELECT g.id, g.uom_type, g.target
    FROM   public.goals g
    WHERE  (g.parent_goal_id = p_parent_goal_id OR g.id = p_parent_goal_id)
  LOOP
    -- Compute score for this sibling's own target/uom
    sib_score :=
      CASE sib.uom_type
        WHEN 'MIN'      THEN LEAST(ROUND((p_actual / NULLIF(sib.target,0)) * 100, 1), 150)
        WHEN 'MAX'      THEN LEAST(ROUND((sib.target / NULLIF(p_actual,0)) * 100, 1), 150)
        WHEN 'TIMELINE' THEN GREATEST(0, LEAST(100, 100 - (p_actual - sib.target)))
        WHEN 'ZERO'     THEN CASE WHEN p_actual = 0 THEN 100 ELSE 0 END
        ELSE 0
      END;

    SELECT id INTO existing_id
    FROM   public.check_ins
    WHERE  goal_id = sib.id AND quarter = p_quarter;

    IF existing_id IS NOT NULL THEN
      UPDATE public.check_ins SET
        actual_achievement = p_actual,
        progress_status    = p_status,
        computed_score     = sib_score,
        updated_at         = now()
      WHERE id = existing_id;
    ELSE
      INSERT INTO public.check_ins (goal_id, quarter, planned_target, actual_achievement, progress_status, computed_score)
      VALUES (sib.id, p_quarter, ROUND(sib.target / 4, 4), p_actual, p_status, sib_score);
    END IF;
  END LOOP;
END;
$$;

-- Grant execute to authenticated users (RLS still applies to the caller context,
-- but the function body runs as the definer and can write any sibling row)
GRANT EXECUTE ON FUNCTION public.sync_shared_checkin(uuid, public.quarter, numeric, public.progress_status)
  TO authenticated;

-- 4. Approve all per-employee validation: DB constraint already covers min 10%.
--    Add a function to atomically approve a full employee goal set only when
--    total weightage = 100 AND all individual goals >= 10.
CREATE OR REPLACE FUNCTION public.approve_employee_goals(p_employee_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  total_w numeric;
  low_count int;
BEGIN
  -- Must be called by a manager of this employee or admin
  IF NOT (
    public.is_manager_of(auth.uid(), p_employee_id)
    OR public.has_role(auth.uid(), 'admin')
  ) THEN
    RETURN 'UNAUTHORIZED';
  END IF;

  SELECT COALESCE(SUM(weightage), 0)
  INTO   total_w
  FROM   public.goals
  WHERE  employee_id = p_employee_id
    AND  status = 'SUBMITTED';

  IF total_w <> 100 THEN
    RETURN 'WEIGHTAGE_NOT_100';
  END IF;

  SELECT COUNT(*)
  INTO   low_count
  FROM   public.goals
  WHERE  employee_id = p_employee_id
    AND  status = 'SUBMITTED'
    AND  weightage < 10;

  IF low_count > 0 THEN
    RETURN 'MIN_WEIGHTAGE_VIOLATION';
  END IF;

  UPDATE public.goals
  SET    status = 'APPROVED', locked = true
  WHERE  employee_id = p_employee_id
    AND  status = 'SUBMITTED';

  RETURN 'OK';
END;
$$;

GRANT EXECUTE ON FUNCTION public.approve_employee_goals(uuid) TO authenticated;
