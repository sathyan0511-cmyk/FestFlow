"""Unit Tests & Synthetic Evaluation for CampusFix Duplicate Detection Engine."""

import pytest
from app.engines.duplicate import DuplicateDetector, clean_text


# =====================================================================
# 1. Text Normalization & Preprocessing Tests
# =====================================================================

def test_clean_text_normalization():
    """Verify lowercase conversion, punctuation stripping, and stopword removal."""
    raw = "PLEASE URGENTLY KINDLY fix the broken light in Hall 2, sir! It's flickering!"
    cleaned = clean_text(raw)
    assert "please" not in cleaned
    assert "urgently" not in cleaned
    assert "sir" not in cleaned
    assert "broken" in cleaned
    assert "light" in cleaned
    assert "hall" in cleaned
    assert "flickering" in cleaned


def test_clean_text_empty_and_none():
    """Verify clean_text handles None, whitespace, and empty strings gracefully."""
    assert clean_text(None) == ""
    assert clean_text("") == ""
    assert clean_text("   \n\t  ") == ""


# =====================================================================
# 2. Text Similarity (TF-IDF & Cosine Similarity) Tests
# =====================================================================

def test_identical_descriptions_produce_maximum_similarity():
    """Verify identical complaints yield a text similarity of 1.0."""
    detector = DuplicateDetector()
    text = "Severe water leakage from the ceiling in Science Block Room 301."
    sim = detector.compute_text_similarity(text, text)
    assert pytest.approx(sim, abs=1e-4) == 1.0


def test_near_identical_paraphrased_descriptions():
    """Verify paraphrased complaints with identical core entities have high similarity."""
    detector = DuplicateDetector()
    text1 = "Water leaking heavily from ceiling in Science Block Lab 301."
    text2 = "Science Block Lab 301 has water dripping continuously from the roof."
    sim = detector.compute_text_similarity(text1, text2)
    assert sim >= 0.40


def test_unrelated_descriptions_yield_near_zero_similarity():
    """Verify completely different maintenance problems have low or zero similarity."""
    detector = DuplicateDetector()
    text_water = "Water pipe burst flooding the basement parking area."
    text_wifi = "Wi-Fi access point disconnected and flashing red in Central Library 2nd floor."
    sim = detector.compute_text_similarity(text_water, text_wifi)
    assert sim < 0.15


def test_out_of_vocabulary_and_small_corpus():
    """Verify TF-IDF handles small vocabularies and zero-overlap inputs gracefully."""
    detector = DuplicateDetector()
    sim = detector.compute_text_similarity("xyz123 nonexistentterm", "abc789 otherterm")
    assert sim == 0.0


# =====================================================================
# 3. Contextual Signals (Location & Category) Tests
# =====================================================================

def test_location_similarity_levels():
    """Verify spatial heuristic levels (exact match, building match, details overlap)."""
    detector = DuplicateDetector()

    # Exact building and exact details
    loc_exact = detector.compute_location_similarity(
        building_a="Science Block",
        building_b="Science Block",
        details_a="Room 102",
        details_b="Room 102"
    )
    assert loc_exact == 1.0

    # Same building, different specific rooms
    loc_building = detector.compute_location_similarity(
        building_a="Science Block",
        building_b="Science Block",
        details_a="Room 102",
        details_b="Room 405"
    )
    assert loc_building == 0.70

    # Same building, shared specific room/area
    loc_area_match = detector.compute_location_similarity(
        building_a="Science Block",
        building_b="Science Block",
        details_a="2nd Floor Wet Lab",
        details_b="Wet Lab 2nd Floor"
    )
    assert loc_area_match == 0.85

    # Different building, no correlation
    loc_diff = detector.compute_location_similarity(
        building_a="Hostel 3",
        building_b="Academic Complex",
        details_a="Wing A",
        details_b="East Hall"
    )
    assert loc_diff == 0.0


def test_category_similarity():
    """Verify category matching indicator."""
    detector = DuplicateDetector()
    assert detector.compute_category_similarity("Plumbing", "Plumbing") == 1.0
    assert detector.compute_category_similarity("electrical", "ELECTRICAL") == 1.0
    assert detector.compute_category_similarity("Plumbing", "Electrical") == 0.0
    assert detector.compute_category_similarity(None, "HVAC") == 0.0


# =====================================================================
# 4. Composite Scoring & Confidence Classifications Tests
# =====================================================================

