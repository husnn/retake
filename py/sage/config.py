import os

from dotenv import load_dotenv

load_dotenv()

ENV = os.getenv("ENV", "dev")
IS_DEV = ENV == "dev"

FACE_DETECTION_MODEL = "Facenet"
FACE_DETECTION_METHOD = "mtcnn"

USE_S3_STORE = False
S3_VIDEOS = os.getenv("S3_VIDEOS_NAME", "")

BASE_DIR = os.path.dirname(__file__) + "/runtime"
VIDEO_DIR = BASE_DIR + "/videos"
