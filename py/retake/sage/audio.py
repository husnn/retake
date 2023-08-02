def extract_from_video(src: str, dst: str):
  import ffmpeg

  ffmpeg \
      .input(src) \
      .output(dst, format='wav', acodec='pcm_s16le', ac=1, ar='16k') \
      .overwrite_output() \
      .run(capture_stdout=True)