def test_high_confidence_duplicate_pair():
    """Verify identical issue reported with same location and category triggers HIGH_CONFIDENCE."""
    detector = DuplicateDetector()
    inc1 = {
        "id": 101,
        "title": "Broken window glass in Central Library",
        "description": "Window shattered by wind on the 2nd floor reading area.",
        "category": "Structural",
        "building": "Central Library",
        "location_details": "2nd floor reading hall"
    }
    inc2 = {
        "id": 102,
        "title": "Shattered window glass Central Library",
        "description": "2nd floor reading hall window pane broken into pieces.",
        "category": "Structural",
        "building": "Central Library",
        "location_details": "2nd floor reading hall"
    }

    eval_result = detector.evaluate_pair(inc1, inc2)
    assert eval_result["composite_score"] >= detector.threshold_high
    assert eval_result["match_level"] == "HIGH_CONFIDENCE"
    assert "recommendation" in eval_result
    assert eval_result["signals"]["location_similarity"] == 1.0
    assert eval_result["signals"]["category_similarity"] == 1.0


def test_potential_duplicate_classification():
    """Verify moderate similarity (same building, related terms) triggers POTENTIAL_DUPLICATE."""
    detector = DuplicateDetector()
    inc1 = {
        "id": 201,
        "title": "Air conditioning warm in Lecture Hall A",
        "description": "LH-A is not cooling down, fans are blowing hot air.",
        "category": "HVAC",
        "building": "Lecture Complex",
        "location_details": "Hall A"
    }
    inc2 = {
        "id": 202,
        "title": "Air conditioning warm in adjacent Hall B",
        "description": "Temperature is very high in Hall B, AC not cooling.",
        "category": "HVAC",
        "building": "Lecture Complex",
        "location_details": "Hall B"
    }

    eval_result = detector.evaluate_pair(inc1, inc2)
    score = eval_result["composite_score"]
    assert detector.threshold_potential <= score < detector.threshold_high
    assert eval_result["match_level"] == "POTENTIAL_DUPLICATE"


def test_distinct_classification():
    """Verify unrelated issues trigger DISTINCT classification."""
    detector = DuplicateDetector()
    inc1 = {
        "id": 301,
        "title": "Streetlight fixture broken near Sports Ground",
        "description": "Pole 14 light is dead at night.",
        "category": "Electrical",
        "building": "Sports Ground",
        "location_details": "East Gate"
    }
    inc2 = {
        "id": 302,
        "title": "Canteen drainage clogged",
        "description": "Water overflowing near the kitchen sinks.",
        "category": "Sanitation",
        "building": "Dining Hall",
        "location_details": "Kitchen"
    }

    eval_result = detector.evaluate_pair(inc1, inc2)
    assert eval_result["composite_score"] < detector.threshold_potential
    assert eval_result["match_level"] == "DISTINCT"


# =====================================================================
# 5. Ranking Candidates & Self-Exclusion Tests
# =====================================================================

def test_rank_candidates_sorting_and_top_k():
    """Verify candidate ranking sorts descending and respects top_k limit."""
    detector = DuplicateDetector()
    new_inc = {
        "id": 500,
        "title": "Restroom tap leaking water",
        "description": "Continuous leak flooding floor in Engineering Block B.",
        "category": "Plumbing",
        "building": "Engineering Block B",
        "location_details": "Ground Floor Restroom"
    }

    candidates = [
        {
            "id": 501,  # Unrelated
            "title": "Elevator door stuck",
            "description": "Lift door not opening smoothly in Admin Tower.",
            "category": "Mechanical",
            "building": "Admin Tower",
            "location_details": "Lobby"
        },
        {
            "id": 502,  # Close duplicate
            "title": "Engineering Block B tap dripping water",
            "description": "Water leaking constantly from restroom faucet on ground floor.",
            "category": "Plumbing",
            "building": "Engineering Block B",
            "location_details": "Ground Floor Restroom"
        },
        {
            "id": 503,  # Moderate duplicate
            "title": "Water leak on 2nd floor",
            "description": "Pipe leaking in Engineering Block B hallway.",
            "category": "Plumbing",
            "building": "Engineering Block B",
            "location_details": "2nd Floor"
        }
    ]

    ranked = detector.rank_candidates(new_inc, candidates, top_k=2, min_threshold=0.30)
    assert len(ranked) <= 2
    # Candidate 502 must be rank 1
    assert ranked[0]["incident_id"] == 502
    assert ranked[0]["composite_score"] >= ranked[1]["composite_score"]


