"""Exercise the actual Vercel handler over HTTP, including a session cookie."""
import json
import threading
import unittest
from http.cookiejar import CookieJar
from http.server import ThreadingHTTPServer
from urllib.request import Request, build_opener, HTTPCookieProcessor

from api.index import handler, demo_state


class VercelDemoTest(unittest.TestCase):
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
