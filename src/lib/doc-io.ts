// Editable-document round-trip for the admin legal editor.
//
//   • extractTextFromFile(file)  — read an uploaded .pdf / .docx / .md / .txt
//     into Markdown/plain text for the editor. (PDF + DOCX parse in-browser;
//     nothing is uploaded anywhere.)
//   • markdownToDocxBlob(...)    — turn the stored content into a real Word
//     (.docx) file the admin can edit in Word / Google Docs and re-upload.
//   • downloadBlob(...)          — trigger a browser download.
//
// Everything runs client-side, so the heavy libs (pdfjs, mammoth, docx) are
// dynamically imported from the handlers and never touched during SSR.

import { extractPdfText } from './pdf-extract';

function extOf(name: string): string {
  const m = name.toLowerCase().match(/\.([a-z0-9]+)$/);
  return m ? m[1] : '';
}

// ── Reading: any supported file → Markdown / plain text ──────────────────────

/** Read a .docx into Markdown using mammoth (DOCX → HTML → Markdown). */
async function extractDocxText(file: File): Promise<string> {
  // mammoth has no `exports` map and remaps its unzip/files submodules via the
  // package "browser" field, so the plain import resolves to the browser build
  // under webpack.
  const mammoth: any = await import('mammoth');
  const arrayBuffer = await file.arrayBuffer();
  const result = await (mammoth.convertToHtml
    ? mammoth.convertToHtml({ arrayBuffer })
    : mammoth.default.convertToHtml({ arrayBuffer }));
  return htmlToMarkdown(result.value || '');
}

/**
 * Route an uploaded file to the right extractor. Returns Markdown / plain text
 * ready to drop into the Document editor.
 */