def test_self_matching_exclusion():
    """Verify the candidate being evaluated is never returned as its own duplicate."""
    detector = DuplicateDetector()
    inc = {
        "id": 777,
        "tracking_number": "CF-2026-0777",
        "title": "Main circuit breaker tripped in Chemistry Lab",
        "description": "All power dead in lab 4.",
        "category": "Electrical",
        "building": "Science Block"
    }

    candidates = [inc]
    ranked = detector.rank_candidates(inc, candidates, top_k=5, min_threshold=0.0)
    assert len(ranked) == 0


def test_empty_candidates_handling():
    """Verify passing an empty list of existing incidents returns empty list cleanly."""
    detector = DuplicateDetector()
    new_inc = {"title": "Any incident", "description": "Any description"}
    assert detector.rank_candidates(new_inc, []) == []


# =====================================================================
# 6. Model & Dict Adaptability Tests
# =====================================================================

class MockIncidentModel:
    """Mock simulating SQLAlchemy Incident model attributes."""
    def __init__(self, id, tracking_number, title, description, category, building, location_details):
        self.id = id
        self.tracking_number = tracking_number
        self.title = title
        self.description = description
        self.category = category
        self.building = building
        self.location_details = location_details


def test_duck_typing_supports_objects_and_dicts():
    """Verify detector processes both custom class objects and dictionaries."""
    detector = DuplicateDetector()
    obj_incident = MockIncidentModel(
        id=888,
        tracking_number="CF-2026-0888",
        title="Fire alarm beeping intermittently",
        description="Alarm sensor beeping low battery chirp in Hostel 2.",
        category="Safety",
        building="Hostel 2",
        location_details="Corridor 3"
    )
    dict_incident = {
        "id": 889,
        "tracking_number": "CF-2026-0889",
        "title": "Smoke alarm detector beeping",
        "description": "Hostel 2 corridor alarm beeping low battery chirp.",
        "category": "Safety",
        "building": "Hostel 2",
        "location_details": "Corridor 3"
    }

    eval_result = detector.evaluate_pair(obj_incident, dict_incident)
    assert eval_result["composite_score"] >= detector.threshold_potential
    assert eval_result["incident_id"] == 889


# =====================================================================
# 7. Determinism & Score Bounds Tests
# =====================================================================

def test_duplicate_detector_determinism():
    """Verify multiple executions on identical inputs yield exact same scores."""
    detector = DuplicateDetector()
    a = {"title": "Damaged staircase railing", "description": "Loose metal handrail Block C"}
    b = {"title": "Loose handrail on stairs", "description": "Block C stairs handrail wobbly"}

    first = detector.evaluate_pair(a, b)
    for _ in range(25):
        assert detector.evaluate_pair(a, b) == first


def test_score_bounds_always_valid():
    """Verify all returned scores strictly adhere to [0.0, 1.0]."""
    detector = DuplicateDetector()
    test_cases = [
        ({"title": ""}, {"title": ""}),
        ({"title": "A" * 1000}, {"title": "B" * 1000}),
        ({"title": "Emergency electrical sparks"}, {"title": "Emergency electrical sparks"}),
    ]
    for inc_a, inc_b in test_cases:
        res = detector.evaluate_pair(inc_a, inc_b)
        assert 0.0 <= res["composite_score"] <= 1.0
        assert 0.0 <= res["signals"]["text_similarity"] <= 1.0
        assert 0.0 <= res["signals"]["location_similarity"] <= 1.0
        assert 0.0 <= res["signals"]["category_similarity"] <= 1.0


# =====================================================================
# 8. Synthetic Evaluation Dataset: Precision, Recall & F1-Score
# =====================================================================

