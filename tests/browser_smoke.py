"""Exercise the PhishIntel at a project subpath in Chromium."""
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import os
import shutil
import tempfile
import threading
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]


class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass


def main():
    screenshots = ROOT / "browser-checks"
    screenshots.mkdir(exist_ok=True)
    with tempfile.TemporaryDirectory() as temporary:
        shutil.copytree(ROOT / "dist", Path(temporary) / "phishintel")
        server = ThreadingHTTPServer(("127.0.0.1", 0), partial(QuietHandler, directory=temporary))
        threading.Thread(target=server.serve_forever, daemon=True).start()
        try:
            with sync_playwright() as p:
                browser = p.chromium.launch(executable_path=os.environ.get("CHROMIUM_PATH") or None)
                page = browser.new_page(viewport={"width": 1280, "height": 1000})
                errors = []
                page.on("pageerror", lambda error: errors.append(str(error)))
                page.goto(f"http://127.0.0.1:{server.server_port}/phishintel/")
                page.locator(".record").first.wait_for()
                total = page.locator(".record").count()
                assert total >= 10
                page.locator("#metric").select_option("deviceBlock")
                assert "2025 Q2, 58%" in page.locator("#chart").get_attribute("aria-label")
                page.locator(".study summary").click()
                assert page.locator("#quarters tr").count() == 10
                with page.expect_download() as study:
                    page.locator("#export-study").click()
                assert "cumulative" in Path(study.value.path()).read_text().lower()
                page.locator(".study summary").click()
                page.locator("#query").fill("ticket")
                page.locator("#publisher").select_option("Competition Bureau Canada")
                assert page.locator(".record").count() == 1
                assert "q=ticket" in page.url
                page.reload()
                page.locator(".record").first.wait_for()
                assert page.locator(".record").count() == 1
                with page.expect_download() as matches:
                    page.locator("#export-index").click()
                assert "protect-yourself-online-ticket-fraud" in Path(matches.value.path()).read_text()
                page.locator("#query").fill("<img src=x onerror=alert(1)>")
                assert page.locator(".empty").is_visible()
                assert page.locator("img").count() == 0
                page.locator("#reset").click()
                assert page.locator(".record").count() == total
                page.screenshot(path=str(screenshots / "desktop.png"), full_page=True)
                page.set_viewport_size({"width": 390, "height": 844})
                assert page.evaluate("document.documentElement.scrollWidth <= window.innerWidth")
                page.screenshot(path=str(screenshots / "mobile.png"), full_page=True)
                assert not errors, errors
                browser.close()
            print("Browser checks passed: project subpath, filters, bookmarks, chart, exports and mobile layout")
        finally:
            server.shutdown()


if __name__ == "__main__":
    main()
