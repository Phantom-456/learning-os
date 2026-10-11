import json
import os
import time
from datetime import datetime
from pathlib import Path
from typing import Optional, Dict, Any

SESSION_DIR = Path.home() / ".config" / "udemy-mcp"
SESSION_FILE = SESSION_DIR / "session.json"


def get_session_cache_path() -> Path:
    SESSION_DIR.mkdir(parents=True, exist_ok=True)
    return SESSION_FILE


def load_cached_session() -> Optional[Dict[str, Any]]:
    path = get_session_cache_path()
    if not path.exists():
        return None
    try:
        with open(path, "r", encoding="utf-8") as f:
            data = json.load(f)
            if data.get("access_token") or data.get("cookie_string"):
                return data
    except Exception:
        return None
    return None


def save_session_data(data: Dict[str, Any]) -> None:
    path = get_session_cache_path()
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2)
    try:
        os.chmod(path, 0o600)
    except Exception:
        pass


def run_interactive_login(timeout_seconds: int = 120) -> Dict[str, Any]:
    """
    Launches a headed Chromium browser window using Playwright.
    Allows user to sign in to Udemy interactively (SSO / email+password).
    Detects authenticated cookies, saves them to ~/.config/udemy-mcp/session.json,
    and cleanly closes the browser window.
    """
    try:
        from playwright.sync_api import sync_playwright
    except ImportError:
        return {
            "status": "failed",
            "message": "Playwright is not installed. Run 'pip install playwright && playwright install chromium'."
        }

    print(f"Launching Chromium login window (timeout: {timeout_seconds}s)...")
    start_time = time.time()

    with sync_playwright() as p:
        # Launch headed browser so user can type/click login
        browser = p.chromium.launch(
            headless=False,
            args=["--disable-blink-features=AutomationControlled"]
        )
        context = browser.new_context(
            user_agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36"
        )
        page = context.new_page()

        try:
            page.goto("https://www.udemy.com/join/login-popup/", wait_until="domcontentloaded")
        except Exception:
            try:
                page.goto("https://www.udemy.com/", wait_until="domcontentloaded")
            except Exception as e:
                browser.close()
                return {"status": "failed", "message": f"Failed to load Udemy page: {str(e)}"}

        captured_session = None

        while time.time() - start_time < timeout_seconds:
            cookies = context.cookies()
            cookie_dict = {c["name"]: c["value"] for c in cookies if "udemy.com" in c.get("domain", "")}

            access_token = cookie_dict.get("access_token")
            client_id = cookie_dict.get("client_id")
            
            # If access_token cookie is directly present
            if access_token:
                cookie_str = "; ".join(f"{name}={val}" for name, val in cookie_dict.items())
                user_agent = page.evaluate("() => navigator.userAgent")
                captured_session = {
                    "access_token": access_token,
                    "client_id": client_id or "",
                    "cookies": cookie_dict,
                    "cookie_string": cookie_str,
                    "user_agent": user_agent,
                    "saved_at": datetime.now().isoformat()
                }
                break

            # Check if user is logged in by inspecting local storage or user profile element
            try:
                token_from_storage = page.evaluate("() => window.localStorage.getItem('access_token') || ''")
                if token_from_storage:
                    cookie_str = "; ".join(f"{name}={val}" for name, val in cookie_dict.items())
                    user_agent = page.evaluate("() => navigator.userAgent")
                    captured_session = {
                        "access_token": token_from_storage,
                        "client_id": client_id or "",
                        "cookies": cookie_dict,
                        "cookie_string": cookie_str,
                        "user_agent": user_agent,
                        "saved_at": datetime.now().isoformat()
                    }
                    break
            except Exception:
                pass

            time.sleep(1.5)

        browser.close()

        if captured_session:
            save_session_data(captured_session)
            return {
                "status": "authenticated",
                "message": "Udemy session successfully captured and saved to ~/.config/udemy-mcp/session.json.",
                "details": {
                    "saved_at": captured_session["saved_at"],
                    "has_access_token": bool(captured_session["access_token"]),
                    "has_client_id": bool(captured_session["client_id"]),
                }
            }
        else:
            return {
                "status": "timeout",
                "message": f"Login timed out after {timeout_seconds} seconds without detecting authenticated session."
            }


def main():
    import sys
    timeout = 180
    if len(sys.argv) > 1 and sys.argv[1].isdigit():
        timeout = int(sys.argv[1])
    res = run_interactive_login(timeout_seconds=timeout)
    print(json.dumps(res, indent=2))


if __name__ == "__main__":
    main()
