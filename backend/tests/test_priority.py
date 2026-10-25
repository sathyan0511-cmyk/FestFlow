"""Unit Tests for CampusFix Explainable Prioritisation & SLA Engine."""

import math
from datetime import datetime, timezone, timedelta
import pytest

from app.engines.priority import PriorityEngine, _normalize_dt

# Base fixed reference time for deterministic testing
BASE_NOW = datetime(2026, 10, 20, 12, 0, 0, tzinfo=timezone.utc)


# =====================================================================
# 1. Score Bounds & Extremes Tests
# =====================================================================

def test_absolute_minimum_score():
    """Verify minimum inputs produce a score within [0.0, 100.0]."""
    res = PriorityEngine.calculate_priority(
        severity="LOW",
        is_safety_hazard=False,
        hazard_type="NONE",
        affected_people_count=1,
        created_at=BASE_NOW,
        duplicate_count=0,
        reference_time=BASE_NOW
    )
    score = res["priority_score"]
    assert 0.0 <= score <= 100.0
    assert res["priority_level"] == "LOW"
    assert res["sla_hours"] == 48
    # 7.5 (sev) + 0.0 (safe) + ~2.23 (aff) + 0.0 (age) + 0.0 (dup) = ~9.7
    assert 9.0 <= score <= 11.0


def test_absolute_maximum_score_clamping():
    """Verify maximum combined factors are strictly capped at 100.0."""
    res = PriorityEngine.calculate_priority(
        severity="CRITICAL",
        is_safety_hazard=True,
        hazard_type="ELECTRICAL",
        affected_people_count=2000,   # exceeds 500 saturation
        created_at=BASE_NOW - timedelta(hours=100),  # exceeds 48h aging
        duplicate_count=20,           # exceeds 5 saturation
        reference_time=BASE_NOW
    )
    # 30 (sev) + 25 (safe) + 20 (aff) + 15 (age) + 10 (dup) = 100.0
    assert res["priority_score"] == 100.0
    assert res["priority_level"] == "CRITICAL"
    assert res["sla_hours"] == 4


# =====================================================================
# 2. Severity Factor Monotonicity Tests
# =====================================================================

@pytest.mark.parametrize("sev, expected_pts, expected_tier", [
    ("LOW", 7.5, "LOW"),
    ("MEDIUM", 15.0, "LOW"),      # 15 + ~2.23 = 17.2 -> LOW (<35)
    ("HIGH", 22.5, "LOW"),        # 22.5 + ~2.23 = 24.7 -> LOW (<35)
    ("CRITICAL", 30.0, "LOW"),    # 30.0 + ~2.23 = 32.2 -> LOW (<35)
])
def test_severity_levels(sev, expected_pts, expected_tier):
    """Verify each severity level contributes exact points."""
    res = PriorityEngine.calculate_priority(
        severity=sev,
        is_safety_hazard=False,
        affected_people_count=1,
        created_at=BASE_NOW,
        reference_time=BASE_NOW
    )
    assert res["factors"]["severity"]["score"] == expected_pts
    assert res["factors"]["severity"]["value"] == sev


def test_severity_monotonic_progression():
    """Verify strictly increasing score as severity increases."""
    scores = []
    for sev in ["LOW", "MEDIUM", "HIGH", "CRITICAL"]:
        r = PriorityEngine.calculate_priority(severity=sev, reference_time=BASE_NOW)
        scores.append(r["priority_score"])
    assert scores[0] < scores[1] < scores[2] < scores[3]


# =====================================================================
# 3. Safety Hazard Meaningful Elevation Tests
# =====================================================================

def test_safety_hazard_versus_non_hazard():
    """Verify acute safety hazard substantially escalates score and tier."""
    non_hazard = PriorityEngine.calculate_priority(
        severity="MEDIUM",
        is_safety_hazard=False,
        hazard_type="NONE",
        affected_people_count=10,
        reference_time=BASE_NOW
    )
    hazard = PriorityEngine.calculate_priority(
        severity="MEDIUM",
        is_safety_hazard=True,
        hazard_type="ELECTRICAL",
        affected_people_count=10,
        reference_time=BASE_NOW
    )

    diff = hazard["priority_score"] - non_hazard["priority_score"]
    assert pytest.approx(diff, abs=1e-5) == 25.0
    assert hazard["factors"]["safety_hazard"]["score"] == 25.0
    assert non_hazard["factors"]["safety_hazard"]["score"] == 0.0
    # Escalates tier from LOW to MEDIUM
    assert non_hazard["priority_level"] == "LOW"
    assert hazard["priority_level"] == "MEDIUM"


