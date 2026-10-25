from datetime import datetime, timedelta
from app.models import Incident, DuplicateCluster, IncidentAuditLog

def test_incident_creation_and_defaults(db_session):
    """Test incident creation, default values, and serialization."""
    incident = Incident(
        tracking_number="CF-2026-0001",
        title="Water leak in Science Block Room 102",
        description="Continuous dripping from ceiling above the lab benches.",
        category="Plumbing",
        building="Science Block",
        location_details="Room 102, Wet Lab",
        reporter_name="Dr. Alice Smith",
        reporter_email="alice.smith@campus.edu",
        severity="HIGH",
        is_safety_hazard=True,
        hazard_type="WATER_DAMAGE",
        affected_people_count=25,
        status="REPORTED",
        priority_score=68.5,
        priority_level="HIGH",
        sla_hours=12,
        sla_deadline=datetime.utcnow() + timedelta(hours=12)
    )
    db_session.add(incident)
    db_session.commit()

    saved = Incident.query.filter_by(tracking_number="CF-2026-0001").first()
    assert saved is not None
    assert saved.id is not None
    assert saved.title == "Water leak in Science Block Room 102"
    assert saved.severity == "HIGH"
    assert saved.is_safety_hazard is True
    assert saved.hazard_type == "WATER_DAMAGE"
    assert saved.affected_people_count == 25
    assert saved.is_duplicate is False
    assert saved.created_at is not None

    # Test serialization
    data = saved.to_dict()
    assert data["tracking_number"] == "CF-2026-0001"
    assert data["building"] == "Science Block"
    assert data["priority_score"] == 68.5
    assert data["priority_level"] == "HIGH"
    assert data["sla_hours"] == 12
    assert "created_at" in data

def test_parent_duplicate_incident_relationship(db_session):
    """Test self-referential parent-child duplicate relationship."""
    parent = Incident(
        tracking_number="CF-2026-0010",
        title="Main AC failure in Lecture Hall 1",
        description="AC unit not cooling; hall is extremely warm.",
        category="HVAC",
        building="Academic Complex",
        reporter_name="Prof. Johnson",
        reporter_email="johnson@campus.edu",
        severity="MEDIUM"
    )
    db_session.add(parent)
    db_session.commit()

    # Second student reports same problem
    duplicate = Incident(
        tracking_number="CF-2026-0011",
        title="AC not working in LH-1",
        description="Air conditioning is off in LH 1 during lecture.",
        category="HVAC",
        building="Academic Complex",
        reporter_name="Bob Student",
        reporter_email="bob@campus.edu",
        severity="MEDIUM",
        is_duplicate=True,
        parent_incident_id=parent.id
    )
    db_session.add(duplicate)
    db_session.commit()

    # Verify relationship
    assert duplicate.parent.id == parent.id
    assert duplicate.parent.tracking_number == "CF-2026-0010"
    
    parent_dups = parent.duplicates.all()
    assert len(parent_dups) == 1
    assert parent_dups[0].tracking_number == "CF-2026-0011"

def test_duplicate_cluster_model(db_session):
    """Test DuplicateCluster grouping multiple incidents."""
    canonical = Incident(
        tracking_number="CF-2026-0020",
        title="Fallen tree branch near Library walkway",
        description="Large branch blocking pedestrian path.",
        category="Grounds",
        building="Central Library",
        reporter_name="Campus Security",
        reporter_email="security@campus.edu"
    )
    db_session.add(canonical)
    db_session.commit()

    cluster = DuplicateCluster(
        cluster_code="CLUST-LIB-TREE-01",
        canonical_incident_id=canonical.id,
        title="Central Library Fallen Branch Cluster",
        duplicate_count=1,
        status="ACTIVE"
    )
    db_session.add(cluster)
    db_session.commit()

    assert cluster.id is not None
    assert cluster.canonical_incident.id == canonical.id
    
    cluster_dict = cluster.to_dict()
    assert cluster_dict["cluster_code"] == "CLUST-LIB-TREE-01"
    assert cluster_dict["canonical_incident_id"] == canonical.id
    assert cluster_dict["duplicate_count"] == 1

def test_incident_audit_log(db_session):
    """Test IncidentAuditLog records actions and relates to incident."""
    incident = Incident(
        tracking_number="CF-2026-0030",
        title="Broken window latch in Hostel 4",
        description="Window cannot be locked securely.",
        category="Structural",
        building="Hostel 4",
        reporter_name="Resident Student",
        reporter_email="resident@campus.edu"
    )
    db_session.add(incident)
    db_session.commit()

    log1 = IncidentAuditLog(
        incident_id=incident.id,
        action="CREATED",
        actor="Student Portal",
        notes="Incident reported via mobile portal."
    )
    log2 = IncidentAuditLog(
        incident_id=incident.id,
        action="STATUS_CHANGE",
        actor="Maintenance Lead",
        previous_state={"status": "REPORTED"},
        new_state={"status": "IN_PROGRESS"},
        notes="Assigned to carpenter team."
    )
    db_session.add_all([log1, log2])
    db_session.commit()

    logs = incident.audit_logs.all()
    assert len(logs) == 2
    assert logs[0].action == "CREATED"
    assert logs[1].action == "STATUS_CHANGE"
    assert logs[1].new_state["status"] == "IN_PROGRESS"

    data_with_audit = incident.to_dict(include_audit=True)
    assert "audit_logs" in data_with_audit
    assert len(data_with_audit["audit_logs"]) == 2
