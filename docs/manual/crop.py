#!/usr/bin/env python3
"""撮った画面写真から「寄り」の絵を切り出す。

    python3 docs/manual/crop.py [images ディレクトリ]

capture.mjs の shot() は画面まるごとしか撮れない。マニュアルの絵は
「いま押すのはこれ」を見せるものなので、押すものの周りに寄せた絵が要る
（standards/skills/giga-manual/references/screenshots.md の 3 節）。

どこを切るかは docs/manual/shots.mjs が images/crops.json に書き出している。
画面の中に赤枠を描いて撮る代わりに、撮ったあとで切る形にしてあるので、
画面が変わっても枠だけが古くなって残ることがない。

⚠️ 2 度走らせても平気なように、まだ切っていない（画面まるごとの大きさの）
   ものだけを切る。切ったものをもう一度切ると、枠が二重にずれる。
"""
import json
import sys
from pathlib import Path

from PIL import Image

# capture.mjs の deviceScaleFactor。CSS ピクセルを画像のピクセルに直すのに使う。
DPR = 2


def main() -> int:
    root = Path(sys.argv[1] if len(sys.argv) > 1 else "docs/manual/images")
    index = root / "crops.json"
    if not index.exists():
        print(f"crops.json が無い: {index}（先に capture.mjs を走らせる）")
        return 2

    cut = kept = 0
    for item in json.loads(index.read_text(encoding="utf-8")):
        path = root / item["name"]
        if not path.exists():
            print(f"  無い: {path}")
            continue
        full = (round(item["vw"] * DPR), round(item["vh"] * DPR))
        with Image.open(path) as im:
            if im.size != full:
                kept += 1
                continue
            box = (
                round(item["x"] * DPR),
                round(item["y"] * DPR),
                round((item["x"] + item["w"]) * DPR),
                round((item["y"] + item["h"]) * DPR),
            )
            im.crop(box).save(path)
        cut += 1
        print(f"  切った  {item['name']}  {item['w']:.0f}x{item['h']:.0f}")

    print(f"\n寄りの絵 {cut} 枚を切り出した（すでに切ってあった {kept} 枚はそのまま）")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
