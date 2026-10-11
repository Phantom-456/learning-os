import json
import traceback
from typing import Optional
from mcp.server.fastmcp import FastMCP

from udemy_mcp.client import UdemyClient
from udemy_mcp.auth import run_interactive_login

mcp = FastMCP(
    "udemy-mcp",
    instructions="Session-authenticated MCP server exposing Udemy Personal Plan & enrolled courses/curricula to local AI agents"
)

client = UdemyClient()


def _format_error(e: Exception) -> str:
    if isinstance(e, PermissionError):
        return (
            "ERROR: Udemy session expired or unauthenticated. "
            "Please call the 'trigger_login()' tool to open a Chromium browser window and sign in."
        )
    return f"ERROR: {type(e).__name__}: {str(e)}"


@mcp.tool()
def trigger_login(timeout_seconds: int = 120) -> str:
    """
    Spawns a headed Chromium browser window for the user to sign in to Udemy.
    Monitors for authenticated session cookies, auto-saves them to ~/.config/udemy-mcp/session.json,
    and closes the browser automatically upon successful login.
    """
    try:
        res = run_interactive_login(timeout_seconds=timeout_seconds)
        return json.dumps(res, indent=2)
    except Exception as e:
        return _format_error(e)


@mcp.tool()
def check_auth_status() -> str:
    """
    Verifies whether a cached session exists and tests if the credentials are valid with Udemy's API.
    Returns authenticated status and user details, or guidance if re-login is required.
    """
    try:
        status = client.check_auth_status()
        return json.dumps(status.model_dump(), indent=2)
    except Exception as e:
        return _format_error(e)


@mcp.tool()
def search_courses(query: str, page_size: int = 5, sort: str = "relevance") -> str:
    """
    Searches Udemy's catalog and subscription library for courses matching keywords.
    Args:
        query: Search keywords (e.g. 'differential drive kinematics', 'ROS 2 navigation').
        page_size: Number of courses to return (1 to 20, default 5).
        sort: Sort ordering ('relevance', 'highest-rated', 'newest').
    Returns JSON list of courses with ID, title, headline, instructor, rating, duration, and URL.
    """
    try:
        courses = client.search_courses(query=query, page_size=page_size, sort=sort)
        return json.dumps([c.model_dump() for c in courses], indent=2)
    except Exception as e:
        return _format_error(e)


@mcp.tool()
def list_enrolled_courses(page_size: int = 20) -> str:
    """
    Lists courses currently enrolled in the user's active Udemy account dashboard.
    Args:
        page_size: Number of courses to return (1 to 50, default 20).
    Returns list of enrolled courses with completion percentages and last accessed times.
    """
    try:
        courses = client.list_enrolled_courses(page_size=page_size)
        return json.dumps(courses, indent=2)
    except Exception as e:
        return _format_error(e)


@mcp.tool()
def get_course_curriculum(course_id: int, include_descriptions: bool = True) -> str:
    """
    Fetches the granular curriculum structure for a course.
    Returns chapters, sections, and individual lectures with lecture IDs, titles, video durations, and descriptions.
    Args:
        course_id: The numeric Udemy course ID.
        include_descriptions: Whether to include lecture summaries (default True).
    """
    try:
        curriculum = client.get_course_curriculum(course_id=course_id, include_descriptions=include_descriptions)
        return json.dumps(curriculum.model_dump(), indent=2)
    except Exception as e:
        return _format_error(e)


@mcp.tool()
def search_course_lectures(course_id: int, keyword: str) -> str:
    """
    Searches and filters lectures inside a specific course by keyword in title or description.
    Prevents overflowing model context by returning only the exact relevant lectures.
    Args:
        course_id: The numeric Udemy course ID.
        keyword: The topic or concept keyword to find (e.g. 'quaternion', 'PID tuning', 'URDF').
    """
    try:
        matches = client.search_course_lectures(course_id=course_id, keyword=keyword)
        return json.dumps(matches, indent=2)
    except Exception as e:
        return _format_error(e)


@mcp.tool()
def get_lecture_details(course_id: int, lecture_id: int) -> str:
    """
    Retrieves full details for a specific lecture, including description, asset type, and supplementary resource links.
    Args:
        course_id: The numeric Udemy course ID.
        lecture_id: The numeric lecture ID.
    """
    try:
        details = client.get_lecture_details(course_id=course_id, lecture_id=lecture_id)
        return json.dumps(details, indent=2)
    except Exception as e:
        return _format_error(e)


@mcp.tool()
def get_lecture_transcript(course_id: int, lecture_id: int) -> str:
    """
    Extracts the text transcript / captions for a video lecture when available.
    Args:
        course_id: The numeric Udemy course ID.
        lecture_id: The numeric lecture ID.
    """
    try:
        transcript = client.get_lecture_transcript(course_id=course_id, lecture_id=lecture_id)
        return json.dumps(transcript, indent=2)
    except Exception as e:
        return _format_error(e)


def main():
    mcp.run()


if __name__ == "__main__":
    main()
