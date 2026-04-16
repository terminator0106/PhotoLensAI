from __future__ import annotations

from dataclasses import dataclass
from io import BytesIO
from typing import Dict, List, Tuple

import requests
from PIL import Image
import imagehash

from models.photo_model import Photo


@dataclass
class DuplicateGroupResult:
    group_id: str
    photo_ids: List[int]
    similarity: float
    potential_savings_bytes: int


def _download(url: str, timeout: int = 15) -> bytes:
    resp = requests.get(url, timeout=timeout)
    resp.raise_for_status()
    return resp.content


def ensure_photo_hash(photo: Photo) -> str | None:
    if photo.phash:
        try:
            # Validate the stored value is a pHash-compatible hex string.
            imagehash.hex_to_hash(photo.phash)
            return photo.phash
        except Exception:
            # Stored hash came from an older algorithm; recompute below.
            pass
    try:
        content = _download(photo.image_url)
        img = Image.open(BytesIO(content)).convert("RGB")
        ph = imagehash.phash(img)  # 64-bit perceptual hash
        photo.phash = str(ph)
        return photo.phash
    except Exception:
        return None


def _hash_distance(a_hex: str, b_hex: str) -> int:
    # Use imagehash's own conversion to avoid assumptions about formatting.
    ha = imagehash.hex_to_hash(a_hex)
    hb = imagehash.hex_to_hash(b_hex)
    return int(ha - hb)


def _distance_to_similarity_score(dist: int, *, bits: int = 64) -> int:
    # Convert Hamming distance to a 0-100 similarity score.
    dist = max(0, int(dist))
    score = round((1.0 - (dist / float(bits))) * 100.0)
    return int(max(0, min(100, score)))


def find_duplicate_groups(photos: List[Photo], *, max_distance: int = 10) -> Tuple[List[DuplicateGroupResult], int]:
    """Groups photos by perceptual hash similarity (pHash via ImageHash).

    max_distance is the Hamming distance threshold for pHash. 0 means identical.
    Returns (groups, total_savings_bytes)
    """

    hashes: Dict[int, str] = {}
    for p in photos:
        h = ensure_photo_hash(p)
        if h:
            hashes[p.id] = h

    visited: set[int] = set()
    groups: List[DuplicateGroupResult] = []
    total_savings = 0

    photo_by_id = {p.id: p for p in photos}
    ids = list(hashes.keys())

    for i, pid in enumerate(ids):
        if pid in visited:
            continue
        base_hash = hashes[pid]
        cluster = [pid]
        visited.add(pid)

        for other_id in ids[i + 1 :]:
            if other_id in visited:
                continue
            dist = _hash_distance(base_hash, hashes[other_id])
            if dist <= max_distance:
                cluster.append(other_id)
                visited.add(other_id)

        if len(cluster) >= 2:
            # similarity is an approximate score derived from the threshold.
            similarity = _distance_to_similarity_score(max_distance) / 100.0
            sizes = [photo_by_id[c].bytes or 0 for c in cluster]
            avg_size = int(sum(sizes) / len(sizes)) if any(sizes) else 0
            savings = max(0, (len(cluster) - 1) * avg_size)
            total_savings += savings

            groups.append(
                DuplicateGroupResult(
                    group_id=f"dup-{pid}",
                    photo_ids=cluster,
                    similarity=round(similarity, 3),
                    potential_savings_bytes=savings,
                )
            )

    return groups, total_savings
