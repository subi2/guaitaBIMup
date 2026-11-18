from playwright.sync_api import sync_playwright
import sys
URL = "file:///home/claude/g3d/out/guaitaBIMup%2024.html?nou"
with sync_playwright() as p:
    b = p.chromium.launch(executable_path="/usr/bin/google-chrome", args=["--no-sandbox","--use-gl=angle","--use-angle=swiftshader","--enable-unsafe-swiftshader"])
    pg = b.new_page(viewport={"width":1400,"height":860})
    errs = []
    pg.on("pageerror", lambda e: errs.append(str(e)))
    pg.goto(URL); pg.wait_for_timeout(800)
    assert pg.inner_text("#verTag") == "v24", pg.inner_text("#verTag")
    assert "SBS BIM Consulting" in pg.inner_text("#sbsSig")
    pg.click("#verTag"); pg.wait_for_timeout(200)
    assert "Quant a" in pg.inner_text("#dlg") or "guaitaBIMup 24" in pg.inner_text("#dlg")
    pg.keyboard.press("Escape")
    assert not errs, errs
    print("VER_TEST OK")
    b.close()
