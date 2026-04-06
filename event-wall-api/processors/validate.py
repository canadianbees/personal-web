MAGIC_BYTES = {
    'image': [
        b'\xff\xd8\xff',          # JPEG
        b'\x89PNG\r\n\x1a\n',    # PNG
    ]
}

def validate_file_type(raw: bytes, content_type: str) -> bool:
    if 'video' in content_type:
        return raw[4:8] == b'ftyp'

    if 'image' in content_type:
        if raw.startswith(b'RIFF'):
            return raw[8:12] == b'WEBP'
        return any(raw.startswith(sig) for sig in MAGIC_BYTES['image'])

    return False