@pytest.mark.parametrize("hazard_type, expected_score", [
    ("ELECTRICAL", 25.0),
    ("FIRE", 25.0),
    ("STRUCTURAL", 25.0),
    ("CHEMICAL", 25.0),
    ("GAS_LEAK", 25.0),
    ("TRIP_FALL", 15.0),
    ("WATER_DAMAGE", 15.0),
    ("SHATTERED_GLASS", 15.0),
    ("UNSPECIFIED_NEW_HAZARD", 20.0),  # General fallback
])
def test_hazard_taxonomy_scoring(hazard_type, expected_score):
    """Verify diverse safety hazard types receive proper calibrated weights."""
    res = PriorityEngine.calculate_priority(
        severity="LOW",
        is_safety_hazard=True,
        hazard_type=hazard_type,
        reference_time=BASE_NOW
    )
    assert res["factors"]["safety_hazard"]["score"] == expected_score


# =====================================================================
# 4. Affected Population Logarithmic Scaling Tests
# =====================================================================

def test_affected_population_monotonicity_and_saturation():
    """Verify population increases score logarithmically and saturates at 20.0."""
    counts = [1, 5, 20, 50, 100, 250, 500, 1000]
    scores = []
    for c in counts:
        r = PriorityEngine.calculate_priority(
            severity="MEDIUM",
            affected_people_count=c,
            reference_time=BASE_NOW
        )
        scores.append(r["factors"]["affected_people"]["score"])

    # Strictly monotonic until saturation
    for i in range(len(scores) - 2):
        assert scores[i] < scores[i + 1]

    # Max points capped at 20.0 at/beyond 500 occupants
    assert scores[-2] == 20.0
    assert scores[-1] == 20.0


# =====================================================================
# 5. Aging Factor & Upper Bound Tests
# =====================================================================

def test_aging_progression_and_cap():
    """Verify aging factor scales linearly over 48h and caps at 15.0."""
    t0 = PriorityEngine.calculate_priority(
        severity="MEDIUM",
        created_at=BASE_NOW,
        reference_time=BASE_NOW
    )
    assert t0["factors"]["aging"]["score"] == 0.0

    t24 = PriorityEngine.calculate_priority(
        severity="MEDIUM",
        created_at=BASE_NOW - timedelta(hours=24),
        reference_time=BASE_NOW
    )
    assert t24["factors"]["aging"]["score"] == 7.5

    t48 = PriorityEngine.calculate_priority(
        severity="MEDIUM",
        created_at=BASE_NOW - timedelta(hours=48),
        reference_time=BASE_NOW
    )
    assert t48["factors"]["aging"]["score"] == 15.0

    t96 = PriorityEngine.calculate_priority(
        severity="MEDIUM",
        created_at=BASE_NOW - timedelta(hours=96),
        reference_time=BASE_NOW
    )
    assert t96["factors"]["aging"]["score"] == 15.0  # capped strictly


def test_future_creation_time_clamped():
    """Verify incidents with clocks in the future do not produce negative aging."""
    future = PriorityEngine.calculate_priority(
        severity="MEDIUM",
        created_at=BASE_NOW + timedelta(hours=5),
        reference_time=BASE_NOW
    )
    assert future["factors"]["aging"]["score"] == 0.0
    assert future["factors"]["aging"]["hours_open"] == 0.0


# =====================================================================
# 6. Duplicate Escalation Tests
# =====================================================================

