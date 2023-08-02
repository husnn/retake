import os

from dotenv import load_dotenv

load_dotenv()

ENV = os.getenv("ENV", "dev")
IS_DEV = ENV == "dev"

DEBUG = os.getenv("DEBUG", False)

FACE_DETECTION_MODEL = "Facenet"
FACE_DETECTION_METHOD = "mtcnn"

USE_S3_STORE = False
S3_VIDEOS = os.getenv("S3_VIDEOS_NAME", "")

BASE_DIR = os.getenv("BASE_DIR", os.path.dirname(__file__) + "/runtime")
VIDEO_DIR = BASE_DIR + "/videos"

WHISPERX_MODEL = os.getenv("WHISPERX_MODEL", "large-v2")
WHISPERX_BATCH_SIZE = int(os.getenv("WHISPERX_BATCH_SIZE", 16))
WHISPERX_COMPUTE_TYPE = os.getenv("WHISPERX_COMPUTE_TYPE", "float16")

HUGGINGFACE_TOKEN = os.getenv("HUGGINGFACE_TOKEN")

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")


def CUDA_AVAILABLE():
  import tensorflow as tf
  if tf.config.list_physical_devices("GPU"):
    return True
  
  from importlib import util
  if util.find_spec("torch"):
    from torch import cuda
    return cuda.is_available()
  
  return False
