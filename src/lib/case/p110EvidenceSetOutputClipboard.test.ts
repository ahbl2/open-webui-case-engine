import { afterEach, describe, expect, it, vi } from 'vitest';
import { writePlainTextToClipboard } from './p110EvidenceSetOutputClipboard';

describe('writePlainTextToClipboard', () => {
	afterEach(() => {
		vi.unstubAllGlobals();
		vi.restoreAllMocks();
	});

	it('writes via navigator.clipboard', async () => {
		const writeText = vi.fn().mockResolvedValue(undefined);
		vi.stubGlobal('navigator', { clipboard: { writeText } });
		await writePlainTextToClipboard('abc');
		expect(writeText).toHaveBeenCalledWith('abc');
	});

	it('propagates failure for feedback handling', async () => {
		vi.stubGlobal('navigator', {
			clipboard: { writeText: vi.fn().mockRejectedValue(new Error('denied')) }
		});
		await expect(writePlainTextToClipboard('x')).rejects.toThrow('denied');
	});
});
