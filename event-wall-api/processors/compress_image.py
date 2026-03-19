from PIL import Image
import io

def compress_image(data: bytes):
    image = Image.open(io.BytesIO(data))

    webp_file = io.BytesIO()
    image.save(webp_file, "webp", quality=90)
    webp_file.seek(0)

    thumbnail = io.BytesIO()
    image.thumbnail((480, 480))
    image.save(thumbnail, "webp", quality=60)
    thumbnail.seek(0)


    return webp_file.read(), thumbnail.read()
