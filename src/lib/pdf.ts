function escapePdf(text: string) {
  return text.replaceAll("\\", "\\\\").replaceAll("(", "\\(").replaceAll(")", "\\)");
}

function wrapLine(text: string, width = 86) {
  const words = text.replaceAll("\r", "").split(/\s+/);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length > width && current) {
      lines.push(current);
      current = word;
    } else {
      current = next;
    }
  }
  if (current) lines.push(current);
  return lines.length ? lines : [""];
}

export type PdfSection = { heading: string; body?: string; date?: string };
export type PdfChapter = { title: string; subtitle?: string; sections: PdfSection[] };

function paginate(chapters: PdfChapter[], title: string) {
  const pages: string[][] = [];
  let lines: string[] = [];
  const flush = () => {
    if (lines.length) pages.push(lines);
    lines = [];
  };
  const add = (text: string) => {
    for (const line of wrapLine(text)) {
      if (lines.length >= 48) flush();
      lines.push(line);
    }
  };
  add(title);
  add("");
  for (const chapter of chapters) {
    if (lines.length > 36) flush();
    add(chapter.title);
    if (chapter.subtitle) add(chapter.subtitle);
    add("");
    for (const section of chapter.sections) {
      add(section.heading);
      if (section.date) add(section.date);
      if (section.body) add(section.body);
      add("");
    }
  }
  flush();
  return pages.length ? pages : [[title]];
}

export function buildPdf(chapters: PdfChapter[], title = "Family book") {
  const pages = paginate(chapters, title);
  const bodies: string[] = [];
  bodies[1] = "<< /Type /Catalog /Pages 2 0 R >>";
  const pageNums = pages.map((_, index) => 4 + index * 2);
  bodies[2] = `<< /Type /Pages /Kids [${pageNums.map((num) => `${num} 0 R`).join(" ")}] /Count ${pages.length} >>`;
  bodies[3] = "<< /Type /Font /Subtype /Type1 /BaseFont /Times-Roman >>";
  pages.forEach((pageLines, index) => {
    const pageNum = 4 + index * 2;
    const contentNum = pageNum + 1;
    const commands = ["BT", "/F1 12 Tf", "72 740 Td", "16 TL"];
    pageLines.forEach((line, lineIndex) => {
      if (lineIndex) commands.push("T*");
      commands.push(`(${escapePdf(line)}) Tj`);
    });
    commands.push("ET");
    const stream = commands.join("\n");
    bodies[pageNum] =
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 3 0 R >> >> /Contents ${contentNum} 0 R >>`;
    bodies[contentNum] = `<< /Length ${Buffer.byteLength(stream)} >>\nstream\n${stream}\nendstream`;
  });

  const header = "%PDF-1.4\n";
  const chunks = [header];
  const offsets = [0];
  let offset = Buffer.byteLength(header);
  for (let num = 1; num < bodies.length; num += 1) {
    offsets[num] = offset;
    const obj = `${num} 0 obj\n${bodies[num]}\nendobj\n`;
    chunks.push(obj);
    offset += Buffer.byteLength(obj);
  }
  let xref = `xref\n0 ${bodies.length}\n0000000000 65535 f \n`;
  for (let num = 1; num < bodies.length; num += 1) {
    xref += `${String(offsets[num]).padStart(10, "0")} 00000 n \n`;
  }
  chunks.push(xref);
  chunks.push(
    `trailer << /Size ${bodies.length} /Root 1 0 R /Info << /Title (${escapePdf(title)}) >> >>\nstartxref\n${offset}\n%%EOF\n`,
  );
  return Buffer.from(chunks.join(""), "utf8");
}

export function pdfFilename(familyName: string) {
  return `${familyName.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase() || "family"}-book.pdf`;
}
