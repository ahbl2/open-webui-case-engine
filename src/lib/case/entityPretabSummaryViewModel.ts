/**
 * Declarative view-models for `EntityPretabSummary` (shared pre-tab header summaries).
 * Keeps field slots explicit — no ad-hoc attribute smuggling into the wrong section.
 */
import type { CaseIntelligenceCommittedEntity } from '$lib/apis/caseEngine';

/** Entity kinds rendered by the shared pretab (PHONE is future / API may extend). */
export type EntityPretabLayoutKind = CaseIntelligenceEntityKind | 'PHONE';

export type PretabValueClass = 'vin' | 'coord' | 'notes' | 'notes-prose' | 'none' | undefined;

export type PretabFieldRow = {
	key: string;
	label: string;
	value: string;
	/** Optional presentation modifier (maps to shared CSS). */
	valueClass?: PretabValueClass;
};

export type PretabFieldSection = {
	key: string;
	title: string;
	rows: PretabFieldRow[];
	/** e.g. entity-detail-vehicle-pretab-col-details */
	dataTestid?: string;
	/** e.g. full-width on narrow breakpoints (Location record col). */
	columnClass?: string;
};

export type PretabProseSection = {
	key: string;
	title: string;
	text: string;
	placeholder: boolean;
	dataTestid?: string;
	columnClass?: string;
};

export type PretabMediaIcon = 'truck' | 'mappin' | 'phone';

export type MediaGridPretabViewModel = {
	form: 'media_grid';
	dataEntityKind: 'VEHICLE' | 'LOCATION' | 'PHONE';
	dashboardTestid: string;
	media: {
		variant: 'landscape_photo' | 'landscape_icon';
		photoUrl: string | null;
		icon: PretabMediaIcon;
		/** Fired when the photo fails to load (parent clears / tracks failure). */
		onPhotoError?: () => void;
		badgeText: string;
		badgeTestid: string;
		mediaTestid?: string;
		/** e.g. entity-detail-location-pretab-icon (vehicle photo aspect is untestid) */
		iconAspectTestid?: string;
		fallbackTestid?: string;
	};
	columns: Array<PretabFieldSection | PretabProseSection>;
	footLine: string | null;
	/** PHONE: render built-in second-row placeholder cards. */
	phoneSecondRow?: boolean;
};

export type PersonPretabViewModel = {
	form: 'person';
	dataEntityKind: 'PERSON';
	dashboardTestid: string;
	mediaTestid: string;
	portraitUrl: string | null;
	portraitInitials: string;
	onPortraitError: () => void;
	identity: {
		name: string;
		dob: string;
		dobAge: string;
		ssn: string;
		dl: string;
		roleBadgeClass: string;
		roleBadgeText: string;
		riskFlagRows: Array<{
			id: string;
			label: string;
			level: 'high' | 'medium' | 'low';
		}>;
	};
	physical: PretabFieldSection;
	record: PretabFieldSection;
	recordListScope: string | null;
};

export type EntityPretabViewModel = PersonPretabViewModel | MediaGridPretabViewModel;

const PHONE_NOT_WIRED = 'Not yet wired';
const NO_SUB = 'No subscriber mapped';
const NO_CARRIER = 'No carrier mapped';
const NO_LINKED = 'No linked entities';

/** Future-ready: PHONE is not a committed API kind yet; used when `entity_kind === 'PHONE'`. */
export function buildPhonePretabPlaceholderViewModel(
	entity: CaseIntelligenceCommittedEntity
): MediaGridPretabViewModel {
	const label = entity.display_label?.trim() || '—';
	return {
		form: 'media_grid',
		dataEntityKind: 'PHONE',
		dashboardTestid: 'entity-detail-phone-pretab-dashboard',
		media: {
			variant: 'landscape_icon',
			photoUrl: null,
			icon: 'phone',
			badgeText: 'Phone',
			badgeTestid: 'entity-detail-phone-pretab-kind-badge',
			mediaTestid: 'entity-detail-phone-pretab-media',
			fallbackTestid: 'entity-detail-phone-pretab-fallback'
		},
		columns: [
			{
				key: 'details',
				title: 'Phone details',
				dataTestid: 'entity-detail-phone-pretab-col-details',
				rows: [
					{ key: 'line', label: 'Line / display', value: label },
					{ key: 'number', label: 'Number (normalized)', value: PHONE_NOT_WIRED },
					{ key: 'line-type', label: 'Line type', value: PHONE_NOT_WIRED }
				]
			},
			{
				key: 'subscriber',
				title: 'Subscriber / carrier',
				dataTestid: 'entity-detail-phone-pretab-col-subscriber',
				rows: [
					{ key: 'subscriber', label: 'Subscriber', value: NO_SUB },
					{ key: 'carrier', label: 'Carrier', value: NO_CARRIER }
				]
			},
			{
				key: 'record',
				title: 'Record & case',
				dataTestid: 'entity-detail-phone-pretab-col-record',
				rows: [
					{ key: 'file', label: 'File context', value: PHONE_NOT_WIRED },
					{ key: 'case', label: 'Case use', value: PHONE_NOT_WIRED }
				]
			}
		],
		footLine: null,
		phoneSecondRow: true
	};
}

export function isProseCol(
	c: PretabFieldSection | PretabProseSection
): c is PretabProseSection {
	return 'text' in c && 'placeholder' in c;
}
