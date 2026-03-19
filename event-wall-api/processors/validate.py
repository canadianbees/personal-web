MAGIC_BYTES = {
    'image': [
        b'\xff\xd8\xff',          # JPEG
        b'\x89PNG\r\n\x1a\n',    # PNG
    ],
    'video': [
        b'\x00\x00\x00\x18ftyp', # MP4
        b'\x00\x00\x00\x20ftyp', # MP4 variant
        b'\x00\x00\x00\x1cftyp', # MOV
    ]
}

def validate_file_type(raw: bytes, content_type:str) -> bool:
    kind = 'video' if 'video' in content_type else 'image'

    match kind:

        case "video":
            for signature in MAGIC_BYTES['video']:
                if raw.startswith(signature):
                    return True
            return False

        case "image":
            if raw.startswith(b'RIFF'):
                return raw[8:12] == b'WEBP'

            for signature in MAGIC_BYTES['image']:
                if raw.startswith(signature):
                    return True
            return False

        case _:
            return False