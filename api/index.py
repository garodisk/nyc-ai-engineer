"""Vercel demo entry point: a seeded, temporary database per function instance."""
import os
import sys
import tempfile
import threading
import base64
import hashlib
import hmac
import json
import time
from http.cookies import SimpleCookie
from types import SimpleNamespace

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import server
import seed

_lock = threading.Lock()
_state = None


def sign_demo_session(handle, secret, expires=None):
    claims = json.dumps({"handle": handle, "expires": expires if expires is not None else int(time.time()) + 30 * server.DAY},
                        separators=(",", ":")).encode()
    encoded = base64.urlsafe_b64encode(claims).decode().rstrip("=")
    signature = hmac.new(secret.encode(), ("aoh-demo-v1." + encoded).encode(), hashlib.sha256).hexdigest()
    return "demo1." + encoded + "." + signature


def verify_demo_session(token, secret):
    try:
        if len(token) > 600:
            return None
        version, encoded, signature = token.split(".")
        expected = hmac.new(secret.encode(), ("aoh-demo-v1." + encoded).encode(), hashlib.sha256).hexdigest()
        if version != "demo1" or not hmac.compare_digest(signature, expected):
            return None
        claims = json.loads(base64.urlsafe_b64decode(encoded + "=" * (-len(encoded) % 4)))
        if not isinstance(claims, dict) or not isinstance(claims.get("expires"), int) or claims["expires"] <= time.time():
            return None
        handle = claims.get("handle")
        return handle if isinstance(handle, str) and 2 <= len(handle) <= 24 else None
    except (ValueError, TypeError, UnicodeError):
        return None


def demo_state():
    global _state
    with _lock:
        if _state is None:
            # Never write into Vercel's read-only deployment directory.
            path = os.path.join(tempfile.mkdtemp(prefix="aoh-demo-"), "aoh.db")
            server.init_db(path)
            seed.seed(path)
            seed.seed_builders(path)
            seed.seed_hackathons(path)
            _state = SimpleNamespace(
                db_path=path, quiet=True, auto_approve=2, react_times={},
                agent_mode="simulated", agent_delay=0, demo_ritual=None,
                synchronous_jobs=True,
                room_instance=os.path.basename(os.path.dirname(path)),
            )
        return _state


class handler(server.Handler):
    def dispatch(self, method):
        for name, value in vars(demo_state()).items():
            setattr(self.server, name, value)
        return super().dispatch(method)

    def current_user(self, db):
        secret = os.environ.get("AOH_DEMO_SESSION_SECRET", "")
        jar = SimpleCookie(self.headers.get("Cookie") or "")
        token = jar[server.COOKIE].value if server.COOKIE in jar else ""
        if token.startswith("demo1."):
            handle = verify_demo_session(token, secret) if secret else None
            return db.execute("SELECT * FROM users WHERE handle=?", (handle,)).fetchone() if handle else None
        return super().current_user(db)

    def send_json(self, status, payload, cookie=None):
        secret = os.environ.get("AOH_DEMO_SESSION_SECRET", "")
        if cookie and secret:
            db = server.connect(self.server.db_path)
            try:
                user = db.execute("SELECT u.handle FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token=?", (cookie,)).fetchone()
                if user:
                    cookie = sign_demo_session(user["handle"], secret)
            finally:
                db.close()
        return super().send_json(status, payload, cookie)

    def send_header(self, keyword, value):
        if keyword.lower() == "set-cookie" and os.environ.get("VERCEL") == "1":
            value += "; Secure"
        return super().send_header(keyword, value)
