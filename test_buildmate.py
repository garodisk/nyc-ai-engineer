import io
import json
import os
import unittest
from unittest.mock import patch
from urllib.error import HTTPError

import buildmate_ai as ai
from test_server import Client
from api.index import handler
from http.server import ThreadingHTTPServer
import threading


class BuildmateTest(unittest.TestCase):
    def setUp(self):
        ai._calls.clear()

    def test_openrouter_request_and_validation(self):
        output = {"context": dict(ai.DEFAULTS, count=50, location="New York", skills=["React"], anySkill="false"),
                  "message": "I’ll look for React builders in New York."}
        encoded = json.dumps({"choices": [{"message": {"content": json.dumps(output)}}]}).encode()
        with patch.dict(os.environ, {"OPENROUTER_API_KEY": "test-secret"}), patch.object(ai, "urlopen", return_value=io.BytesIO(encoded)) as upstream:
            result = ai.interpret("Find React people in NYC", None, [], {"skills": ["React"]})
        request = upstream.call_args.args[0]
        payload = json.loads(request.data)
        self.assertEqual(request.full_url, "https://openrouter.ai/api/v1/chat/completions")
        self.assertEqual(request.get_header("Authorization"), "Bearer test-secret")
        self.assertNotIn("test-secret", request.data.decode())
        self.assertEqual(payload["response_format"]["type"], "json_schema")
        self.assertEqual(payload["messages"][-1], {"role": "user", "content": "Find React people in NYC"})
        self.assertEqual((result["context"]["count"], result["context"]["anySkill"]), (10, False))
        self.assertEqual(result["provider"], "openrouter")

    def test_provider_errors_do_not_leak_credentials(self):
        error = HTTPError("https://openrouter.ai", 401, "secret upstream text", {}, io.BytesIO(b"secret"))
        with patch.dict(os.environ, {"OPENROUTER_API_KEY": "test-secret"}), patch.object(ai, "urlopen", side_effect=error):
            with self.assertRaises(ai.BuildmateError) as caught:
                ai.interpret("Find React people", None, [], {})
        self.assertIn("authentication failed", str(caught.exception))
        self.assertNotIn("secret", str(caught.exception))

    def test_endpoint_uses_public_vocabulary_and_explicit_fallback(self):
        httpd = ThreadingHTTPServer(("127.0.0.1", 0), handler)
        thread = threading.Thread(target=httpd.serve_forever, daemon=True)
        thread.start()
        client = Client("http://127.0.0.1:%s" % httpd.server_port)
        try:
            with patch.dict(os.environ, {"OPENROUTER_API_KEY": ""}):
                answer = client.ok("/buildmate", {"prompt": "Find three people in NYC"})
                self.assertEqual(answer["provider"], "keyword")
            response = {"context": ai.DEFAULTS, "message": "Let's find a team.", "provider": "openrouter", "model": ai.MODEL}
            with patch.object(ai, "interpret", return_value=response) as interpret:
                self.assertEqual(client.ok("/buildmate", {"prompt": "Find React builders"}), response)
                vocab = interpret.call_args.args[3]
                self.assertIn("React", vocab["skills"])
                self.assertNotIn("sessions", vocab)
            self.assertEqual(client.call("/buildmate", {"prompt": ""})[0], 400)
        finally:
            httpd.shutdown()
            httpd.server_close()
            thread.join()

    def test_demo_rate_limit_prevents_upstream_call(self):
        import time
        ai._calls.extend([time.time()] * 15)
        with patch.dict(os.environ, {"OPENROUTER_API_KEY": "test-secret"}), patch.object(ai, "urlopen") as upstream:
            with self.assertRaises(ai.BuildmateError):
                ai.interpret("Find people", None, [], {})
            upstream.assert_not_called()

    def test_unrestricted_ai_values_do_not_become_filters(self):
        context = ai.clean_context(dict(ai.DEFAULTS, location="Worldwide", role="any", experience="any", mode="any"))
        self.assertEqual((context["location"], context["role"], context["experience"], context["mode"]), ("", "", "", ""))