def test_duplicate_escalation_boost():
    """Verify corroborating reports escalate score up to 10.0 points."""
    d0 = PriorityEngine.calculate_priority(severity="MEDIUM", duplicate_count=0, reference_time=BASE_NOW)
    d1 = PriorityEngine.calculate_priority(severity="MEDIUM", duplicate_count=1, reference_time=BASE_NOW)
    d3 = PriorityEngine.calculate_priority(severity="MEDIUM", duplicate_count=3, reference_time=BASE_NOW)
    d5 = PriorityEngine.calculate_priority(severity="MEDIUM", duplicate_count=5, reference_time=BASE_NOW)
    d10 = PriorityEngine.calculate_priority(severity="MEDIUM", duplicate_count=10, reference_time=BASE_NOW)

    assert d0["factors"]["duplicate_escalation"]["score"] == 0.0
    assert d1["factors"]["duplicate_escalation"]["score"] == 2.0
    assert d3["factors"]["duplicate_escalation"]["score"] == 6.0
    assert d5["factors"]["duplicate_escalation"]["score"] == 10.0
    assert d10["factors"]["duplicate_escalation"]["score"] == 10.0  # capped


# =====================================================================
# 7. Robustness, Missing & Extreme Value Tests
# =====================================================================

@pytest.mark.parametrize("bad_input", [
    {"severity": None, "affected_people_count": -5, "duplicate_count": -10},
    {"severity": "UNKNOWN_GARBAGE", "affected_people_count": "invalid", "duplicate_count": None},
    {"affected_people_count": float("nan"), "duplicate_count": float("inf")},
    {"affected_people_count": 10_000_000, "duplicate_count": 50_000},
    {"created_at": None, "reference_time": None},
])
def test_robustness_against_malformed_inputs(bad_input):
    """Verify that corrupt, missing, or extreme inputs never raise or produce NaN/inf."""
    res = PriorityEngine.calculate_priority(**bad_input)
    score = res["priority_score"]
    assert isinstance(score, float)
    assert not math.isnan(score)
    assert not math.isinf(score)
    assert 0.0 <= score <= 100.0
    assert res["priority_level"] in ("LOW", "MEDIUM", "HIGH", "CRITICAL")
    assert isinstance(res["reason"], str)


# =====================================================================
# 8. Determinism & Repeatability Tests
# =====================================================================

def test_deterministic_identical_runs():
    """Verify running the engine multiple times with identical inputs yields exact same results."""
    first_run = PriorityEngine.calculate_priority(
        severity="HIGH",
        is_safety_hazard=True,
        hazard_type="STRUCTURAL",
        affected_people_count=45,
        created_at=BASE_NOW - timedelta(hours=14),
        duplicate_count=3,
        reference_time=BASE_NOW
    )
    for _ in range(50):
        subsequent = PriorityEngine.calculate_priority(
            severity="HIGH",
            is_safety_hazard=True,
            hazard_type="STRUCTURAL",
            affected_people_count=45,
            created_at=BASE_NOW - timedelta(hours=14),
            duplicate_count=3,
            reference_time=BASE_NOW
        )
        assert subsequent == first_run


# =====================================================================
# 9. Explainability & Factor Consistency Tests
# =====================================================================

def test_factor_breakdown_consistency():
    """Verify the sum of individual factor points equals the computed priority score."""
    res = PriorityEngine.calculate_priority(
        severity="HIGH",
        is_safety_hazard=True,
        hazard_type="FIRE",
        affected_people_count=80,
        created_at=BASE_NOW - timedelta(hours=10),
        duplicate_count=2,
        reference_time=BASE_NOW
    )
    factors = res["factors"]
    sum_factors = (
        factors["severity"]["score"] +
        factors["safety_hazard"]["score"] +
        factors["affected_people"]["score"] +
        factors["aging"]["score"] +
        factors["duplicate_escalation"]["score"]
    )
    expected_score = round(min(100.0, sum_factors), 1)
    assert res["priority_score"] == expected_score

    # Check reason text contains key descriptors
    reason = res["reason"]
    assert res["priority_level"] in reason
    assert str(res["priority_score"]) in reason
    assert "FIRE" in reason


# =====================================================================
# 10. SLA Policy, Deadline & State Evaluation Tests
# =====================================================================

@pytest.mark.parametrize("tier, expected_hours", [
    ("CRITICAL", 4),
    ("HIGH", 12),
    ("MEDIUM", 24),
    ("LOW", 48),
    ("UNKNOWN", 24),  # Default to MEDIUM
])
def test_sla_deadline_assignment(tier, expected_hours):
    """Verify SLA deadline assignment adheres to policy matrix."""
    created = datetime(2026, 10, 20, 10, 0, 0, tzinfo=timezone.utc)
    deadline = PriorityEngine.calculate_sla_deadline(created, tier)
    assert deadline == created + timedelta(hours=expected_hours)


