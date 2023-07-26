import json
import whisperx

from typing import cast, Iterator

import config


device = "cuda" if config.CUDA_AVAILABLE else "cpu"

model = whisperx.load_model(config.WHISPERX_MODEL, device,
                            compute_type=config.WHISPERX_COMPUTE_TYPE)

def transcribe(name: str, src: str):
  audio = whisperx.load_audio(src)
  result = model.transcribe(audio, batch_size=config.WHISPERX_BATCH_SIZE)

  align_model, metadata = whisperx.load_align_model(result["language"], device)

  result = whisperx.align(cast(Iterator, result["segments"]), align_model,
                          metadata, audio, device, return_char_alignments=False)

  diarize_model = whisperx.DiarizationPipeline(use_auth_token=config.HUGGING_FACE_TOKEN, device=device)
  diarized_segments = diarize_model(src)

  result = whisperx.assign_word_speakers(diarized_segments, result)

  with open(config.VIDEO_DIR + f"/{name}.txt", "w") as f:
    f.write(json.dumps(result))
    f.flush()
