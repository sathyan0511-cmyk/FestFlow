"""CampusFix Duplicate Complaint Detection Engine.

Uses scikit-learn's TF-IDF vectorization and cosine similarity combined with
transparent categorical and spatial heuristics to rank potential duplicate reports.

Mathematical Formulation:
-------------------------
Composite Similarity Score S_composite in [0.0, 1.0]:
    S_composite = round(w_text * S_text + w_loc * S_loc + w_cat * S_cat, 3)

Configurable Default Weights (Sum = 1.0):
    w_text = 0.65 (Text semantic cosine similarity from TF-IDF unigrams)
    w_loc  = 0.20 (Spatial building & location proximity heuristic)
    w_cat  = 0.15 (Category match indicator)

Confidence Classifications:
    - HIGH_CONFIDENCE:     S_composite >= 0.70 (Strong duplicate candidate)
    - POTENTIAL_DUPLICATE: 0.40 <= S_composite < 0.70 (Flagged for human review)
    - DISTINCT:            S_composite < 0.40 (Functionally distinct incident)

Note:
Scores represent relative similarity and administrative triage confidence indicators;
they are not calibrated Bayesian posterior probabilities of physical identity.
"""

import re
from typing import List, Dict, Any, Optional, Union

from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

# Focused campus-specific stopwords and conversational filler
CAMPUS_STOPWORDS = {
    "a", "about", "above", "after", "again", "against", "all", "am", "an", "and", "any", "are",
    "as", "at", "be", "because", "been", "before", "being", "below", "between", "both", "but",
    "by", "can", "did", "do", "does", "doing", "don", "down", "during", "each", "few", "for",
    "from", "further", "had", "has", "have", "having", "he", "her", "here", "hers", "herself",
    "him", "himself", "his", "how", "i", "if", "in", "into", "is", "it", "its", "itself", "just",
    "me", "more", "most", "my", "myself", "no", "nor", "not", "now", "of", "off", "on", "once",
    "only", "or", "other", "our", "ours", "ourselves", "out", "over", "own", "s", "same", "she",
    "should", "so", "some", "such", "t", "than", "that", "the", "their", "theirs", "them",
    "themselves", "then", "there", "these", "they", "this", "those", "through", "to", "too",
    "under", "until", "up", "very", "was", "we", "were", "what", "when", "where", "which",
    "while", "who", "whom", "why", "will", "with", "you", "your", "yours", "yourself",
    # Conversational campus intake boilerplate
    "please", "kindly", "urgently", "problem", "issue", "complaint", "facing", "campus",
    "college", "university", "dept", "department", "sir", "madam", "admin", "immediate", "action"
}

GENERIC_LOCATION_TOKENS = {
    "room", "hall", "block", "wing", "area", "floor", "building", "near", "side",
    "at", "in", "the", "of", "on", "next", "to", "front", "back", "rear"
}


def clean_text(text: Optional[str]) -> str:
    """
    Normalize text through lowercase conversion, stripping punctuation,
    and removing stopwords and empty whitespace.
    """
    if not text:
        return ""
    # Lowercase
    cleaned = str(text).lower()
    # Replace non-alphanumeric characters with spaces
    cleaned = re.sub(r"[^a-z0-9\s]", " ", cleaned)
    # Tokenize and filter stopwords
    tokens = [w for w in cleaned.split() if len(w) > 1 and w not in CAMPUS_STOPWORDS]
    return " ".join(tokens)


def _extract_fields(incident: Union[Dict[str, Any], Any]) -> Dict[str, Any]:
    """
    Adaptively extract incident fields from SQLAlchemy models, dictionaries,
    or generic test objects.
    """
    if isinstance(incident, dict):
        return {
            "id": incident.get("id"),
            "tracking_number": incident.get("tracking_number"),
            "title": incident.get("title", ""),
            "description": incident.get("description", ""),
            "category": incident.get("category", ""),
            "building": incident.get("building", ""),
            "location_details": incident.get("location_details", "")
        }
    return {
        "id": getattr(incident, "id", None),
        "tracking_number": getattr(incident, "tracking_number", None),
        "title": getattr(incident, "title", ""),
        "description": getattr(incident, "description", ""),
        "category": getattr(incident, "category", ""),
        "building": getattr(incident, "building", ""),
        "location_details": getattr(incident, "location_details", "")
    }