def test_sla_states_active_incident():
    """Test ON_TRACK, AT_RISK, and BREACHED states for active incidents."""
    created = datetime(2026, 10, 20, 0, 0, 0, tzinfo=timezone.utc)
    deadline = created + timedelta(hours=24)  # 24h total duration

    # 1. On Track: 4h elapsed, 20h remaining (>25% and >2h)
    eval_on_track = PriorityEngine.evaluate_sla_status(
        created_at=created,
        sla_deadline=deadline,
        reference_time=created + timedelta(hours=4)
    )
    assert eval_on_track["state"] == "ON_TRACK"
    assert eval_on_track["is_breached"] is False
    assert eval_on_track["remaining_minutes"] == 20 * 60

    # 2. At Risk: 22h elapsed, 2h remaining (<= 25% or <= 2h)
    eval_at_risk = PriorityEngine.evaluate_sla_status(
        created_at=created,
        sla_deadline=deadline,
        reference_time=created + timedelta(hours=22)
    )
    assert eval_at_risk["state"] == "AT_RISK"
    assert eval_at_risk["is_breached"] is False
    assert eval_at_risk["remaining_minutes"] == 2 * 60

    # 3. Breached: 26h elapsed, 2h overdue
    eval_breached = PriorityEngine.evaluate_sla_status(
        created_at=created,
        sla_deadline=deadline,
        reference_time=created + timedelta(hours=26)
    )
    assert eval_breached["state"] == "BREACHED"
    assert eval_breached["is_breached"] is True
    assert eval_breached["remaining_minutes"] == -120


def test_sla_states_resolved_incident():
    """Test COMPLIED vs RESOLVED_BREACHED states for closed incidents."""
    created = datetime(2026, 10, 20, 0, 0, 0, tzinfo=timezone.utc)
    deadline = created + timedelta(hours=12)

    # Resolved within SLA
    comp = PriorityEngine.evaluate_sla_status(
        created_at=created,
        sla_deadline=deadline,
        status="RESOLVED",
        resolved_at=created + timedelta(hours=8)
    )
    assert comp["state"] == "COMPLIED"
    assert comp["is_breached"] is False

    # Resolved after SLA
    late = PriorityEngine.evaluate_sla_status(
        created_at=created,
        sla_deadline=deadline,
        status="RESOLVED",
        resolved_at=created + timedelta(hours=15)
    )
    assert late["state"] == "RESOLVED_BREACHED"
    assert late["is_breached"] is True


# =====================================================================
# 11. Datetime Boundary & Timezone Robustness Tests
# =====================================================================

def test_timezone_naive_and_aware_interoperability():
    """Verify seamless arithmetic between naive and timezone-aware datetimes."""
    naive_created = datetime(2026, 10, 20, 6, 0, 0)
    aware_now = datetime(2026, 10, 20, 18, 0, 0, tzinfo=timezone.utc)

    # Calculate priority without error
    res = PriorityEngine.calculate_priority(
        severity="MEDIUM",
        created_at=naive_created,
        reference_time=aware_now
    )
    assert res["factors"]["aging"]["hours_open"] == 12.0

    # Calculate SLA status without error
    naive_deadline = datetime(2026, 10, 21, 6, 0, 0)
    sla_eval = PriorityEngine.evaluate_sla_status(
        created_at=naive_created,
        sla_deadline=naive_deadline,
        reference_time=aware_now
    )
    assert sla_eval["state"] == "ON_TRACK"


def test_exact_deadline_boundary():
    """Verify behavior at the exact second of deadline expiration."""
    created = datetime(2026, 10, 20, 10, 0, 0, tzinfo=timezone.utc)
    deadline = created + timedelta(hours=4)

    # At exact deadline moment
    res = PriorityEngine.evaluate_sla_status(
        created_at=created,
        sla_deadline=deadline,
        reference_time=deadline
    )
    # Remaining seconds == 0, remaining minutes == 0
    assert res["remaining_minutes"] == 0
    assert res["state"] in ("AT_RISK", "BREACHED")
