/**
 * P20-PRE-02 — Client must parse canonical `{ success, data, error }` first; legacy only when `success` is absent.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

function jsonResponse(body: unknown, status = 200) {
	return new Response(JSON.stringify(body), {
		status,
		headers: { 'Content-Type': 'application/json' }
	});
}

describe('P20-PRE-02 canonical-first parsing', () => {
	let fetchSpy: any;

	beforeEach(() => {
		fetchSpy = vi.spyOn(globalThis, 'fetch');
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('login: canonical success uses data', async () => {
		fetchSpy.mockResolvedValueOnce(
			jsonResponse({
				success: true,
				data: { token: 't1', user: { id: 'u1', name: 'n', role: 'CID' } }
			})
		);
		const { login } = await import('../index');
		const out = await login('u', 'p');
		expect(out.token).toBe('t1');
		expect(out.user.id).toBe('u1');
	});

	it('login: legacy body without success still works', async () => {
		fetchSpy.mockResolvedValueOnce(jsonResponse({ token: 'legacy', user: { id: 'u1', name: 'n', role: 'CID' } }));
		const { login } = await import('../index');
		const out = await login('u', 'p');
		expect(out.token).toBe('legacy');
	});

	it('login: success true without data throws', async () => {
		fetchSpy.mockResolvedValueOnce(jsonResponse({ success: true }));
		const { login } = await import('../index');
		await expect(login('u', 'p')).rejects.toThrow(/invalid envelope/);
	});

	it('listCases: canonical array in data', async () => {
		fetchSpy.mockResolvedValueOnce(
			jsonResponse({
				success: true,
				data: [{ id: 'c1', case_number: 'X', title: 't', unit: 'CID', status: 'OPEN' }]
			})
		);
		const { listCases } = await import('../index');
		const rows = await listCases('ALL', 'tok');
		expect(rows).toHaveLength(1);
		expect(rows[0].id).toBe('c1');
	});

	it('getCaseById: uses GET /cases/:id and unwraps data', async () => {
		fetchSpy.mockResolvedValueOnce(
			jsonResponse({
				success: true,
				data: { id: 'cid', case_number: 'N', title: 'T', unit: 'CID', status: 'OPEN' }
			})
		);
		const { getCaseById } = await import('../index');
		const c = await getCaseById('cid', 'tok');
		expect(c.case_number).toBe('N');
		const [url, init] = fetchSpy.mock.calls[0];
		expect(String(url)).toContain('/cases/cid');
		expect((init as RequestInit).headers).toMatchObject({ Authorization: 'Bearer tok' });
	});

	it('createCase: POST /cases unwraps data', async () => {
		fetchSpy.mockResolvedValueOnce(
			jsonResponse(
				{
					success: true,
					data: { id: 'new', case_number: 'N', title: 'T', unit: 'CID', status: 'OPEN' }
				},
				201
			)
		);
		const { createCase } = await import('../index');
		const c = await createCase('tok', {
			case_number: ' cid-0001 ',
			title: 'T',
			unit: 'CID',
			status: 'OPEN',
			incident_date: '2026-03-22'
		});
		expect(c.id).toBe('new');
		expect(fetchSpy.mock.calls[0][1]).toMatchObject({ method: 'POST' });
		const body = JSON.parse(String((fetchSpy.mock.calls[0][1] as RequestInit).body));
		expect(body.case_number).toBe('CID-0001');
	});

	it('createCase sends normalized incident_date when provided', async () => {
		fetchSpy.mockResolvedValueOnce(
			jsonResponse(
				{
					success: true,
					data: {
						id: 'new-incident',
						case_number: 'N2',
						title: 'T2',
						unit: 'CID',
						status: 'OPEN',
						incident_date: '2026-03-22'
					}
				},
				201
			)
		);
		const { createCase } = await import('../index');
		await createCase('tok', {
			case_number: 'cid-0002',
			title: 'T2',
			unit: 'CID',
			status: 'OPEN',
			incident_date: ' 2026-03-22 '
		});
		const body = JSON.parse(String((fetchSpy.mock.calls[0][1] as RequestInit).body));
		expect(body.incident_date).toBe('2026-03-22');
	});

	it('createCase omits blank incident_date', async () => {
		const { createCase } = await import('../index');
		await expect(
			createCase('tok', {
				case_number: 'cid-0003',
				title: 'T3',
				unit: 'CID',
				status: 'OPEN',
				incident_date: '   '
			})
		).rejects.toThrow(/Incident date is required/);
		expect(fetchSpy).not.toHaveBeenCalled();
	});

	it('createCase rejects missing incident_date before request', async () => {
		const { createCase } = await import('../index');
		await expect(
			createCase('tok', {
				case_number: 'cid-0003',
				title: 'T3',
				unit: 'CID',
				status: 'OPEN'
			})
		).rejects.toThrow(/Incident date is required/);
		expect(fetchSpy).not.toHaveBeenCalled();
	});

	it('createCase rejects invalid incident_date before request', async () => {
		const { createCase } = await import('../index');
		await expect(
			createCase('tok', {
				case_number: 'cid-0004',
				title: 'T4',
				unit: 'CID',
				status: 'OPEN',
				incident_date: '2026-02-31'
			})
		).rejects.toThrow(/Incident date must use YYYY-MM-DD/);
		expect(fetchSpy).not.toHaveBeenCalled();
	});

	it('createCase rejects datetime-like incident_date to preserve date-only contract', async () => {
		const { createCase } = await import('../index');
		await expect(
			createCase('tok', {
				case_number: 'cid-0005',
				title: 'T5',
				unit: 'CID',
				status: 'OPEN',
				incident_date: '2026-03-22T00:00:00.000Z'
			})
		).rejects.toThrow(/Incident date must use YYYY-MM-DD/);
		expect(fetchSpy).not.toHaveBeenCalled();
	});

	it('fetchCaseEngineHealth: unwraps data', async () => {
		fetchSpy.mockResolvedValueOnce(
			jsonResponse({ success: true, data: { status: 'ok', service: 'case-engine' } })
		);
		const { fetchCaseEngineHealth } = await import('../index');
		const h = await fetchCaseEngineHealth();
		expect(h.service).toBe('case-engine');
		expect(String(fetchSpy.mock.calls[0][0])).toMatch(/\/health$/);
	});

	it('HTTP error prefers canonical error.message', async () => {
		fetchSpy.mockResolvedValueOnce(
			jsonResponse({ success: false, error: { code: 'BAD_REQUEST', message: 'unit must be CID or SIU' } }, 400)
		);
		const { createCase } = await import('../index');
		await expect(
			createCase('tok', {
				case_number: 'x',
				title: 't',
				unit: 'CID',
				status: 'OPEN',
				incident_date: '2026-03-22'
			})
		).rejects.toThrow(/unit must be CID or SIU/);
	});

	it('createCase surfaces duplicate case number conflict detail', async () => {
		fetchSpy.mockResolvedValueOnce(
			jsonResponse(
				{
					success: false,
					error: { code: 'CASE_NUMBER_EXISTS', message: 'Case number already exists' }
				},
				409
			)
		);
		const { createCase } = await import('../index');
		await expect(
			createCase('tok', {
				case_number: 'CID-0001',
				title: 'Dup',
				unit: 'CID',
				status: 'OPEN',
				incident_date: '2026-03-22'
			})
		).rejects.toThrow(/Case number already exists/);
	});

	it('updateCase sends normalized payload and unwraps data', async () => {
		fetchSpy.mockResolvedValueOnce(
			jsonResponse({
				success: true,
				data: {
					id: 'cid',
					case_number: 'CID-009',
					title: 'Updated',
					unit: 'CID',
					status: 'OPEN',
					incident_date: '2026-03-23'
				}
			})
		);
		const { updateCase } = await import('../index');
		const out = await updateCase('tok', 'cid', {
			case_number: ' cid-009 ',
			title: ' Updated ',
			incident_date: ' 2026-03-23 '
		});
		expect(out.case_number).toBe('CID-009');
		const [url, init] = fetchSpy.mock.calls[0];
		expect(String(url)).toContain('/cases/cid');
		expect((init as RequestInit).method).toBe('PATCH');
		const body = JSON.parse(String((init as RequestInit).body));
		expect(body).toEqual({
			case_number: 'CID-009',
			title: 'Updated',
			incident_date: '2026-03-23'
		});
	});

	it('updateCase rejects invalid payload before request', async () => {
		const { updateCase } = await import('../index');
		await expect(updateCase('tok', 'cid', { incident_date: '2026-02-31' })).rejects.toThrow(
			/Incident date must use YYYY-MM-DD/
		);
		expect(fetchSpy).not.toHaveBeenCalled();
	});

	it('updateCase supports partial patch for unchanged legacy incident date', async () => {
		fetchSpy.mockResolvedValueOnce(
			jsonResponse({
				success: true,
				data: {
					id: 'cid',
					case_number: 'CID-009',
					title: 'Title only changed',
					unit: 'CID',
					status: 'OPEN',
					incident_date: null
				}
			})
		);
		const { updateCase } = await import('../index');
		await updateCase('tok', 'cid', { title: ' Title only changed ' });
		const body = JSON.parse(String((fetchSpy.mock.calls[0][1] as RequestInit).body));
		expect(body).toEqual({ title: 'Title only changed' });
	});

	it('requestCaseSummary reuses existing backend route and returns payload', async () => {
		fetchSpy.mockResolvedValueOnce(
			jsonResponse({
				caseId: 'cid',
				generatedAt: '2026-03-23T10:00:00.000Z',
				params: { maxSources: 200, maxTextPerSource: 800 },
				evidencePack: { packVersion: 1, items: [] },
				summary: {
					primarySuspects: ['A'],
					keyEvents: [],
					evidenceHighlights: [],
					recommendedNextSteps: [],
					openQuestions: []
				},
				citations: []
			})
		);
		const { requestCaseSummary } = await import('../index');
		const out = await requestCaseSummary('cid', 'tok');
		expect(out.caseId).toBe('cid');
		const [url, init] = fetchSpy.mock.calls[0];
		expect(String(url)).toContain('/cases/cid/ai/case-summary');
		expect((init as RequestInit).method).toBe('POST');
	});

	it('getCaseSummaryStatus fetches summary metadata from backend', async () => {
		fetchSpy.mockResolvedValueOnce(
			jsonResponse({
				summary: null,
				lastSummaryGeneratedAt: null,
				latestActivityAt: '2026-03-23T09:00:00.000Z',
				isStale: false
			})
		);
		const { getCaseSummaryStatus } = await import('../index');
		const out = await getCaseSummaryStatus('cid', 'tok');
		expect(out.summary).toBeNull();
		const [url, init] = fetchSpy.mock.calls[0];
		expect(String(url)).toContain('/cases/cid/ai/case-summary/status');
		expect((init as RequestInit).method ?? 'GET').toBe('GET');
	});

	it('requestCaseBrief posts filters and returns grouped brief payload', async () => {
		fetchSpy.mockResolvedValueOnce(
			jsonResponse({
				case: {
					case_id: 'cid',
					case_number: 'CID-100',
					title: 'Test brief case',
					unit: 'CID'
				},
				sections: [
					{
						date: '2026-03-24',
						entries: [
							{
								entry_id: 'e1',
								occurred_at: '2026-03-24T10:00:00Z',
								created_at: '2026-03-24T10:05:00Z',
								created_by: 'u1',
								created_by_name: 'Detective One',
								type: 'CALL',
								text: 'Cleaned text',
								has_cleaned: true
							}
						]
					}
				]
			})
		);
		const { requestCaseBrief } = await import('../index');
		const out = await requestCaseBrief('cid', 'tok', {
			date_from: ' 2026-03-24T00:00:00Z ',
			types: [' CALL ', '', 'NOTE']
		});
		expect(out.case.case_id).toBe('cid');
		expect(out.sections[0].entries[0].type).toBe('CALL');
		const [url, init] = fetchSpy.mock.calls[0];
		expect(String(url)).toContain('/cases/cid/brief');
		expect((init as RequestInit).method).toBe('POST');
		const body = JSON.parse(String((init as RequestInit).body));
		expect(body).toEqual({
			date_from: '2026-03-24T00:00:00Z',
			types: ['CALL', 'NOTE']
		});
	});

	it('requestTimelineIntelligenceSummary posts filters and returns structured payload', async () => {
		fetchSpy.mockResolvedValueOnce(
			jsonResponse({
				summary: 'Timeline summary text',
				key_events: [{ entry_id: 'e1', reason: 'Anchor event' }],
				gaps: [{ description: 'Missing witness follow-up time' }],
				meta: {
					entry_count: 3,
					date_from: '2026-03-24T00:00:00Z',
					date_to: null,
					types: ['NOTE', 'CALL']
				}
			})
		);
		const { requestTimelineIntelligenceSummary } = await import('../index');
		const out = await requestTimelineIntelligenceSummary('cid', 'tok', {
			date_from: ' 2026-03-24T00:00:00Z ',
			types: [' NOTE ', '', 'CALL']
		});
		expect(out.summary).toBe('Timeline summary text');
		expect(out.key_events[0].entry_id).toBe('e1');
		expect(out.meta?.entry_count).toBe(3);
		const [url, init] = fetchSpy.mock.calls[0];
		expect(String(url)).toContain('/cases/cid/timeline-summary');
		expect((init as RequestInit).method).toBe('POST');
		const body = JSON.parse(String((init as RequestInit).body));
		expect(body).toEqual({
			date_from: '2026-03-24T00:00:00Z',
			types: ['NOTE', 'CALL']
		});
	});

	it('getEntityProfile reads backend entity profile route', async () => {
		fetchSpy.mockResolvedValueOnce(
			jsonResponse({
				entity: { type: 'phone', normalized_id: '5551234567', display_label: '(555) 123-4567' },
				scope_applied: 'UNIT',
				unit_applied: 'CID',
				summary: {
					case_count: 1,
					occurrence_count: 2,
					timeline_occurrence_count: 1,
					file_occurrence_count: 1,
					first_seen_at: '2026-03-24T10:00:00Z',
					last_seen_at: '2026-03-24T11:00:00Z'
				},
				evidence: []
			})
		);
		const { getEntityProfile } = await import('../index');
		const out = await getEntityProfile('phone', '5551234567', 'tok', { scope: 'UNIT', unit: 'CID' });
		expect(out.entity.type).toBe('phone');
		const [url] = fetchSpy.mock.calls[0];
		expect(String(url)).toContain('/entities/phone/5551234567/profile?scope=UNIT&unit=CID');
	});

	it('exportCaseBriefPdf posts export request and returns filename from header', async () => {
		fetchSpy.mockResolvedValueOnce(
			new Response('pdf-bytes', {
				status: 200,
				headers: {
					'Content-Type': 'application/pdf',
					'Content-Disposition': 'attachment; filename="case-brief-CID-100.pdf"'
				}
			})
		);
		const { exportCaseBriefPdf } = await import('../index');
		const out = await exportCaseBriefPdf('cid', 'tok', { format: 'pdf', types: [' CALL '] });
		expect(out.filename).toBe('case-brief-CID-100.pdf');
		expect(out.blob.size).toBeGreaterThan(0);
		const [url, init] = fetchSpy.mock.calls[0];
		expect(String(url)).toContain('/cases/cid/brief/export');
		expect((init as RequestInit).method).toBe('POST');
		const body = JSON.parse(String((init as RequestInit).body));
		expect(body).toEqual({ format: 'pdf', types: ['CALL'] });
	});

	it('success false on OK status throws from unwrap', async () => {
		fetchSpy.mockResolvedValueOnce(
			jsonResponse({ success: false, error: { code: 'X', message: 'nope' } }, 200)
		);
		const { listCases } = await import('../index');
		await expect(listCases('ALL', 'tok')).rejects.toThrow(/nope/);
	});

	it('getCaseById: invalid envelope on OK throws CaseEngineRequestError (P20-PRE-04)', async () => {
		fetchSpy.mockResolvedValueOnce(jsonResponse({ success: true }, 200));
		const { getCaseById, CaseEngineRequestError } = await import('../index');
		let err: unknown;
		try {
			await getCaseById('cid', 'tok');
		} catch (e) {
			err = e;
		}
		expect(err).toBeInstanceOf(CaseEngineRequestError);
		expect((err as InstanceType<typeof CaseEngineRequestError>).errorCode).toBe('INVALID_ENVELOPE');
	});

	it('P20-PRE-07: askCaseQuestion rejects success envelope without data (canonical contract)', async () => {
		fetchSpy.mockResolvedValueOnce(jsonResponse({ success: true }, 200));
		const { askCaseQuestion, CaseEngineRequestError } = await import('../index');
		let err: unknown;
		try {
			await askCaseQuestion('case-1', 'question text ok?', 'tok', 8, undefined, 'thread-1');
		} catch (e) {
			err = e;
		}
		expect(err).toBeInstanceOf(CaseEngineRequestError);
		expect((err as InstanceType<typeof CaseEngineRequestError>).errorCode).toBe('INVALID_ENVELOPE');
	});

	it('askCase preserves opaque citation ids (including file chunk evidence ids)', async () => {
		fetchSpy.mockResolvedValueOnce(
			jsonResponse({
				success: true,
				data: {
					answer: 'ok',
					citations: [{ type: 'file', id: 'file-uuid:chunk-uuid' }],
					meta: { source: 'case' },
					question: 'q',
					confidence: 'LOW',
					evidence_citations: [
						{
							source_type: 'case_file',
							id: 'file-uuid',
							chunk_id: 'chunk-uuid',
							original_filename: 'report.pdf',
							uploaded_at: '2026-03-22T00:00:00.000Z',
							page_start: 3,
							page_end: 5,
							snippet: 'sample'
						}
					],
					used_citations: []
				}
			})
		);
		const { askCase } = await import('../index');
		const out = await askCase('case-1', 'question?', 'case', 'tok', 'thread-1');
		expect(out.citations).toHaveLength(1);
		expect(out.citations[0]).toEqual({ type: 'file', id: 'file-uuid:chunk-uuid' });
	});
});
