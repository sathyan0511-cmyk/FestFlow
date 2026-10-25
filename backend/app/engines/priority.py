"""CampusFix Explainable Prioritisation & SLA Engine.

This module provides a deterministic, multi-factor priority scoring and
SLA tracking engine for campus maintenance and incident reports.

Mathematical Formulation:
-------------------------
Priority Score P in [0.0, 100.0] is computed as:
    P = min(100.0, max(0.0, S_sev + S_safe + S_aff + S_age + S_dup))

Factor Weights & Maximum Points (Sum = 100.0):
1. Severity (S_sev): Max 30.0 points
   - CRITICAL: 30.0 pts (100%)
   - HIGH:     22.5 pts (75%)
   - MEDIUM:   15.0 pts (50%)
   - LOW:       7.5 pts (25%)
   - Default:  15.0 pts (MEDIUM)

2. Safety Hazard (S_safe): Max 25.0 points
   - Acute Life Safety (ELECTRICAL, FIRE, STRUCTURAL, CHEMICAL, GAS_LEAK): 25.0 pts
   - Physical Hazards (TRIP_FALL, WATER_DAMAGE, SHATTERED_GLASS):         15.0 pts
   - General safety hazard flag without specific taxonomy:                 20.0 pts
   - Non-hazardous / None:                                                 0.0 pts

3. Affected Population (S_aff): Max 20.0 points
   - Smooth logarithmic scaling based on occupant count N:
       S_aff = min(20.0, 20.0 * (log10(1 + N) / log10(1 + 500)))
     (e.g., N=1 -> 2.2 pts, N=10 -> 7.7 pts, N=50 -> 12.7 pts, N>=500 -> 20.0 pts)

4. Aging Factor (S_age): Max 15.0 points
   - Linear aging factor over a 48-hour SLA baseline:
       S_age = min(15.0, (t_hours / 48.0) * 15.0)
     (e.g., 0h -> 0.0 pts, 24h -> 7.5 pts, >=48h -> 15.0 pts)

5. Duplicate Escalation Boost (S_dup): Max 10.0 points
   - Escalation derived from corroborating independent reports D:
       S_dup = min(10.0, (D / 5.0) * 10.0)
     (e.g., D=1 -> 2.0 pts, D=3 -> 6.0 pts, D>=5 -> 10.0 pts)

Priority Tiers:
- CRITICAL: P >= 75.0 (SLA: 4 hours)
- HIGH:     55.0 <= P < 75.0 (SLA: 12 hours)
- MEDIUM:   35.0 <= P < 55.0 (SLA: 24 hours)
- LOW:      P < 35.0 (SLA: 48 hours)
"""

import math
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, Optional, Union

def _normalize_dt(dt: Optional[datetime]) -> Optional[datetime]:
    """Ensure datetime is timezone-aware in UTC."""
    if dt is None:
        return None
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)


