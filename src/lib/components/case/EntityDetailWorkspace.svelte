<script lang="ts">
	/**
	 * P69-09 — Entity detail workspace inside focus mode (P69-06): header, Overview cards, deep tabs, dirty hook.
	 */
	import {
		listCaseIntelligenceAssociationsForEntity,
		listCaseIntelligenceAssociationStaging,
		retireCaseIntelligenceEntity,
		restoreCaseIntelligenceEntity,
		type CaseIntelligenceCommittedAssociationProjection,
		type CaseIntelligenceAssociationStagingRecord,
		type CaseIntelligenceCommittedEntity,
		type CaseIntelligenceEntityKind
	} from '$lib/apis/caseEngine';
	import { ageInYearsFromDobString, formatCaseDateTime } from '$lib/utils/formatDateTime';
	import CaseEmptyState from '$lib/components/case/CaseEmptyState.svelte';
	import CaseErrorState from '$lib/components/case/CaseErrorState.svelte';
	import CaseLoadingState from '$lib/components/case/CaseLoadingState.svelte';
	import {
		associationKindLabel,
		assertionLaneLabel,
		coreAttributesEntries
	} from '$lib/utils/caseIntelligenceEntityDetailDisplay';
	import {
		buildRegistrySecondaryLine,
		entityPortraitUrl,
		initialsFromDisplayLabel,
		pickAttrString,
		personPostureShort
	} from '$lib/utils/caseIntelligenceEntityRegistry';
	import { CASE_DESTINATION_LABELS, CASE_DESTINATION_TITLES } from '$lib/utils/caseDestinationLabels';
	import { committedEntityEvidenceFocusGate } from '$lib/utils/entityFocus';
	import { toast } from 'svelte-sonner';
	import {
		DS_BTN_CLASSES,
		DS_ENTITY_BOARD_CLASSES,
		DS_ENTITY_DETAIL_CLASSES,
		DS_INTELLIGENCE_CLASSES,
		DS_SKELETON_CLASSES,
		DS_TIMELINE_CLASSES,
		DS_TYPE_CLASSES
	} from '$lib/case/detectivePrimitiveFoundation';
	import EntityPretabSummary from '$lib/components/case/EntityPretabSummary.svelte';
	import { buildPhonePretabPlaceholderViewModel } from '$lib/case/entityPretabSummaryViewModel';
	import {
		toLocationPretabViewModel,
		toPersonPretabViewModel,
		toVehiclePretabViewModel
	} from '$lib/case/entityPretabSummaryFromEntity';
	import { pretabRiskLevelClasses } from '$lib/case/entityPretabRiskChips';

	export let caseId: string;
	export let token: string;
	export let entity: CaseIntelligenceCommittedEntity | null;
	export let detailLoading = false;
	export let detailError = '';
	export let readScope: 'active_only' | 'include_retired' | null = null;
	export let onRetryDetail: () => void;
	/** Focus shell: closes detail / returns to board (dirty-gated in parent). */
	export let onCloseDetails: (() => void) | undefined = undefined;
	/** P69-05 / P69-06 — workspace publishes aggregate dirty for shell gates. */
	export let onDetailDirtyChange: ((dirty: boolean) => void) | undefined = undefined;
	/** Opens Phase 68 association composer (modal) for this entity. */
	export let onOpenAssociationComposer: ((entity: CaseIntelligenceCommittedEntity) => void) | undefined =
		undefined;
	/** After retire/restore, parent should reload entity GET. */
	export let onEntityNeedsRefresh: (() => void) | undefined = undefined;

	/** Focus shell calls this when user chooses Discard at dirty gate. */
	export function discardUnsavedWorkspaceDraft(): void {
		notesDraft = '';
		onDetailDirtyChange?.(false);
	}

	export type EntityDetailPrimaryTab =
		| 'overview'
		| 'associations'
		| 'timeline'
		| 'notes'
		| 'history'
		| 'files';

	const PRIMARY_TABS: Array<{ id: EntityDetailPrimaryTab; label: string }> = [
		{ id: 'overview', label: 'Overview' },
		{ id: 'associations', label: 'Associations' },
		{ id: 'timeline', label: 'Timeline' },
		{ id: 'notes', label: 'Notes' },
		{ id: 'history', label: 'History' },
		{ id: 'files', label: 'Files' }
	];

	const ASSOC_SUMMARY_CAP = 5;

	/* PERSON pre-tab: stable placeholder copy (tune as backend wiring lands). */
	const PP_NOT_WIRED = 'Not yet wired';
	const PP_PENDING_SOURCE = 'Pending source mapping';
	const PP_DASH = '—';
	const PP_NO_ADDRESS = 'No address mapped';
	const PP_NO_PHONE = 'No phone mapped';
	const PP_NO_EMAIL = 'No email mapped';
	const PP_NO_VEH = 'No linked vehicles';
	const PP_NO_LOC = 'No linked locations';
	const PP_NO_ENT = 'No linked entities';
	const PP_LOADING = 'Loading…';

	type PersonPretabLabeled = { key: string; label: string; value: string };

	function personPretabAddressLine(attrs: Record<string, unknown>): string | null {
		const direct = pickAttrString(attrs, [
			'address',
			'mailing_address',
			'residence',
			'residency',
			'home_address',
			'full_address',
			'normalized_address',
			'street',
			'location_address'
		]);
		if (direct) return direct;
		const line1 = pickAttrString(attrs, ['addr1', 'address_line1', 'street1', 'street_line1']);
		const line2 = pickAttrString(attrs, ['addr2', 'address_line2', 'apartment', 'apt', 'suite', 'unit']);
		const city = pickAttrString(attrs, ['city', 'locality', 'town']);
		const st = pickAttrString(attrs, ['state', 'region', 'province']);
		const zip = pickAttrString(attrs, ['zip', 'postal', 'postal_code', 'zipcode']);
		const csl = [city, st, zip].filter(Boolean);
		const cityLine = csl.length ? csl.join(', ') : '';
		const parts = [line1, line2, cityLine].map((p) => p?.trim()).filter((p) => p && p.length > 0);
		return parts.length ? parts.join(' · ') : null;
	}

	function fileCreatedPretabLine(ent: CaseIntelligenceCommittedEntity): string {
		if (!ent.created_at?.trim()) return PP_NOT_WIRED;
		return formatCaseDateTime(ent.created_at) || PP_NOT_WIRED;
	}

	function lastUpdatedPretabLine(ent: CaseIntelligenceCommittedEntity): string {
		if (!ent.updated_at?.trim()) return PP_PENDING_SOURCE;
		return formatCaseDateTime(ent.updated_at) || PP_PENDING_SOURCE;
	}

	function personPretabViewModel(
		ent: CaseIntelligenceCommittedEntity,
		assocs: CaseIntelligenceCommittedAssociationProjection[],
		assocLoading: boolean,
		assocError: string
	): {
		name: string;
		dob: string;
		dobAge: string;
		ssn: string;
		dl: string;
		record: PersonPretabLabeled[];
		contact: PersonPretabLabeled[];
		physical: PersonPretabLabeled[];
		investigative: PersonPretabLabeled[];
	} {
		const attrs = ent.core_attributes ?? {};
		const name = ent.display_label?.trim() || PP_DASH;
		const idOr = (v: string | null, ph: string) => (v && v.trim() ? v : ph);
		const em = PP_DASH;
		return {
			name,
			dob: (() => {
				const raw = pickAttrString(attrs, [
					'dob',
					'date_of_birth',
					'dateOfBirth',
					'birth_date'
				]);
				if (!raw?.trim()) return em;
				return raw.trim();
			})(),
			dobAge: (() => {
				const raw = pickAttrString(attrs, [
					'dob',
					'date_of_birth',
					'dateOfBirth',
					'birth_date'
				]);
				if (!raw?.trim()) return em;
				const a = ageInYearsFromDobString(raw.trim());
				return a != null ? String(a) : em;
			})(),
			ssn: idOr(
				pickAttrString(attrs, [
					'ssn',
					'SSN',
					'social_security_number',
					'social_security',
					'ssn_last4'
				]),
				em
			),
			dl: idOr(
				pickAttrString(attrs, [
					'dl',
					'driver_license',
					'drivers_license',
					'dl_number',
					'license_number'
				]),
				em
			),
			record: [
				{ key: 'file-created', label: 'File Created', value: fileCreatedPretabLine(ent) },
				{ key: 'last-updated', label: 'Last Updated', value: lastUpdatedPretabLine(ent) },
				{
					key: 'source-of-truth',
					label: 'Source of Truth',
					value:
						pickAttrString(attrs, [
							'source_of_truth',
							'source_system',
							'system_of_record',
							'authoritative_source',
							'data_source',
							'record_source'
						]) ?? PP_DASH
				}
			],
			contact: [
				{
					key: 'addr',
					label: 'Address',
					value: personPretabAddressLine(attrs) ?? PP_NO_ADDRESS
				},
				{
					key: 'phone',
					label: 'Phone',
					value:
						pickAttrString(attrs, [
							'phone',
							'mobile',
							'cell',
							'home_phone',
							'work_phone',
							'primary_phone',
							'telephone'
						]) ?? PP_NO_PHONE
				},
				{
					key: 'email',
					label: 'Email',
					value: pickAttrString(attrs, ['email', 'e_mail', 'primary_email', 'work_email']) ?? PP_NO_EMAIL
				}
			],
			physical: [
				{
					key: 'race',
					label: 'Race',
					value: idOr(
						pickAttrString(attrs, [
							'race',
							'ethnicity',
							'RACE',
							'racial_appearance',
							'ethnic_appearance'
						]),
						em
					)
				},
				{
					key: 'height',
					label: 'Height',
					value: idOr(
						pickAttrString(attrs, [
							'height',
							'height_in',
							'height_inches',
							'stature',
							'HEIGHT',
							'height_text'
						]),
						em
					)
				},
				{
					key: 'weight',
					label: 'Weight',
					value: idOr(
						pickAttrString(attrs, [
							'weight',
							'weight_lbs',
							'weight_lb',
							'body_weight',
							'WEIGHT',
							'weight_text'
						]),
						em
					)
				},
				{
					key: 'hair',
					label: 'Hair color',
					value: idOr(
						pickAttrString(attrs, [
							'hair',
							'hair_color',
							'hair_colour',
							'HAIR_COLOR',
							'hairColor'
						]),
						em
					)
				},
				{
					key: 'eyes',
					label: 'Eye color',
					value: idOr(
						pickAttrString(attrs, [
							'eyes',
							'eye_color',
							'eye_colour',
							'EYE_COLOR',
							'eyeColor'
						]),
						em
					)
				}
			],
			investigative: (() => {
				if (assocLoading) {
					return [
						{ key: 'ic-role', label: 'Case Role', value: PP_LOADING },
						{ key: 'ic-veh', label: 'Associated Vehicles', value: PP_LOADING },
						{ key: 'ic-loc', label: 'Associated Locations', value: PP_LOADING },
						{ key: 'ic-ent', label: 'Linked Entities', value: PP_LOADING }
					];
				}
				if (assocError) {
					return [
						{ key: 'ic-role', label: 'Case Role', value: PP_NOT_WIRED },
						{ key: 'ic-veh', label: 'Associated Vehicles', value: PP_NOT_WIRED },
						{ key: 'ic-loc', label: 'Associated Locations', value: PP_NOT_WIRED },
						{ key: 'ic-ent', label: 'Linked Entities', value: PP_NOT_WIRED }
					];
				}
				const caseRole =
					pickAttrString(attrs, [
						'case_role',
						'case_role_label',
						'subject_role',
						'registry_role',
						'role',
						'capacity',
						'involvement_role'
					]) ?? PP_NOT_WIRED;
				const vehN = assocs.filter((a) => a.association_kind === 'OPERATES_VEHICLE').length;
				const locN = assocs.filter((a) => a.association_kind === 'ASSOCIATED_WITH').length;
				const entN = assocs.length;
				return [
					{ key: 'ic-role', label: 'Case Role', value: caseRole },
					{
						key: 'ic-veh',
						label: 'Associated Vehicles',
						value: vehN > 0 ? `${vehN} linked` : PP_NO_VEH
					},
					{
						key: 'ic-loc',
						label: 'Associated Locations',
						value: locN > 0 ? `${locN} linked` : PP_NO_LOC
					},
					{
						key: 'ic-ent',
						label: 'Linked Entities',
						value: entN > 0 ? `${entN} linked` : PP_NO_ENT
					}
				];
			})()
		};
	}

	let primaryTab: EntityDetailPrimaryTab = 'overview';
	let prevBoundEntityId = '';

	let assocCommitted: CaseIntelligenceCommittedAssociationProjection[] = [];
	let assocStaging: CaseIntelligenceAssociationStagingRecord[] = [];
	let assocLoading = false;
	let assocError = '';
	let assocLoadSeq = 0;

	let actionsOpen = false;
	let portraitFailed = false;

	let notesDraft = '';
	let showRetireConfirm = false;
	let retireBusy = false;

	$: summaryLine = entity ? buildRegistrySecondaryLine(entity.entity_kind, entity) : null;
	$: attrRows = entity ? coreAttributesEntries(entity.core_attributes ?? {}) : [];
	$: portraitUrl =
		entity && entity.entity_kind === 'PERSON'
			? entityPortraitUrl(entity.core_attributes ?? {})
			: null;
	$: metaMiddot =
		entity ? [personPostureShort(entity.person_identity_posture), summaryLine].filter(Boolean).join(' · ') : '';

	/** Only surface entity-evidence focus when a navigable deep link exists (no empty-state messaging). */
	$: entityFocusNavigate = (() => {
		if (!entity) return null;
		const g = committedEntityEvidenceFocusGate(entity);
		return g.outcome === 'navigate' ? g : null;
	})();

	$: workspaceDirty = notesDraft.trim().length > 0;
	$: onDetailDirtyChange?.(workspaceDirty);

	$: if (entity?.id !== prevBoundEntityId) {
		prevBoundEntityId = entity?.id ?? '';
		primaryTab = 'overview';
		notesDraft = '';
		portraitFailed = false;
		assocCommitted = [];
		assocStaging = [];
		assocError = '';
		if (entity?.id) void loadAssociationsFor(entity.id);
		else assocLoading = false;
	}

	function kindLabel(k: CaseIntelligenceEntityKind | 'PHONE'): string {
		switch (k) {
			case 'PERSON':
				return 'Person';
			case 'VEHICLE':
				return 'Vehicle';
			case 'LOCATION':
				return 'Location';
			case 'PHONE':
				return 'Phone';
			default:
				return k;
		}
	}

	function setTab(tab: EntityDetailPrimaryTab): void {
		primaryTab = tab;
		actionsOpen = false;
	}

	function otherEndpointId(row: CaseIntelligenceCommittedAssociationProjection, anchor: string): string {
		return row.endpoint_a_entity_id === anchor ? row.endpoint_b_entity_id : row.endpoint_a_entity_id;
	}

	function isStagingOpen(s: CaseIntelligenceAssociationStagingRecord): boolean {
		return s.status === 'draft' || s.status === 'pending';
	}

	async function loadAssociationsFor(entityId: string): Promise<void> {
		assocLoadSeq += 1;
		const seq = assocLoadSeq;
		if (!caseId || !token || !entityId) return;
		assocLoading = true;
		assocError = '';
		try {
			const [adjacency, stagingAll] = await Promise.all([
				listCaseIntelligenceAssociationsForEntity(caseId, entityId, token, { includeRetired: true }),
				listCaseIntelligenceAssociationStaging(caseId, token, { status: 'draft,pending' })
			]);
			if (seq !== assocLoadSeq) return;
			assocCommitted = adjacency.committed_associations;
			const aid = adjacency.anchor_entity_id;
			assocStaging = stagingAll.filter(
				(r) =>
					isStagingOpen(r) && (r.endpoint_a_entity_id === aid || r.endpoint_b_entity_id === aid)
			);
		} catch (e) {
			if (seq !== assocLoadSeq) return;
			assocError = e instanceof Error ? e.message : 'Could not load associations.';
			assocCommitted = [];
			assocStaging = [];
		} finally {
			if (seq === assocLoadSeq) assocLoading = false;
		}
	}

	function retryAssoc(): void {
		if (entity?.id) void loadAssociationsFor(entity.id);
	}

	function proposalsHref(): string {
		return `/case/${caseId}/proposals`;
	}
	function notesHref(): string {
		return `/case/${caseId}/notes`;
	}
	function filesHref(): string {
		return `/case/${caseId}/files`;
	}
	function timelineCaseHref(): string {
		return `/case/${caseId}/timeline`;
	}

	async function confirmRetire(): Promise<void> {
		if (!entity || retireBusy) return;
		retireBusy = true;
		try {
			await retireCaseIntelligenceEntity(caseId, entity.id, token);
			toast.success('Entity retired.');
			showRetireConfirm = false;
			onEntityNeedsRefresh?.();
		} catch (e) {
			toast.error(e instanceof Error ? e.message : 'Retire failed.');
		} finally {
			retireBusy = false;
		}
	}

	async function runRestore(): Promise<void> {
		if (!entity) return;
		try {
			await restoreCaseIntelligenceEntity(caseId, entity.id, token);
			toast.success('Entity restored.');
			onEntityNeedsRefresh?.();
		} catch (e) {
			toast.error(e instanceof Error ? e.message : 'Restore failed.');
		}
	}

	$: assocPreview = assocCommitted.slice(0, ASSOC_SUMMARY_CAP);
	$: assocTotalCount = assocCommitted.length + assocStaging.length;
	$: heroAttrRows = attrRows.slice(0, 10);
	$: personPretab =
		entity && entity.entity_kind === 'PERSON'
			? personPretabViewModel(entity, assocCommitted, assocLoading, assocError)
			: null;

	const VEHICLE_PRETAB_DASH = '—';
	const VEHICLE_PRETAB_NOT_WIRED = 'Not yet wired';
	const VEHICLE_PRETAB_NO_NOTES = 'No notes mapped';

	function safeHttpImageUrlForVehicle(raw: string | null | undefined): string | null {
		if (!raw) return null;
		const t = String(raw).trim();
		if (!t) return null;
		try {
			const p = new URL(t);
			if (p.protocol !== 'http:' && p.protocol !== 'https:') return null;
			return t;
		} catch {
			return null;
		}
	}

	function vehiclePretabPhotoUrl(attrs: Record<string, unknown>): string | null {
		const u = pickAttrString(attrs, [
			'vehicle_image_url',
			'vehicle_photo_url',
			'image_url',
			'photo_url',
			'portrait_url'
		]);
		return safeHttpImageUrlForVehicle(u);
	}

	type VehiclePretabDashboard = {
		photoUrl: string | null;
		detailsRows: { key: string; label: string; value: string }[];
		regRows: { key: string; label: string; value: string }[];
		notesDisplay: string;
		notesIsPlaceholder: boolean;
	};

	function buildVehiclePretabDashboard(e: CaseIntelligenceCommittedEntity): VehiclePretabDashboard {
		const a = e.core_attributes ?? {};
		const make = pickAttrString(a, ['make', 'manufacturer']);
		const model = pickAttrString(a, ['model']);
		const year = pickAttrString(a, ['year', 'model_year']);
		const color = pickAttrString(a, ['color', 'colour', 'vehicle_color', 'exterior_color']);
		const plate = pickAttrString(a, ['plate', 'license_plate', 'registration']);
		const state = pickAttrString(a, ['plate_state', 'state', 'registration_state']);
		const vin = pickAttrString(a, ['vin', 'VIN']);
		const owner = pickAttrString(a, ['owner', 'registered_owner', 'title_holder']);
		const operator = pickAttrString(a, ['operator', 'operator_name', 'driver']);
		const notes = pickAttrString(a, ['notes', 'vehicle_notes', 'entity_notes', 'case_note', 'case_notes']);

		const slot = (v: string | null) => (v && v.trim() ? v.trim() : VEHICLE_PRETAB_DASH);

		const detailsRows = [
			{ key: 'make', label: 'Make', value: slot(make) },
			{ key: 'model', label: 'Model', value: slot(model) },
			{ key: 'year', label: 'Year', value: slot(year) },
			{ key: 'color', label: 'Color', value: slot(color) }
		];
		const ownT = (owner ?? '').trim();
		const opT = (operator ?? '').trim();
		const regRows = [
			{ key: 'plate', label: 'Plate', value: slot(plate) },
			{ key: 'state', label: 'State', value: slot(state) },
			{ key: 'vin', label: 'VIN', value: slot(vin) },
			{ key: 'owner', label: 'Owner', value: ownT ? ownT : VEHICLE_PRETAB_NOT_WIRED },
			{ key: 'operator', label: 'Operator', value: opT ? opT : VEHICLE_PRETAB_NOT_WIRED }
		];
		const notesIsPlaceholder = !notes || !notes.trim();
		const notesDisplay = notesIsPlaceholder ? VEHICLE_PRETAB_NO_NOTES : notes.trim();

		return {
			photoUrl: vehiclePretabPhotoUrl(a),
			detailsRows,
			regRows,
			notesDisplay,
			notesIsPlaceholder
		};
	}

	$: vehiclePretabDashboard =
		entity?.entity_kind === 'VEHICLE' ? buildVehiclePretabDashboard(entity) : null;

	const LOCATION_PRETAB_DASH = '—';
	const LOCATION_NOT_WIRED = 'Not yet wired';

	type LocationPretabRow = { key: string; label: string; value: string };
	type LocationPretabDashboard = {
		addressRows: LocationPretabRow[];
		placeRows: LocationPretabRow[];
		recordRows: LocationPretabRow[];
	};

	function buildLocationPretabDashboard(e: CaseIntelligenceCommittedEntity): LocationPretabDashboard {
		const a = e.core_attributes ?? {};
		const slot = (v: string | null) => (v && v.trim() ? v.trim() : LOCATION_PRETAB_DASH);
		const slotRecord = (v: string | null) => (v && v.trim() ? v.trim() : LOCATION_NOT_WIRED);

		const addressLine = pickAttrString(a, [
			'address',
			'street',
			'full_address',
			'normalized_address',
			'location_address',
			'addr1',
			'address_line1'
		]);
		const city = pickAttrString(a, ['city', 'locality', 'town']);
		const state = pickAttrString(a, ['state', 'region', 'province']);
		const country = pickAttrString(a, ['country']);
		const zip = pickAttrString(a, ['zip', 'postal_code', 'postal', 'zipcode']);
		const county = pickAttrString(a, ['county']);

		const placeName = pickAttrString(a, ['place_label', 'label', 'name', 'place_name']);
		const unit = pickAttrString(a, ['unit', 'apt', 'apartment', 'suite', 'addr2', 'address_line2']);
		const lat = pickAttrString(a, ['lat', 'latitude']);
		const lng = pickAttrString(a, ['lng', 'lon', 'longitude']);
		const coordinates =
			lat && lng
				? `${lat}, ${lng}`
				: lat
					? lat
					: lng
						? lng
						: null;
		const timeZone = pickAttrString(a, ['timezone', 'time_zone', 'tz']);
		const placeType = pickAttrString(a, ['location_type', 'place_type', 'type']);
		const placeSource = pickAttrString(a, [
			'place_source',
			'data_source',
			'place_data_source',
			'attribution',
			'source_name'
		]);

		const fileCreated = e.created_at ? formatCaseDateTime(e.created_at) : null;
		const lastUpdated = e.updated_at ? formatCaseDateTime(e.updated_at) : null;
		const sourceOfTruth = pickAttrString(a, ['source_of_truth', 'canonical_source', 'record_authority']);
		const caseRole = pickAttrString(a, ['case_role', 'location_role', 'role_in_case', 'registry_role']);

		const addressRows: LocationPretabRow[] = [
			{ key: 'address_line', label: 'Address line', value: slot(addressLine) },
			{ key: 'city', label: 'City', value: slot(city) },
			{ key: 'state', label: 'State', value: slot(state) },
			{ key: 'country', label: 'Country', value: slot(country) },
			{ key: 'zip', label: 'Zip code', value: slot(zip) },
			{ key: 'county', label: 'County', value: slot(county) }
		];

		const placeRows: LocationPretabRow[] = [
			{ key: 'place_name', label: 'Place name', value: slot(placeName) },
			{ key: 'unit', label: 'Unit / apt', value: slot(unit) },
			{ key: 'coordinates', label: 'Coordinates', value: slot(coordinates) },
			{ key: 'time_zone', label: 'Time zone', value: slot(timeZone) },
			{ key: 'type', label: 'Type', value: slot(placeType) },
			{ key: 'source', label: 'Source', value: slot(placeSource) }
		];

		const recordRows: LocationPretabRow[] = [
			{ key: 'file_created', label: 'File created', value: fileCreated ? fileCreated : LOCATION_NOT_WIRED },
			{ key: 'last_updated', label: 'Last updated', value: lastUpdated ? lastUpdated : LOCATION_NOT_WIRED },
			{ key: 'source_of_truth', label: 'Source of truth', value: slotRecord(sourceOfTruth) },
			{ key: 'case_role', label: 'Case role', value: slotRecord(caseRole) }
		];

		return { addressRows, placeRows, recordRows };
	}

	$: locationPretabDashboard =
		entity?.entity_kind === 'LOCATION' ? buildLocationPretabDashboard(entity) : null;

	let vehiclePretabPhotoFailed = false;
	let lastVehiclePretabPhotoKey = '';
	$: if (entity?.entity_kind === 'VEHICLE' && vehiclePretabDashboard) {
		const k = `${entity.id}::${vehiclePretabDashboard.photoUrl ?? ''}`;
		if (k !== lastVehiclePretabPhotoKey) {
			lastVehiclePretabPhotoKey = k;
			vehiclePretabPhotoFailed = false;
		}
	}
	$: overviewSummaryText = entity
		? [entity.display_label, metaMiddot, summaryLine].filter(Boolean).join(' — ')
		: '';

	/** Hide "List scope: include retired" in the header; still show for `active_only` when passed. */
	$: readScopeListLine =
		readScope && readScope !== 'include_retired' ? readScope : null;

	type RiskFlagRow = { id: string; label: string; level: 'high' | 'medium' | 'low' };

	function riskRowsForEntity(e: CaseIntelligenceCommittedEntity): RiskFlagRow[] {
		const out: RiskFlagRow[] = [];
		if (e.entity_kind === 'PERSON' && e.person_identity_posture === 'UNKNOWN_PARTIAL') {
			out.push({ id: 'unknown-partial', label: 'Identity partially unknown', level: 'medium' });
		}
		return out;
	}

	$: riskFlagRows = entity ? riskRowsForEntity(entity) : [];

	$: pretabPersonVm =
		entity && personPretab && entity.entity_kind === 'PERSON'
			? toPersonPretabViewModel(
					{
						name: personPretab.name,
						dob: personPretab.dob,
						dobAge: personPretab.dobAge,
						ssn: personPretab.ssn,
						dl: personPretab.dl,
						physical: personPretab.physical,
						record: personPretab.record
					},
					{
						roleBadgeClass: roleBadgeClassMockup(entity.entity_kind),
						roleBadgeText: roleBadgeText(entity.entity_kind),
						riskFlagRows
					},
					{
						portraitUrl: portraitUrl && !portraitFailed ? portraitUrl : null,
						portraitInitials: initialsFromDisplayLabel(entity.display_label),
						onPortraitError: () => (portraitFailed = true),
						recordListScope: readScopeListLine
					}
				)
			: null;

	$: pretabVehicleVm =
		entity && vehiclePretabDashboard && entity.entity_kind === 'VEHICLE'
			? toVehiclePretabViewModel(vehiclePretabDashboard, {
					onPhotoError: () => (vehiclePretabPhotoFailed = true),
					readScopeListLine,
					badgeText: roleBadgeText('VEHICLE')
				})
			: null;

	$: pretabLocationVm =
		entity && locationPretabDashboard && entity.entity_kind === 'LOCATION'
			? toLocationPretabViewModel(locationPretabDashboard, {
					readScopeListLine,
					badgeText: roleBadgeText('LOCATION')
				})
			: null;

	/** Future-ready: API `CaseIntelligenceEntityKind` may add PHONE later. */
	$: pretabPhoneVm =
		entity && String(entity.entity_kind) === 'PHONE' ? buildPhonePretabPlaceholderViewModel(entity) : null;

	function primaryTabLabel(tab: EntityDetailPrimaryTab): string {
		switch (tab) {
			case 'overview':
				return 'Overview';
			case 'associations':
				return `Connections (${assocTotalCount})`;
			case 'timeline':
				return 'Timeline links (0)';
			case 'files':
				return 'Files (0)';
			case 'notes':
				return `Notes (${notesDraft.trim() ? 1 : 0})`;
			case 'history':
				return 'History (0)';
			default:
				return tab;
		}
	}

	function roleBadgeClassMockup(kind: CaseIntelligenceEntityKind | 'PHONE'): string {
		if (kind === 'VEHICLE') {
			return `${DS_ENTITY_DETAIL_CLASSES.roleBadge} ${DS_ENTITY_DETAIL_CLASSES.roleBadgeVehicle}`;
		}
		if (kind === 'LOCATION') {
			return `${DS_ENTITY_DETAIL_CLASSES.roleBadge} ${DS_ENTITY_DETAIL_CLASSES.roleBadgeLocation}`;
		}
		if (kind === 'PHONE') {
			return `${DS_ENTITY_DETAIL_CLASSES.roleBadge} ${DS_ENTITY_DETAIL_CLASSES.roleBadgePhone}`;
		}
		return DS_ENTITY_DETAIL_CLASSES.roleBadge;
	}

	function roleBadgeText(kind: CaseIntelligenceEntityKind | 'PHONE'): string {
		if (kind === 'PERSON') return 'Person of interest';
		if (kind === 'VEHICLE') return 'Vehicle';
		if (kind === 'LOCATION') return 'Location';
		if (kind === 'PHONE') return 'Phone';
		return kindLabel(kind);
	}
