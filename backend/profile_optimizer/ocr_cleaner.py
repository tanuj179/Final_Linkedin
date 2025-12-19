# profile_optimizer/ocr_cleaner.py
"""
OCR cleaning and profile extraction helpers.

Public API:
    clean_ocr_to_profile(ocr_raw_json: dict, ocr_full_text: str, skill_vocab: list=None)
        -> (cleaned_profile_json: dict, meta: dict)

This implementation is conservative and works without optional libraries.
It will use ftfy and emoji if available for nicer cleaning.
"""

import re
from typing import Any, Dict, List, Tuple

# Optional helper libs — used if installed; code works without them.
try:
    import ftfy
except Exception:
    ftfy = None

try:
    import emoji
except Exception:
    emoji = None

# Simple regexes
EMAIL_RE = re.compile(r"[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}")
PHONE_RE = re.compile(r"(\+?\d{1,4}[\s-])?(?:\d{6,12})")

UI_BLOCKLIST = {
    "message",
    "connect",
    "follow",
    "see more",
    "show more",
    "followers",
    "connections",
    "profile views",
    "activity",
    "posts",
    "comments",
}


# --- Utility cleaning functions ---
def fix_text_basic(text: str) -> str:
    if not text:
        return ""
    # ftfy for unicode fixes if available
    if ftfy:
        try:
            text = ftfy.fix_text(text)
        except Exception:
            pass
    # normalize newlines and spaces
    text = text.replace("\r", "\n")
    text = re.sub(r"[ \t]+", " ", text)
    # remove repeated newlines
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


def remove_emoji(text: str) -> str:
    if not text:
        return ""
    if emoji:
        try:
            return emoji.replace_emoji(text, replace="")
        except Exception:
            pass
    # fallback: strip common unicode emoji ranges (best-effort)
    try:
        return re.sub(
            r"["
            r"\U0001F600-\U0001F64F"  # emoticons
            r"\U0001F300-\U0001F5FF"  # symbols & pictographs
            r"\U0001F680-\U0001F6FF"  # transport & map symbols
            r"\U0001F1E0-\U0001F1FF"  # flags
            r"]+",
            "",
            text,
        )
    except re.error:
        # Some Python builds can't handle these ranges in regex; return original
        return text


def redact_pii(text: str) -> Tuple[str, List[str]]:
    redacted: List[str] = []
    t = EMAIL_RE.sub("<REDACTED_EMAIL>", text)
    if "<REDACTED_EMAIL>" in t:
        redacted.append("email")
    t2 = PHONE_RE.sub("<REDACTED_PHONE>", t)
    if "<REDACTED_PHONE>" in t2:
        redacted.append("phone")
    return t2, redacted


def collapse_spaced_letters(line: str) -> str:
    # Convert "F u l l  S t a c k" -> "Full Stack"
    # Only do when sequence of single letters separated by spaces is found.
    def _join(match):
        s = match.group(0).replace(" ", "")
        return s

    return re.sub(r"\b(?:[A-Za-z]\s){2,}[A-Za-z]\b", _join, line)


def merge_hyphenated_lines(lines: List[str]) -> List[str]:
    merged: List[str] = []
    i = 0
    n = len(lines)
    while i < n:
        ln = lines[i]
        if ln.endswith("-") and i + 1 < n:
            ln = ln[:-1] + lines[i + 1].lstrip()
            i += 2
            merged.append(ln)
        else:
            merged.append(ln)
            i += 1
    return merged


# --- Raw JSON -> ordered lines ---
def lines_from_raw_json(raw_json: Dict[str, Any]) -> List[str]:
    """
    Best-effort: walk Vision's JSON and return a list of paragraphs/lines
    in top->bottom order. Fallback to text annotation description.
    """
    if not raw_json:
        return []

    lines: List[str] = []
    try:
        fta = raw_json.get("fullTextAnnotation") or raw_json.get("text_annotations") or raw_json
        pages = []
        if isinstance(fta, dict):
            pages = fta.get("pages") or []
        if not pages:
            tanns = raw_json.get("textAnnotations")
            if tanns and isinstance(tanns, list) and len(tanns) > 0:
                desc = tanns[0].get("description")
                if desc:
                    return [ln.strip() for ln in desc.split("\n\n") if ln.strip()]
        for page in pages:
            blocks = page.get("blocks") or []
            for block in blocks:
                paras = block.get("paragraphs") or []
                for para in paras:
                    words = para.get("words") or []
                    word_texts: List[str] = []
                    for w in words:
                        symbols = w.get("symbols") or []
                        wtext = "".join([s.get("text", "") for s in symbols])
                        if wtext:
                            word_texts.append(wtext)
                    if word_texts:
                        lines.append(" ".join(word_texts))
    except Exception:
        return []

    final: List[str] = []
    for ln in lines:
        ln2 = ln.strip()
        if ln2:
            ln2 = collapse_spaced_letters(ln2)
            final.append(ln2)
    return final