class DuplicateDetector:
    """
    Deterministic duplicate complaint detection engine powered by scikit-learn
    TF-IDF vector space modeling and multi-signal composite scoring.
    """

    # Default weights for composite similarity
    DEFAULT_WEIGHT_TEXT: float = 0.65
    DEFAULT_WEIGHT_LOCATION: float = 0.20
    DEFAULT_WEIGHT_CATEGORY: float = 0.15

    # Default decision thresholds
    DEFAULT_THRESHOLD_HIGH: float = 0.70
    DEFAULT_THRESHOLD_POTENTIAL: float = 0.40

    def __init__(
        self,
        weight_text: float = DEFAULT_WEIGHT_TEXT,
        weight_location: float = DEFAULT_WEIGHT_LOCATION,
        weight_category: float = DEFAULT_WEIGHT_CATEGORY,
        threshold_high: float = DEFAULT_THRESHOLD_HIGH,
        threshold_potential: float = DEFAULT_THRESHOLD_POTENTIAL,
        ngram_range: tuple = (1, 1)
    ):
        """
        Initialize detector with configurable factor weights and classification thresholds.
        """
        # Normalize weights so they sum to 1.0
        total_w = weight_text + weight_location + weight_category
        if total_w <= 0:
            total_w = 1.0
        self.weight_text = weight_text / total_w
        self.weight_location = weight_location / total_w
        self.weight_category = weight_category / total_w

        self.threshold_high = threshold_high
        self.threshold_potential = threshold_potential
        self.ngram_range = ngram_range

    def _prepare_document(self, fields: Dict[str, Any]) -> str:
        """
        Construct normalized textual document representation.
        Titles carry strong semantic signals and are double-weighted.
        """
        raw_title = fields.get("title", "") or ""
        raw_desc = fields.get("description", "") or ""
        # Repeat title twice to boost salient term frequency
        combined = f"{raw_title} {raw_title} {raw_desc}".strip()
        return clean_text(combined)

    def compute_text_similarity(self, text_a: str, text_b: str) -> float:
        """
        Compute cosine similarity between two normalized text strings
        using scikit-learn TfidfVectorizer.
        """
        clean_a = clean_text(text_a)
        clean_b = clean_text(text_b)

        if not clean_a or not clean_b:
            return 0.0

        if clean_a == clean_b:
            return 1.0

        try:
            vectorizer = TfidfVectorizer(
                ngram_range=self.ngram_range,
                min_df=1,
                sublinear_tf=True
            )
            tfidf_matrix = vectorizer.fit_transform([clean_a, clean_b])
            cos_sim = cosine_similarity(tfidf_matrix[0:1], tfidf_matrix[1:2])[0][0]
            return float(min(1.0, max(0.0, round(float(cos_sim), 4))))
        except Exception:
            return 0.0

    @staticmethod
    def compute_location_similarity(
        building_a: Optional[str],
        building_b: Optional[str],
        details_a: Optional[str] = None,
        details_b: Optional[str] = None
    ) -> float:
        """
        Calculate spatial alignment heuristic.
        1.0 for exact building + location match, 0.70 for same building, 0.40 for token overlap.
        """
        b_a = str(building_a or "").strip().lower()
        b_b = str(building_b or "").strip().lower()
        d_a = str(details_a or "").strip().lower()
        d_b = str(details_b or "").strip().lower()

        if not b_a or not b_b:
            return 0.0

        # Exact match of building and details
        if b_a == b_b and d_a and d_b and d_a == d_b:
            return 1.0

        # Exact match of building
        if b_a == b_b:
            if d_a and d_b:
                spec_a = {t for t in d_a.split() if t not in GENERIC_LOCATION_TOKENS}
                spec_b = {t for t in d_b.split() if t not in GENERIC_LOCATION_TOKENS}
                # If specific non-generic tokens overlap (e.g. "reading", "102")
                if spec_a and spec_b and spec_a.intersection(spec_b):
                    return 0.85
            return 0.70

        # Different building but strong room/floor token overlap
        if d_a and d_b:
            spec_a = {t for t in d_a.split() if t not in GENERIC_LOCATION_TOKENS}
            spec_b = {t for t in d_b.split() if t not in GENERIC_LOCATION_TOKENS}
            overlap = spec_a.intersection(spec_b)
            if overlap:
                return 0.40

        return 0.0

    @staticmethod
    def compute_category_similarity(cat_a: Optional[str], cat_b: Optional[str]) -> float:
        """Evaluate category match: 1.0 if identical category, 0.0 otherwise."""
        c_a = str(cat_a or "").strip().lower()
        c_b = str(cat_b or "").strip().lower()
        if not c_a or not c_b:
            return 0.0
        return 1.0 if c_a == c_b else 0.0

    def evaluate_pair(
        self,
        new_incident: Union[Dict[str, Any], Any],
        existing_incident: Union[Dict[str, Any], Any]
    ) -> Dict[str, Any]:
        """
        Evaluate pairwise similarity between a candidate incident and an existing incident.
        Returns composite score, factor breakdown, and classification.
        """
        fields_new = _extract_fields(new_incident)
        fields_exist = _extract_fields(existing_incident)

        doc_new = self._prepare_document(fields_new)
        doc_exist = self._prepare_document(fields_exist)

        text_sim = self.compute_text_similarity(doc_new, doc_exist)
        loc_sim = self.compute_location_similarity(
            fields_new.get("building"),
            fields_exist.get("building"),
            fields_new.get("location_details"),
            fields_exist.get("location_details")
        )
        cat_sim = self.compute_category_similarity(
            fields_new.get("category"),
            fields_exist.get("category")
        )

        composite = round(
            (self.weight_text * text_sim) +
            (self.weight_location * loc_sim) +
            (self.weight_category * cat_sim),
            3
        )
        composite = min(1.0, max(0.0, composite))

        # Classification
        if composite >= self.threshold_high:
            match_level = "HIGH_CONFIDENCE"
            recommendation = "High likelihood of duplicate complaint. Recommend merging with primary incident."
        elif composite >= self.threshold_potential:
            match_level = "POTENTIAL_DUPLICATE"
            recommendation = "Moderate similarity detected. Review to determine if related or distinct."
        else:
            match_level = "DISTINCT"
            recommendation = "Incident appears physically or functionally distinct."

        return {
            "incident_id": fields_exist.get("id"),
            "tracking_number": fields_exist.get("tracking_number"),
            "title": fields_exist.get("title"),
            "composite_score": composite,
            "match_level": match_level,
            "signals": {
                "text_similarity": round(text_sim, 3),
                "location_similarity": round(loc_sim, 3),
                "category_similarity": round(cat_sim, 3),
                "weights": {
                    "text": round(self.weight_text, 3),
                    "location": round(self.weight_location, 3),
                    "category": round(self.weight_category, 3)
                }
            },
            "recommendation": recommendation
        }

    def rank_candidates(
        self,
        new_incident: Union[Dict[str, Any], Any],
        candidate_incidents: List[Union[Dict[str, Any], Any]],
        top_k: int = 5,
        min_threshold: Optional[float] = None
    ) -> List[Dict[str, Any]]:
        """
        Vectorize candidate incidents en masse and rank by composite similarity.
        Filters out self-comparison and results below min_threshold.

        Args:
            new_incident: Candidate incident (model or dict).
            candidate_incidents: Collection of existing incidents to scan.
            top_k: Maximum number of ranked candidate matches to return.
            min_threshold: Minimum composite score required for inclusion (defaults to threshold_potential).

        Returns:
            List of ranked candidate match dictionaries.
        """
        if not candidate_incidents:
            return []

        fields_new = _extract_fields(new_incident)
        new_id = fields_new.get("id")
        new_track = fields_new.get("tracking_number")

        doc_new = self._prepare_document(fields_new)

        cutoff = self.threshold_potential if min_threshold is None else min_threshold

        # Filter out self-matching and extract valid candidates
        valid_candidates = []
        for cand in candidate_incidents:
            f = _extract_fields(cand)
            # Skip self-match if identifiers match
            if new_id is not None and f.get("id") is not None and new_id == f.get("id"):
                continue
            if new_track is not None and f.get("tracking_number") is not None and new_track == f.get("tracking_number"):
                continue
            valid_candidates.append(cand)

        if not valid_candidates:
            return []

        candidate_docs = [self._prepare_document(_extract_fields(c)) for c in valid_candidates]

        # Batch TF-IDF vectorization across the entire corpus for optimal IDF weighting
        all_docs = [doc_new] + candidate_docs
        non_empty_docs = [d for d in all_docs if d.strip()]

        text_similarities = [0.0] * len(valid_candidates)
        if doc_new.strip() and len(non_empty_docs) > 1:
            try:
                vectorizer = TfidfVectorizer(ngram_range=self.ngram_range, min_df=1, sublinear_tf=True)
                tfidf_matrix = vectorizer.fit_transform([doc_new] + candidate_docs)
                cos_sims = cosine_similarity(tfidf_matrix[0:1], tfidf_matrix[1:])[0]
                text_similarities = [float(min(1.0, max(0.0, s))) for s in cos_sims]
            except Exception:
                # Fallback to pairwise calculation
                text_similarities = [self.compute_text_similarity(doc_new, cd) for cd in candidate_docs]

        results = []
        for i, cand in enumerate(valid_candidates):
            f_cand = _extract_fields(cand)
            t_sim = text_similarities[i]
            l_sim = self.compute_location_similarity(
                fields_new.get("building"),
                f_cand.get("building"),
                fields_new.get("location_details"),
                f_cand.get("location_details")
            )
            c_sim = self.compute_category_similarity(
                fields_new.get("category"),
                f_cand.get("category")
            )

            composite = round(
                (self.weight_text * t_sim) +
                (self.weight_location * l_sim) +
                (self.weight_category * c_sim),
                3
            )
            composite = min(1.0, max(0.0, composite))

            if composite >= self.threshold_high:
                match_level = "HIGH_CONFIDENCE"
                rec = "High likelihood of duplicate complaint. Recommend merging with primary incident."
            elif composite >= self.threshold_potential:
                match_level = "POTENTIAL_DUPLICATE"
                rec = "Moderate similarity detected. Review to determine if related or distinct."
            else:
                match_level = "DISTINCT"
                rec = "Incident appears physically or functionally distinct."

            if min_threshold is None or composite >= cutoff:
                results.append({
                    "incident_id": f_cand.get("id"),
                    "tracking_number": f_cand.get("tracking_number"),
                    "title": f_cand.get("title"),
                    "composite_score": composite,
                    "match_level": match_level,
                    "signals": {
                        "text_similarity": round(t_sim, 3),
                        "location_similarity": round(l_sim, 3),
                        "category_similarity": round(c_sim, 3),
                        "weights": {
                            "text": round(self.weight_text, 3),
                            "location": round(self.weight_location, 3),
                            "category": round(self.weight_category, 3)
                        }
                    },
                    "recommendation": rec
                })

        # Rank descending by composite score
        results.sort(key=lambda x: x["composite_score"], reverse=True)
        return results[:top_k]
