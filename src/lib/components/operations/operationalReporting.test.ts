/**
 * P14-08: Basic operational reporting API surface tests.
 * Verifies reporting client exports; no full mount.
 */
import { describe, it, expect } from 'vitest';
import * as api from '../../apis/operationsApi';

describe('Operational Reporting API', () => {
	it('exports getCaseOperationalBrief', () => {
		expect(typeof api.getCaseOperationalBrief).toBe('function');
	});

	it('exports getPlanOperationalBrief', () => {
		expect(typeof api.getPlanOperationalBrief).toBe('function');
	});

	it('exports getPlanOperationalSummary', () => {
		expect(typeof api.getPlanOperationalSummary).toBe('function');
	});
});
