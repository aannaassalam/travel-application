"""Build store marketing screenshots: real app screen in a device frame,
brand headline above. Rendered at @2x.

  python3 frame.py           -> Play  1080x2160 from shots/    into play/
  python3 frame.py appstore   -> App Store 6.9" 1320x2868 from shots-ios/
  python3 frame.py appstore65 -> App Store 6.5" 1284x2778 from shots-ios/
"""
import subprocess, pathlib, os, sys

# name: (src dir, out dir, canvas w/h, phone w, phone top, headline px, pad px)
TARGETS = {
    "play":     ("shots",     "play",                  540, 1080, 454, 296, 40, 62),
    # 6.9" (iPhone 16/17 Pro Max) — 1320x2868
    "appstore":    ("shots-ios", "appstore/screenshots-6.9", 660, 1434, 556, 392, 48, 84),
    # 6.5" (iPhone 11 Pro Max / 12-14 Pro Max slot) — 1284x2778
    "appstore65":  ("shots-ios", "appstore/screenshots-6.5", 642, 1389, 541, 381, 47, 82),
}

ROOT = pathlib.Path(__file__).parent
CHROME = os.path.expanduser("~/.cache/puppeteer/chrome-headless-shell/mac_arm-152.0.7977.42/chrome-headless-shell-mac-arm64/chrome-headless-shell")

SHOTS = [
    ("01-explore",        "dark",  "Your whole trip,<br><em>in one app</em>",          "Flights, hotels, restaurants and activities in the DRC"),
    ("02-hotels-results", "light", "Compare hotels<br><em>at a glance</em>",           "Nightly rates, amenities and real guest ratings"),
    ("03-hotel",          "dark",  "Book your room<br><em>in a few taps</em>",         "Clear prices, instant confirmation"),
    ("04-restaurants",    "light", "Order food,<br><em>wherever you are</em>",         "Delivery in Kinshasa, Goma and Lubumbashi"),
    ("05-restaurant",     "dark",  "The full menu,<br><em>prices and delivery</em>",   "Add to your cart and pay in the app"),
]

CSS = """
@font-face{font-family:Fraunces;src:url("../assets/fonts/Fraunces-Bold.ttf");font-weight:700}
@font-face{font-family:Inter;src:url("../assets/fonts/Inter-Regular.ttf");font-weight:400}
@font-face{font-family:Inter;src:url("../assets/fonts/Inter-SemiBold.ttf");font-weight:600}
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:{W}px;height:{H}px;overflow:hidden}
.f{position:relative;width:{W}px;height:{H}px;overflow:hidden;font-family:Inter,system-ui}
.dark{background:radial-gradient(120% 90% at 50% 0%,#17497a 0%,#0e2f4f 45%,#0a2540 100%)}
.light{background:radial-gradient(120% 90% at 50% 0%,#ffffff 0%,#f1f6fb 45%,#e6eef7 100%)}
.glow{position:absolute;left:50%;top:300px;width:760px;height:760px;margin-left:-380px;border-radius:50%;
  background:radial-gradient(circle,rgba(245,166,35,.22) 0%,rgba(245,166,35,0) 62%)}
.light .glow{background:radial-gradient(circle,rgba(245,166,35,.20) 0%,rgba(245,166,35,0) 62%)}
.copy{position:relative;padding:{PAD}px 46px 0;text-align:center}
.rule{width:44px;height:4px;border-radius:2px;background:#f5a623;margin:0 auto 22px}
h1{font-family:Fraunces;font-weight:700;font-size:{HEAD}px;line-height:1.16;letter-spacing:-.4px}
h1 em{font-style:normal;color:#f5a623}
p{margin-top:14px;font-size:17px;line-height:1.45}
.dark h1{color:#fff} .dark p{color:#b9cde0}
.light h1{color:#0a2540} .light p{color:#4a6customsize}
.light p{color:#4b6b8a}
.phone{position:absolute;left:50%;top:{TOP}px;margin-left:-{HALF}px;width:{PW}px;
  background:linear-gradient(155deg,#3a5f85 0%,#1b3c5c 40%,#0d2b47 100%);border-radius:34px;padding:9px;
  box-shadow:0 40px 90px rgba(4,18,33,.55)}
.light .phone{box-shadow:0 40px 90px rgba(10,37,64,.30)}
.phone img{display:block;width:{IW}px;border-radius:18px}
"""

HTML = """<!doctype html><meta charset="utf-8"><style>{css}</style>
<div class="f {tone}">
  <div class="glow"></div>
  <div class="copy"><div class="rule"></div><h1>{head}</h1><p>{sub}</p></div>
  <div class="phone"><img src="{src}/{name}.png"></div>
</div>"""

target = sys.argv[1] if len(sys.argv) > 1 else "play"
src, outdir, W, H, PW, TOP, HEAD, PAD = TARGETS[target]
css = (CSS.replace("{W}", str(W)).replace("{H}", str(H)).replace("{PW}", str(PW))
          .replace("{HALF}", str(PW // 2)).replace("{IW}", str(PW - 18))
          .replace("{TOP}", str(TOP)).replace("{HEAD}", str(HEAD)).replace("{PAD}", str(PAD)))

out = ROOT / outdir
out.mkdir(parents=True, exist_ok=True)
for name, tone, head, sub in SHOTS:
    if not (ROOT / src / f"{name}.png").exists():
        continue  # e.g. no iOS capture for that screen
    html = ROOT / f".build-{name}.html"
    html.write_text(HTML.format(css=css, tone=tone, head=head, sub=sub, src=src, name=name))
    subprocess.run([CHROME, "--headless", "--disable-gpu", "--allow-file-access-from-files",
        "--hide-scrollbars", "--force-device-scale-factor=2", f"--window-size={W},{H}",
        f"--screenshot={out / (name + '.png')}", f"file://{html}"],
        capture_output=True)
    html.unlink()
    print("wrote", out / (name + ".png"))
