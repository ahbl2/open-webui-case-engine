import type { MediaGridPretabViewModel, PersonPretabViewModel, PretabFieldRow } from '$lib/case/entityPretabSummaryViewModel';

type VehicleLike = {
	photoUrl: string | null;
	detailsRows: PretabFieldRow[];
	regRows: PretabFieldRow[];
	notesDisplay: string;
	notesIsPlaceholder: boolean;
};

type LocationLike = {
	addressRows: PretabFieldRow[];
	placeRows: PretabFieldRow[];
	recordRows: PretabFieldRow[];
};

function vehicleRowsWithVinClass(rows: PretabFieldRow[]): PretabFieldRow[] {
	return rows.map((r) =>
		r.key === 'vin' ? { ...r, valueClass: 'vin' as const } : r
	);
}

function locationRowsWithCoordClass(rows: PretabFieldRow[]): PretabFieldRow[] {
	return rows.map((r) =>
		r.key === 'coordinates' ? { ...r, valueClass: 'coord' as const } : r
	);
}

export function toVehiclePretabViewModel(
	d: VehicleLike,
	ctx: { onPhotoError: () => void; readScopeListLine: string | null; badgeText: string }
): MediaGridPretabViewModel {
	const notes: PretabProseSection = {
		key: 'notes',
		title: 'Notes',
		text: d.notesDisplay,
		placeholder: d.notesIsPlaceholder,
		dataTestid: 'entity-detail-vehicle-pretab-col-notes',
		columnClass: 'ds-entity-pretab-col--notes'
	};
	return {
		form: 'media_grid',
		dataEntityKind: 'VEHICLE',
		dashboardTestid: 'entity-detail-vehicle-pretab-dashboard',
		media: {
			variant: 'landscape_photo',
			photoUrl: d.photoUrl,
			icon: 'truck',
			onPhotoError: ctx.onPhotoError,
			badgeText: ctx.badgeText,
			badgeTestid: 'entity-detail-vehicle-pretab-kind-badge',
			mediaTestid: 'entity-detail-vehicle-pretab-media',
			fallbackTestid: 'entity-detail-vehicle-pretab-fallback'
		},
		columns: [
			{
				key: 'details',
				title: 'Vehicle details',
				dataTestid: 'entity-detail-vehicle-pretab-col-details',
				rows: d.detailsRows
			},
			{
				key: 'reg',
				title: 'Registration & ownership',
				dataTestid: 'entity-detail-vehicle-pretab-col-reg',
				rows: vehicleRowsWithVinClass(d.regRows)
			},
			notes
		],
		footLine: ctx.readScopeListLine
	};
}

export function toLocationPretabViewModel(
	d: LocationLike,
	ctx: { readScopeListLine: string | null; badgeText: string }
): MediaGridPretabViewModel {
	return {
		form: 'media_grid',
		dataEntityKind: 'LOCATION',
		dashboardTestid: 'entity-detail-location-pretab-dashboard',
		media: {
			variant: 'landscape_icon',
			photoUrl: null,
			icon: 'mappin',
			badgeText: ctx.badgeText,
			badgeTestid: 'entity-detail-location-pretab-kind-badge',
			mediaTestid: 'entity-detail-location-pretab-media',
			iconAspectTestid: 'entity-detail-location-pretab-icon',
			fallbackTestid: 'entity-detail-location-pretab-fallback'
		},
		columns: [
			{
				key: 'addr',
				title: 'Address details',
				dataTestid: 'entity-detail-location-pretab-col-address',
				rows: d.addressRows
			},
			{
				key: 'place',
				title: 'Place & address',
				dataTestid: 'entity-detail-location-pretab-col-place',
				rows: locationRowsWithCoordClass(d.placeRows)
			},
			{
				key: 'record',
				title: 'Record & case',
				dataTestid: 'entity-detail-location-pretab-col-record',
				columnClass: 'ds-entity-pretab-col--record',
				rows: d.recordRows
			}
		],
		footLine: ctx.readScopeListLine
	};
}

type PersonPretabCore = {
	name: string;
	dob: string;
	dobAge: string;
	ssn: string;
	dl: string;
	physical: PretabFieldRow[];
	record: PretabFieldRow[];
};

export function toPersonPretabViewModel(
	p: PersonPretabCore,
	tactical: {
		roleBadgeClass: string;
		roleBadgeText: string;
		riskFlagRows: PersonPretabViewModel['identity']['riskFlagRows'];
	},
	ctx: {
		portraitUrl: string | null;
		portraitInitials: string;
		onPortraitError: () => void;
		recordListScope: string | null;
	}
): PersonPretabViewModel {
	return {
		form: 'person',
		dataEntityKind: 'PERSON',
		dashboardTestid: 'entity-detail-person-pretab-dashboard',
		mediaTestid: 'entity-detail-person-header',
		portraitUrl: ctx.portraitUrl,
		portraitInitials: ctx.portraitInitials,
		onPortraitError: ctx.onPortraitError,
		identity: {
			name: p.name,
			dob: p.dob,
			dobAge: p.dobAge,
			ssn: p.ssn,
			dl: p.dl,
			...tactical
		},
		physical: {
			key: 'physical',
			title: 'Physical description',
			dataTestid: 'entity-detail-person-physical-description',
			rows: p.physical
		},
		record: {
			key: 'record',
			title: 'Record details',
			dataTestid: 'entity-detail-person-record-card',
			rows: p.record
		},
		recordListScope: ctx.recordListScope
	};
}
