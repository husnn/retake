import json
import whisperx

from typing import cast, Iterator

from retake.sage import config

device = "cuda" if config.CUDA_AVAILABLE() else "cpu"

model = whisperx.load_model(config.WHISPERX_MODEL, device,
                            compute_type=config.WHISPERX_COMPUTE_TYPE)


def transcribe(video_id: str, src: str):
  from .s3 import upload_file

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

  speech_data_out = out_path_base + "/speech_data.json"
  transcript_out = out_path_base + "/transcript.srt"

  with open(speech_data_out, "w") as f:
    f.write(json.dumps(result))
    f.flush()

  with open(transcript_out, "w") as f:
    for i, s in enumerate(result["segments"]):
      print(f"{i}\n{s['start']} --> {s['end']}\n{s['text'].strip()}\n", file=f)
    f.flush()

  upload_file(speech_data_out, config.S3_VIDEOS, speech_data_out.lstrip(config.BASE_DIR), "application/json")
  print(f"transcribe: Uploaded speech data to S3.")

  upload_file(transcript_out, config.S3_VIDEOS, transcript_out.lstrip(config.BASE_DIR), "text/plain")
  print(f"transcribe: Uploaded transcript to S3.")

  return result
