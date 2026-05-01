# Buyers

Five tenant types, each a different sales motion, cohort definition, outcome metric, and care team structure. Stored as `tenants.type` enum + `tenants.cohort_definition` jsonb + `tenants.outcome_metrics` jsonb.

The `cohort_definition` and `outcome_metrics` shapes are intentionally free-form (jsonb) until a buyer-type's pattern stabilizes. Each section below documents the expected shape; treat it as a soft contract, not a schema constraint.

---

## ACO — Accountable Care Organization

**Anchor pilot: Palm Beach ACO (PBACO).** Top conditions: CHF, COPD, pneumonia, AMI, post-surgical recovery.

**Cohort:** Risk-stratified Medicare Shared Savings Program lives, typically 5–15% of the panel flagged as "rising risk" or "high risk" via the ACO's existing risk model.

```jsonc
// cohort_definition
{
  "top_conditions": ["chf", "copd", "pneumonia", "ami", "post_surgical"],
  "min_risk_tier": "medium",
  "min_age": 65,
  "exclude": ["hospice", "memory_care"],
}
```

**Outcome metric:** 30-day readmission rate. Secondary: acute transfer avoidance, ED utilization.

```jsonc
// outcome_metrics
{
  "primary": "thirty_day_readmission_rate",
  "secondary": ["acute_transfer_avoidance", "ed_utilization"],
  "baseline_period": "2025-01-01..2025-12-31",
}
```

**Care team roles:** `tenant_admin` = ACO ops director, `care_team_lead` = nurse care manager, `care_team_member` = floor RNs / social workers.

**Family-in-the-loop:** OPEN — does PBACO already maintain family contact lists in their PHM platform? If yes, sync; if no, our DB owns it. **Decision needed before family feature build.**

---

## MA Plan — Medicare Advantage payer

**Cohort:** High-risk MA members, often defined by HCC score, recent inpatient stay, or chronic care management eligibility.

```jsonc
{
  "min_hcc_score": 2.0,
  "include_states": ["FL", "NY"],
  "top_conditions": ["chf", "copd", "diabetes", "frailty"],
}
```

**Outcome metric:** Stars rating components (Adult Access to Care, Plan All-Cause Readmissions, Statin Use in Persons with Diabetes) + HEDIS gap closure.

```jsonc
{
  "primary": "stars_composite",
  "stars_measures": ["c10", "c14", "d09"],
  "secondary": ["hedis_gap_closures", "thirty_day_readmission_rate"],
}
```

**Care team roles:** `tenant_admin` = star ratings director, `care_team_lead` = case manager supervisor, `care_team_member` = care coordinators.

**Family-in-the-loop:** OPEN.

---

## Physician Group — risk-bearing primary care

**Cohort:** Panel patients flagged by EHR risk score or care manager; typically capitated value-based primary care.

```jsonc
{
  "panel_id": "<group's panel ID>",
  "include_risk_tags": ["panel-rising-risk", "post-discharge-30d"],
}
```

**Outcome metric:** Acute utilization (ED + inpatient days per 1000), no-show rate to scheduled visits, patient activation.

```jsonc
{
  "primary": "acute_utilization_per_1000",
  "secondary": ["no_show_rate", "patient_activation_score"],
}
```

**Care team roles:** `tenant_admin` = practice manager, `care_team_lead` = nurse practitioner / physician, `care_team_member` = MAs and care coordinators.

**Family-in-the-loop:** OPEN — physician groups often have _existing_ family contact in EHR.

---

## Home Health — HHA agency

**Cohort:** Active home-health episodes (60-day periods of care, OASIS-driven).

```jsonc
{
  "active_episodes": true,
  "include_oasis_risk": ["high"],
  "exclude_episode_types": ["lupa"],
}
```

**Outcome metric:** Acute transfer avoidance during the episode, 30-day post-discharge rehospitalization, quality star rating components.

```jsonc
{
  "primary": "acute_transfer_avoidance_rate",
  "secondary": ["post_discharge_30d_readmission", "ohqr_components"],
}
```

**Care team roles:** `tenant_admin` = director of clinical services, `care_team_lead` = case manager / RN supervisor, `care_team_member` = field RNs / LPNs.

**Family-in-the-loop:** OPEN — home health caregivers are already a pseudo-care-team member; modeling needs thought.

---

## SNF — Skilled Nursing Facility

**Cohort:** Recently discharged short-stay residents (typically 30 days post-discharge home).

```jsonc
{
  "post_discharge_window_days": 30,
  "discharge_disposition": ["home", "home_with_services"],
}
```

**Outcome metric:** 30-day rehospitalization, ED revisits, SNF QRP measures.

```jsonc
{
  "primary": "thirty_day_rehospitalization",
  "secondary": ["ed_revisits", "snf_qrp_measures"],
}
```

**Care team roles:** `tenant_admin` = administrator, `care_team_lead` = DON / ADON, `care_team_member` = MDS coordinators / discharge planners.

**Family-in-the-loop:** OPEN — SNFs typically have power-of-attorney documents; family permission model needs research.

---

## Cross-cutting open questions

These are deferred from V1 but will affect every buyer type:

1. **Family contact source-of-truth.** Each buyer type already maintains _some_ family contact data in their existing systems. Decision: do we sync from theirs, own ours, or hybrid? Resolve before family-in-the-loop migration.
2. **Cohort refresh cadence.** Buyer panels change weekly or monthly. Do we accept a CSV upload, sync via FHIR, or pull from their EHR/PHM via a custom integration? Likely tenant-by-tenant.
3. **Outcome metric reconciliation.** We compute _call signal_ metrics (alerts raised, mood trends). The buyer's _outcome metric_ (30-day readmits) lives in their data warehouse. The reconciliation job has to live somewhere.
