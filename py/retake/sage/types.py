from dataclasses import dataclass
from dataclasses_json import DataClassJsonMixin


@dataclass
class Video:
  src: str
  width: int
  height: int
  fps: int
  duration_ms: int

  
@dataclass
class Segment(DataClassJsonMixin):
  title: str
  duration: float
  timeranges: list[tuple[float, float]]


@dataclass
class FaceData(DataClassJsonMixin):
  id: str
  x: float
  y: float
  w: float
  h: float


@dataclass
class FrameData(DataClassJsonMixin):
  frame: int
  time: float
  faces: list[FaceData]
