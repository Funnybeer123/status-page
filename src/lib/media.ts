import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

export function mediaRoot() {
  return process.env.MEDIA_ROOT || join(process.cwd(), "data", "media");
}

export function absoluteMediaPath(storagePath: string) {
  return join(mediaRoot(), storagePath);
}

export async function saveUpload(familyId: string, filename: string, bytes: Buffer) {
  const dir = join(mediaRoot(), familyId);
  await mkdir(dir, { recursive: true });
  const storagePath = `${familyId}/${filename}`;
  await writeFile(join(mediaRoot(), storagePath), bytes);
  return storagePath;
}
