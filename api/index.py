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


def sign_demo_session(handle, secret, expires=None, teams=None, left=None):
    claims = json.dumps({"handle": handle, "teams": teams or [], "left": left or [], "expires": expires if expires is not None else int(time.time()) + 30 * server.DAY},
                        separators=(",", ":")).encode()
    encoded = base64.urlsafe_b64encode(claims).decode().rstrip("=")
    signature = hmac.new(secret.encode(), ("aoh-demo-v1." + encoded).encode(), hashlib.sha256).hexdigest()
    return "demo1." + encoded + "." + signature


def verify_demo_session(token, secret):
    try:
        if len(token) > 2000:
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
            db = server.connect(path)
            seeded_team_ids = {r["id"] for r in db.execute("SELECT id FROM teams")}
            seeded_memberships = {}
            for r in db.execute("SELECT u.handle, m.team_id FROM members m JOIN users u ON u.id=m.user_id"):
                seeded_memberships.setdefault(r["handle"], set()).add(r["team_id"])
            db.close()
            _state = SimpleNamespace(
                db_path=path, quiet=True, auto_approve=2, react_times={},
                agent_mode="simulated", agent_delay=0, demo_ritual=None,
                synchronous_jobs=True,
                room_instance=os.path.basename(os.path.dirname(path)),
                seeded_team_ids=seeded_team_ids,
                seeded_memberships=seeded_memberships,
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
            user = db.execute("SELECT * FROM users WHERE handle=?", (handle,)).fetchone() if handle else None
            if user:
                encoded = token.split(".")[1]
                claims = json.loads(base64.urlsafe_b64decode(encoded + "=" * (-len(encoded) % 4)))
                left = claims.get("left", [])
                if isinstance(left, list) and len(left) <= 100:
                    for tid in left:
                        if type(tid) is int and tid in self.server.seeded_memberships.get(handle, set()):
                            try:
                                server.leave_team(server.Ctx(db, user, {}, {}, self.server), str(tid))
                            except server.ApiError:
                                pass
                teams = claims.get("teams", [])
                if isinstance(teams, list) and len(teams) <= 100:
                    for tid in teams:
                        if type(tid) is not int or tid not in self.server.seeded_team_ids:
                            continue
                        if db.execute("SELECT 1 FROM members WHERE team_id=? AND user_id=?", (tid, user["id"])).fetchone():
                            continue
                        try:
                            server.check_can_join(db, server.get_team(db, tid), user["id"])
                            db.execute("INSERT INTO members(team_id,user_id,joined_at) VALUES(?,?,?)", (tid, user["id"], server.now()))
                        except server.ApiError:
                            pass
                db.commit()
            return user
        return super().current_user(db)

    def send_json(self, status, payload, cookie=None):
        secret = os.environ.get("AOH_DEMO_SESSION_SECRET", "")
        membership_change = self.command == "POST" and ((self.path.startswith("/api/teams/") and self.path.split('?')[0].endswith(("/join", "/leave"))) or self.path.startswith("/api/requests/")) and 200 <= status < 300
        if secret and (cookie or membership_change):
            db = server.connect(self.server.db_path)
            try:
                user = db.execute("SELECT u.id, u.handle FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token=?", (cookie,)).fetchone() if cookie else None
                if not user and membership_change:
                    jar = SimpleCookie(self.headers.get("Cookie") or "")
                    token = jar[server.COOKIE].value if server.COOKIE in jar else ""
                    handle = verify_demo_session(token, secret)
                    user = db.execute("SELECT id, handle FROM users WHERE handle=?", (handle,)).fetchone() if handle else None
                if user:
                    teams = [r["team_id"] for r in db.execute("SELECT team_id FROM members WHERE user_id=?", (user["id"],)) if r["team_id"] in self.server.seeded_team_ids]
                    left = sorted(self.server.seeded_memberships.get(user["handle"], set()) - set(teams))
                    cookie = sign_demo_session(user["handle"], secret, teams=teams, left=left)
            finally:
                db.close()
        return super().send_json(status, payload, cookie)

    def send_header(self, keyword, value):
        if keyword.lower() == "set-cookie" and os.environ.get("VERCEL") == "1":
            value += "; Secure"
        return super().send_header(keyword, value)
