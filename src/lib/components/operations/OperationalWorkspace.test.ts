/**
 * P14-04: Basic operations workspace tests.
 * Verifies API client and component wiring; no full mount.
 */
import { describe, it, expect } from 'vitest';
import * as api from '../../apis/operationsApi';

describe('Operations API', () => {
	it('exports getOperationalPlans', () => {
		expect(typeof api.getOperationalPlans).toBe('function');
	});

	it('exports getOperationalTimeline', () => {
		expect(typeof api.getOperationalTimeline).toBe('function');
	});

	it('exports getOperationalTasks', () => {
		expect(typeof api.getOperationalTasks).toBe('function');
	});

	it('exports getOperationProgressSummary', () => {
		expect(typeof api.getOperationProgressSummary).toBe('function');
	});

	it('exports assignOperationalTask', () => {
		expect(typeof api.assignOperationalTask).toBe('function');
	});

	it('exports completeOperationalTask', () => {
		expect(typeof api.completeOperationalTask).toBe('function');
	});
});