</script>

<div
	class="{DS_ENTITY_DETAIL_CLASSES.workspaceRoot} entity-detail-workspace w-full min-w-0 min-h-0 shrink-0"
	data-testid="entity-detail-workspace"
>
	{#if detailLoading && !entity}
		{#if onCloseDetails}
			<div class="flex shrink-0 justify-end pb-3">
				<button
					type="button"
					class="{DS_ENTITY_BOARD_CLASSES.focusBackBtn}"
					data-testid="entities-focus-close-details"
					on:click={onCloseDetails}
				>
					Close Details
				</button>
			</div>
		{/if}
		<div class="{DS_ENTITY_DETAIL_CLASSES.headerSkeleton} space-y-3" data-testid="entity-detail-header-skeleton" aria-busy="true">
			<div class="{DS_SKELETON_CLASSES.base} {DS_SKELETON_CLASSES.shimmer} h-6 w-2/3 rounded"></div>
			<div class="{DS_SKELETON_CLASSES.base} {DS_SKELETON_CLASSES.shimmer} h-4 w-24 rounded"></div>
			<div class="{DS_SKELETON_CLASSES.base} {DS_SKELETON_CLASSES.shimmer} h-3 w-full rounded opacity-90"></div>
		</div>
	{:else if detailError}
		{#if onCloseDetails}
			<div class="flex shrink-0 justify-end pb-3">
				<button
					type="button"
					class="{DS_ENTITY_BOARD_CLASSES.focusBackBtn}"
					data-testid="entities-focus-close-details"
					on:click={onCloseDetails}
				>
					Close Details
				</button>
			</div>
		{/if}
		<div class="{DS_ENTITY_DETAIL_CLASSES.headerError}" data-testid="entity-detail-header-error">
			<CaseErrorState title="Could not load entity" message={detailError} onRetry={onRetryDetail} />
		</div>
	{:else if entity}
		<header class="{DS_ENTITY_DETAIL_CLASSES.header}" data-testid="entity-detail-header">
			<div class="{DS_ENTITY_DETAIL_CLASSES.chromeBar}">
				<div class="{DS_ENTITY_DETAIL_CLASSES.chromeTitle}">
					{#if onCloseDetails}
						<button
							type="button"
							class="{DS_ENTITY_BOARD_CLASSES.focusBackBtn}"
							data-testid="entities-focus-close-details"
							on:click={onCloseDetails}
						>
							Close Details
						</button>
					{/if}
				</div>
				<div class="{DS_ENTITY_DETAIL_CLASSES.chromeToolbar}">
					<button
						type="button"
						class="{DS_ENTITY_DETAIL_CLASSES.chromeEditBtn}"
						disabled
						title="Case Engine does not expose entity PATCH in this UI build."
						data-testid="entity-detail-chrome-edit"
					>
						<span aria-hidden="true">✎</span>
						Edit
					</button>
					<details bind:open={actionsOpen} class="relative" data-testid="entity-detail-actions-menu">
						<summary class="{DS_ENTITY_DETAIL_CLASSES.chromeMoreBtn}" aria-label="More actions">⋮</summary>
						<div class="{DS_ENTITY_DETAIL_CLASSES.actionsMenuPanel}">
							<button
								type="button"
								class="{DS_ENTITY_DETAIL_CLASSES.actionsMenuItem} {DS_ENTITY_DETAIL_CLASSES.actionsMenuItemDisabled}"
								disabled
								title="Case Engine does not expose entity PATCH in this UI build."
								data-testid="entity-detail-action-edit-disabled"
							>
								Edit entity…
							</button>
							<button
								type="button"
								class="{DS_ENTITY_DETAIL_CLASSES.actionsMenuItem}"
								data-testid="entity-detail-action-propose-association"
								on:click={() => {
									actionsOpen = false;
									onOpenAssociationComposer?.(entity);
								}}
							>
								Propose association…
							</button>
						</div>
					</details>
				</div>
			</div>

			{#if entity.deleted_at}
				<div class="{DS_ENTITY_DETAIL_CLASSES.retiredBanner} mx-4 mt-4" data-testid="entity-detail-retired-banner" role="status">
					<strong class="font-semibold">Retired</strong>
					<span> — not in the active registry view. Restore from the Status card if permitted.</span>
				</div>
			{/if}

			<div class="{DS_ENTITY_DETAIL_CLASSES.profilePanel}">
				{#if pretabPersonVm && personPretab}
					<EntityPretabSummary
						viewModel={pretabPersonVm}
						hasSecondRowSlot={true}
						onAssociationsTab={() => setTab('associations')}
					>
						<svelte:fragment slot="secondRow">
							<section
								class="{DS_INTELLIGENCE_CLASSES.panel} {DS_ENTITY_DETAIL_CLASSES.personPretabSummaryCard} min-w-0"
								data-testid="entity-detail-person-contact-residency"
							>
								<h3 class="{DS_ENTITY_DETAIL_CLASSES.sectionLabel}">Contact & residency</h3>
								<dl class="{DS_ENTITY_DETAIL_CLASSES.attrGrid} mt-2">
									{#each personPretab.contact as row (row.key)}
										<div class="{DS_ENTITY_DETAIL_CLASSES.attrCell}">
											<dt class="{DS_ENTITY_DETAIL_CLASSES.attrDt}">{row.label}</dt>
											<dd class="{DS_ENTITY_DETAIL_CLASSES.attrDd}">{row.value}</dd>
										</div>
									{/each}
								</dl>
							</section>
							<section
								class="{DS_INTELLIGENCE_CLASSES.panel} {DS_ENTITY_DETAIL_CLASSES.personPretabSummaryCard} min-w-0"
								data-testid="entity-detail-person-investigative-links"
							>
								<div class="flex flex-wrap items-center justify-between gap-2">
									<h3 class="{DS_ENTITY_DETAIL_CLASSES.sectionLabel}">Investigative links</h3>
									<button
										type="button"
										class="{DS_INTELLIGENCE_CLASSES.inlineLink} text-xs font-semibold"
										data-testid="entity-detail-person-investigative-view-all"
										on:click={() => setTab('associations')}
									>
										View all
									</button>
								</div>
								{#if assocError}
									<div class="mt-2" data-testid="entity-detail-person-pretab-assoc-error">
										<CaseErrorState
											title="Links unavailable"
											message={assocError}
											onRetry={retryAssoc}
										/>
									</div>
								{:else}
									{#if assocLoading}
										<span class="sr-only" data-testid="entity-detail-person-pretab-assoc-loading"
											>Loading links…</span
										>
									{/if}
									<dl
										class="{DS_ENTITY_DETAIL_CLASSES.attrGrid} mt-2"
										data-testid="entity-detail-person-pretab-assoc-list"
										aria-busy={assocLoading}
									>
										{#each personPretab.investigative as row (row.key)}
											<div class="{DS_ENTITY_DETAIL_CLASSES.attrCell}">
												<dt class="{DS_ENTITY_DETAIL_CLASSES.attrDt}">{row.label}</dt>
												<dd class="{DS_ENTITY_DETAIL_CLASSES.attrDd}">{row.value}</dd>
											</div>
										{/each}
									</dl>
									{#if !assocLoading && assocCommitted.length === 0}
										<p class="{DS_TYPE_CLASSES.body} mt-2">
											<span class="opacity-90">No committed associations yet.</span>
											<button
												type="button"
												class="{DS_INTELLIGENCE_CLASSES.inlineLink} ml-1 font-semibold"
												data-testid="entity-detail-person-pretab-assoc-propose"
												on:click={() => onOpenAssociationComposer?.(entity)}
											>
												Propose association
											</button>
										</p>
									{/if}
								{/if}
								{#if assocStaging.length > 0}
									<p
										class="{DS_TYPE_CLASSES.meta} mt-2 text-[var(--ds-text-secondary)]"
										data-testid="entity-detail-person-pretab-staging-note"
									>
										{assocStaging.length} open draft or pending
										{assocStaging.length === 1 ? 'link' : 'links'} in staging.
									</p>
								{/if}
							</section>
						</svelte:fragment>
					</EntityPretabSummary>
				{:else if pretabVehicleVm}
					<EntityPretabSummary viewModel={pretabVehicleVm} />
				{:else if pretabLocationVm}
					<EntityPretabSummary viewModel={pretabLocationVm} />
				{:else if pretabPhoneVm}
					<EntityPretabSummary
						viewModel={pretabPhoneVm}
						onAssociationsTab={() => setTab('associations')}
					/>
				{:else}
					<div class="{DS_ENTITY_DETAIL_CLASSES.profileHero}">
						<div class="flex flex-col items-start gap-2">
							<span class="{DS_ENTITY_DETAIL_CLASSES.kindTileLocation}" aria-hidden="true">?</span>
						</div>
						<div class="min-w-0">
							<h2 class="{DS_ENTITY_DETAIL_CLASSES.heroTitle}" data-testid="entity-detail-hero-label">
								{entity.display_label}
							</h2>
							<span class={roleBadgeClassMockup(entity.entity_kind)} data-testid="entity-detail-kind-chip">
								{roleBadgeText(entity.entity_kind)}
							</span>
							{#if heroAttrRows.length > 0}
								<dl class="{DS_ENTITY_DETAIL_CLASSES.profileMetaGrid}" data-testid="entity-detail-metadata-row">
									{#each heroAttrRows as row (row.key)}
										<div class="{DS_ENTITY_DETAIL_CLASSES.attrCell}">
											<dt class="{DS_ENTITY_DETAIL_CLASSES.attrDt}">{row.label}</dt>
											<dd class="{DS_ENTITY_DETAIL_CLASSES.attrDd}">{row.value}</dd>
										</div>
									{/each}
								</dl>
							{:else if metaMiddot}
								<p class="{DS_ENTITY_DETAIL_CLASSES.metaLine} mt-3">{metaMiddot}</p>
							{/if}
							{#if readScopeListLine}
								<p class="{DS_ENTITY_DETAIL_CLASSES.scopeLine}">List scope: {readScopeListLine.replace(/_/g, ' ')}</p>
							{/if}
						</div>
					</div>
				{/if}
			</div>

			{#if entityFocusNavigate}
				<div
					class="rounded-lg border border-[var(--ds-border-subtle)] bg-[var(--ds-surface-raised)]/60 px-3 py-2.5"
					data-testid="entity-detail-entity-focus-affordance"
					role="region"
					aria-label={CASE_DESTINATION_TITLES.entityIntelligenceFocusRegion}
				>
					<a
						class="{DS_INTELLIGENCE_CLASSES.inlineLink} font-semibold"
						data-testid="entity-detail-open-entity-focus"
						href={entityFocusNavigate.href}
						title={CASE_DESTINATION_TITLES.entityIntelligenceFocusRegion}
					>
						{CASE_DESTINATION_LABELS.entityIntelligenceFocusDrillDown}
					</a>
				</div>
			{/if}
		</header>
	{/if}

	{#if entity}
		<div
			class="{DS_ENTITY_DETAIL_CLASSES.tabstrip}"
			data-testid="entity-detail-primary-tabstrip"
			role="tablist"
			aria-label="Entity primary tabs"
		>
			{#each PRIMARY_TABS as tab (tab.id)}
				<button
					type="button"
					role="tab"
					aria-selected={primaryTab === tab.id ? 'true' : 'false'}
					class="{DS_ENTITY_DETAIL_CLASSES.tab} {primaryTab === tab.id
						? DS_ENTITY_DETAIL_CLASSES.tabActive
						: DS_ENTITY_DETAIL_CLASSES.tabInactive}"
					data-testid="entity-detail-tab-{tab.id}"
					on:click={() => setTab(tab.id)}
				>
					{primaryTabLabel(tab.id)}
				</button>
			{/each}
		</div>

		<div class="{DS_ENTITY_DETAIL_CLASSES.panelBody}" data-testid="entity-detail-panel-body">
			{#if primaryTab === 'overview'}
				<div class="{DS_ENTITY_DETAIL_CLASSES.overviewGrid}" data-testid="entity-detail-overview-grid">
					<section class="{DS_INTELLIGENCE_CLASSES.panel} xl:col-span-2" data-testid="entity-detail-overview-summary-block">
						<h3 class="{DS_ENTITY_DETAIL_CLASSES.sectionLabel}">Summary</h3>
						<p class="{DS_ENTITY_DETAIL_CLASSES.overviewStory} mt-2">{overviewSummaryText}</p>
					</section>

					<section class="{DS_INTELLIGENCE_CLASSES.panel}" data-testid="entity-detail-overview-risks">
						<h3 class="{DS_ENTITY_DETAIL_CLASSES.sectionLabel}">Risks / flags</h3>
						{#if riskFlagRows.length === 0}
							<p class="{DS_TYPE_CLASSES.body} mt-2 text-[var(--ds-text-secondary)]">
								No risk flags recorded in Case Engine for this entity.
							</p>
						{:else}
							<div class="{DS_ENTITY_DETAIL_CLASSES.riskBlock} mt-3">
								{#each riskFlagRows as r (r.id)}
									{@const rl = pretabRiskLevelClasses(r.level)}
									<div class="{DS_ENTITY_DETAIL_CLASSES.riskRow}">
										<span class={rl.diamond} aria-hidden="true"></span>
										<span class="{DS_TYPE_CLASSES.body} text-[var(--ds-text-primary)]">{r.label}</span>
										<span class={rl.pill}>{rl.label}</span>
									</div>
								{/each}
							</div>
						{/if}
					</section>

					<section class="{DS_INTELLIGENCE_CLASSES.panel}" data-testid="entity-detail-overview-tags">
						<h3 class="{DS_ENTITY_DETAIL_CLASSES.sectionLabel}">Tags</h3>
						<p class="{DS_TYPE_CLASSES.meta} mt-2 text-[var(--ds-text-secondary)]">
							Committed entity tags are not modeled in Case Engine for this build — chips mirror registry kind for scanning only.
						</p>
						<div class="{DS_ENTITY_DETAIL_CLASSES.tagBlock} mt-3">
							<span class="{DS_ENTITY_DETAIL_CLASSES.tagPill}">{kindLabel(entity.entity_kind)}</span>
							{#if entity.deleted_at}
								<span class="{DS_ENTITY_DETAIL_CLASSES.tagPill}">Retired</span>
							{/if}
							<button type="button" class="{DS_ENTITY_DETAIL_CLASSES.tagAddBtn}" disabled title="Not available in this build" aria-label="Add tag">
								+
							</button>
						</div>
					</section>

					<div class="{DS_ENTITY_DETAIL_CLASSES.shortcutsStrip} xl:col-span-2" data-testid="entity-detail-quick-pills">
						<div class="{DS_ENTITY_DETAIL_CLASSES.quickPillCluster}" data-testid="entity-detail-quick-pills-workspace">
							<p id="entity-detail-quick-pills-ws-label" class="{DS_ENTITY_DETAIL_CLASSES.quickPillClusterLabel}">
								In this workspace
							</p>
							<div
								class="{DS_ENTITY_DETAIL_CLASSES.quickPillClusterRow}"
								role="group"
								aria-labelledby="entity-detail-quick-pills-ws-label"
							>
								<button
									type="button"
									class="{DS_ENTITY_DETAIL_CLASSES.quickPill} {DS_ENTITY_DETAIL_CLASSES.quickPillWorkspace}"
									data-testid="entity-detail-pill-timeline"
									aria-pressed={primaryTab === 'timeline' ? 'true' : 'false'}
									title="Opens the Timeline tab in this workspace — not the official case timeline."
									on:click={() => setTab('timeline')}
								>
									Timeline
								</button>
								<button
									type="button"
									class="{DS_ENTITY_DETAIL_CLASSES.quickPill} {DS_ENTITY_DETAIL_CLASSES.quickPillWorkspace}"
									data-testid="entity-detail-pill-files"
									aria-pressed={primaryTab === 'files' ? 'true' : 'false'}
									title="Opens the Files tab in this workspace — not an entity-linked file index from Case Engine."
									on:click={() => setTab('files')}
								>
									Files
								</button>
								<button
									type="button"
									class="{DS_ENTITY_DETAIL_CLASSES.quickPill} {DS_ENTITY_DETAIL_CLASSES.quickPillWorkspace}"
									data-testid="entity-detail-pill-notes"
									aria-pressed={primaryTab === 'notes' ? 'true' : 'false'}
									title="Opens the Notes tab in this workspace — use case Notes for persisted notebook drafts."
									on:click={() => setTab('notes')}
								>
									Notes
								</button>
							</div>
						</div>
						<div class="{DS_ENTITY_DETAIL_CLASSES.quickPillCluster}" data-testid="entity-detail-quick-pills-governed-route">
							<p id="entity-detail-quick-pills-gov-label" class="{DS_ENTITY_DETAIL_CLASSES.quickPillClusterLabel}">
								Governed case route
							</p>
							<div
								class="{DS_ENTITY_DETAIL_CLASSES.quickPillClusterRow}"
								role="group"
								aria-labelledby="entity-detail-quick-pills-gov-label"
							>
								<a
									class="{DS_ENTITY_DETAIL_CLASSES.quickPill} {DS_ENTITY_DETAIL_CLASSES.quickPillProposals}"
									data-testid="entity-detail-pill-proposals"
									href={proposalsHref()}
									title={CASE_DESTINATION_TITLES.caseProposalsOpenPill}
								>
									{CASE_DESTINATION_LABELS.caseProposals} (P19)
								</a>
							</div>
						</div>
					</div>

					<!-- Details card -->
					<section class="{DS_INTELLIGENCE_CLASSES.panel}" data-testid="entity-detail-card-details">
						<h3 class="{DS_ENTITY_DETAIL_CLASSES.sectionLabel}">Details</h3>
						<p class="{DS_ENTITY_DETAIL_CLASSES.sectionHint}">
							Read-only committed attributes. Edit when Case Engine exposes governed patch (P69-10).
						</p>
						{#if attrRows.length === 0}
							<p class="{DS_TYPE_CLASSES.meta} mt-3">No extended attributes recorded.</p>
						{:else}
							<dl class="{DS_ENTITY_DETAIL_CLASSES.attrGrid}">
								{#each attrRows as row (row.key)}
									<div class="{DS_ENTITY_DETAIL_CLASSES.attrCell}">
										<dt class="{DS_ENTITY_DETAIL_CLASSES.attrDt}">{row.label}</dt>
										<dd class="{DS_ENTITY_DETAIL_CLASSES.attrDd}">{row.value}</dd>
									</div>
								{/each}
							</dl>
						{/if}
					</section>

					<!-- Status card (single owner for retire/restore per P69-06 §3.2) -->
					<section class="{DS_INTELLIGENCE_CLASSES.panel}" data-testid="entity-detail-card-status">
						<h3 class="{DS_ENTITY_DETAIL_CLASSES.sectionLabel}">Status</h3>
						<dl class="{DS_ENTITY_DETAIL_CLASSES.statusDl}">
							<div class="{DS_ENTITY_DETAIL_CLASSES.statusRow}">
								<dt class="{DS_ENTITY_DETAIL_CLASSES.statusDt}">State</dt>
								<dd data-testid="entity-detail-status-active">{entity.deleted_at ? 'Retired' : 'Active'}</dd>
							</div>
							<div class="{DS_ENTITY_DETAIL_CLASSES.statusRow}">
								<dt class="{DS_ENTITY_DETAIL_CLASSES.statusDt}">Created</dt>
								<dd>{entity.created_at}</dd>
							</div>
							{#if entity.updated_at}
								<div class="{DS_ENTITY_DETAIL_CLASSES.statusRow}">
									<dt class="{DS_ENTITY_DETAIL_CLASSES.statusDt}">Updated</dt>
									<dd>{entity.updated_at}</dd>
								</div>
							{/if}
							{#if entity.deleted_at}
								<div class="{DS_ENTITY_DETAIL_CLASSES.statusRow}">
									<dt class="{DS_ENTITY_DETAIL_CLASSES.statusDt}">Retired at</dt>
									<dd>{entity.deleted_at}</dd>
								</div>
							{/if}
						</dl>
						<div class="mt-4 flex flex-wrap gap-2">
							{#if !entity.deleted_at}
								<button
									type="button"
									class="{DS_BTN_CLASSES.secondary} !text-xs"
									data-testid="entity-detail-retire-open"
									on:click={() => (showRetireConfirm = true)}
								>
									Retire entity…
								</button>
							{:else}
								<button
									type="button"
									class="{DS_BTN_CLASSES.primary} !text-xs"
									data-testid="entity-detail-restore"
									on:click={() => void runRestore()}
								>
									Restore entity…
								</button>
							{/if}
						</div>
					</section>

					<!-- Associations summary -->
					<section
						class="{DS_INTELLIGENCE_CLASSES.panel} xl:col-span-2"
						data-testid="entity-detail-card-associations-summary"
					>
						<div class="flex flex-wrap items-center justify-between gap-2">
							<h3 class="{DS_ENTITY_DETAIL_CLASSES.sectionLabel}">Associations</h3>
							<button
								type="button"
								class="{DS_INTELLIGENCE_CLASSES.inlineLink} text-[11px] font-semibold"
								data-testid="entity-detail-assoc-view-all"
								on:click={() => setTab('associations')}
							>
								View all
							</button>
						</div>
						{#if assocLoading}
							<CaseLoadingState label="Loading associations…" testId="entity-detail-assoc-summary-loading" />
						{:else if assocError}
							<div class="mt-2" data-testid="entity-detail-assoc-summary-error">
								<CaseErrorState title="Associations unavailable" message={assocError} onRetry={retryAssoc} />
							</div>
						{:else if assocCommitted.length === 0}
							<p class="{DS_TYPE_CLASSES.body} mt-2">
								<span class="opacity-90">No committed associations yet.</span>
								<button
									type="button"
									class="{DS_INTELLIGENCE_CLASSES.inlineLink} ml-1 font-semibold"
									data-testid="entity-detail-assoc-propose-inline"
									on:click={() => onOpenAssociationComposer?.(entity)}
								>
									Propose association
								</button>
							</p>
						{:else}
							<ul class="{DS_ENTITY_DETAIL_CLASSES.assocSummaryList}" data-testid="entity-detail-assoc-summary-list">
								{#each assocPreview as row (row.id)}
									<li class="{DS_ENTITY_DETAIL_CLASSES.assocSummaryRow}">
										<span class="font-semibold text-[color:var(--ds-text-primary)]"
											>{associationKindLabel(row.association_kind)}</span
										>
										<span class="opacity-70"> · </span>
										<span class="{DS_TYPE_CLASSES.mono} text-[10px]">{otherEndpointId(row, entity.id)}</span>
										<span class="opacity-70"> · {assertionLaneLabel(row.assertion_lane)}</span>
									</li>
								{/each}
							</ul>
						{/if}
					</section>

					<!-- Recent timeline (deferred) -->
					<section class="{DS_INTELLIGENCE_CLASSES.emptyDashed}" data-testid="entity-detail-card-timeline">
						<h3 class="{DS_ENTITY_DETAIL_CLASSES.sectionLabel}">Recent timeline</h3>
						<p class="{DS_TYPE_CLASSES.body} mt-2 leading-relaxed opacity-90">
							Timeline linkage for this entity is not available in this build (Case Engine join pending — P69-10).
						</p>
						<button
							type="button"
							class="{DS_INTELLIGENCE_CLASSES.inlineLink} mt-2 text-xs font-semibold"
							data-testid="entity-detail-card-timeline-open-tab"
							on:click={() => setTab('timeline')}
						>
							Open Timeline tab
						</button>
					</section>

					<!-- Files card -->
					<section class="{DS_INTELLIGENCE_CLASSES.panel}" data-testid="entity-detail-card-files">
						<h3 class="{DS_ENTITY_DETAIL_CLASSES.sectionLabel}">Files</h3>
						<p class="{DS_TYPE_CLASSES.body} mt-2 opacity-90">
							No entity-scoped file index from Case Engine in this build. Open the case Files tab for uploads and
							attachments.
						</p>
						<div class="mt-2 flex flex-wrap gap-2">
							<button
								type="button"
								class="{DS_INTELLIGENCE_CLASSES.inlineLink} text-xs font-semibold"
								data-testid="entity-detail-card-files-deep-tab"
								on:click={() => setTab('files')}
							>
								Files tab
							</button>
							<a class="{DS_INTELLIGENCE_CLASSES.inlineLink} text-xs font-semibold" href={filesHref()}>Case Files</a>
						</div>
					</section>

					<!-- Notes card -->
					<section class="{DS_INTELLIGENCE_CLASSES.panel}" data-testid="entity-detail-card-notes">
						<h3 class="{DS_ENTITY_DETAIL_CLASSES.sectionLabel}">Notes</h3>
						<p class="{DS_TYPE_CLASSES.body} mt-2 opacity-90">
							Notebook notes are case-scoped in this build. Use the Notes tab to add working drafts — they are not
							the official timeline.
						</p>
						<a
							class="{DS_INTELLIGENCE_CLASSES.inlineLink} mt-2 inline-block text-xs font-semibold"
							data-testid="entity-detail-card-notes-link"
							href={notesHref()}
						>
							Open case Notes
						</a>
					</section>

					<!-- AI Assist (non-authoritative) -->
					<section class="{DS_ENTITY_DETAIL_CLASSES.aiAssistCard} xl:col-span-2" data-testid="entity-detail-card-ai-assist">
						<h3 class="{DS_ENTITY_DETAIL_CLASSES.sectionLabel}">AI assist</h3>
						<p class="{DS_TYPE_CLASSES.body} mt-2 leading-relaxed opacity-95">
							Non-authoritative analysis in entity context is deferred — no silent writes; Ask integrity rules apply
							when wired (P69-10 / Phase 33).
						</p>
					</section>
				</div>
			{:else if primaryTab === 'associations'}
				<div class="flex flex-col gap-4" data-testid="entity-detail-deep-associations">
					<div class="flex flex-wrap items-center justify-between gap-2">
						<h3 class="{DS_ENTITY_DETAIL_CLASSES.deepSectionTitle}">Committed associations</h3>
						<button
							type="button"
							class="{DS_INTELLIGENCE_CLASSES.inlineLink} text-xs font-semibold"
							data-testid="entity-detail-deep-assoc-propose"
							on:click={() => onOpenAssociationComposer?.(entity)}
						>
							Propose association…
						</button>
					</div>
					{#if assocLoading}
						<CaseLoadingState label="Loading…" testId="entity-detail-deep-assoc-loading" />
					{:else if assocError}
						<CaseErrorState title="Could not load associations" message={assocError} onRetry={retryAssoc} />
					{:else if assocCommitted.length === 0}
						<CaseEmptyState
							title="No committed associations for this entity."
							description="Stage a proposal and commit from Stage 2 when ready."
							testId="entity-detail-deep-assoc-empty-committed"
						/>
					{:else}
						<ul class="flex flex-col gap-2" data-testid="entity-detail-deep-assoc-committed-list">
							{#each assocCommitted as row (row.id)}
								<li class="{DS_ENTITY_DETAIL_CLASSES.assocCommittedRow}">
									<div class="font-semibold text-[color:var(--ds-text-primary)]">{associationKindLabel(row.association_kind)}</div>
									<div class="{DS_TYPE_CLASSES.mono} mt-1 text-[10px] opacity-80">
										Other endpoint: {otherEndpointId(row, entity.id)}
									</div>
									<div class="mt-0.5 opacity-80">{assertionLaneLabel(row.assertion_lane)}</div>
								</li>
							{/each}
						</ul>
					{/if}

					<div class="{DS_ENTITY_DETAIL_CLASSES.deepDivider}">
						<h3 class="{DS_ENTITY_DETAIL_CLASSES.deepSectionTitle}">Staging (draft / pending)</h3>
					</div>
					{#if assocLoading}
						<p class="{DS_TYPE_CLASSES.meta} opacity-80">…</p>
					{:else if assocStaging.length === 0}
						<p class="{DS_TYPE_CLASSES.body} opacity-90" data-testid="entity-detail-deep-assoc-staging-empty">
							No open staging rows referencing this entity. Use Propose association or Stage 2 queue on the board.
						</p>
					{:else}
						<ul class="flex flex-col gap-2" data-testid="entity-detail-deep-assoc-staging-list">
							{#each assocStaging as row (row.id)}
								<li class="{DS_ENTITY_DETAIL_CLASSES.assocStagingRow}">
									<div class="font-semibold text-[color:var(--ds-text-primary)]">{associationKindLabel(row.association_kind)}</div>
									<div class="opacity-80">{row.status}</div>
								</li>
							{/each}
						</ul>
					{/if}
				</div>
			{:else if primaryTab === 'timeline'}
				<div class="{DS_INTELLIGENCE_CLASSES.emptyDashed} p-6" data-testid="entity-detail-deep-timeline">
					<h3 class="{DS_ENTITY_DETAIL_CLASSES.deepSectionTitle}">Timeline</h3>
					<p class="{DS_TYPE_CLASSES.body} mt-2 leading-relaxed opacity-90">
						Official timeline entries are not correlated to this entity in this UI build (P69-10). Review the case
						timeline for committed events.
					</p>
					<a
						class="{DS_INTELLIGENCE_CLASSES.inlineLink} mt-3 inline-block text-sm font-semibold"
						href={timelineCaseHref()}
						data-testid="entity-detail-deep-timeline-case-link"
					>
						Open case Timeline
					</a>
				</div>
			{:else if primaryTab === 'notes'}
				<div class="flex flex-col gap-4" data-testid="entity-detail-deep-notes">
					<p class="{DS_TYPE_CLASSES.body} opacity-90">
						<strong class="text-[color:var(--ds-text-primary)]">Notebook</strong> — drafts are not automatic timeline records. Open the case
						Notes tab to create or edit persisted notes.
					</p>
					<a
						class="{DS_INTELLIGENCE_CLASSES.inlineLink} inline-block text-sm font-semibold"
						href={notesHref()}
						data-testid="entity-detail-deep-notes-route"
					>
						Go to Notes tab (case)
					</a>
					<div class="{DS_ENTITY_DETAIL_CLASSES.notesDraftPanel}">
						<label for="entity-detail-notes-draft" class="{DS_ENTITY_DETAIL_CLASSES.notesDraftLabel}">
							Workspace draft (local only)
						</label>
						<p class="{DS_ENTITY_DETAIL_CLASSES.notesDraftHint}">
							This text stays in your browser session until you clear it. It does not write to Case Engine — future
							entity-scoped notes may replace this (P69-10). Leaving text here flags the workspace as dirty for switch
							/ back guards.
						</p>
						<textarea
							id="entity-detail-notes-draft"
							rows="5"
							class="mt-2 w-full {DS_TIMELINE_CLASSES.formControl}"
							placeholder="Optional scratch…"
							bind:value={notesDraft}
							data-testid="entity-detail-notes-draft"
						></textarea>
						{#if workspaceDirty}
							<button
								type="button"
								class="{DS_ENTITY_DETAIL_CLASSES.discardDraftBtn}"
								data-testid="entity-detail-notes-discard-draft"
								on:click={() => {
									notesDraft = '';
									onDetailDirtyChange?.(false);
								}}
							>
								Discard draft
							</button>
						{/if}
					</div>
				</div>
			{:else if primaryTab === 'history'}
				<div class="{DS_INTELLIGENCE_CLASSES.emptyDashed} p-6" data-testid="entity-detail-deep-history">
					<h3 class="{DS_ENTITY_DETAIL_CLASSES.deepSectionTitle}">History</h3>
					<p class="{DS_TYPE_CLASSES.body} mt-2 leading-relaxed opacity-90">
						Audit-style history for this entity is not wired to Case Engine in this build — no fabricated events
						(P69-06 §4.4).
					</p>
				</div>
			{:else if primaryTab === 'files'}
				<div class="{DS_INTELLIGENCE_CLASSES.panel}" data-testid="entity-detail-deep-files">
					<h3 class="{DS_ENTITY_DETAIL_CLASSES.deepSectionTitle}">Files</h3>
					<p class="{DS_TYPE_CLASSES.body} mt-2 leading-relaxed opacity-90">
						Case Engine does not expose an entity-linked file listing here yet. Use the case Files route for
						attachments (P69-10).
					</p>
					<a
						class="{DS_INTELLIGENCE_CLASSES.inlineLink} mt-3 inline-block text-sm font-semibold"
						href={filesHref()}
						data-testid="entity-detail-deep-files-route"
					>
						Open case Files
					</a>
				</div>
			{/if}
		</div>
	{/if}

	{#if showRetireConfirm && entity}
		<div
			class="{DS_ENTITY_BOARD_CLASSES.focusDirtyGateOverlay}"
			role="dialog"
			aria-modal="true"
			aria-labelledby="entity-retire-title"
			data-testid="entity-detail-retire-confirm"
		>
			<div class="{DS_ENTITY_BOARD_CLASSES.focusDirtyGateCard} max-w-md w-full">
				<h2 id="entity-retire-title" class="{DS_TYPE_CLASSES.body} font-semibold">Retire this entity?</h2>
				<p class="{DS_TYPE_CLASSES.meta} mt-2 leading-relaxed">
					Retire removes this committed row from the active intel view (soft delete in Case Engine). It can be restored
					when include-retired lists apply.
				</p>
				<div class="mt-4 flex flex-wrap justify-end gap-2">
					<button
						type="button"
						class="{DS_BTN_CLASSES.ghost} !text-xs"
						data-testid="entity-detail-retire-cancel"
						on:click={() => (showRetireConfirm = false)}
					>
						Cancel
					</button>
					<button
						type="button"
						class="{DS_BTN_CLASSES.danger} !text-xs"
						data-testid="entity-detail-retire-confirm-btn"
						disabled={retireBusy}
						on:click={() => void confirmRetire()}
					>
						{retireBusy ? 'Retiring…' : 'Retire'}
					</button>
				</div>
			</div>
		</div>
	{/if}
</div>
