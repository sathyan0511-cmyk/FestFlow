from datetime import datetime
from .. import db

class Incident(db.Model):
    """
    Core campus incident / maintenance report entity.
    Tracks issue details, severity, priority, SLA deadline, and duplicate linkages.
    """
    __tablename__ = "incidents"

    id = db.Column(db.Integer, primary_key=True)
    tracking_number = db.Column(db.String(32), unique=True, nullable=False, index=True)
    title = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text, nullable=False)
    category = db.Column(db.String(64), nullable=False, default="General")
    building = db.Column(db.String(100), nullable=False)
    location_details = db.Column(db.String(255), nullable=True)

    # Reporter contact information
    reporter_name = db.Column(db.String(120), nullable=False)
    reporter_email = db.Column(db.String(120), nullable=False)

    # Operational triage fields
    severity = db.Column(db.String(20), nullable=False, default="MEDIUM")
    is_safety_hazard = db.Column(db.Boolean, default=False, nullable=False)
    hazard_type = db.Column(db.String(50), default="NONE", nullable=False)
    affected_people_count = db.Column(db.Integer, default=1, nullable=False)
    status = db.Column(db.String(30), default="REPORTED", nullable=False)

    # Priority and SLA fields
    priority_score = db.Column(db.Float, default=0.0, nullable=False)
    priority_level = db.Column(db.String(20), default="LOW", nullable=False)
    priority_breakdown = db.Column(db.JSON, nullable=True)
    sla_hours = db.Column(db.Integer, default=24, nullable=False)
    sla_deadline = db.Column(db.DateTime, nullable=True)

    # Resolution tracking
    resolved_at = db.Column(db.DateTime, nullable=True)
    resolution_notes = db.Column(db.Text, nullable=True)
    resolved_by = db.Column(db.String(120), nullable=True)

    # Duplicate resolution fields
    parent_incident_id = db.Column(db.Integer, db.ForeignKey("incidents.id", ondelete="SET NULL"), nullable=True)
    cluster_id = db.Column(db.Integer, db.ForeignKey("duplicate_clusters.id", ondelete="SET NULL"), nullable=True)
    is_duplicate = db.Column(db.Boolean, default=False, nullable=False)

    # Timestamps
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Self-referential relationship for parent-duplicate clustering
    duplicates = db.relationship(
        "Incident",
        backref=db.backref("parent", remote_side=[id]),
        foreign_keys=[parent_incident_id],
        lazy="dynamic"
    )

    # Audit logs
    audit_logs = db.relationship(
        "IncidentAuditLog",
        backref="incident",
        lazy="dynamic",
        cascade="all, delete-orphan",
        foreign_keys="IncidentAuditLog.incident_id"
    )

    def to_dict(self, include_audit=False):
        """Serialize model to a dictionary representation."""
        data = {
            "id": self.id,
            "tracking_number": self.tracking_number,
            "title": self.title,
            "description": self.description,
            "category": self.category,
            "building": self.building,
            "location_details": self.location_details,
            "reporter_name": self.reporter_name,
            "reporter_email": self.reporter_email,
            "severity": self.severity,
            "is_safety_hazard": self.is_safety_hazard,
            "hazard_type": self.hazard_type,
            "affected_people_count": self.affected_people_count,
            "status": self.status,
            "priority_score": self.priority_score,
            "priority_level": self.priority_level,
            "priority_breakdown": self.priority_breakdown,
            "sla_hours": self.sla_hours,
            "sla_deadline": self.sla_deadline.isoformat() if self.sla_deadline else None,
            "resolved_at": self.resolved_at.isoformat() if self.resolved_at else None,
            "resolution_notes": self.resolution_notes,
            "resolved_by": self.resolved_by,
            "parent_incident_id": self.parent_incident_id,
            "cluster_id": self.cluster_id,
            "is_duplicate": self.is_duplicate,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }
        if include_audit:
            data["audit_logs"] = [log.to_dict() for log in self.audit_logs.all()]
        return data

    def __repr__(self):
        return f"<Incident {self.tracking_number} - {self.title[:30]}>"
