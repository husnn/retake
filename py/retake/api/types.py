from dataclasses import dataclass
from datetime import datetime
from enum import Enum
from typing import Generic, Optional, TypeVar, TypedDict

from retake.sage.types import Segment, FrameData

T = TypeVar('T')


@dataclass
class Job(Generic[T]):
    id: str
    result: Optional[T]
    completed: bool
    created_at: Optional[datetime]


class SourceType(Enum):
    LOCAL = "LOCAL"
    S3 = "S3"


@dataclass
class Source:
    type: SourceType
    uri: str


class SingleAlignedSegment(TypedDict):
    start: float
    end: float
    text: str
    words: list[dict]


@dataclass
class Clip(Segment):
    id: int
    file: Source
    preview_file: Source
    frame_data: list[FrameData]
    speech_data: list[SingleAlignedSegment]


class FailureReason(Enum):
    TOO_LONG = "TOO_LONG"


@dataclass
class VideoResult:
    id: str
    original_file: Source
    clips: list[Clip]
    length_minutes: int
    failure_reason: Optional[FailureReason]
