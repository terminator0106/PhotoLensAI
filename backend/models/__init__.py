from config.database import Base

# Ensure models are imported so SQLAlchemy can discover them
from models.user_model import User  # noqa: F401
from models.photo_model import Photo  # noqa: F401
from models.album_model import Album, PhotoAlbum  # noqa: F401
from models.tag_model import Tag  # noqa: F401
