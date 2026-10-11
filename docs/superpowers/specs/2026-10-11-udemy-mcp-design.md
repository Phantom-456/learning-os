# Design Spec: Udemy MCP Server & APC Integration

**Date**: 2026-10-11  
**Project**: Udemy MCP (`/Users/avishi/Workspace/learning-os/udemy-mcp`)  
**Status**: Approved (Brainstorming Phase Complete)

---

## 1. Overview & Problem Statement

Users with Udemy Personal Plan subscriptions have access to an enormous, fluid catalog of thousands of courses and tens of thousands of individual video lectures. Manually curating a static text list or catalog down to the lecture level is impossible. 

To give local AI agents (Gemini in Antigravity, Claude Code, Cursor, subagents) programmatic, real-time access to pinpoint specific lectures across both enrolled materials and the broader subscription catalog, we are building a dedicated local **Model Context Protocol (MCP)** server: **`udemy-mcp`**.

### Core Value
- Agents can search Udemy's catalog, inspect course syllabi down to individual lecture descriptions, fetch transcripts, and pinpoint exact video IDs/links matching a student's learning or coding gap.
- Authentication is fully automated: when unauthenticated or when the session expires, the agent triggers an interactive Chromium login popup via Playwright. The user simply signs in, the session is cached locally, and the agent automatically proceeds.
- The server is registered globally on the machine and tracked as an independent project in **MTM APC (Active Project Control)** with an advisory rule added to the Workspace Rulebook.

---

## 2. System Architecture & Components

```
┌─────────────────────────────────────────────────────────────┐
│                       AI Agent Layer                        │
│   (Antigravity / Gemini, Claude Code, Cursor, Learning OS)  │
└──────────────────────────────┬──────────────────────────────┘
                               │ MCP Protocol (stdio)
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                 Udemy MCP Server (FastMCP)                  │
│               /learning-os/udemy-mcp/server.py               │
│                                                             │
│  [Tools]                                                    │
│  - trigger_login()         - get_course_curriculum()        │
│  - check_auth_status()     - search_course_lectures()       │
│  - search_courses()        - get_lecture_details()          │
│  - list_enrolled_courses() - get_lecture_transcript()       │
└──────────────┬──────────────────────────────┬───────────────┘
               │                              │
               ▼                              ▼
┌──────────────────────────────┐ ┌────────────────────────────┐
│      Auth Manager (Playwright)│ │  API Client (curl_cffi)    │
│  - Headed browser popup      │ │  - Chrome TLS fingerprint  │
│  - Captures cookies/token    │ │  - Bearer + Cookie auth    │
│  - Writes session cache      │ │  - api-2.0 endpoints       │
└──────────────┬───────────────┘ └─────────────┬──────────────┘
               │                               │
               ▼                               ▼
       ~/.config/udemy-mcp/                 Udemy Web
          session.json                     (udemy.com)
```

### Directory Structure
```
/Users/avishi/Workspace/learning-os/udemy-mcp/
├── pyproject.toml              # Dependencies: mcp, curl_cffi, playwright, pydantic
├── README.md                   # Installation, manual usage, and tool descriptions
├── udemy_mcp/
│   ├── __init__.py
│   ├── server.py               # FastMCP server definition & tool handlers
│   ├── client.py               # Udemy API client with curl_cffi & session loading
│   ├── auth.py                 # Playwright login trigger & cookie extractor
│   └── models.py               # Pydantic schemas for courses, lectures, curricula
└── tests/
    └── test_client.py          # Unit & mock API tests
```

---

## 3. Authentication & Session Lifecycle

### Session Store
Session data is persisted to `~/.config/udemy-mcp/session.json` with permissions `0600`:
```json
{
  "access_token": "...",
  "client_id": "...",
  "cookies": {
    "access_token": "...",
    "client_id": "...",
    "csrf_token": "..."
  },
  "cookie_string": "access_token=...; client_id=...",
  "user_agent": "Mozilla/5.0 ... Chrome/120.0.0.0 Safari/537.36",
  "saved_at": "2026-10-11T13:30:00"
}
```

### Agent-Triggered Login Flow (`trigger_login`)
1. An agent detects missing/expired credentials via `check_auth_status()` or receives a `401 Unauthorized` response.
2. The agent invokes the `trigger_login(timeout_seconds=120)` tool.
3. Playwright launches a headed Chromium instance navigating to `https://www.udemy.com/join/login-popup/`.
4. The user logs in via SSO (Google/Apple) or email/password.
5. The background loop detects the presence of authenticated cookies (`access_token` and `client_id`).
6. The session is written to `~/.config/udemy-mcp/session.json`, the browser window automatically closes, and the tool returns:
   ```json
   {
     "status": "authenticated",
     "message": "Udemy session successfully captured and cached. You may now execute course queries."
   }
   ```
7. The calling agent continues executing its original goal without requiring manual terminal interaction from the user.

---

## 4. MCP Tool Specifications

### 1. `trigger_login(timeout_seconds: int = 120)`
* **Description**: Launches a headed browser window for the user to sign in to Udemy. Captures cookies and caches the session.
* **Returns**: JSON object with `status` (`authenticated` or `timeout`/`failed`) and guidance message.

