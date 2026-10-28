// Client-side PDF text extraction for the admin legal-document editor.
//
// The PDF is parsed entirely in the browser with pdfjs-dist — it is never
// uploaded anywhere. Only the extracted text is kept, which the admin then
// reviews and edits before saving as the document's `content`. This keeps the
// backend free of any binary-upload / storage pipeline.
//
// pdfjs touches browser-only globals (DOMMatrix, Worker, …), so this module is
// imported dynamically from the click handler — it never runs during SSR.

/**
 * Extract readable text from a PDF file, preserving line and paragraph breaks
 * as faithfully as the source layout allows. Returns a single string suitable
 * for dropping straight into the Document editor.
 */
export async function extractPdfText(file: File): Promise<string> {
  const pdfjs = await import('pdfjs-dist');

  // Bundle the worker as a SAME-ORIGIN asset. Webpack (which Next.js uses)
  // understands this `new URL(..., import.meta.url)` form and emits the worker
  // file next to our bundle, which sidesteps the cross-origin worker / CORS
  // failures you hit when pointing workerSrc at a CDN.
  pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.mjs',
    import.meta.url,
  ).toString();

  const buffer = await file.arrayBuffer();
  const pdf = await pdfjs.getDocument({ data: new Uint8Array(buffer) }).promise;

  const pageTexts: string[] = [];
  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const textContent = await page.getTextContent();

    // pdfjs returns text as positioned fragments, not lines. Rebuild lines by
    // (a) honouring each fragment's `hasEOL` flag and (b) breaking whenever the
    // vertical baseline (transform[5]) jumps — so wrapped lines and paragraph
    // gaps in the source survive instead of collapsing into one run.
    const lines: string[] = [];
    let line = '';
    let lastY: number | null = null;

    for (const item of textContent.items as Array<Record<string, any>>) {
      if (typeof item.str !== 'string') continue;
      const y: number | undefined = item.transform?.[5];

      if (lastY !== null && y !== undefined && Math.abs(y - lastY) > 2) {
        if (line.trim()) lines.push(line.trimEnd());
        line = '';
      }

      line += item.str;

      if (item.hasEOL) {
        if (line.trim()) lines.push(line.trimEnd());
        line = '';
      }
      if (y !== undefined) lastY = y;
    }
    if (line.trim()) lines.push(line.trimEnd());

    pageTexts.push(lines.join('\n'));
  }

  await pdf.cleanup();

  // Join pages with a blank line, and collapse runs of 3+ newlines to a single
  // paragraph break so the result reads cleanly.
  return pageTexts.join('\n\n').replace(/\n{3,}/g, '\n\n').trim();
}
