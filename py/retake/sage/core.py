import os
import tensorflow as tf
import time

from typing import cast, Optional

from . import config
from .types import Segment
from .utils import ensure_dir_exists

tf.keras.utils.disable_interactive_logging()

ensure_dir_exists(config.BASE_DIR)
ensure_dir_exists(config.VIDEO_DIR)


def transcribe_video(id: str, src: str):
    from . import audio, speech

    print(f"transcribe_video: Starting for video '{id}'.")

    dir = config.VIDEO_DIR + f"/{id}"
    audio_path = dir + "/audio.wav"

    audio.extract_from_video(src, audio_path)
    print(f"transcribe_video: Extracted audio to {audio_path}.")

    result = speech.transcribe(id, audio_path)

    print(f"transcribe_video: Done.")

    return result


def get_highlights(video_id: str, video_title: str, transcript_path: Optional[str] = None):
  import openai
  from .s3 import upload_file

  print(f"get_highlights: Starting for video '{video_id}'.")

  transcript = ""

  if not video_title:
    video_title = video_id

  if not transcript_path:
    transcript_path = config.VIDEO_DIR + f"/{video_id}/transcript.srt"

  with open(transcript_path, "r") as f:
    transcript = f.read()

  MAX_SECTION_CHAR_COUNT = 2500 * 4
  MAX_PREPEND_CHAR_COUNT = 100 * 4

  sections = []

  lines = transcript.splitlines()
  sentences = lines[2::4]

  print(f"Found {len(sentences)} sentences.")

  section: list[tuple[str, str]] = []
  section_char_count = 0

  for i, l in enumerate(sentences):
    section.append((lines[(i*4)+1], l))
    section_char_count += len(l)

    if i == len(sentences) - 1: # Last line
      sections.append(section)
      print(f"get_highlights: Created section. Lines: {len(section)}, Chars: {section_char_count}.")

      section = []
      section_char_count = 0
      break

    next_len = len(sentences[i+1])

    # Adding the next line would exceed max char count for section.
    if section_char_count + next_len > MAX_SECTION_CHAR_COUNT:
        prepend_lines = []
        prepend_lines_char_count = 0

        # Prepend up to x lines from current section to next,
        # starting from the last.
        for ll in section[-3:][::-1]:
           ll_char_count = len(ll)

           if prepend_lines_char_count + ll_char_count > MAX_PREPEND_CHAR_COUNT:
              break
           
           prepend_lines.append(ll)
           prepend_lines_char_count += ll_char_count

        # Undo reversing to correct the sentence order.
        prepend_lines = prepend_lines[::-1]

        # Finalise current section.
        sections.append(section)

        print(f"get_highlights: Created segment. Lines: {len(section)}, Chars: {section_char_count}.")

        section = prepend_lines
        section_char_count = prepend_lines_char_count

  openai.api_key = config.OPENAI_API_KEY

  highlights: list[Segment] = []

  for i, s in enumerate(sections):
    content = ""
    
    for line in s:
      content += f"{line[0]}: {line[1]}\n"

    total_tries = 3
    tries_left = total_tries

    while True:
      if tries_left == 0: break
      tries_left -= 1

      print(f"get_highlights: Extracting highlights ({i+1}/{len(sections)}). Attempt: {total_tries-tries_left}.")

      try:
        completion = openai.ChatCompletion.create(model="gpt-3.5-turbo", messages=[
          {
              "role": "system",
              # "content": "Given the transcript of a podcast/interview, identify the most interesting segment, summarise it, and return the time range(s) at which it is being discussed (in the format \"from --> to\"). The segment should be fully coherent on its own, without requiring the full context of the discussion."
              "content": "Given the transcript of a podcast/interview, identify the most interesting segments, briefly summarise them, and return the timestamps at which they're being discussed (in the format \"from --> to\"). Joining the segments should form a concise clip."
          },
          {
              "role": "user",
              "content": content
          }
        ])

        result = cast(dict, completion)["choices"][0]["message"]["content"]

        import re
        matches = re.findall(r"(\d+\.\d+)\s*-->\s*(\d+\.\d+)", result)

        if len(matches) <= 0:
          matches = re.findall(r"(\d+\.\d+)\s*to\s*(\d+\.\d+)", result)

        print(f"Timerange matches: {matches}")

        if len(matches) <= 0:
          print(f"No matches. Retrying.")
          continue

        timeranges: list[tuple[float, float]] = []
        last_end = None
        total_length = 0

        for m in matches:
          start = float(m[0])
          end = float(m[1])

          invalid_timerange = False
          if end <= start:
            print("get_highlights: End timestamp is lower than start.")
            invalid_timerange = True

          if last_end and last_end > start:
            print("get_highlights: Timerange preceeds last.")
            invalid_timerange = True

          if invalid_timerange:
            print("Find completion result below:")
            print(result)
            break

          print(f"get_highlights: Found highlight. Start: {start}, End: {end}.")

          total_length += (end - start)

          if last_end == start:
            # Extend end time of last segment.
            timeranges[-1] = (timeranges[-1][0], end)
          else:
            timeranges.append((start, end))

          last_end = end

        if total_length < 15:
          print(f"get_highlights: Highlight too short ({int(total_length)} seconds). Trying again.")
          continue

        if total_length > 120:
          print(f"get_highlights: Highlight too long ({int(total_length)} seconds). Trying again.")
          continue

        completion = openai.ChatCompletion.create(model="gpt-3.5-turbo", messages=[
          {
              "role": "assistant",
              "content": result
          },
          {
              "role": "user",
              "content": f"Write an informal and catchy intro (under 80 characters) summarising the above segment.\nFull video: {video_title}"
          }
        ])

        title = cast(dict, completion)["choices"][0]["message"]["content"]
        title = title.replace('"', '')
        # Hashtags are sometimes returned in the response. Remove them.
        title = re.sub(r"#[\S]+", '', title).strip()

        h = Segment(title, round(total_length, 2), timeranges)
        highlights.append(h)

        print(f"get_highlights: Built highlight '{title}'.")

        break
      except Exception as e:
        print(f"Error getting completion. {e}")
        time.sleep(3)

  highlights_out = config.VIDEO_DIR + f"/{video_id}/highlights.json"

  with open(highlights_out, "w") as f:
    from dataclasses import asdict
    from json import dumps

    d = []
    for h in highlights:
      d.append(asdict(h))

    f.write(dumps(d))
    f.flush()

  upload_file(highlights_out, config.S3_VIDEOS, highlights_out.lstrip(config.BASE_DIR), "application/json")
  print(f"get_highlights: Uploaded highlights to S3.")
  
  print(f"get_highlights: Done.")

  return highlights


