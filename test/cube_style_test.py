from playwright.sync_api import sync_playwright
URL = "file:///home/claude/g3d/out/guaitaBIMup%2024.html?nou"
with sync_playwright() as p:
    b=p.chromium.launch(executable_path="/usr/bin/google-chrome",args=["--no-sandbox","--use-gl=angle","--use-angle=swiftshader","--enable-unsafe-swiftshader"])
    pg=b.new_page(viewport={"width":1100,"height":700}); pg.goto(URL); pg.wait_for_timeout(800)
    pg.locator("#viewWrap").screenshot(path="/home/claude/g3d/out/cube17.png")
    b.close()
