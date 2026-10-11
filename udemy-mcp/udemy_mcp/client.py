import json
import re
from typing import Optional, List, Dict, Any
from urllib.parse import quote

from udemy_mcp.auth import load_cached_session
from udemy_mcp.models import (
    CourseSummary,
    LectureItem,
    ChapterSection,
    CourseCurriculum,
    AuthStatus
)


class UdemyClient:
    BASE_URL = "https://www.udemy.com/api-2.0"

    def __init__(self):
        self._session = None
        self._session_data = None

    def _get_curl_session(self):
        from curl_cffi import requests
        cached = load_cached_session()
        self._session_data = cached
        s = requests.Session(impersonate="chrome120")
        if cached:
            headers = {
                "Accept": "application/json, text/plain, */*",
                "Referer": "https://www.udemy.com/",
            }
            if cached.get("access_token"):
                headers["Authorization"] = f"Bearer {cached['access_token']}"
            if cached.get("client_id"):
                headers["X-Udemy-Client-Id"] = cached["client_id"]
            if cached.get("cookie_string"):
                headers["Cookie"] = cached["cookie_string"]
            if cached.get("user_agent"):
                headers["User-Agent"] = cached["user_agent"]
            s.headers.update(headers)
        return s

    def check_auth_status(self) -> AuthStatus:
        cached = load_cached_session()
        if not cached or not cached.get("access_token"):
            return AuthStatus(
                authenticated=False,
                reason="No cached session found in ~/.config/udemy-mcp/session.json. Call trigger_login to authenticate."
            )
        try:
            s = self._get_curl_session()
            resp = s.get(f"{self.BASE_URL}/users/me/?fields[user]=title,display_name,email", timeout=10)
            if resp.status_code == 200:
                data = resp.json()
                name = data.get("display_name") or data.get("title") or "Udemy User"
                return AuthStatus(
                    authenticated=True,
                    user=name,
                    saved_at=cached.get("saved_at")
                )
            elif resp.status_code in (401, 403):
                return AuthStatus(
                    authenticated=False,
                    reason=f"Session token expired or rejected (HTTP {resp.status_code}). Call trigger_login to re-authenticate.",
                    saved_at=cached.get("saved_at")
                )
            else:
                return AuthStatus(
                    authenticated=True,  # token exists, transient status
                    user="Udemy User",
                    saved_at=cached.get("saved_at")
                )
        except Exception as e:
            return AuthStatus(
                authenticated=False,
                reason=f"Connection error testing session: {str(e)}"
            )

    def search_courses(
        self,
        query: str,
        page_size: int = 5,
        sort: str = "relevance"
    ) -> List[CourseSummary]:
        s = self._get_curl_session()
        page_size = min(max(1, page_size), 20)

        sort_map = {
            "relevance": "relevance",
            "highest-rated": "-rating",
            "newest": "-release_date",
        }
        ordering = sort_map.get(sort, "relevance")

        url = (
            f"{self.BASE_URL}/courses/?"
            f"search={quote(query)}&"
            f"page_size={page_size}&"
            f"ordering={ordering}&"
            f"fields[course]=id,title,headline,url,visible_instructors,rating,num_subscribers,content_info,is_paid"
        )
        resp = s.get(url, timeout=15)
        if resp.status_code in (401, 403):
            raise PermissionError("Udemy session expired or unauthenticated. Call trigger_login to authenticate.")
        resp.raise_for_status()

        data = resp.json()
        results = []
        for item in data.get("results", []):
            instructors = [inst.get("display_name") for inst in item.get("visible_instructors", []) if inst.get("display_name")]
            primary_inst = instructors[0] if instructors else None
            course_url = item.get("url", "")
            if course_url and not course_url.startswith("http"):
                course_url = f"https://www.udemy.com{course_url}"

            results.append(CourseSummary(
                id=item["id"],
                title=item.get("title", ""),
                headline=item.get("headline"),
                url=course_url,
                primary_instructor=primary_inst,
                rating=item.get("rating"),
                num_subscribers=item.get("num_subscribers"),
                duration_text=item.get("content_info"),
                is_paid=item.get("is_paid")
            ))
        return results

    def list_enrolled_courses(self, page_size: int = 20) -> List[Dict[str, Any]]:
        s = self._get_curl_session()
        page_size = min(max(1, page_size), 50)
        url = (
            f"{self.BASE_URL}/users/me/subscribed-courses/?"
            f"page_size={page_size}&"
            f"fields[course]=id,title,headline,url,completion_ratio,last_accessed_time,image_480x270"
        )
        resp = s.get(url, timeout=15)
        if resp.status_code in (401, 403):
            raise PermissionError("Udemy session expired or unauthenticated. Call trigger_login to authenticate.")
        resp.raise_for_status()

        data = resp.json()
        courses = []
        for item in data.get("results", []):
            course_url = item.get("url", "")
            if course_url and not course_url.startswith("http"):
                course_url = f"https://www.udemy.com{course_url}"
            courses.append({
                "id": item["id"],
                "title": item.get("title", ""),
                "headline": item.get("headline", ""),
                "completion_ratio": item.get("completion_ratio", 0),
                "last_accessed_time": item.get("last_accessed_time"),
                "url": course_url
            })
        return courses

    def get_course_curriculum(
        self,
        course_id: int,
        include_descriptions: bool = True
    ) -> CourseCurriculum:
        s = self._get_curl_session()
        page_url = (
            f"{self.BASE_URL}/courses/{course_id}/subscriber-curriculum-items/?"
            f"page_size=100&"
            f"fields[lecture]=id,title,description,asset,object_index,content_summary,is_free,item_type&"
            f"fields[chapter]=id,title,object_index"
        )

        all_items = []
        max_pages = 5
        curr_page = 0

        while page_url and curr_page < max_pages:
            curr_page += 1
            resp = s.get(page_url, timeout=15)
            if resp.status_code in (401, 403):
                # Fallback to public curriculum endpoint if subscriber endpoint is restricted
                fallback_url = (
                    f"{self.BASE_URL}/courses/{course_id}/public-curriculum-items/?"
                    f"page_size=100&fields[lecture]=id,title,description,content_summary,object_index&"
                    f"fields[chapter]=id,title,object_index"
                )
                fb_resp = s.get(fallback_url, timeout=15)
                if fb_resp.status_code == 200:
                    data = fb_resp.json()
                    all_items.extend(data.get("results", []))
                    break
                else:
                    raise PermissionError("Udemy session expired or unauthenticated. Call trigger_login to authenticate.")

            resp.raise_for_status()
            data = resp.json()
            all_items.extend(data.get("results", []))
            page_url = data.get("next")

        sections: List[ChapterSection] = []
        current_section = ChapterSection(id=0, title="Introduction", index=0, lectures=[])
        sections.append(current_section)

        total_lectures = 0

        for item in all_items:
            item_class = item.get("_class", "")
            if item_class == "chapter":
                current_section = ChapterSection(
                    id=item.get("id", 0),
                    title=item.get("title", ""),
                    index=item.get("object_index", len(sections)),
                    lectures=[]
                )
                sections.append(current_section)
            elif item_class in ("lecture", "quiz", "practice"):
                total_lectures += 1
                desc = item.get("description") if include_descriptions else None
                # Strip excessive html tags from description if present
                if desc:
                    desc = re.sub(r"<[^>]+>", " ", desc).strip()
                    desc = " ".join(desc.split())

                dur_text = item.get("content_summary")
                lecture_item = LectureItem(
                    id=item.get("id", 0),
                    title=item.get("title", ""),
                    object_index=item.get("object_index", 0),
                    item_type=item_class,
                    duration_text=dur_text,
                    description=desc,
                    is_free_preview=bool(item.get("is_free"))
                )
                current_section.lectures.append(lecture_item)

        # Remove default section if empty
        non_empty_sections = [sec for sec in sections if sec.lectures or sec.title != "Introduction"]

        return CourseCurriculum(
            course_id=course_id,
            total_sections=len(non_empty_sections),
            total_lectures=total_lectures,
            sections=non_empty_sections
        )

    def search_course_lectures(self, course_id: int, keyword: str) -> List[Dict[str, Any]]:
        curriculum = self.get_course_curriculum(course_id, include_descriptions=True)
        kw = keyword.lower().strip()
        matched = []

        for sec in curriculum.sections:
            for lec in sec.lectures:
                title_match = kw in lec.title.lower()
                desc_match = kw in (lec.description or "").lower()
                if title_match or desc_match:
                    matched.append({
                        "course_id": course_id,
                        "section_title": sec.title,
                        "lecture_id": lec.id,
                        "lecture_title": lec.title,
                        "duration": lec.duration_text,
                        "snippet": (lec.description[:200] + "...") if lec.description and len(lec.description) > 200 else lec.description,
                        "url": f"https://www.udemy.com/course/{course_id}/learn/lecture/{lec.id}"
                    })
        return matched

    def get_lecture_details(self, course_id: int, lecture_id: int) -> Dict[str, Any]:
        s = self._get_curl_session()
        url = (
            f"{self.BASE_URL}/users/me/subscribed-courses/{course_id}/lectures/{lecture_id}/?"
            f"fields[lecture]=id,title,description,asset,supplementary_assets"
        )
        resp = s.get(url, timeout=15)
        if resp.status_code in (401, 403):
            raise PermissionError("Udemy session expired or unauthenticated. Call trigger_login to authenticate.")
        resp.raise_for_status()

        data = resp.json()
        desc = data.get("description", "")
        if desc:
            desc = re.sub(r"<[^>]+>", " ", desc).strip()

        asset = data.get("asset") or {}
        supp_assets = data.get("supplementary_assets") or []

        return {
            "id": data.get("id"),
            "title": data.get("title"),
            "description": desc,
            "asset_type": asset.get("asset_type"),
            "time_estimation": asset.get("time_estimation"),
            "supplementary_resources_count": len(supp_assets),
            "supplementary_resources": [
                {"id": res.get("id"), "title": res.get("title"), "filename": res.get("filename")}
                for res in supp_assets
            ]
        }

    def get_lecture_transcript(self, course_id: int, lecture_id: int) -> Dict[str, Any]:
        s = self._get_curl_session()
        url = (
            f"{self.BASE_URL}/users/me/subscribed-courses/{course_id}/lectures/{lecture_id}/?"
            f"fields[lecture]=id,title,asset&fields[asset]=captions"
        )
        resp = s.get(url, timeout=15)
        if resp.status_code in (401, 403):
            raise PermissionError("Udemy session expired or unauthenticated. Call trigger_login to authenticate.")
        resp.raise_for_status()

        data = resp.json()
        asset = data.get("asset") or {}
        captions = asset.get("captions") or []

        if not captions:
            return {
                "course_id": course_id,
                "lecture_id": lecture_id,
                "transcript": None,
                "message": "No captions/transcripts found for this lecture."
            }

        en_caption = next((c for c in captions if c.get("locale_id", "").startswith("en")), captions[0])
        caption_url = en_caption.get("url")

        if not caption_url:
            return {
                "course_id": course_id,
                "lecture_id": lecture_id,
                "transcript": None,
                "message": "Caption track URL unavailable."
            }

        cap_resp = s.get(caption_url, timeout=15)
        raw_vtt = cap_resp.text

        # Strip VTT timestamps and header
        lines = []
        for line in raw_vtt.splitlines():
            line = line.strip()
            if not line or line.startswith("WEBVTT") or "-->" in line or line.isdigit():
                continue
            lines.append(line)

        clean_text = " ".join(lines)
        return {
            "course_id": course_id,
            "lecture_id": lecture_id,
            "language": en_caption.get("locale_id", "en"),
            "transcript": clean_text[:4000] if len(clean_text) > 4000 else clean_text
        }
