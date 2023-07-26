import os
import s3
import tensorflow as tf

import config
import speech
import utils
import video


tf.keras.utils.disable_interactive_logging()

utils.ensure_dir_exists(config.VIDEO_DIR)

def process_video_from_s3(id: str, bucket_name: str, key: str):
    f = s3.download_file(bucket_name, key)

    process_video(id, f.name)
    
    f.close()

def process_video(id: str, src: str):
    audio_path = config.VIDEO_DIR + f"/{id}.wav"

    video.extract_audio(src, audio_path)
    speech.transcribe(id, audio_path)

    v = video.from_source(src)

    preview_size = 720
    preview_name = f"/{id}_{preview_size}.mp4"
    preview_path = config.VIDEO_DIR + preview_name

    if not os.path.exists(preview_path):
      video.downscale(v, preview_path, preview_size)

    if config.USE_S3_STORE and not s3.file_exists(config.S3_VIDEOS, preview_name):
      s3.upload_file(preview_path, config.S3_VIDEOS, preview_name, "video/mp4")

    preview = video.from_source(preview_path)
    video.track_faces(preview)

    os.remove(preview_path)
