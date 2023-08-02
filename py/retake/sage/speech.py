import json
import whisperx

import tensorflow as tf

from typing import cast, Iterator

from retake.sage import config

device = "cuda" if config.CUDA_AVAILABLE() else "cpu"

model = whisperx.load_model(config.WHISPERX_MODEL, device,
                            compute_type=config.WHISPERX_COMPUTE_TYPE)


def transcribe(video_id: str, src: str):
  print(f"transcribe: Transcribing audio using {device}.")

  audio = whisperx.load_audio(src)
  result = model.transcribe(audio, batch_size=config.WHISPERX_BATCH_SIZE)

  align_model, metadata = whisperx.load_align_model(result["language"], device)

  result = whisperx.align(cast(Iterator, result["segments"]), align_model,
                          metadata, audio, device, return_char_alignments=False)
  
  print(f"transcribe: Aligned segments.")

  if not config.IS_DEV:
    print(f"transcribe: Starting diarization pipeline.")

    diarize_model = whisperx.DiarizationPipeline(use_auth_token=config.HUGGINGFACE_TOKEN, device=device)
    diarized_segments = diarize_model(src)

    print(f"transcribe: Done diarizing segments.")

    result = whisperx.assign_word_speakers(diarized_segments, result)

  out_path_base = config.VIDEO_DIR + f"/{video_id}"

  with open(out_path_base + "/speech_data.json", "w") as f:
    f.write(json.dumps(result))
    f.flush()

  with open(out_path_base + "/transcript.srt", "w") as f:
    for i, s in enumerate(result["segments"]):
      print(f"{i}\n{s['start']} --> {s['end']}\n{s['text'].strip()}\n", file=f)
    f.flush()

  return result
