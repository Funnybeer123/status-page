import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { absoluteMediaPath } from "@/lib/media";

const execFileAsync = promisify(execFile);

export async function ocrFile(storagePath: string) {
  const full = absoluteMediaPath(storagePath);
  try {
    const { stdout } = await execFileAsync("tesseract", [full, "stdout", "-l", "eng"], {
      timeout: 60_000,
    });
    return stdout.trim();
  } catch (error) {
    const message = error instanceof Error ? error.message : "OCR failed";
    return `(OCR could not read this scan. Edit the transcript by hand.)\n\n${message}`;
  }
}
