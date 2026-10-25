from datetime import datetime
from .. import db

class DuplicateCluster(db.Model):
    """
    Groups corroborating incident reports representing the same underlying campus breakdown.
    Tracks canonical master incident and cluster statistics.
    """
    __tablename__ = "duplicate_clusters"

    id = db.Column(db.Integer, primary_key=True)
    cluster_code = db.Column(db.String(64), unique=True, nullable=False, index=True)
    canonical_incident_id = db.Column(
        db.Integer,
        db.ForeignKey(
            "incidents.id",
            ondelete="CASCADE",
            use_alter=True,
            name="fk_cluster_canonical_incident"
        ),
        nullable=False
    )
    title = db.Column(db.String(200), nullable=False)
    duplicate_count = db.Column(db.Integer, default=0, nullable=False)
    status = db.Column(db.String(20), default="ACTIVE", nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    incidents = db.relationship(
        "Incident",
        backref="cluster",
        lazy="dynamic",
        foreign_keys="Incident.cluster_id"
    )

    canonical_incident = db.relationship(
        "Incident",
        foreign_keys=[canonical_incident_id],
        post_update=True
    )

    def to_dict(self):
        return {
            "id": self.id,
            "cluster_code": self.cluster_code,
            "canonical_incident_id": self.canonical_incident_id,
            "title": self.title,
            "duplicate_count": self.duplicate_count,
            "status": self.status,
            "created_at": self.created_at.isoformat() if self.created_at else None
        }

    def __repr__(self):
        return f"<DuplicateCluster {self.cluster_code}: {self.title[:30]}>"


class IncidentAuditLog(db.Model):
    """
    Immutable audit history of status changes, priority recalculations, and duplicate mergers.
    Essential for compliance, operations review, and academic project evaluation.
    """
    __tablename__ = "incident_audit_logs"

    id = db.Column(db.Integer, primary_key=True)
    incident_id = db.Column(
        db.Integer,
        db.ForeignKey("incidents.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    action = db.Column(db.String(50), nullable=False)
    actor = db.Column(db.String(120), default="System", nullable=False)
    previous_state = db.Column(db.JSON, nullable=True)
    new_state = db.Column(db.JSON, nullable=True)
    notes = db.Column(db.Text, nullable=True)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow, nullable=False, index=True)

    def to_dict(self):
        return {
            "id": self.id,
            "incident_id": self.incident_id,
            "action": self.action,
            "actor": self.actor,
            "previous_state": self.previous_state,
            "new_state": self.new_state,
            "notes": self.notes,
            "timestamp": self.timestamp.isoformat() if self.timestamp else None
        }

    def __repr__(self):
        return f"<AuditLog Incident:{self.incident_id} Action:{self.action}>"
