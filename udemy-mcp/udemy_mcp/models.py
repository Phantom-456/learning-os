from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field


class CourseSummary(BaseModel):
    id: int
    title: str
    headline: Optional[str] = None
    url: str
    primary_instructor: Optional[str] = None
    rating: Optional[float] = None
    num_subscribers: Optional[int] = None
    duration_text: Optional[str] = None
    is_paid: Optional[bool] = None


class LectureItem(BaseModel):
    id: int
    title: str
    object_index: int
    item_type: str = "lecture"  # lecture, quiz, practice, etc.
    duration_seconds: Optional[int] = None
    duration_text: Optional[str] = None
    description: Optional[str] = None
    url: Optional[str] = None
    is_free_preview: bool = False


class ChapterSection(BaseModel):
    id: int
    title: str
    index: int
    lectures: List[LectureItem] = Field(default_factory=list)


class CourseCurriculum(BaseModel):
    course_id: int
    title: Optional[str] = None
    total_sections: int = 0
    total_lectures: int = 0
    sections: List[ChapterSection] = Field(default_factory=list)


class AuthStatus(BaseModel):
    authenticated: bool
    user: Optional[str] = None
    saved_at: Optional[str] = None
    reason: Optional[str] = None


class LoginTriggerResult(BaseModel):
    status: str  # "authenticated", "timeout", "failed", "window_open"
    message: str
    details: Optional[Dict[str, Any]] = None
