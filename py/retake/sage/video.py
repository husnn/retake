import cv2
import ffmpeg
import pandas as pd
import shutil
import subprocess

from dataclasses import dataclass
from deepface import DeepFace
from deepface.commons import distance

from retake.sage import config
from .types import FaceData, FrameData


@dataclass
class Video:
  src: str
  width: int
  height: int
  fps: int
  duration_ms: int


def downscale(video: Video, dst: str, size_px: int):
   w = None
   h = None

   # Video is already of the desired resoultion.
   if max(video.width, video.height) == size_px:
      shutil.copy(video.src, dst)
      return
   
   # Scale whilst maintaining aspect ratio.
   # The larger side will have the specified pixel size.
   if video.width > video.height:
      w = size_px
      h = -2
   else:
      w = -2
      h = size_px

   # if config.CUDA_AVAILABLE:
   #    cmd = [
   #       "ffmpeg",
   #       "-y",
   #       "-hwaccel",
   #       "cuda",
   #       "-i",
   #       video.src,
   #       "-vf",
   #       f"scale={w}:{h}",
   #       "-c:a",
   #       "copy",
   #       "-c:v",
   #       "h264_nvenc",
   #       dst
   #    ]

   #    result = subprocess.run(cmd, stderr=subprocess.PIPE)

   #    if result.returncode != 0:
   #       raise Exception(result.stderr)
      
   #    return

   v = ffmpeg.input(video.src) \
      .video \
      .filter('scale', w, h)
   
   a = ffmpeg.input(video.src).audio

   ffmpeg \
      .output(v, a, dst) \
      .overwrite_output() \
      .run(capture_stdout=True, capture_stderr=True)


def from_source(src: str) -> Video:
   cmd = [
      "ffprobe",
      "-v",
      "error",
      "-select_streams",
      "v",
      "-show_entries",
      "stream=width,height,r_frame_rate,duration",
      "-of",
      "default=noprint_wrappers=1:nokey=1",
      src
   ]

   result = subprocess.run(cmd, stdout=subprocess.PIPE,
                           stderr=subprocess.PIPE, universal_newlines=True)
   
   if result.returncode != 0:
      raise Exception(result.stderr)
   
   info = result.stdout.split('\n')
   
   if len(info) != 5:
      raise Exception("Unexpected video stream output")
   
   fps = info[2].split("/")
   if len(fps) > 1 and float(fps[1]) > 0:
      fps = float(fps[0])/float(fps[1])
   else:
      fps = float(fps[0])
   
   return Video(
      src=src,
      width=int(info[0]),
      height=int(info[1]),
      fps=int(fps),
      duration_ms=int(float(info[3]) * 1000)
   )


def trim(src: str, dst: str, start: float, end: float):
   PTS = "PTS-STARTPTS"

   v = (
      ffmpeg.input(src)
         .trim(start=start, end=end)
         .setpts(PTS)
   )
   a = (
      ffmpeg.input(src)
         .filter("atrim", start=start, end=end)
         .filter("asetpts", PTS)
   )

   concat = ffmpeg.concat(v, a, v=1, a=1)

   (
      ffmpeg
      .output(concat, dst)
      .overwrite_output()
      .run(capture_stdout=True, capture_stderr=True)
   )


def merge_all(src: list[str], dst: str):
   av = []

   for f in src:
      v = ffmpeg.input(f).video
      a = ffmpeg.input(f).audio
      av.append(v)
      av.append(a)

   (
      ffmpeg
      .concat(*av, v=1, a=1)
      .output(dst)
      .overwrite_output()
      .run(capture_stdout=True, capture_stderr=True)
   )


