from __future__ import annotations

from dataclasses import dataclass
from typing import Dict, List, Tuple

import requests

from models.photo_model import Photo
from utils.image_utils import average_hash, hamming_distance_hex


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
        return photo.phash
    try:
        content = _download(photo.image_url)
        photo.phash = average_hash(content)
        return photo.phash
    except Exception:
        return None


def find_duplicate_groups(photos: List[Photo], *, max_distance: int = 6) -> Tuple[List[DuplicateGroupResult], int]:
    """Groups photos by perceptual hash similarity.

    max_distance is Hamming distance threshold for aHash. 0 means identical.
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
            dist = hamming_distance_hex(base_hash, hashes[other_id])
            if dist <= max_distance:
                cluster.append(other_id)
                visited.add(other_id)

        if len(cluster) >= 2:
            # similarity: 1 - (dist / bits). We approximate using threshold.
            similarity = 1.0 - (max_distance / 64.0)
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
