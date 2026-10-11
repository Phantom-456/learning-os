# Udemy MCP Server

A Model Context Protocol (MCP) server that gives local AI agents (Gemini in Antigravity, Claude Code, Cursor) programmatic access to search your Udemy subscription catalog, inspect granular course syllabi down to the lecture level, and extract transcripts.

## Features
- **Catalog Search**: Query courses by topic with rating, instructor, and duration filters.
- **Granular Curriculum**: Pull section-by-section breakdown of courses with lecture IDs and descriptions.
- **In-Course Lecture Search**: Search inside a specific course for exact lectures addressing a skill gap.
- **Interactive Auth Trigger**: Agents can invoke `trigger_login()` to open a Chromium window on your screen. Once you sign in, session tokens are auto-cached to `~/.config/udemy-mcp/session.json`.

## Tools Exposed
1. `trigger_login(timeout_seconds)` — Opens a headed browser window for login; auto-captures and caches session.
2. `check_auth_status()` — Tests whether the cached session is valid.
3. `search_courses(query, page_size, sort)` — Searches Udemy catalog and Personal Plan courses.
4. `list_enrolled_courses(page_size)` — Lists enrolled courses in your account.
5. `get_course_curriculum(course_id, include_descriptions)` — Retrieves full course syllabus and lectures.
6. `search_course_lectures(course_id, keyword)` — Pinpoints lectures matching a specific keyword within a course.
7. `get_lecture_details(course_id, lecture_id)` — Fetches detailed lecture description and resource attachments.
8. `get_lecture_transcript(course_id, lecture_id)` — Extracts subtitles / transcript text for a video lecture.

## Running / Setup
```bash
# Install dependencies
pip install -e .

# Or run with uv
uv run python -m udemy_mcp.server
```
