function escapeXml(value: string) {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
}

export function watermarkLabel(familyName: string) {
  return `${familyName} · family only`;
}

export function watermarkSvg(svg: string, label: string) {
  const mark = `<text x="50%" y="94%" text-anchor="middle" fill="#7a2e2e" fill-opacity="0.42" font-size="18" font-family="Georgia, serif">${escapeXml(label)}</text>`;
  if (/<\/svg>/i.test(svg)) return svg.replace(/<\/svg>\s*$/i, `${mark}</svg>`);
  return `${svg}${mark}`;
}

export function watermarkPhoto(bytes: Buffer, mimeType: string, label: string) {
  if (mimeType.includes("svg") || bytes.toString("utf8", 0, 200).includes("<svg")) {
    return { bytes: Buffer.from(watermarkSvg(bytes.toString("utf8"), label), "utf8"), mimeType: "image/svg+xml" };
  }
  const href = `data:${mimeType};base64,${bytes.toString("base64")}`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600"><image href="${href}" width="800" height="600" preserveAspectRatio="xMidYMid meet"/>${watermarkSvg("", label)}</svg>`;
  return { bytes: Buffer.from(svg, "utf8"), mimeType: "image/svg+xml" };
}

export function hasWatermark(bytes: Buffer | string, label: string) {
  return String(bytes).includes(label);
}
