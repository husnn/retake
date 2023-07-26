import os

from dotenv import load_dotenv
from torch import cuda


load_dotenv()

ENV = os.getenv("ENV", "dev")
IS_DEV = ENV == "dev"

CUDA_AVAILABLE = cuda.is_available()

FACE_DETECTION_MODEL = "Facenet"
FACE_DETECTION_METHOD = "mtcnn"

USE_S3_STORE = False
S3_VIDEOS = os.getenv("S3_VIDEOS_NAME", "")

BASE_DIR = os.path.dirname(__file__) + "/runtime"
VIDEO_DIR = BASE_DIR + "/videos"

WHISPERX_MODEL = os.getenv("WHISPERX_MODEL", "large-v2")
WHISPERX_BATCH_SIZE = int(os.getenv("WHISPERX_BATCH_SIZE", 16))
WHISPERX_COMPUTE_TYPE = os.getenv("WHISPERX_COMPUTE_TYPE", "float16")

HUGGING_FACE_TOKEN = os.getenv("HUGGING_FACE_TOKEN")