# --- Fallback: lines from full_text ---
def lines_from_full_text(full_text: str) -> List[str]:
    if not full_text:
        return []
    txt = fix_text_basic(full_text)
    if "\n\n" in txt:
        paras = [p.strip() for p in txt.split("\n\n") if p.strip()]
    else:
        paras = [l.strip() for l in txt.splitlines() if l.strip()]
    paras = [collapse_spaced_letters(p) for p in paras]
    return paras


# --- Lightweight headline hint extractor ---
def extract_headline(lines: List[str]) -> Tuple[str, float]:
    """
    Best-effort guess of a headline from the top of the profile.
    This is only a hint; final logic is in the LLM.
    """
    for ln in lines[:8]:
        low = ln.lower().strip()
        if any(block in low for block in UI_BLOCKLIST):
            continue
        if EMAIL_RE.search(ln) or PHONE_RE.search(ln):
            continue
        if 20 <= len(ln) <= 220:
            return ln.strip(), 0.8
    return "", 0.0


# --- Simple coverage score (optional) ---
def compute_coverage_score_simple(full_cleaned_text: str) -> int:
    """
    Very rough signal: how much meaningful content exists.
    Used only as a hint; final scoring is done by GPT.
    """
    if not full_cleaned_text:
        return 0
    paras = [p.strip() for p in full_cleaned_text.split("\n\n") if p.strip()]
    n = len(paras)
    if n == 0:
        return 0
    return max(0, min(100, n * 5))


# --- Public API ---
def clean_ocr_to_profile(
    ocr_raw_json: Dict[str, Any],
    ocr_full_text: str,
    skill_vocab: List[str] = None,  # kept for compatibility, currently unused
) -> Tuple[Dict[str, Any], Dict[str, Any]]:
    """
    Returns (cleaned_profile_json, meta).

    Goal (aligned with docs):
    - Produce a single, PII-redacted, cleaned OCR text block.
    - Provide a short lines_preview for debugging.
    - Optionally provide a soft headline_hint from early lines.
    - Do NOT try to fully extract experience/education/etc here.
      That work is delegated to the LLM analyzer using the cleaned text.
    """

    meta: Dict[str, Any] = {
        "parsing_warnings": [],
        "redacted_fields": [],
        "section_confidence": {},
        "lines_preview": [],
    }

    # 1) attempt to build lines from JSON; fallback to full_text
    lines: List[str] = []
    try:
        if ocr_raw_json:
            lines = lines_from_raw_json(ocr_raw_json)
    except Exception as e:
        meta["parsing_warnings"].append(f"raw_json_lines_failed:{str(e)}")
        lines = []
    if not lines:
        lines = lines_from_full_text(ocr_full_text or "")

    # 2) pre-clean lines
    cleaned_lines: List[str] = []
    for ln in lines:
        ln = fix_text_basic(ln)
        ln = remove_emoji(ln)
        ln = ln.strip()
        ln = collapse_spaced_letters(ln)
        if ln:
            cleaned_lines.append(ln)

    # merge hyphenations
    cleaned_lines = merge_hyphenated_lines(cleaned_lines)
    # cap preview
    meta["lines_preview"] = cleaned_lines[:200]

    # 3) build joined cleaned text
    full_cleaned_text = "\n\n".join(cleaned_lines)

    # 4) redact PII (emails/phones)
    full_cleaned_text_redacted, redacted = redact_pii(full_cleaned_text)
    meta["redacted_fields"] = redacted

    # 5) light hints only (no heavy section parsing)
    headline_hint, h_conf = extract_headline(cleaned_lines)
    section_conf: Dict[str, float] = {}
    if headline_hint:
        section_conf["headline"] = h_conf
    meta["section_confidence"] = section_conf

    # 6) assemble cleaned JSON (minimal, LLM-friendly)
    cleaned_profile: Dict[str, Any] = {
        # optional, best-effort hint – GPT will still re-evaluate
        "headline_hint": headline_hint,
        # main thing: one big, cleaned, PII-redacted text block
        "raw_text": full_cleaned_text_redacted,
        "_meta": {
            "section_confidence": section_conf,
            "parser_notes": meta["parsing_warnings"],
        },
    }

    # 7) simple coverage score for debugging / telemetry
    coverage = compute_coverage_score_simple(full_cleaned_text_redacted)
    meta["coverage_score"] = coverage

    return cleaned_profile, meta