def generate_clips(id: str, segments: Optional[list[Segment]] = None):
  from . import video
  from .s3 import upload_file

  print(f"generate_clips: Starting for video '{id}'.")

  video_dir = config.VIDEO_DIR + f"/{id}"

  video_path = None
  video_ext = None
  for file in os.listdir(video_dir):
    _, video_ext = os.path.splitext(file)
    if file == ("video" + video_ext):
      video_path = video_dir + f"/{file}"
      break
  
  if not video_path:
    raise Exception("No video found.")

  if not segments:
    with open(video_dir + "/highlights.json", "r") as f:
      from json import loads

      segments = []
      for h in loads(f.read()):
        segments.append(Segment.from_dict(h))

  if not segments:
    raise Exception("No segments found.")
  
  if len(segments) > 1:
    print(f"generate_clips: Found {len(segments)} segments.")

  for s in segments:
    clips = []
    clip_id = 0

    for ts in s.timeranges:
      start, end = ts[0], ts[1]
      out_path = video_dir + f"/trimmed_{round(start*1000)}-{round(end*1000)}{video_ext}"
      video.trim(video_path, out_path, start, end)
      clips.append(out_path)
      clip_id += int(start + end)

    clip_out = video_dir + f"/clip_{clip_id}{video_ext}"
    video.merge_all(clips, clip_out)

    print(f"generate_clips: Merged {len(clips)} clips. ID: {clip_id}.")

    upload_file(clip_out, config.S3_VIDEOS, clip_out.lstrip(config.BASE_DIR), "video/mp4")
    print(f"generate_clips: Uploaded clip to S3.")

    # [os.remove(c) for c in clips]

    v = video.from_source(clip_out)
    face_data = video.track_faces(v)

    print(f"generate_clips: Done tracking faces for clip '{clip_id}'.")

    preview_out = video_dir + f"/clip_{clip_id}_preview{video_ext}"
    video.downscale(v, preview_out, 480)

    print(f"generate_clips: Saved clip preview to {preview_out}.")

    upload_file(preview_out, config.S3_VIDEOS, preview_out.lstrip(config.BASE_DIR), "video/mp4")
    print(f"generate_clips: Uploaded clip preview to S3.")

    frame_data_out = video_dir + f"/clip_{clip_id}.json"

    with open(frame_data_out, "w") as f:
      from dataclasses import asdict
      from json import dumps

      d = []
      for fd in face_data:
        d.append(asdict(fd))

      f.write(dumps(d))
      f.flush()

    upload_file(frame_data_out, config.S3_VIDEOS, frame_data_out.lstrip(config.BASE_DIR), "application/json")
    print(f"generate_clips: Uploaded frame data to S3.")
