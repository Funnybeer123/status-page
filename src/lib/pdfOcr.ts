import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdtemp, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { absoluteMediaPath } from "@/lib/media";
import { ocrAbsolute } from "@/lib/ocr";

const execFileAsync = promisify(execFile);

export async function ocrPdf(storagePath: string) {
  const full = absoluteMediaPath(storagePath);
  const dir = await mkdtemp(join(tmpdir(), "fl-pdf-"));
  try {
    await execFileAsync("pdftoppm", ["-png", "-r", "150", full, join(dir, "page")], { timeout: 90_000 });
    const pages = (await readdir(dir)).filter((name) => name.endsWith(".png")).sort();
    if (!pages.length) {
      const text = await ocrAbsolute(full);
      return { pages: 1, text };
    }
    const parts: string[] = [];
    for (const [index, name] of pages.entries()) {
      const text = await ocrAbsolute(join(dir, name));
      parts.push(`--- Page ${index + 1} ---\n${text}`);
    }
    return { pages: pages.length, text: parts.join("\n\n") };
  } catch (error) {
    const text = await ocrAbsolute(full);
    const message = error instanceof Error ? error.message : "pdftoppm failed";
    return {
      pages: 1,
      text: text || `(Could not split that PDF into pages.)\n${message}`,
    };
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}
