"""Vercel demo entry point: a seeded, temporary database per function instance."""
import os
import sys
import tempfile
import threading
from types import SimpleNamespace

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import server
import seed

_lock = threading.Lock()
_state = None


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
            )
        return _state


class handler(server.Handler):
    def dispatch(self, method):
        for name, value in vars(demo_state()).items():
            setattr(self.server, name, value)
        return super().dispatch(method)