export async function extractTextFromFile(file: File): Promise<string> {
  const ext = extOf(file.name);
  const type = file.type;

  if (ext === 'pdf' || type === 'application/pdf') {
    return extractPdfText(file);
  }
  if (
    ext === 'docx' ||
    type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ) {
    return extractDocxText(file);
  }
  // .md / .markdown / .txt and anything else text-like: read verbatim.
  const text = await file.text();
  return text.replace(/\r\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
}

/** Minimal, dependency-free HTML → Markdown for the tags mammoth emits. */
function htmlToMarkdown(html: string): string {
  if (typeof window === 'undefined') return html;
  const docEl = new DOMParser().parseFromString(html, 'text/html');

  const inline = (node: Node): string => {
    let s = '';
    node.childNodes.forEach((c) => {
      if (c.nodeType === Node.TEXT_NODE) {
        s += c.textContent || '';
      } else if (c.nodeType === Node.ELEMENT_NODE) {
        const el = c as HTMLElement;
        const tag = el.tagName.toLowerCase();
        if (tag === 'strong' || tag === 'b') s += `**${inline(el)}**`;
        else if (tag === 'em' || tag === 'i') s += `*${inline(el)}*`;
        else if (tag === 'br') s += '\n';
        else s += inline(el);
      }
    });
    return s;
  };

  const out: string[] = [];
  const walk = (node: Node) => {
    node.childNodes.forEach((c) => {
      if (c.nodeType === Node.TEXT_NODE) {
        const t = (c.textContent || '').trim();
        if (t) out.push(t);
        return;
      }
      if (c.nodeType !== Node.ELEMENT_NODE) return;
      const el = c as HTMLElement;
      const tag = el.tagName.toLowerCase();

      if (/^h[1-6]$/.test(tag)) {
        const lvl = Number(tag[1]);
        const t = inline(el).trim();
        if (t) out.push(`${'#'.repeat(lvl)} ${t}`);
      } else if (tag === 'p') {
        const t = inline(el).trim();
        if (t) out.push(t);
      } else if (tag === 'ul') {
        const items: string[] = [];
        el.querySelectorAll(':scope > li').forEach((li) => {
          const t = inline(li).trim();
          if (t) items.push(`- ${t}`);
        });
        if (items.length) out.push(items.join('\n'));
      } else if (tag === 'ol') {
        const items: string[] = [];
        let i = 1;
        el.querySelectorAll(':scope > li').forEach((li) => {
          const t = inline(li).trim();
          if (t) items.push(`${i++}. ${t}`);
        });
        if (items.length) out.push(items.join('\n'));
      } else {
        walk(el);
      }
    });
  };
  walk(docEl.body);

  return out.join('\n\n').replace(/\n{3,}/g, '\n\n').trim();
}

// ── Writing: stored Markdown / plain text → a real .docx ─────────────────────

/**
 * Build a Word (.docx) file from the document's Markdown/plain-text body. The
 * structures understood mirror the in-app renderer: headings, bullets,
 * numbered lines, bold runs, and blank-line paragraphs — so a download → edit
 * → re-upload round-trip preserves them.
 */
export async function markdownToDocxBlob(title: string, content: string): Promise<Blob> {
  const { Document, Packer, Paragraph, TextRun, HeadingLevel } = await import('docx');

  const headingFor: Record<number, (typeof HeadingLevel)[keyof typeof HeadingLevel]> = {
    1: HeadingLevel.HEADING_1,
    2: HeadingLevel.HEADING_2,
    3: HeadingLevel.HEADING_3,
    4: HeadingLevel.HEADING_4,
    5: HeadingLevel.HEADING_5,
    6: HeadingLevel.HEADING_6,
  };

  const inlineRuns = (text: string) => {
    const parts = text.split(/(\*\*[^*]+\*\*)/g).filter((p) => p.length > 0);
    if (!parts.length) return [new TextRun({ text: '' })];
    return parts.map((p) => {
      const m = p.match(/^\*\*([^*]+)\*\*$/);
      return m ? new TextRun({ text: m[1], bold: true }) : new TextRun({ text: p });
    });
  };

  const children: InstanceType<typeof Paragraph>[] = [];
  if (title.trim()) {
    children.push(new Paragraph({ heading: HeadingLevel.TITLE, children: inlineRuns(title.trim()) }));
  }

  const blocks = content.replace(/\r\n/g, '\n').split(/\n{2,}/);
  for (const block of blocks) {
    const lines = block.split('\n').map((l) => l.trim()).filter(Boolean);
    if (!lines.length) continue;

    const isList = lines.every((l) => /^([-*•]|\d+[.)])\s+/.test(l));
    if (isList) {
      for (const l of lines) {
        const numbered = l.match(/^(\d+[.)])\s+(.*)$/);
        if (numbered) {
          // Keep the literal number so it survives the round-trip as a numbered
          // line (rather than relying on Word list numbering).
          children.push(new Paragraph({ children: inlineRuns(`${numbered[1]} ${numbered[2]}`) }));
        } else {
          children.push(new Paragraph({ bullet: { level: 0 }, children: inlineRuns(l.replace(/^[-*•]\s+/, '')) }));
        }
      }
      continue;
    }

    const heading = lines.length === 1 ? lines[0].match(/^(#{1,6})\s+(.*)$/) : null;
    if (heading) {
      children.push(new Paragraph({
        heading: headingFor[heading[1].length] || HeadingLevel.HEADING_3,
        children: inlineRuns(heading[2]),
      }));
      continue;
    }

    const para = lines.map((l) => l.replace(/^#{1,6}\s+/, '')).join(' ');
    children.push(new Paragraph({ children: inlineRuns(para) }));
  }

  if (!children.length) children.push(new Paragraph({ children: [new TextRun({ text: '' })] }));

  const doc = new Document({ sections: [{ children }] });
  return Packer.toBlob(doc);
}

// ── Download helper ──────────────────────────────────────────────────────────

/** Turn a title into a safe file base, e.g. "Merchant Agreement" → "merchant-agreement". */
export function slugifyFilename(title: string, fallback = 'legal-document'): string {
  const base = (title || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return base || fallback;
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Revoke on the next tick so the download has definitely started.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
