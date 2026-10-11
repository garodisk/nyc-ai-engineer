"""Exercise the actual Vercel handler over HTTP, including a session cookie."""
import json
import threading
import unittest
from unittest.mock import patch
import time
from http.cookiejar import CookieJar
from http.server import ThreadingHTTPServer
from urllib.request import Request, build_opener, HTTPCookieProcessor

from api.index import handler, demo_state, sign_demo_session, verify_demo_session
import api.index as adapter


class VercelDemoTest(unittest.TestCase):
    def test_signed_session_survives_a_new_instance_and_logout(self):
        original_state = adapter._state
        httpd = ThreadingHTTPServer(("127.0.0.1", 0), handler)
        thread = threading.Thread(target=httpd.serve_forever, daemon=True)
        thread.start()
        jar = CookieJar()
        client = build_opener(HTTPCookieProcessor(jar))
        root = "http://127.0.0.1:%s" % httpd.server_port
        try:
            with patch.dict("os.environ", {"AOH_DEMO_SESSION_SECRET": "test-signing-secret", "VERCEL": "0"}):
                request = Request(root + "/api/login", data=b'{"handle":"ada"}', headers={"Content-Type": "application/json"})
                with client.open(request) as response:
                    self.assertIn("demo1.", response.headers["Set-Cookie"])
                    self.assertIn("HttpOnly", response.headers["Set-Cookie"])
                old_path = demo_state().db_path
                adapter._state = None  # model a cold start with a completely independent database
                with client.open(root + "/api/me") as response:
                    self.assertEqual(json.load(response)["user"]["handle"], "ada")
                self.assertNotEqual(demo_state().db_path, old_path)
                with client.open(root + "/api/notifications") as response:
                    self.assertEqual(response.status, 200)
                with client.open(Request(root + "/api/logout", data=b'{}', headers={"Content-Type": "application/json"})) as response:
                    self.assertIn("Max-Age=0", response.headers["Set-Cookie"])
                with client.open(root + "/api/me") as response:
                    self.assertIsNone(json.load(response)["user"])
        finally:
            httpd.shutdown()
            httpd.server_close()
            thread.join()
            adapter._state = original_state

    def test_signed_session_rejects_tampering_and_expiry(self):
        token = sign_demo_session("ada", "test-secret")
        self.assertEqual(verify_demo_session(token, "test-secret"), "ada")
        self.assertIsNone(verify_demo_session(token, "different-secret"))
        parts = token.split(".")
        parts[1] = parts[1][:-1] + ("A" if parts[1][-1] != "A" else "B")
        self.assertIsNone(verify_demo_session(".".join(parts), "test-secret"))
        expired = sign_demo_session("ada", "test-secret", expires=int(time.time()) - 1)
        self.assertIsNone(verify_demo_session(expired, "test-secret"))
        self.assertIsNone(verify_demo_session("demo1.malformed", "test-secret"))

    def test_seeded_api_and_session(self):
        httpd = ThreadingHTTPServer(("127.0.0.1", 0), handler)
        thread = threading.Thread(target=httpd.serve_forever, daemon=True)
        thread.start()
        client = build_opener(HTTPCookieProcessor(CookieJar()))
        root = "http://127.0.0.1:%s" % httpd.server_port
        try:
            with client.open(root + "/") as response:
                self.assertIn(b"Always-On Hackathon", response.read())
            with client.open(root + "/static/app.js") as response:
                self.assertEqual(response.status, 200)
            request = Request(root + "/api/login", data=json.dumps({"handle": "ben"}).encode(),
                              headers={"Content-Type": "application/json"})
            with client.open(request) as response:
                self.assertEqual(response.status, 200)
            with client.open(root + "/api/me") as response:
                self.assertEqual(json.load(response)["user"]["handle"], "ben")
            self.assertTrue(demo_state().synchronous_jobs)
            self.assertEqual(demo_state().agent_mode, "simulated")
        finally:
            httpd.shutdown()
            httpd.server_close()
            thread.join()


if __name__ == "__main__":
    unittest.main()
