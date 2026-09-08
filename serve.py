import http.server
import socketserver
import os
import sys
import webbrowser

PORT = 3000
DIRECTORY = os.path.join(os.path.dirname(__file__), "dist")

if not os.path.exists(DIRECTORY):
    DIRECTORY = os.path.dirname(__file__)

class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

    def guess_type(self, path):
        if path.endswith(".wasm"):
            return "application/wasm"
        if path.endswith(".js") or path.endswith(".mjs"):
            return "application/javascript"
        return super().guess_type(path)

def main():
    port = int(sys.argv[1]) if len(sys.argv) > 1 else PORT
    with socketserver.TCPServer(("", port), Handler) as httpd:
        print(f"BabySQL server running at: http://localhost:{port}")
        print("Serving from:", DIRECTORY)
        print("Press Ctrl+C to stop.")
        try:
            webbrowser.open(f"http://localhost:{port}")
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("
Shutting down BabySQL server.")

if __name__ == "__main__":
    main()
