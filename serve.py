import http.server
import socketserver
import os
import sys
import webbrowser

PORT = 3000
DIRECTORY = os.path.join(os.path.dirname(__file__), "dist")

if not os.path.exists(DIRECTORY) or not os.path.exists(os.path.join(DIRECTORY, "index.html")):
    zip_path = os.path.join(os.path.dirname(__file__), "dist.zip")
    if os.path.exists(zip_path):
        import zipfile
        try:
            print("[SETUP] Extracting production build from dist.zip...")
            with zipfile.ZipFile(zip_path, "r") as zip_ref:
                zip_ref.extractall(os.path.dirname(__file__))
        except Exception as e:
            print(f"[WARN] Failed to auto-extract dist.zip: {e}")

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
    def log_message(self, format, *args):
        sys.stdout.write(f"[{self.log_date_time_string()}] {args[0]} {args[1]}\n")
        sys.stdout.flush()

class ReusableTCPServer(socketserver.TCPServer):
    allow_reuse_address = True

def main():
    port = int(sys.argv[1]) if len(sys.argv) > 1 else PORT
    server_address = ("127.0.0.1", port)
    with ReusableTCPServer(server_address, Handler) as httpd:
        print(f"BabySQL server running at: http://localhost:{port}", flush=True)
        print(f"Serving from: {DIRECTORY}", flush=True)
        print("Press Ctrl+C to stop.", flush=True)
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nShutting down BabySQL server.", flush=True)

if __name__ == "__main__":
    main()