SYNTHETIC_EVALUATION_DATASET = [
    # --- 10 True Duplicate Pairs (Ground Truth = True) ---
    {
        "is_duplicate": True,
        "incident_a": {
            "title": "Ceiling water leakage near Lab 101",
            "description": "Water dripping heavily onto tables from the ceiling.",
            "category": "Plumbing", "building": "Science Block", "location_details": "Lab 101"
        },
        "incident_b": {
            "title": "Lab 101 ceiling leaking water",
            "description": "Continuous water seepage from ceiling in Science Block Lab 101.",
            "category": "Plumbing", "building": "Science Block", "location_details": "Lab 101"
        }
    },
    {
        "is_duplicate": True,
        "incident_a": {
            "title": "AC not cooling in Lecture Hall 3",
            "description": "Air conditioner blowing warm air during class.",
            "category": "HVAC", "building": "Academic Hall", "location_details": "LH 3"
        },
        "incident_b": {
            "title": "LH 3 air conditioning broken",
            "description": "Room is extremely hot, AC units not cooling in Lecture Hall 3.",
            "category": "HVAC", "building": "Academic Hall", "location_details": "LH 3"
        }
    },
    {
        "is_duplicate": True,
        "incident_a": {
            "title": "Exposed high voltage wires near corridor",
            "description": "Electrical wires hanging loose from open junction box.",
            "category": "Electrical", "building": "Engineering Block A", "location_details": "2nd Floor Corridor"
        },
        "incident_b": {
            "title": "Dangling electric wires Block A corridor",
            "description": "Hazardous exposed wires outside 2nd floor classrooms in Block A.",
            "category": "Electrical", "building": "Engineering Block A", "location_details": "2nd Floor Corridor"
        }
    },
    {
        "is_duplicate": True,
        "incident_a": {
            "title": "Main entrance glass door cracked",
            "description": "Large spiderweb crack across glass door entrance.",
            "category": "Structural", "building": "Central Library", "location_details": "Front Entrance"
        },
        "incident_b": {
            "title": "Broken front glass door",
            "description": "Library front entrance door glass has shattered crack.",
            "category": "Structural", "building": "Central Library", "location_details": "Front Entrance"
        }
    },
    {
        "is_duplicate": True,
        "incident_a": {
            "title": "Washroom sink pipe disconnected",
            "description": "Drain pipe under sink is detached, water flooding floor.",
            "category": "Plumbing", "building": "Hostel 4", "location_details": "1st Floor Restroom"
        },
        "incident_b": {
            "title": "Hostel 4 bathroom sink leaking on floor",
            "description": "Sink drainage pipe detached flooding first floor washroom.",
            "category": "Plumbing", "building": "Hostel 4", "location_details": "1st Floor Restroom"
        }
    },
    {
        "is_duplicate": True,
        "incident_a": {
            "title": "Projector not displaying signal in Room 204",
            "description": "HDMI cable connected but projector shows no input.",
            "category": "IT & AV", "building": "Management Block", "location_details": "Room 204"
        },
        "incident_b": {
            "title": "Room 204 classroom projector dead",
            "description": "Cannot connect laptop to projector in Management Block Room 204.",
            "category": "IT & AV", "building": "Management Block", "location_details": "Room 204"
        }
    },
    {
        "is_duplicate": True,
        "incident_a": {
            "title": "Broken elevator in Tower B",
            "description": "Elevator stuck between floor 3 and 4 with error code E04.",
            "category": "Mechanical", "building": "Research Tower B", "location_details": "Elevator 2"
        },
        "incident_b": {
            "title": "Lift elevator out of service Research Tower B",
            "description": "Elevator 2 not working, stuck between 3rd and 4th floors in Tower B.",
            "category": "Mechanical", "building": "Research Tower B", "location_details": "Elevator 2"
        }
    },
    {
        "is_duplicate": True,
        "incident_a": {
            "title": "Staircase light fixture hanging loose",
            "description": "Tube light fixture dangling by wires on stairwell.",
            "category": "Electrical", "building": "Hostel 1", "location_details": "Stairwell B"
        },
        "incident_b": {
            "title": "Dangling light in Hostel 1 stairs",
            "description": "Fluorescent fixture loose on ceiling of stairwell B.",
            "category": "Electrical", "building": "Hostel 1", "location_details": "Stairwell B"
        }
    },
    {
        "is_duplicate": True,
        "incident_a": {
            "title": "Foul odor from sewage drain near canteen",
            "description": "Sewage backup creating unbearable smell outside food court.",
            "category": "Sanitation", "building": "Food Court", "location_details": "Rear Gate"
        },
        "incident_b": {
            "title": "Canteen rear drain overflow sewage odor",
            "description": "Drain overflowing with foul sewage odor behind food court.",
            "category": "Sanitation", "building": "Food Court", "location_details": "Rear Gate"
        }
    },
    {
        "is_duplicate": True,
        "incident_a": {
            "title": "Tree branch fallen on pedestrian walkway",
            "description": "Large branch snapped and blocking walking path.",
            "category": "Grounds", "building": "Main Quad", "location_details": "North Path"
        },
        "incident_b": {
            "title": "Fallen branch blocking north walkway path",
            "description": "Pathway blocked by heavy broken tree limb in main quad.",
            "category": "Grounds", "building": "Main Quad", "location_details": "North Path"
        }
    },

    # --- 10 True Distinct / Unrelated Pairs (Ground Truth = False) ---
    {
        "is_duplicate": False,
        "incident_a": {
            "title": "Water leakage in Science Block",
            "description": "Sink tap dripping in Chemistry Lab.",
            "category": "Plumbing", "building": "Science Block", "location_details": "Lab 101"
        },
        "incident_b": {
            "title": "Window latch broken in Hostel 3",
            "description": "Cannot lock window in room 12.",
            "category": "Structural", "building": "Hostel 3", "location_details": "Room 12"
        }
    },
    {
        "is_duplicate": False,
        "incident_a": {
            "title": "AC not cooling in Lecture Hall 1",
            "description": "AC temperature stuck at 28C.",
            "category": "HVAC", "building": "Lecture Complex", "location_details": "LH 1"
        },
        "incident_b": {
            "title": "Projector lamp burnt out in Lecture Hall 5",
            "description": "Lamp red warning light blinking.",
            "category": "IT & AV", "building": "Lecture Complex", "location_details": "LH 5"
        }
    },
    {
        "is_duplicate": False,
        "incident_a": {
            "title": "Streetlight dark near Basketball Court",
            "description": "Post light 3 not turning on at dusk.",
            "category": "Electrical", "building": "Sports Complex", "location_details": "Court"
        },
        "incident_b": {
            "title": "Treadmill motor smoke in Gymnasium",
            "description": "Gym treadmill overheated with burning plastic smell.",
            "category": "Electrical", "building": "Sports Complex", "location_details": "Gym"
        }
    },
    {
        "is_duplicate": False,
        "incident_a": {
            "title": "Library quiet room AC rattling",
            "description": "Loud vibration noise from AC vent.",
            "category": "HVAC", "building": "Central Library", "location_details": "Quiet Room"
        },
        "incident_b": {
            "title": "Library ground floor photocopier jam",
            "description": "Paper continuously jamming in Xerox machine.",
            "category": "IT & AV", "building": "Central Library", "location_details": "Repro Section"
        }
    },
    {
        "is_duplicate": False,
        "incident_a": {
            "title": "Hostel 1 shower pressure low",
            "description": "Very weak water flow in morning.",
            "category": "Plumbing", "building": "Hostel 1", "location_details": "2nd Floor"
        },
        "incident_b": {
            "title": "Hostel 4 washing machine leaking",
            "description": "Laundry room machine 3 drum leaking soapy water.",
            "category": "Plumbing", "building": "Hostel 4", "location_details": "Laundry"
        }
    },
    {
        "is_duplicate": False,
        "incident_a": {
            "title": "Broken whiteboard tray in Room 302",
            "description": "Tray fell off wall cannot hold markers.",
            "category": "Structural", "building": "Academic Block", "location_details": "Room 302"
        },
        "incident_b": {
            "title": "Fire extinguisher inspection tag expired",
            "description": "Hallway extinguisher tag is 6 months past inspection date.",
            "category": "Safety", "building": "Academic Block", "location_details": "3rd Floor Hall"
        }
    },
    {
        "is_duplicate": False,
        "incident_a": {
            "title": "Cafeteria microwave sparking",
            "description": "Microwave oven making electrical buzzing noise.",
            "category": "Electrical", "building": "Dining Hall", "location_details": "Counter"
        },
        "incident_b": {
            "title": "Dining table leg broken",
            "description": "Table 8 wobbles heavily and threatens to collapse.",
            "category": "Structural", "building": "Dining Hall", "location_details": "Seating Area"
        }
    },
    {
        "is_duplicate": False,
        "incident_a": {
            "title": "Internet Ethernet jack loose in Lab 4",
            "description": "RJ45 wall port pins bent.",
            "category": "IT & AV", "building": "IT Center", "location_details": "Lab 4"
        },
        "incident_b": {
            "title": "Server room temperature alarm",
            "description": "Rack ambient temperature reached 26C.",
            "category": "HVAC", "building": "IT Center", "location_details": "Server Room"
        }
    },
    {
        "is_duplicate": False,
        "incident_a": {
            "title": "Pothole on West Campus Ring Road",
            "description": "Deep asphalt hole damaging bicycle tires.",
            "category": "Grounds", "building": "Ring Road", "location_details": "West Sector"
        },
        "incident_b": {
            "title": "Main gate security barrier arm broken",
            "description": "Motorized boom barrier will not lower.",
            "category": "Mechanical", "building": "Main Gate", "location_details": "Entry Booth"
        }
    },
    {
        "is_duplicate": False,
        "incident_a": {
            "title": "Chemistry lab fume hood sash stuck",
            "description": "Glass sash jammed at 50% height.",
            "category": "Safety", "building": "Science Block", "location_details": "Lab 203"
        },
        "incident_b": {
            "title": "Physics darkroom door seal light leak",
            "description": "Rubber gasket worn out allowing ambient light in.",
            "category": "Structural", "building": "Science Block", "location_details": "Darkroom"
        }
    }
]


