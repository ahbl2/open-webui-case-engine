/**
 * Client-side plain-text → PDF (pdf-lib). Report-clean: Helvetica, black on white, wrapped lines.
 * Content is supplied as a single string (same structure as TXT exports). Before drawing, text is
 * normalized for StandardFonts.Helvetica (WinAnsi) so pdf-lib never throws on encode.
 *
 * TXT downloads remain full UTF-8; normalization applies only on this PDF path.
 */
import { PDFDocument, StandardFonts, type PDFFont } from 'pdf-lib';
import { Encodings } from '@pdf-lib/standard-fonts';

const WIN_ANSI = Encodings.WinAnsi;

const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const MARGIN = 50;
const FONT_SIZE = 11;
const LINE_HEIGHT = 14;

function* iterateCodePoints(text: string): Generator<number> {
	for (let i = 0; i < text.length; ) {
		const cp = text.codePointAt(i)!;
		yield cp;
		i += cp > 0xffff ? 2 : 1;
	}
}

/** Common symbols not in WinAnsi → ASCII (meaning preserved as closely as possible). */
const SYMBOL_FALLBACK_ASCII: Record<number, string> = {
	0x2192: '->',
	0x2190: '<-',
	0x2194: '<->',
	0x2264: '<=',
	0x2265: '>=',
	0x2260: '!=',
	0x2713: '[x]',
	0x2714: '[x]',
	0x2717: '[ ]'
};

/**
 * Make plain text safe for pdf-lib StandardFonts (WinAnsi). Deterministic; does not run on TXT export.
 *
 * Root cause of Timeline PDF failures: body/metadata can contain Unicode that WinAnsi cannot encode
 * (e.g. zero-width spaces U+200B, line separators U+2028/U+2029, emoji, arrows U+2192) while typical
 * Notes text stayed within encodable Latin-1 / WinAnsi. This layer strips or maps those before drawText.
 */
export function normalizePlainTextForPdfWinAnsi(text: string): string {
	let s = text.replace(/\r\n/g, '\n');
	s = s.replace(/\u2028/g, '\n').replace(/\u2029/g, '\n');
	s = s.replace(/[\u200B\uFEFF\u200C\u200D\u200E\u200F\u2060\u00AD]/g, '');
	s = s.replace(/[\u2013\u2014\u2212\u2010\u2011\u2012\u2015]/g, '-');
	s = s.replace(/[\u2018\u2019\u201A\u201B\u2032\u2035]/g, "'");
	s = s.replace(/[\u201C\u201D\u201E\u201F\u2033\u2036]/g, '"');
	s = s.replace(/\u2026/g, '...');
	s = s.replace(/[\u00A0\u1680\u2000-\u200A\u202F\u205F\u3000]/g, ' ');

	let out = '';
	for (const cp of iterateCodePoints(s)) {
		if (cp === 9 || cp === 10 || cp === 13) {
			out += String.fromCodePoint(cp);
			continue;
		}
		if (cp < 32 || cp === 127) {
			out += ' ';
			continue;
		}
		const mapped = SYMBOL_FALLBACK_ASCII[cp];
		if (mapped !== undefined) {
			out += mapped;
			continue;
		}
		if (WIN_ANSI.canEncodeUnicodeCodePoint(cp)) {
			out += String.fromCodePoint(cp);
		} else {
			out += '?';
		}
	}
	return out;
}

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
	const safeText = normalizePlainTextForPdfWinAnsi(fullText);
	const pdfDoc = await PDFDocument.create();
	const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
	const maxWidth = PAGE_WIDTH - 2 * MARGIN;
	const wrapped = expandToWrappedLines(font, safeText, maxWidth, FONT_SIZE);

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
