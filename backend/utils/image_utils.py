from __future__ import annotations

import math
from io import BytesIO
from typing import Optional, Tuple

from PIL import Image, ExifTags


def _rational_to_float(value) -> float:
    try:
        return float(value[0]) / float(value[1])
    except Exception:
        return float(value)


def _convert_gps_to_degrees(gps_coord) -> float:
    d = _rational_to_float(gps_coord[0])
    m = _rational_to_float(gps_coord[1])
    s = _rational_to_float(gps_coord[2])
    return d + (m / 60.0) + (s / 3600.0)


def extract_gps_from_image_bytes(image_bytes: bytes) -> Tuple[Optional[float], Optional[float]]:
    try:
        img = Image.open(BytesIO(image_bytes))
        exif = img._getexif()  # noqa: SLF001
        if not exif:
            return None, None

        exif_data = {}
        for tag_id, value in exif.items():
            tag = ExifTags.TAGS.get(tag_id, tag_id)
            exif_data[tag] = value

        gps_info = exif_data.get("GPSInfo")
        if not gps_info:
            return None, None

        gps_parsed = {}
        for key, value in gps_info.items():
            name = ExifTags.GPSTAGS.get(key, key)
            gps_parsed[name] = value

        lat = gps_parsed.get("GPSLatitude")
        lat_ref = gps_parsed.get("GPSLatitudeRef")
        lon = gps_parsed.get("GPSLongitude")
        lon_ref = gps_parsed.get("GPSLongitudeRef")

        if not (lat and lat_ref and lon and lon_ref):
            return None, None

        latitude = _convert_gps_to_degrees(lat)
        if str(lat_ref).upper() == "S":
            latitude = -latitude

        longitude = _convert_gps_to_degrees(lon)
        if str(lon_ref).upper() == "W":
            longitude = -longitude

        return latitude, longitude
    except Exception:
        return None, None


def average_hash(image_bytes: bytes, hash_size: int = 8) -> str:
    """Compute a small perceptual hash (aHash) as hex string."""
    img = Image.open(BytesIO(image_bytes)).convert("L").resize((hash_size, hash_size))
    pixels = list(img.getdata())
    avg = sum(pixels) / len(pixels)
    bits = [1 if p >= avg else 0 for p in pixels]

    # pack bits into int
    value = 0
    for bit in bits:
        value = (value << 1) | bit

    # hex string padded
    width = int(math.ceil((hash_size * hash_size) / 4))
    return format(value, f"0{width}x")


def hamming_distance_hex(hash_a: str, hash_b: str) -> int:
    a = int(hash_a, 16)
    b = int(hash_b, 16)
    return (a ^ b).bit_count()