def track_faces(v: Video) -> list[FrameData]:
   import tensorflow as tf
   
   print("Num GPUs Available: ", len(tf.config.list_physical_devices('GPU')))
   
   cap = cv2.VideoCapture(v.src)

   face_data: list[FrameData] = []
   face_size = (224, 224)

   known_faces = []
   df = pd.DataFrame([], columns=["id", "embedding"])

   lf_faces = []

   frame_count = 0
   while (cap.isOpened()):
      frame_count += 1

      ret, frame = cap.read()
      if not ret:
         break

      # Only process every x frames.
      if frame_count % 10 != 0:
         continue

      current_faces = []

      try:
         faces = DeepFace.extract_faces(
            frame,
            face_size,
            config.FACE_DETECTION_METHOD
         )

         for f in faces:
            a = f["facial_area"]
            w, h = a['w'], a['h']
            x, y = a['x'], a['y']

            if f["confidence"] < 0.98:
               continue

            lf_region_face_id = None
            lf_region_face_dst = 1.0

            for f in lf_faces:
               dst = distance.findEuclideanDistance(
                  distance.l2_normalize([x, y]),
                  distance.l2_normalize(f[1])
               )

               if dst < lf_region_face_dst:
                  lf_region_face_id = f[0]
                  lf_region_face_dst = dst

            sim_confidence = 0.0
            
            try:
               face = frame[y:y+h, x:x+w]
               face = cv2.resize(face, face_size)

               face_id = f"face_{len(known_faces) + 1}"

               representation = DeepFace.represent(
                  face,
                  model_name=config.FACE_DETECTION_MODEL,
                  detector_backend=config.FACE_DETECTION_METHOD
               )
               embedding = representation[0]["embedding"]

               distances = []
               for _, row in df.iterrows():
                  source = row["embedding"]

                  dst = distance.findEuclideanDistance(
                     distance.l2_normalize(source),
                     distance.l2_normalize(embedding),
                  )

                  distances.append(dst)

               result_df = df.copy()
               result_df["distance"] = distances

               threshold = distance.findThreshold(config.FACE_DETECTION_MODEL, "euclidean_l2")

               # Only keep rows where distance doesn't exceed threshold.
               result_df = result_df[result_df["distance"] <= threshold]
               result_df = result_df.sort_values(by=["distance"], ascending=True).reset_index(drop=True)

               # Calculate confidence by how similar the next x distances are.
               sim_sd = result_df.head(5)["distance"].std()
               # For new faces, the deviation will be NaN, resulting in a confidence level of 0.
               if not pd.isna(sim_sd):
                  sim_confidence = 1 - sim_sd

               save_embedding = True

               # Found a similar face.
               if result_df.size > 0:
                  match = result_df.iloc[0]
                  face_id = match["id"]

                  if sim_confidence < 0.9:
                     if lf_region_face_dst < 0.05:
                        face_id = lf_region_face_id
                     else:
                        save_embedding = False
               # No match found. But previous frame had a face in the same area.
               elif lf_region_face_dst < 0.05:
                  # Treat both faces as being the same.
                  face_id = lf_region_face_id
               else:
                  known_faces.append(face_id)
                  print(f"New face detected: {face_id}")

               if save_embedding:
                  df = pd.concat([df, pd.DataFrame.from_records({
                     "id": face_id,
                     "embedding": [embedding]
                  })], ignore_index=True)
            except ValueError:
               continue

            current_faces.append([face_id, [x, y]])

            fd = FaceData(
               str(face_id),
               x, y,
               w, h
            )

            if face_data and face_data[-1].frame == frame_count:
               face_data[-1].faces.append(fd)
            else:
               face_data.append(FrameData(frame_count, frame_count / v.fps, [fd]))

            if config.IS_DEV:
               frame = cv2.rectangle(frame, (x, y), (x + w, y + h), (0, 0, 255), 2)
               frame = cv2.putText(
                  img = frame,
                  text = f"{face_id}_{round(sim_confidence, 3)}",
                  org = (x, y+h),
                  fontFace = cv2.FONT_HERSHEY_DUPLEX,
                  fontScale = 1,
                  color = (125, 246, 55),
                  thickness = 1
               )
      except ValueError:
         continue

      lf_faces = current_faces

      if config.IS_DEV and config.DEBUG:
         cv2.imshow('frame', frame)
         if cv2.waitKey(1) & 0xFF == ord('q'):
            break


   cap.release()
   cv2.destroyAllWindows()

   return face_data