def test_synthetic_evaluation_precision_recall_f1():
    """
    Evaluate DuplicateDetector on the synthetic campus maintenance benchmark.
    Verifies Precision, Recall, and F1-score against ground-truth labels.
    Compares against a simple Jaccard token-overlap baseline.
    """
    detector = DuplicateDetector(
        weight_text=0.65,
        weight_location=0.20,
        weight_category=0.15,
        threshold_potential=0.40,
        threshold_high=0.70
    )

    tp, fp, tn, fn = 0, 0, 0, 0
    baseline_tp, baseline_fp, baseline_tn, baseline_fn = 0, 0, 0, 0

    for item in SYNTHETIC_EVALUATION_DATASET:
        ground_truth = item["is_duplicate"]
        inc_a = item["incident_a"]
        inc_b = item["incident_b"]

        # 1. CampusFix TF-IDF + Composite Evaluator
        res = detector.evaluate_pair(inc_a, inc_b)
        pred_duplicate = res["composite_score"] >= detector.threshold_potential

        if pred_duplicate and ground_truth:
            tp += 1
        elif pred_duplicate and not ground_truth:
            fp += 1
        elif not pred_duplicate and not ground_truth:
            tn += 1
        else:
            fn += 1

        # 2. Simple Jaccard Baseline (Raw Token Overlap)
        toks_a = set(clean_text(f"{inc_a['title']} {inc_a['description']}").split())
        toks_b = set(clean_text(f"{inc_b['title']} {inc_b['description']}").split())
        union = toks_a.union(toks_b)
        jaccard = len(toks_a.intersection(toks_b)) / len(union) if union else 0.0
        baseline_pred = jaccard >= 0.30

        if baseline_pred and ground_truth:
            baseline_tp += 1
        elif baseline_pred and not ground_truth:
            baseline_fp += 1
        elif not baseline_pred and not ground_truth:
            baseline_tn += 1
        else:
            baseline_fn += 1

    # Metrics calculation
    precision = tp / (tp + fp) if (tp + fp) > 0 else 0.0
    recall = tp / (tp + fn) if (tp + fn) > 0 else 0.0
    f1 = 2 * (precision * recall) / (precision + recall) if (precision + recall) > 0 else 0.0

    b_precision = baseline_tp / (baseline_tp + baseline_fp) if (baseline_tp + baseline_fp) > 0 else 0.0
    b_recall = baseline_tp / (baseline_tp + baseline_fn) if (baseline_tp + baseline_fn) > 0 else 0.0
    b_f1 = 2 * (b_precision * b_recall) / (b_precision + b_recall) if (b_precision + b_recall) > 0 else 0.0

    print(f"\n--- Synthetic Evaluation Results ---")
    print(f"CampusFix TF-IDF Composite: Precision={precision:.3f}, Recall={recall:.3f}, F1={f1:.3f} (TP={tp}, FP={fp}, TN={tn}, FN={fn})")
    print(f"Jaccard Baseline:           Precision={b_precision:.3f}, Recall={b_recall:.3f}, F1={b_f1:.3f} (TP={baseline_tp}, FP={baseline_fp}, TN={baseline_tn}, FN={baseline_fn})")

    # Assert rigorous performance on synthetic benchmark
    assert precision >= 0.90, f"Expected precision >= 0.90, got {precision}"
    assert recall >= 0.90, f"Expected recall >= 0.90, got {recall}"
    assert f1 >= 0.90, f"Expected F1 >= 0.90, got {f1}"
    # Verify CampusFix composite engine matches or outperforms simple Jaccard
    assert f1 >= b_f1
