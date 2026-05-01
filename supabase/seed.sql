-- Seed: Palm Beach ACO (anchor pilot tenant). No patients in seed — synthetic
-- test data is added per-environment, never committed (plan + docs/security.md).

insert into public.tenants (id, name, type, cohort_definition, outcome_metrics, settings)
values (
  '00000000-0000-0000-0000-000000000001',
  'Palm Beach ACO',
  'aco',
  '{"top_conditions": ["chf", "copd", "pneumonia", "ami", "post_surgical"], "min_risk_tier": "medium"}'::jsonb,
  '{"primary": "thirty_day_readmission_rate", "secondary": ["acute_transfer_avoidance", "ed_utilization"]}'::jsonb,
  '{"timezone": "America/New_York"}'::jsonb
);
