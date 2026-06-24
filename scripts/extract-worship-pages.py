#!/usr/bin/env python3
import re
import os

PDF = os.path.join(os.path.dirname(__file__), "../assets/documents/mongol-worship-conti.pdf")
OUT = os.path.join(os.path.dirname(__file__), "../assets/images/worship-pages")

os.makedirs(OUT, exist_ok=True)

with open(PDF, "rb") as f:
    data = f.read()

starts = [m.start() for m in re.finditer(b"\xff\xd8\xff", data)]
seen_sizes = set()
pages = []

for s in starts:
    e = data.find(b"\xff\xd9", s) + 2
    size = e - s
    if size < 100_000 or size in seen_sizes:
        continue
    seen_sizes.add(size)
    pages.append((s, size))

pages.sort(key=lambda x: x[0])

for i, (s, size) in enumerate(pages, start=1):
    out_path = os.path.join(OUT, f"page-{i:02d}.jpg")
    with open(out_path, "wb") as f:
        f.write(data[s : s + size])
    print(f"wrote {out_path} ({size // 1024}KB)")

print(f"total pages: {len(pages)}")
