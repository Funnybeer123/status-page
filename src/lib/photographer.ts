export type CameraRow = {
  id: string;
  title: string;
  photographer: string;
  photographerId?: string | null;
};

export function photographerLine(title?: string | null, photographer?: string | null) {
  const photo = title?.trim() || "A photograph";
  const who = photographer?.trim();
  return who ? `${who} held the camera for ${photo}` : `${photo} · who held the camera is still unknown`;
}

export function camerasHeading(count: number) {
  if (!count) return "No camera credits yet";
  if (count === 1) return "1 photograph with who held the camera";
  return `${count} photographs with who held the camera`;
}

export function missingCamerasHeading(count: number) {
  if (!count) return "Every photograph already names who held the camera";
  if (count === 1) return "1 photograph still needs who held the camera";
  return `${count} photographs still need who held the camera`;
}

export function compileCameras(rows: CameraRow[]) {
  return [...rows].sort((a, b) => a.photographer.localeCompare(b.photographer) || a.title.localeCompare(b.title));
}