class PriorityEngine:
    """
    Deterministic, explainable incident prioritisation and SLA calculation engine.
    Does not depend on Flask or database models, ensuring full testability and decoupling.
    """

    # 1. Severity Weights (Max 30.0 points)
    SEVERITY_SCORES: Dict[str, float] = {
        "LOW": 7.5,
        "MEDIUM": 15.0,
        "HIGH": 22.5,
        "CRITICAL": 30.0
    }

    # 2. Maximum Points Distribution
    MAX_POINTS: Dict[str, float] = {
        "severity": 30.0,
        "safety_hazard": 25.0,
        "affected_people": 20.0,
        "aging": 15.0,
        "duplicate_escalation": 10.0
    }

    # 3. Hazard Taxonomy Points
    HAZARD_SCORES: Dict[str, float] = {
        "ELECTRICAL": 25.0,
        "FIRE": 25.0,
        "STRUCTURAL": 25.0,
        "CHEMICAL": 25.0,
        "GAS_LEAK": 25.0,
        "TRIP_FALL": 15.0,
        "WATER_DAMAGE": 15.0,
        "SHATTERED_GLASS": 15.0,
        "GENERAL": 20.0,
        "NONE": 0.0
    }

    # 4. Standard SLA Turnaround in Hours by Priority Tier
    SLA_HOURS_BY_TIER: Dict[str, int] = {
        "CRITICAL": 4,
        "HIGH": 12,
        "MEDIUM": 24,
        "LOW": 48
    }

    # Priority Tier Boundaries
    TIER_THRESHOLDS = {
        "CRITICAL": 75.0,
        "HIGH": 55.0,
        "MEDIUM": 35.0,
        "LOW": 0.0
    }

    # Aging normalization constant (48 hours baseline)
    AGING_BASELINE_HOURS: float = 48.0
    # Population normalization constant (500 occupants)
    POPULATION_SATURATION_COUNT: int = 500

    @classmethod
    def calculate_priority(
        cls,
        severity: Optional[str] = "MEDIUM",
        is_safety_hazard: Optional[bool] = False,
        hazard_type: Optional[str] = "NONE",
        affected_people_count: Optional[Union[int, float]] = 1,
        created_at: Optional[datetime] = None,
        duplicate_count: Optional[Union[int, float]] = 0,
        reference_time: Optional[datetime] = None
    ) -> Dict[str, Any]:
        """
        Compute deterministic priority score with mathematical factor breakdown.

        Args:
            severity: LOW, MEDIUM, HIGH, or CRITICAL (defaults to MEDIUM).
            is_safety_hazard: True if incident poses life or property safety hazard.
            hazard_type: Specific hazard taxonomy (ELECTRICAL, FIRE, etc.).
            affected_people_count: Number of occupants impacted (safe handling for <=0, extreme).
            created_at: Datetime of incident reporting.
            duplicate_count: Count of corroborating reports/complaints.
            reference_time: Reference 'now' datetime for aging calculations (defaults to UTC now).

        Returns:
            Dictionary containing:
                - priority_score (float, 0.0 to 100.0)
                - priority_level (str: LOW, MEDIUM, HIGH, CRITICAL)
                - sla_hours (int)
                - factors (dict with points, max, and weights)
                - reason (str: human-readable rationale)
        """
        # --- 1. Sanitize & Normalize Inputs ---
        norm_severity = str(severity or "MEDIUM").strip().upper()
        if norm_severity not in cls.SEVERITY_SCORES:
            norm_severity = "MEDIUM"

        hazard_str = str(hazard_type or "NONE").strip().upper()
        safety_flag = bool(is_safety_hazard)

        # Sanitize affected count
        try:
            raw_count = float(affected_people_count if affected_people_count is not None else 1)
            if math.isnan(raw_count) or math.isinf(raw_count) or raw_count < 1:
                sanitized_count = 1
            else:
                sanitized_count = int(min(raw_count, 1_000_000))
        except (ValueError, TypeError):
            sanitized_count = 1

        # Sanitize duplicate count
        try:
            raw_dups = float(duplicate_count if duplicate_count is not None else 0)
            if math.isnan(raw_dups) or math.isinf(raw_dups) or raw_dups < 0:
                sanitized_dups = 0
            else:
                sanitized_dups = int(min(raw_dups, 1_000_000))
        except (ValueError, TypeError):
            sanitized_dups = 0

        # Datetime reference
        now_utc = _normalize_dt(reference_time) or datetime.now(timezone.utc)
        created_utc = _normalize_dt(created_at)

        # --- 2. Compute Individual Factors ---

        # Factor A: Severity (Max 30.0 pts)
        sev_pts = cls.SEVERITY_SCORES.get(norm_severity, cls.SEVERITY_SCORES["MEDIUM"])

        # Factor B: Safety Hazard (Max 25.0 pts)
        if safety_flag:
            if hazard_str in cls.HAZARD_SCORES and cls.HAZARD_SCORES[hazard_str] > 0:
                safety_pts = cls.HAZARD_SCORES[hazard_str]
            else:
                safety_pts = cls.HAZARD_SCORES["GENERAL"]
        else:
            safety_pts = cls.HAZARD_SCORES.get(hazard_str, 0.0)

        # Factor C: Affected Population (Max 20.0 pts)
        # Logarithmic curve: log10(1 + N) / log10(1 + 500) * 20.0
        log_denom = math.log10(1 + cls.POPULATION_SATURATION_COUNT)
        log_num = math.log10(1 + sanitized_count)
        log_ratio = min(1.0, max(0.0, log_num / log_denom))
        affected_pts = round(log_ratio * cls.MAX_POINTS["affected_people"], 1)

        # Factor D: Aging (Max 15.0 pts)
        if created_utc is not None:
            elapsed_seconds = (now_utc - created_utc).total_seconds()
            hours_open = max(0.0, elapsed_seconds / 3600.0)
            aging_ratio = min(1.0, max(0.0, hours_open / cls.AGING_BASELINE_HOURS))
            aging_pts = round(aging_ratio * cls.MAX_POINTS["aging"], 1)
        else:
            hours_open = 0.0
            aging_pts = 0.0

        # Factor E: Duplicate Escalation (Max 10.0 pts)
        if sanitized_dups > 0:
            dup_ratio = min(1.0, sanitized_dups / 5.0)
            dup_pts = round(dup_ratio * cls.MAX_POINTS["duplicate_escalation"], 1)
        else:
            dup_pts = 0.0

        # --- 3. Composite Score & Priority Tier ---
        raw_total = round(sev_pts + safety_pts + affected_pts + aging_pts + dup_pts, 1)
        # Strictly bound between 0.0 and 100.0
        final_score = round(min(100.0, max(0.0, raw_total)), 1)

        if final_score >= cls.TIER_THRESHOLDS["CRITICAL"]:
            tier = "CRITICAL"
        elif final_score >= cls.TIER_THRESHOLDS["HIGH"]:
            tier = "HIGH"
        elif final_score >= cls.TIER_THRESHOLDS["MEDIUM"]:
            tier = "MEDIUM"
        else:
            tier = "LOW"

        sla_hours = cls.SLA_HOURS_BY_TIER[tier]

        # --- 4. Human-Readable Rationale ---
        reasons = [f"{tier} priority (Score: {final_score}/100, SLA: {sla_hours}h)."]
        if safety_flag or safety_pts > 0:
            reasons.append(f"Flagged as a safety risk ({hazard_str}) adding {safety_pts:.1f}/25 safety points.")
        reasons.append(
            f"Base severity is {norm_severity} ({sev_pts:.1f}/30 pts), impacting ~{sanitized_count} occupant(s) (+{affected_pts:.1f}/20 pts)."
        )
        if sanitized_dups > 0:
            reasons.append(f"Escalated by {sanitized_dups} corroborating report(s) (+{dup_pts:.1f}/10 pts).")
        if hours_open >= 1.0:
            reasons.append(f"Unresolved for {hours_open:.1f} hours (+{aging_pts:.1f}/15 aging pts).")

        return {
            "priority_score": final_score,
            "priority_level": tier,
            "sla_hours": sla_hours,
            "factors": {
                "severity": {
                    "value": norm_severity,
                    "score": round(sev_pts, 1),
                    "max": cls.MAX_POINTS["severity"],
                    "weight_pct": cls.MAX_POINTS["severity"]
                },
                "safety_hazard": {
                    "is_hazard": bool(safety_flag or safety_pts > 0),
                    "hazard_type": hazard_str,
                    "score": round(safety_pts, 1),
                    "max": cls.MAX_POINTS["safety_hazard"],
                    "weight_pct": cls.MAX_POINTS["safety_hazard"]
                },
                "affected_people": {
                    "count": sanitized_count,
                    "score": round(affected_pts, 1),
                    "max": cls.MAX_POINTS["affected_people"],
                    "weight_pct": cls.MAX_POINTS["affected_people"]
                },
                "aging": {
                    "hours_open": round(hours_open, 1),
                    "score": round(aging_pts, 1),
                    "max": cls.MAX_POINTS["aging"],
                    "weight_pct": cls.MAX_POINTS["aging"]
                },
                "duplicate_escalation": {
                    "duplicate_count": sanitized_dups,
                    "score": round(dup_pts, 1),
                    "max": cls.MAX_POINTS["duplicate_escalation"],
                    "weight_pct": cls.MAX_POINTS["duplicate_escalation"]
                }
            },
            "reason": " ".join(reasons)
        }

    @classmethod
    def calculate_sla_deadline(
        cls,
        created_at: datetime,
        priority_level_or_score: Union[str, float]
    ) -> datetime:
        """
        Calculate resolution deadline based on priority tier.

        Args:
            created_at: Creation timestamp.
            priority_level_or_score: Priority level string ('CRITICAL', etc.) or numeric score.

        Returns:
            Timezone-aware UTC deadline datetime.
        """
        created_utc = _normalize_dt(created_at)
        if created_utc is None:
            created_utc = datetime.now(timezone.utc)

        if isinstance(priority_level_or_score, (int, float)):
            score = float(priority_level_or_score)
            if score >= cls.TIER_THRESHOLDS["CRITICAL"]:
                tier = "CRITICAL"
            elif score >= cls.TIER_THRESHOLDS["HIGH"]:
                tier = "HIGH"
            elif score >= cls.TIER_THRESHOLDS["MEDIUM"]:
                tier = "MEDIUM"
            else:
                tier = "LOW"
        else:
            tier = str(priority_level_or_score or "MEDIUM").strip().upper()
            if tier not in cls.SLA_HOURS_BY_TIER:
                tier = "MEDIUM"

        hours = cls.SLA_HOURS_BY_TIER[tier]
        return created_utc + timedelta(hours=hours)

    @classmethod
    def evaluate_sla_status(
        cls,
        created_at: datetime,
        sla_deadline: datetime,
        status: Optional[str] = "REPORTED",
        resolved_at: Optional[datetime] = None,
        reference_time: Optional[datetime] = None
    ) -> Dict[str, Any]:
        """
        Evaluate real-time SLA compliance state and remaining time buffer.

        States:
            - Active Incidents:
                * 'BREACHED': current time > deadline
                * 'AT_RISK': remaining time <= 25% of SLA or remaining time <= 2 hours
                * 'ON_TRACK': remaining time > 25% of SLA and > 2 hours
            - Resolved Incidents:
                * 'COMPLIED': resolved_at <= deadline
                * 'RESOLVED_BREACHED': resolved_at > deadline

        Returns:
            Dict containing:
                - state (str)
                - is_breached (bool)
                - elapsed_minutes (int)
                - remaining_minutes (int, negative if overdue)
                - percent_consumed (float)
                - summary (str)
        """
        now_utc = _normalize_dt(reference_time) or datetime.now(timezone.utc)
        created_utc = _normalize_dt(created_at)
        deadline_utc = _normalize_dt(sla_deadline)

        if created_utc is None:
            created_utc = now_utc
        if deadline_utc is None:
            deadline_utc = created_utc + timedelta(hours=cls.SLA_HOURS_BY_TIER["MEDIUM"])

        total_duration_sec = max(60.0, (deadline_utc - created_utc).total_seconds())
        norm_status = str(status or "REPORTED").strip().upper()

        # Handle Resolved/Closed Incidents
        if norm_status in ("RESOLVED", "CLOSED"):
            resolved_utc = _normalize_dt(resolved_at) or now_utc
            elapsed_sec = max(0.0, (resolved_utc - created_utc).total_seconds())
            elapsed_min = int(elapsed_sec // 60)
            percent_consumed = round(min(100.0, (elapsed_sec / total_duration_sec) * 100.0), 1)

            if resolved_utc <= deadline_utc:
                return {
                    "state": "COMPLIED",
                    "is_breached": False,
                    "elapsed_minutes": elapsed_min,
                    "remaining_minutes": 0,
                    "percent_consumed": percent_consumed,
                    "summary": f"Resolved within SLA ({elapsed_min}m elapsed)"
                }
            else:
                overdue_min = int((resolved_utc - deadline_utc).total_seconds() // 60)
                return {
                    "state": "RESOLVED_BREACHED",
                    "is_breached": True,
                    "elapsed_minutes": elapsed_min,
                    "remaining_minutes": -overdue_min,
                    "percent_consumed": round((elapsed_sec / total_duration_sec) * 100.0, 1),
                    "summary": f"Resolved after SLA deadline ({overdue_min}m overdue)"
                }

        # Handle Active / In-Progress Incidents
        remaining_sec = (deadline_utc - now_utc).total_seconds()
        elapsed_sec = max(0.0, (now_utc - created_utc).total_seconds())
        remaining_min = int(remaining_sec // 60)
        elapsed_min = int(elapsed_sec // 60)
        percent_consumed = round(max(0.0, (elapsed_sec / total_duration_sec) * 100.0), 1)

        if remaining_sec < 0:
            overdue_min = abs(remaining_min)
            return {
                "state": "BREACHED",
                "is_breached": True,
                "elapsed_minutes": elapsed_min,
                "remaining_minutes": remaining_min,
                "percent_consumed": percent_consumed,
                "summary": f"SLA Breached ({overdue_min}m overdue)"
            }
        elif remaining_sec <= (0.25 * total_duration_sec) or remaining_sec <= 7200:  # <= 25% or <= 2 hours
            return {
                "state": "AT_RISK",
                "is_breached": False,
                "elapsed_minutes": elapsed_min,
                "remaining_minutes": remaining_min,
                "percent_consumed": percent_consumed,
                "summary": f"SLA At Risk ({remaining_min}m remaining)"
            }
        else:
            return {
                "state": "ON_TRACK",
                "is_breached": False,
                "elapsed_minutes": elapsed_min,
                "remaining_minutes": remaining_min,
                "percent_consumed": percent_consumed,
                "summary": f"SLA On Track ({remaining_min}m remaining)"
            }
