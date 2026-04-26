import { DS_ENTITY_DETAIL_CLASSES } from '$lib/case/detectivePrimitiveFoundation';

/**
 * Styling for entity pretab risk / posture chips (PERSON tactical strip).
 */
export function pretabRiskLevelClasses(level: 'high' | 'medium' | 'low'): {
	diamond: string;
	pill: string;
	label: string;
} {
	if (level === 'high') {
		return {
			diamond: `${DS_ENTITY_DETAIL_CLASSES.riskDiamond} ${DS_ENTITY_DETAIL_CLASSES.riskDiamondHigh}`,
			pill: `${DS_ENTITY_DETAIL_CLASSES.riskLevelPill} ${DS_ENTITY_DETAIL_CLASSES.riskLevelHigh}`,
			label: 'High'
		};
	}
	if (level === 'medium') {
		return {
			diamond: `${DS_ENTITY_DETAIL_CLASSES.riskDiamond} ${DS_ENTITY_DETAIL_CLASSES.riskDiamondMed}`,
			pill: `${DS_ENTITY_DETAIL_CLASSES.riskLevelPill} ${DS_ENTITY_DETAIL_CLASSES.riskLevelMed}`,
			label: 'Medium'
		};
	}
	return {
		diamond: `${DS_ENTITY_DETAIL_CLASSES.riskDiamond} ${DS_ENTITY_DETAIL_CLASSES.riskDiamondLow}`,
		pill: `${DS_ENTITY_DETAIL_CLASSES.riskLevelPill} ${DS_ENTITY_DETAIL_CLASSES.riskLevelLow}`,
		label: 'Low'
	};
}