### 2. `check_auth_status()`
* **Description**: Checks whether a cached session exists and performs a lightweight test call to verify token validity.
* **Returns**: `{"authenticated": true, "user": "..."}` or `{"authenticated": false, "reason": "..."}`.

### 3. `search_courses(query: str, page_size: int = 5, sort: str = "relevance")`
* **Description**: Searches Udemy's catalog and subscription library.
* **Parameters**:
  * `query`: Search keywords (e.g. "differential drive kinematics", "ROS 2 navigation").
  * `page_size`: Number of results (default 5, max 20).
  * `sort`: `relevance`, `highest-rated`, or `newest`.
* **Returns**: List of courses with ID, title, headline, instructor, rating, total duration, and URL.

### 4. `list_enrolled_courses(page_size: int = 20)`
* **Description**: Lists courses currently enrolled in the user's account dashboard.
* **Returns**: List of enrolled courses with completion percentages and last accessed dates.

### 5. `get_course_curriculum(course_id: int, include_descriptions: bool = True)`
* **Description**: Fetches the structured curriculum for a given course (`subscriber-curriculum-items` endpoint).
* **Returns**: Chapter sections and lectures with lecture ID, title, duration, and summary.

### 6. `search_course_lectures(course_id: int, keyword: str)`
* **Description**: Filters/searches inside a single course's curriculum to return only lectures matching the specific keyword. Prevents flooding the agent's context window.
* **Returns**: Matching lectures with index, chapter title, lecture title, duration, and direct link.

### 7. `get_lecture_details(course_id: int, lecture_id: int)`
* **Description**: Retrieves full metadata for a specific lecture, including complete description, article markdown text (for reading lectures), and downloadable resource attachments.

### 8. `get_lecture_transcript(course_id: int, lecture_id: int)`
* **Description**: Fetches VTT subtitle / transcript text for a video lecture when available.

---

## 5. API Client Implementation Details

- **TLS Fingerprinting**: Standard `requests` or `urllib` calls fail on Udemy due to Cloudflare bot protection. The client uses `curl_cffi.requests.Session(impersonate="chrome120")` to match real browser TLS fingerprints.
- **Headers**:
  ```http
  Authorization: Bearer <access_token>
  Cookie: <cookie_string>
  User-Agent: <cached_user_agent>
  X-Udemy-Client-Id: <client_id>
  Accept: application/json, text/plain, */*
  Referer: https://www.udemy.com/
  ```
- **Error Handling**:
  - `401 / 403`: Intercepted and returned as: `{"error": "unauthorized", "message": "Session expired. Call trigger_login to refresh."}`.
  - `429`: Automatic exponential backoff (1s, 2s, 4s) up to 3 attempts.

---

## 6. Integration: APC, Global MCP Config, and Rulebook

### A. MTM APC Project Registration
- **Project Name**: `Udemy MCP`
- **Location**: `/Users/avishi/Workspace/learning-os/udemy-mcp`
- **Stage**: `develop`
- **Description**: Session-authenticated MCP server exposing Udemy Personal Plan & enrolled courses/curricula to local AI agents.
- **Creation Mechanism**: Created via MFMA REST API `POST /api/apc/projects/create` using the authenticated agent token.

### B. Global MCP Availability
Configured in:
1. `~/.claude.json`:
   ```json
   "udemy-mcp": {
     "command": "uv",
     "args": [
       "run",
       "--directory",
       "/Users/avishi/Workspace/learning-os/udemy-mcp",
       "python",
       "-m",
       "udemy_mcp.server"
     ]
   }
   ```
2. Antigravity MCP directory (`~/.gemini/antigravity/mcp/udemy-mcp/` or IDE settings) so all local agents have native access.

### C. Workspace Rulebook Signpost
Added as an advisory notice in the workspace rulebook (e.g. in `RB-007` or `RB-008`):
> **Advisory:** Whenever an agent requires external course syllabi, video lecture recommendations, or structured tutorials, the agent can query the local `udemy-mcp` server (`search_courses`, `get_course_curriculum`, etc.). If unauthenticated, the agent can call `trigger_login()` to prompt the user to sign in via a Chromium window.

---

## 7. Verification & Testing Plan

1. **Unit & Mock Tests**:
   - Verify `curl_cffi` client handles mocked Udemy JSON responses.
   - Verify curriculum hierarchy parser correctly organizes sections and lectures.
   - Verify error interceptors properly flag `401 Unauthorized` without server crashes.
2. **Auth Integration Test**:
   - Invoke `trigger_login` tool in a test runner to ensure Playwright window launches and captures test cookie jar.
3. **Live API Test**:
   - Test `search_courses("robotics kinematics")` against real Udemy API.
   - Test `get_course_curriculum(course_id)` to verify lecture breakdown and summaries.
4. **APC & Rulebook Verification**:
   - Verify `list_projects` on `mfma-apc` displays `Udemy MCP`.
   - Verify Rulebook reflects the signpost rule.
