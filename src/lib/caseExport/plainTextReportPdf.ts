/**
 * Client-side plain-text → PDF (pdf-lib). Report-clean: Helvetica, black on white, wrapped lines.
 * Content is supplied as a single string (same structure as TXT exports); no semantic changes.
 */
import { PDFDocument, StandardFonts, type PDFFont } from 'pdf-lib';

const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const MARGIN = 50;
const FONT_SIZE = 11;
const LINE_HEIGHT = 14;

function wrapSingleLine(font: PDFFont, line: string, maxWidth: number, fontSize: number): string[] {
	if (line.length === 0) return [''];
	const words = line.split(/\s+/).filter((w) => w.length > 0);
	if (words.length === 0) return [''];
	const out: string[] = [];
	let current = '';
	for (const w of words) {
		const trial = current ? `${current} ${w}` : w;
		if (font.widthOfTextAtSize(trial, fontSize) <= maxWidth) {
			current = trial;
			continue;
		}
		if (current) {
			out.push(current);
			current = '';
		}
		if (font.widthOfTextAtSize(w, fontSize) <= maxWidth) {
			current = w;
			continue;
		}
		let chunk = '';
		for (const ch of w) {
			const next = chunk + ch;
			if (font.widthOfTextAtSize(next, fontSize) <= maxWidth) {
				chunk = next;
			} else {
				if (chunk) out.push(chunk);
				chunk = ch;
			}
		}
		current = chunk;
	}
	if (current) out.push(current);
	return out;
}

function expandToWrappedLines(font: PDFFont, fullText: string, maxWidth: number, fontSize: number): string[] {
	const normalized = fullText.replace(/\r\n/g, '\n');
	const paragraphs = normalized.split('\n');
	const lines: string[] = [];
	for (const p of paragraphs) {
		lines.push(...wrapSingleLine(font, p, maxWidth, fontSize));
	}
	return lines.length > 0 ? lines : [''];
}

/**
 * Build a minimal PDF (A4) whose text matches the supplied plain document (line breaks preserved via wrapping).
 */
export async function buildPlainTextPdfBytes(fullText: string): Promise<Uint8Array> {
	const pdfDoc = await PDFDocument.create();
	const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
	const maxWidth = PAGE_WIDTH - 2 * MARGIN;
	const wrapped = expandToWrappedLines(font, fullText, maxWidth, FONT_SIZE);

	let page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
	let y = PAGE_HEIGHT - MARGIN - FONT_SIZE;

	for (const line of wrapped) {
		if (y < MARGIN) {
			page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
			y = PAGE_HEIGHT - MARGIN - FONT_SIZE;
		}
		if (line.length > 0) {
			page.drawText(line, {
				x: MARGIN,
				y,
				size: FONT_SIZE,
				font
			});
		}
		y -= LINE_HEIGHT;
	}

	return pdfDoc.save();
}

/** Trigger browser download of a PDF built from the same plain-text document as TXT export. */
export async function downloadPlainTextAsPdf(fullText: string, filename: string): Promise<void> {
	const bytes = await buildPlainTextPdfBytes(fullText);
	const blob = new Blob([bytes], { type: 'application/pdf' });
	const url = URL.createObjectURL(blob);
	const link = document.createElement('a');
	link.href = url;
	link.download = filename;
	document.body.appendChild(link);
	link.click();
	document.body.removeChild(link);
	URL.revokeObjectURL(url);
}
