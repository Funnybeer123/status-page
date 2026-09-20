import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

export const ROSE_LETTER = `June 14, 1952
Market Street

Helen,

Grandma Rose met Grandpa Louis at the millinery counter on Market Street.
He bought a navy hatband and asked her to the Saturday picture show.
That is how they began.

Love,
Aunt June`;

export function makeLetterPng(text = ROSE_LETTER) {
  const dir = mkdtempSync(join(tmpdir(), "fl-letter-"));
  const htmlPath = join(dir, "letter.html");
  const pngPath = join(dir, "letter.png");
  const escaped = text.replaceAll("&", "&amp;").replaceAll("<", "&lt;");
  writeFileSync(
    htmlPath,
    `<!doctype html><html><body style="margin:48px;background:#fffaf0;color:#2b2118;font:28px/1.5 Georgia,serif;white-space:pre-wrap">${escaped}</body></html>`,
  );
  execFileSync("google-chrome-stable", [
    "--headless=new",
    "--disable-gpu",
    "--no-sandbox",
    "--hide-scrollbars",
    "--window-size=900,1200",
    `--screenshot=${pngPath}`,
    `file://${htmlPath}`,
  ], { stdio: "ignore" });
  return { path: pngPath, bytes: readFileSync(pngPath), text };
}

export function makePhotoSvg() {
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="640" height="480" viewBox="0 0 640 480">
  <rect width="640" height="480" fill="#5c3a2a"/>
  <text x="320" y="240" text-anchor="middle" font-family="Georgia" font-size="32" fill="#faf6ee">Market Street, 1952</text>
</svg>`;
  return Buffer.from(svg);
}

export function makeVideo() {
  const dir = mkdtempSync(join(tmpdir(), "fl-video-"));
  const dest = join(dir, "picnic.mp4");
  execFileSync(
    "ffmpeg",
    ["-y", "-f", "lavfi", "-i", "color=c=0x4d5b3c:s=320x240:d=1", "-pix_fmt", "yuv420p", dest],
    { stdio: "ignore" },
  );
  return { path: dest, bytes: readFileSync(dest) };
}
