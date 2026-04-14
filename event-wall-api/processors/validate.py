MAGIC_BYTES = {
    'image': [
        b'\xff\xd8\xff',          # JPEG
        b'\x89PNG\r\n\x1a\n',    # PNG
    ]
}

HEIC_BRANDS = {b'heic', b'heix', b'hevc', b'mif1', b'msf1'}

def validate_file_type(raw: bytes, content_type: str) -> bool:
    if 'video' in content_type:
        return raw[4:8] == b'ftyp'

    if 'image' in content_type:
        if raw.startswith(b'RIFF'):
            return raw[8:12] == b'WEBP'
        # HEIC: ftyp box with a heic/heix brand
        if raw[4:8] == b'ftyp' and raw[8:12] in HEIC_BRANDS:
            return True
        return any(raw.startswith(sig) for sig in MAGIC_BYTES['image'])

    return False