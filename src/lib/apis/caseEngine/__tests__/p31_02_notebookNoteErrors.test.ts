import { describe, expect, it, vi, afterEach } from 'vitest';
import { createCaseNotebookNote, updateCaseNotebookNote, CaseEngineRequestError } from '../index';

describe('P31-02 notebook note mutations — error envelope', () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('createCaseNotebookNote maps AI_VALIDATION_FAILED to CaseEngineRequestError with code and details', async () => {
		const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
			new Response(
				JSON.stringify({
					success: false,
					error: {
						code: 'AI_VALIDATION_FAILED',
						message: 'Note failed integrity validation.',
						details: {
							reasons: [
								{
									code: 'fabrication_possible',
									message:
										'The enhanced version may introduce specific information (for example names or times) that was not in your original note.'
								}
							]
						}
					}
				}),
				{ status: 400 }
			)
		);

		try {
			await createCaseNotebookNote('case-1', { title: 'T', text: 'x', integrity_baseline_text: 'y' }, 'tok');
			expect.fail('expected throw');
		} catch (e) {
			expect(e).toBeInstanceOf(CaseEngineRequestError);
			const err = e as CaseEngineRequestError;
			expect(err.httpStatus).toBe(400);
			expect(err.errorCode).toBe('AI_VALIDATION_FAILED');
			expect(err.details).toEqual({
				reasons: [
					{
						code: 'fabrication_possible',
						message:
							'The enhanced version may introduce specific information (for example names or times) that was not in your original note.'
					}
				]
			});
		}
		expect(fetchSpy).toHaveBeenCalledTimes(1);
	});

	it('updateCaseNotebookNote maps envelope error code', async () => {
		const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
			new Response(
				JSON.stringify({
					success: false,
					error: { code: 'AI_VALIDATION_FAILED', message: 'blocked' }
				}),
				{ status: 400 }
			)
		);

		try {
			await updateCaseNotebookNote('case-1', 1, { title: 'T', text: 'a' }, 'tok');
			expect.fail('expected throw');
		} catch (e) {
			expect(e).toBeInstanceOf(CaseEngineRequestError);
			const err = e as CaseEngineRequestError;
			expect(err.httpStatus).toBe(400);
			expect(err.errorCode).toBe('AI_VALIDATION_FAILED');
			expect(err.message).toBe('blocked');
		}
		expect(fetchSpy).toHaveBeenCalledTimes(1);
	});
});
