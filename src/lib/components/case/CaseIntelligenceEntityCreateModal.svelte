<script lang="ts">
	/**
	 * P68-05 / P68-FU7 / P68-FU8 / P68-FU9 — direct committed create (P68-04). Normalized fields per P68-FU6 §9 MVP.
	 */
	import { createEventDispatcher, tick } from 'svelte';
	import {
		createCaseIntelligenceCommittedEntityDirect,
		type CaseIntelligenceCommittedEntity,
		type CaseIntelligenceEntityKind,
		type CaseIntelligencePersonPosture
	} from '$lib/apis/caseEngine';
	import {
		assembleCoreAttributesForSubmit,
		buildLocationCoreAttributes,
		buildPersonCoreAttributes,
		buildVehicleCoreAttributes,
		COUNTRY_OTHER,
		COUNTRY_US,
		DROPDOWN_OTHER,
		formatUsPersonPhoneMask,
		PERSON_ADDRESS_TYPES,
		PERSON_ETHNICITY_OPTIONS,
		PERSON_EYE_COLOR_OPTIONS,
		PERSON_HAIR_COLOR_OPTIONS,
		usPersonPhoneDigitsFromInput,
		resolveUsStateValue,
		resolveVehicleColor,
		resolveVehicleMake,
		suggestLocationDisplayLabel,
		suggestPersonDisplayLabel,
		suggestVehicleDisplayLabel,
		US_STATES,
		VEHICLE_COLOR_OPTIONS,
		VEHICLE_MAKE_OPTIONS,
		type PersonAddressType
	} from '$lib/utils/caseIntelligenceDirectCreatePayload';

	export let open = false;
	export let caseId = '';
	export let token = '';
	export let entityKind: CaseIntelligenceEntityKind = 'PERSON';

	const dispatch = createEventDispatcher<{
		close: void;
		created: { entity: CaseIntelligenceCommittedEntity };
	}>();

	let dialogEl: HTMLDialogElement | null = null;

	let displayLabel = '';
	/** When false, displayLabel follows generated person name suggestion. */
	let displayLabelDirty = false;

	let personPosture: CaseIntelligencePersonPosture = 'IDENTIFIED';
	let personFirstName = '';
	let personMiddleName = '';
	let personLastName = '';
	let personAliases = '';
	let personPrimaryPhone = '';
	/** Extra phone rows (normalized on submit). */
	let personExtraPhones: string[] = [];
	let personAddressLine = '';
	let personUnit = '';
	let personCity = '';
	let personStateSelect = '';
	let personStateOther = '';
	let personCountrySelect = COUNTRY_US;
	let personCountryOther = '';
	let personAddressType: PersonAddressType = 'UNKNOWN';
	let personDobIso = '';
	let personDobApproximate = false;
	let personDobApproxText = '';
	let personEthnicity = '';
	let personHeightFeetStr = '';
	let personHeightInchesStr = '';
	let personWeightStr = '';
	let personHairColor = '';
	let personEyeColor = '';
	let personNotes = '';

	let vehiclePlate = '';
	let vehiclePlateStateSelect = '';
	let vehiclePlateStateOther = '';
	let vehicleVin = '';
	let vehicleMakeSelect = '';
	let vehicleMakeOther = '';
	let vehicleModel = '';
	let vehicleColorSelect = '';
	let vehicleColorOther = '';
	let vehicleYearStr = '';
	let vehicleNotes = '';

	let locPlaceName = '';
	let locAddressLine = '';
	let locUnit = '';
	let locCity = '';
	let locStateSelect = '';
	let locStateOther = '';
	let locCountrySelect = COUNTRY_US;
	let locCountryOther = '';
	let locNotes = '';

	let coreAttributesJson = '';
	let advancedJsonOpen = false;
	let submitError = '';
	let submitting = false;

	const NOTES_MAX_LEN = 4000;
	const currentYear = new Date().getFullYear();

	const PERSON_POSTURES: { value: CaseIntelligencePersonPosture; label: string }[] = [
		{ value: 'IDENTIFIED', label: 'Identified' },
		{ value: 'UNKNOWN_PARTIAL', label: 'Unknown (partial)' },
		{ value: 'UNKNOWN_PLACEHOLDER', label: 'Unknown (placeholder)' }
	];

	/** P68-FU7: bind heading directly to `entityKind` so title never stale ({#key} below). */
	$: modalHeading =
		entityKind === 'PERSON'
			? 'Add person'
			: entityKind === 'VEHICLE'
				? 'Add vehicle'
				: entityKind === 'LOCATION'
					? 'Add location'
					: 'Add entity';

	function markLabelDirty(): void {
		displayLabelDirty = true;
	}

	function resetForm(): void {
		displayLabel = '';
		displayLabelDirty = false;
		personPosture = 'IDENTIFIED';
		personFirstName = '';
		personMiddleName = '';
		personLastName = '';
		personAliases = '';
		personPrimaryPhone = '';
		personExtraPhones = [];
		personAddressLine = '';
		personUnit = '';
		personCity = '';
		personStateSelect = '';
		personStateOther = '';
		personCountrySelect = COUNTRY_US;
		personCountryOther = '';
		personAddressType = 'UNKNOWN';
		personDobIso = '';
		personDobApproximate = false;
		personDobApproxText = '';
		personEthnicity = '';
		personHeightFeetStr = '';
		personHeightInchesStr = '';
		personWeightStr = '';
		personHairColor = '';
		personEyeColor = '';
		personNotes = '';
		vehiclePlate = '';
		vehiclePlateStateSelect = '';
		vehiclePlateStateOther = '';
		vehicleVin = '';
		vehicleMakeSelect = '';
		vehicleMakeOther = '';
		vehicleModel = '';
		vehicleColorSelect = '';
		vehicleColorOther = '';
		vehicleYearStr = '';
		vehicleNotes = '';
		locPlaceName = '';
		locAddressLine = '';
		locUnit = '';
		locCity = '';
		locStateSelect = '';
		locStateOther = '';
		locCountrySelect = COUNTRY_US;
		locCountryOther = '';
		locNotes = '';
		coreAttributesJson = '';
		advancedJsonOpen = false;
		submitError = '';
		submitting = false;
	}

	function closeModal(): void {
		dialogEl?.close();
	}

	function onDialogClose(): void {
		resetForm();
		dispatch('close');
	}

	$: if (dialogEl !== null) {
		const el = dialogEl;
		const shouldOpen = open;
		void tick().then(() => {
			if (!el.isConnected) return;
			if (shouldOpen) {
				if (!el.open) el.showModal();
			} else {
				if (el.open) el.close();
			}
		});
	}

	let createModalWasOpen = false;
	let createModalOpenedKind: CaseIntelligenceEntityKind | null = null;
	$: {
		if (open && !createModalWasOpen) {
			createModalWasOpen = true;
			createModalOpenedKind = entityKind;
			resetForm();
		} else if (open && createModalWasOpen && entityKind !== createModalOpenedKind) {
			createModalOpenedKind = entityKind;
			resetForm();
		} else if (!open) {
			createModalWasOpen = false;
			createModalOpenedKind = null;
		}
	}

	$: if (open && entityKind === 'PERSON' && !displayLabelDirty) {
		const s = suggestPersonDisplayLabel({
			first_name: personFirstName,
			middle_name: personMiddleName,
			last_name: personLastName
		});
		if (s !== null) displayLabel = s;
		else if (!personFirstName.trim() && !personLastName.trim()) displayLabel = '';
	}

	$: if (open && entityKind === 'VEHICLE' && !displayLabelDirty) {
		const st = resolveUsStateValue(vehiclePlateStateSelect, vehiclePlateStateOther);
		const s = suggestVehicleDisplayLabel({
			plate: vehiclePlate,
			plate_state: st,
			year: vehicleYearStr,
			make: resolveVehicleMake(vehicleMakeSelect, vehicleMakeOther),
			model: vehicleModel
		});
		if (s !== null) displayLabel = s;
		else displayLabel = '';
	}

	$: if (open && entityKind === 'LOCATION' && !displayLabelDirty) {
		const st = resolveUsStateValue(locStateSelect, locStateOther);
		const s = suggestLocationDisplayLabel({
			place_name: locPlaceName,
			address_line: locAddressLine,
			unit: locUnit,
			city: locCity,
			state: st
		});
		if (s !== null) displayLabel = s;
		else displayLabel = '';
	}

	function applySuggestedVehicleLabel(): void {
		const st = resolveUsStateValue(vehiclePlateStateSelect, vehiclePlateStateOther);
		const s = suggestVehicleDisplayLabel({
			plate: vehiclePlate,
			plate_state: st,
			year: vehicleYearStr,
			make: resolveVehicleMake(vehicleMakeSelect, vehicleMakeOther),
			model: vehicleModel
		});
		if (s) {
			displayLabel = s;
			displayLabelDirty = false;
		}
	}

	function applySuggestedLocationLabel(): void {
		const st = resolveUsStateValue(locStateSelect, locStateOther);
		const s = suggestLocationDisplayLabel({
			place_name: locPlaceName,
			address_line: locAddressLine,
			unit: locUnit,
			city: locCity,
			state: st
		});
		if (s) {
			displayLabel = s;
			displayLabelDirty = false;
		}
	}

	function applySuggestedPersonLabel(): void {
		const s = suggestPersonDisplayLabel({
			first_name: personFirstName,
			middle_name: personMiddleName,
			last_name: personLastName
		});
		if (s !== null) {
			displayLabel = s;
			displayLabelDirty = false;
		}
	}

	function addPersonPhoneRow(): void {
		personExtraPhones = [...personExtraPhones, ''];
	}

	function removePersonPhoneRow(i: number): void {
		personExtraPhones = personExtraPhones.filter((_, idx) => idx !== i);
	}

	function onPersonPrimaryPhoneInput(e: Event): void {
		personPrimaryPhone = usPersonPhoneDigitsFromInput((e.currentTarget as HTMLInputElement).value);
	}

	function onPersonExtraPhoneInput(i: number, e: Event): void {
		const v = usPersonPhoneDigitsFromInput((e.currentTarget as HTMLInputElement).value);
		const next = [...personExtraPhones];
		next[i] = v;
		personExtraPhones = next;
	}

	function onPersonPrimaryPhonePaste(e: ClipboardEvent): void {
		e.preventDefault();
		const clip = e.clipboardData?.getData('text/plain') ?? '';
		personPrimaryPhone = usPersonPhoneDigitsFromInput(clip);
	}

	function onPersonExtraPhonePaste(i: number, e: ClipboardEvent): void {
		e.preventDefault();
		const clip = e.clipboardData?.getData('text/plain') ?? '';
		const next = [...personExtraPhones];
		next[i] = usPersonPhoneDigitsFromInput(clip);
		personExtraPhones = next;
	}

	function structuredCoreForKind(): Record<string, unknown> {
		if (entityKind === 'PERSON') {
			return buildPersonCoreAttributes({
				first_name: personFirstName,
				middle_name: personMiddleName,
				last_name: personLastName,
				aliases: personAliases,
				primary_phone: personPrimaryPhone,
				additional_phones: personExtraPhones,
				address_line: personAddressLine,
				unit: personUnit,
				city: personCity,
				stateResolved: resolveUsStateValue(personStateSelect, personStateOther),
				countrySelect: personCountrySelect,
				countryOther: personCountryOther,
				address_type: personAddressType,
				dob_iso: personDobApproximate ? '' : personDobIso,
				dob_approx: personDobApproximate ? personDobApproxText : '',
				ethnicity: personEthnicity,
				height_feet: personHeightFeetStr,
				height_inches: personHeightInchesStr,
				weight: personWeightStr,
				hair_color: personHairColor,
				eye_color: personEyeColor,
				notes: personNotes
			});
		}
		if (entityKind === 'VEHICLE') {
			let yr = vehicleYearStr.trim();
			if (yr && /^\d+$/.test(yr)) {
				const y = parseInt(yr, 10);
				if (y < 1900 || y > currentYear + 1) yr = '';
			} else if (yr) {
				yr = '';
			}
			return buildVehicleCoreAttributes({
				plate: vehiclePlate,
				plate_state_resolved: resolveUsStateValue(vehiclePlateStateSelect, vehiclePlateStateOther),
				vin: vehicleVin,
				make_resolved: resolveVehicleMake(vehicleMakeSelect, vehicleMakeOther),
				model: vehicleModel,
				color_resolved: resolveVehicleColor(vehicleColorSelect, vehicleColorOther),
				year: yr,
				notes: vehicleNotes
			});
		}
		return buildLocationCoreAttributes({
			place_name: locPlaceName,
			address_line: locAddressLine,
			unit: locUnit,
			city: locCity,
			stateResolved: resolveUsStateValue(locStateSelect, locStateOther),
			countrySelect: locCountrySelect,
			countryOther: locCountryOther,
			notes: locNotes
		});
	}

	async function onSubmit(): Promise<void> {
		submitError = '';
		if (!caseId || !token || submitting) return;

		if (entityKind === 'PERSON') {
			const fn = personFirstName.trim();
			const ln = personLastName.trim();
			if (!fn && !ln) {
				submitError = 'Enter at least a first name or a last name.';
				return;
			}
			if (personStateSelect === DROPDOWN_OTHER && !personStateOther.trim()) {
				submitError = 'Enter a state/region when “Other” is selected.';
				return;
			}
			if (personCountrySelect === COUNTRY_OTHER && !personCountryOther.trim()) {
				submitError = 'Enter a country detail when “Other country” is selected.';
				return;
			}
		}

		if (entityKind === 'LOCATION') {
			if (!locAddressLine.trim() || !locCity.trim()) {
				submitError = 'Address line and city are required for a location.';
				return;
			}
			const st = resolveUsStateValue(locStateSelect, locStateOther);
			if (!st) {
				submitError = 'State / region is required (choose a state or Other with a value).';
				return;
			}
			if (locStateSelect === DROPDOWN_OTHER && !locStateOther.trim()) {
				submitError = 'Enter state/region when “Other” is selected.';
				return;
			}
			if (locCountrySelect === COUNTRY_OTHER && !locCountryOther.trim()) {
				submitError = 'Enter country detail when “Other country” is selected.';
				return;
			}
		}

		if (entityKind === 'VEHICLE') {
			if (vehiclePlateStateSelect === DROPDOWN_OTHER && !vehiclePlateStateOther.trim()) {
				submitError = 'Enter plate state/region when “Other” is selected.';
				return;
			}
			if (vehicleMakeSelect === DROPDOWN_OTHER && !vehicleMakeOther.trim()) {
				submitError = 'Enter make when “Other” is selected.';
				return;
			}
			if (vehicleColorSelect === DROPDOWN_OTHER && !vehicleColorOther.trim()) {
				submitError = 'Enter color when “Other” is selected.';
				return;
			}
		}

		const label = displayLabel.trim();
		if (!label) {
			submitError = 'Registry label is required.';
			return;
		}

		const assembled = assembleCoreAttributesForSubmit({
			structured: structuredCoreForKind(),
			advancedJson: coreAttributesJson
		});
		if (!assembled.ok) {
			submitError = assembled.error;
			return;
		}

		const body: Parameters<typeof createCaseIntelligenceCommittedEntityDirect>[2] = {
			entity_kind: entityKind,
			display_label: label,
			core_attributes: assembled.core
		};
		if (entityKind === 'PERSON') {
			body.person_identity_posture = personPosture;
		} else {
			body.person_identity_posture = null;
		}

		submitting = true;
		try {
			const out = await createCaseIntelligenceCommittedEntityDirect(caseId, token, body);
			dispatch('created', { entity: out.committed_entity });
			closeModal();
		} catch (e) {
			submitError = e instanceof Error ? e.message : 'Could not create entity.';
		} finally {
			submitting = false;
		}
	}

	function onFormKeydown(e: KeyboardEvent): void {
		if (e.key === 'Enter' && (e.target as HTMLElement)?.tagName !== 'TEXTAREA') {
			e.preventDefault();
		}
	}
</script>

<dialog
	bind:this={dialogEl}
	class="max-w-xl w-[calc(100vw-2rem)] rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 shadow-2xl p-0 backdrop:bg-black/50"
	data-testid="case-intel-entity-create-modal"
	aria-modal="true"
	aria-labelledby="case-intel-entity-create-title"
	on:click={(e) => {
		if (e.currentTarget === e.target && !submitting) closeModal();
	}}
	on:close={onDialogClose}
>
	<form
		class="flex flex-col max-h-[min(92vh,44rem)]"
		on:submit|preventDefault={() => void onSubmit()}
		on:keydown={onFormKeydown}
	>
		<div class="px-4 pt-4 pb-3 border-b border-gray-100 dark:border-gray-800 shrink-0">
			{#key entityKind}
				<h2 id="case-intel-entity-create-title" class="text-base font-semibold text-gray-900 dark:text-gray-100" data-testid="case-intel-create-modal-title">
					{modalHeading}
				</h2>
			{/key}
			<p class="mt-1.5 text-[11px] text-gray-600 dark:text-gray-400 leading-snug">
				Saves <strong class="font-medium text-gray-800 dark:text-gray-200">immediately</strong> as <strong class="font-medium"
					>committed</strong> case intelligence — not staging or a <strong class="font-medium">P19</strong> proposal.
			</p>
		</div>

		<div class="px-4 py-3 space-y-4 overflow-y-auto flex-1">
			{#if entityKind === 'PERSON'}
				<div class="space-y-4" data-testid="case-intel-create-person-structured">
					<div class="space-y-2" data-testid="case-intel-create-person-section-identifiers">
						<p class="text-[10px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Identifiers</p>
						<div class="grid grid-cols-1 sm:grid-cols-3 gap-2">
							<div>
								<label class="block text-[11px] font-medium text-gray-600 dark:text-gray-400 mb-0.5" for="ci-p-fn">First name</label>
								<input
									id="ci-p-fn"
									type="text"
									class="w-full px-2 py-1.5 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-sm"
									data-testid="case-intel-create-person-first-name"
									bind:value={personFirstName}
									disabled={submitting}
									autocomplete="off"
								/>
							</div>
							<div>
								<label class="block text-[11px] font-medium text-gray-600 dark:text-gray-400 mb-0.5" for="ci-p-mn">Middle name</label>
								<input
									id="ci-p-mn"
									type="text"
									class="w-full px-2 py-1.5 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-sm"
									data-testid="case-intel-create-person-middle-name"
									bind:value={personMiddleName}
									disabled={submitting}
									autocomplete="off"
								/>
							</div>
							<div>
								<label class="block text-[11px] font-medium text-gray-600 dark:text-gray-400 mb-0.5" for="ci-p-ln">Last name</label>
								<input
									id="ci-p-ln"
									type="text"
									class="w-full px-2 py-1.5 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-sm"
									data-testid="case-intel-create-person-last-name"
									bind:value={personLastName}
									disabled={submitting}
									autocomplete="off"
								/>
							</div>
						</div>
						<div>
							<label class="block text-[11px] font-medium text-gray-600 dark:text-gray-400 mb-0.5" for="ci-p-aliases">Aliases / also known as</label>
							<input
								id="ci-p-aliases"
								type="text"
								class="w-full px-2 py-1.5 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-sm"
								data-testid="case-intel-create-person-aliases"
								bind:value={personAliases}
								disabled={submitting}
								autocomplete="off"
							/>
						</div>
						<div>
							<label class="block text-[11px] font-medium text-gray-600 dark:text-gray-400 mb-0.5" for="ci-create-posture"
								>Identity posture <span class="text-red-600 dark:text-red-400" aria-hidden="true">*</span></label
							>
							<select
								id="ci-create-posture"
								class="w-full px-2 py-1.5 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-sm"
								data-testid="case-intel-create-person-posture"
								bind:value={personPosture}
								disabled={submitting}
							>
								{#each PERSON_POSTURES as p}
									<option value={p.value}>{p.label}</option>
								{/each}
							</select>
						</div>
						<div>
							<label class="block text-[11px] font-medium text-gray-600 dark:text-gray-400 mb-0.5" for="ci-p-ethnicity">Ethnicity</label>
							<select
								id="ci-p-ethnicity"
								class="w-full px-2 py-1.5 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-sm"
								data-testid="case-intel-create-person-ethnicity"
								bind:value={personEthnicity}
								disabled={submitting}
							>
								<option value="">—</option>
								{#each PERSON_ETHNICITY_OPTIONS as eth}
									<option value={eth}>{eth}</option>
								{/each}
							</select>
						</div>
						<p class="text-[10px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 pt-1">Date of birth</p>
						<label class="flex items-center gap-2 text-[11px] text-gray-700 dark:text-gray-300">
							<input type="checkbox" bind:checked={personDobApproximate} disabled={submitting} data-testid="case-intel-create-person-dob-approx-toggle" />
							Approximate / unknown (text)
						</label>
						{#if personDobApproximate}
							<textarea
								rows="2"
								class="w-full px-2 py-1.5 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-sm"
								data-testid="case-intel-create-person-dob-approx"
								bind:value={personDobApproxText}
								disabled={submitting}
								placeholder="e.g. ~1980s, year unknown"
							></textarea>
						{:else}
							<input
								type="date"
								class="w-full px-2 py-1.5 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-sm"
								data-testid="case-intel-create-person-dob-date"
								bind:value={personDobIso}
								disabled={submitting}
							/>
						{/if}
					</div>

					<div class="space-y-2" data-testid="case-intel-create-person-section-contact">
						<p class="text-[10px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Contact</p>
						<div>
							<label class="block text-[11px] font-medium text-gray-600 dark:text-gray-400 mb-0.5" for="ci-p-phone">Primary phone</label>
							<input
								id="ci-p-phone"
								type="tel"
								class="w-full px-2 py-1.5 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-sm"
								data-testid="case-intel-create-person-phone"
								value={formatUsPersonPhoneMask(personPrimaryPhone)}
								on:input={onPersonPrimaryPhoneInput}
								on:paste={onPersonPrimaryPhonePaste}
								disabled={submitting}
								autocomplete="off"
								placeholder="(555) 123-4567"
								maxlength="14"
							/>
							<p class="mt-0.5 text-[10px] text-gray-500">US 10 digits max; extra digits ignored. Paste is sanitized.</p>
						</div>
						{#each personExtraPhones as _, i (i)}
							<div class="flex gap-2 items-end">
								<div class="flex-1">
									<label class="block text-[11px] font-medium text-gray-600 dark:text-gray-400 mb-0.5" for="ci-p-exphone-{i}">Additional phone</label>
									<input
										id="ci-p-exphone-{i}"
										type="tel"
										class="w-full px-2 py-1.5 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-sm"
										data-testid="case-intel-create-person-phone-extra"
										value={formatUsPersonPhoneMask(personExtraPhones[i] ?? '')}
										on:input={(e) => onPersonExtraPhoneInput(i, e)}
										on:paste={(e) => onPersonExtraPhonePaste(i, e)}
										disabled={submitting}
										maxlength="14"
									/>
								</div>
								<button
									type="button"
									class="text-[11px] px-2 py-1.5 rounded border border-gray-300 dark:border-gray-600 shrink-0"
									data-testid="case-intel-create-person-phone-remove"
									disabled={submitting}
									on:click={() => removePersonPhoneRow(i)}
								>Remove</button>
							</div>
						{/each}
						<button
							type="button"
							class="text-[11px] font-medium text-blue-700 dark:text-blue-400"
							data-testid="case-intel-create-person-phone-add"
							disabled={submitting}
							on:click={addPersonPhoneRow}
						>+ Add phone</button>
					</div>

					<div class="space-y-2" data-testid="case-intel-create-person-section-address">
						<p class="text-[10px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Address</p>
					<div class="grid grid-cols-1 gap-2">
						<div>
							<label class="block text-[11px] font-medium text-gray-600 dark:text-gray-400 mb-0.5" for="ci-p-addr">Address line</label>
							<input
								id="ci-p-addr"
								type="text"
								class="w-full px-2 py-1.5 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-sm"
								data-testid="case-intel-create-person-address-line"
								bind:value={personAddressLine}
								disabled={submitting}
								autocomplete="off"
							/>
						</div>
						<div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
							<div>
								<label class="block text-[11px] font-medium text-gray-600 dark:text-gray-400 mb-0.5" for="ci-p-unit">Unit / apartment</label>
								<input
									id="ci-p-unit"
									type="text"
									class="w-full px-2 py-1.5 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-sm"
									data-testid="case-intel-create-person-unit"
									bind:value={personUnit}
									disabled={submitting}
								/>
							</div>
							<div>
								<label class="block text-[11px] font-medium text-gray-600 dark:text-gray-400 mb-0.5" for="ci-p-city">City</label>
								<input
									id="ci-p-city"
									type="text"
									class="w-full px-2 py-1.5 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-sm"
									data-testid="case-intel-create-person-city"
									bind:value={personCity}
									disabled={submitting}
								/>
							</div>
						</div>
						<div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
							<div>
								<label class="block text-[11px] font-medium text-gray-600 dark:text-gray-400 mb-0.5" for="ci-p-state">State</label>
								<select
									id="ci-p-state"
									class="w-full px-2 py-1.5 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-sm"
									data-testid="case-intel-create-person-state-select"
									bind:value={personStateSelect}
									disabled={submitting}
								>
									<option value="">—</option>
									{#each US_STATES as s}
										<option value={s.code}>{s.code} — {s.name}</option>
									{/each}
									<option value={DROPDOWN_OTHER}>Other…</option>
								</select>
							</div>
							{#if personStateSelect === DROPDOWN_OTHER}
								<div>
									<label class="block text-[11px] font-medium text-gray-600 dark:text-gray-400 mb-0.5" for="ci-p-state-other">State / region (other)</label>
									<input
										id="ci-p-state-other"
										type="text"
										class="w-full px-2 py-1.5 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-sm"
										data-testid="case-intel-create-person-state-other"
										bind:value={personStateOther}
										disabled={submitting}
									/>
								</div>
							{/if}
						</div>
						<div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
							<div>
								<label class="block text-[11px] font-medium text-gray-600 dark:text-gray-400 mb-0.5" for="ci-p-country">Country</label>
								<select
									id="ci-p-country"
									class="w-full px-2 py-1.5 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-sm"
									data-testid="case-intel-create-person-country-select"
									bind:value={personCountrySelect}
									disabled={submitting}
								>
									<option value={COUNTRY_US}>United States</option>
									<option value={COUNTRY_OTHER}>Other…</option>
								</select>
							</div>
							{#if personCountrySelect === COUNTRY_OTHER}
								<div>
									<label class="block text-[11px] font-medium text-gray-600 dark:text-gray-400 mb-0.5" for="ci-p-country-other">Country</label>
									<input
										id="ci-p-country-other"
										type="text"
										class="w-full px-2 py-1.5 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-sm"
										data-testid="case-intel-create-person-country-other"
										bind:value={personCountryOther}
										disabled={submitting}
									/>
								</div>
							{/if}
						</div>
						<div>
							<label class="block text-[11px] font-medium text-gray-600 dark:text-gray-400 mb-0.5" for="ci-p-addr-type">Address type</label>
							<select
								id="ci-p-addr-type"
								class="w-full px-2 py-1.5 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-sm"
								data-testid="case-intel-create-person-address-type"
								bind:value={personAddressType}
								disabled={submitting}
							>
								{#each PERSON_ADDRESS_TYPES as t}
									<option value={t.value}>{t.label}</option>
								{/each}
							</select>
						</div>
					</div>
					</div>

					<div class="space-y-2" data-testid="case-intel-create-person-section-physical">
						<p class="text-[10px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Physical descriptors</p>
						<div class="grid grid-cols-2 gap-2 max-w-xs">
							<div>
								<label class="block text-[11px] font-medium text-gray-600 dark:text-gray-400 mb-0.5" for="ci-p-h-ft">Height (ft)</label>
								<input
									id="ci-p-h-ft"
									type="text"
									inputmode="numeric"
									maxlength="1"
									class="w-full px-2 py-1.5 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-sm"
									data-testid="case-intel-create-person-height-feet"
									bind:value={personHeightFeetStr}
									disabled={submitting}
									autocomplete="off"
								/>
							</div>
							<div>
								<label class="block text-[11px] font-medium text-gray-600 dark:text-gray-400 mb-0.5" for="ci-p-h-in">Height (in)</label>
								<input
									id="ci-p-h-in"
									type="text"
									inputmode="numeric"
									maxlength="2"
									class="w-full px-2 py-1.5 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-sm"
									data-testid="case-intel-create-person-height-inches"
									bind:value={personHeightInchesStr}
									disabled={submitting}
									autocomplete="off"
								/>
							</div>
						</div>
						<div class="max-w-xs">
							<label class="block text-[11px] font-medium text-gray-600 dark:text-gray-400 mb-0.5" for="ci-p-weight">Weight (lb)</label>
							<input
								id="ci-p-weight"
								type="text"
								inputmode="numeric"
								class="w-full px-2 py-1.5 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-sm"
								data-testid="case-intel-create-person-weight"
								bind:value={personWeightStr}
								disabled={submitting}
								autocomplete="off"
								placeholder="e.g. 180"
							/>
						</div>
						<div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
							<div>
								<label class="block text-[11px] font-medium text-gray-600 dark:text-gray-400 mb-0.5" for="ci-p-hair">Hair color</label>
								<select
									id="ci-p-hair"
									class="w-full px-2 py-1.5 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-sm"
									data-testid="case-intel-create-person-hair-color"
									bind:value={personHairColor}
									disabled={submitting}
								>
									<option value="">—</option>
									{#each PERSON_HAIR_COLOR_OPTIONS as c}
										<option value={c}>{c}</option>
									{/each}
								</select>
							</div>
							<div>
								<label class="block text-[11px] font-medium text-gray-600 dark:text-gray-400 mb-0.5" for="ci-p-eye">Eye color</label>
								<select
									id="ci-p-eye"
									class="w-full px-2 py-1.5 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-sm"
									data-testid="case-intel-create-person-eye-color"
									bind:value={personEyeColor}
									disabled={submitting}
								>
									<option value="">—</option>
									{#each PERSON_EYE_COLOR_OPTIONS as c}
										<option value={c}>{c}</option>
									{/each}
								</select>
							</div>
						</div>
					</div>

					<div class="space-y-2" data-testid="case-intel-create-person-section-notes">
						<p class="text-[10px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Notes</p>
						<div>
							<label class="sr-only" for="ci-p-notes">Notes</label>
							<textarea
								id="ci-p-notes"
								rows="2"
								maxlength={NOTES_MAX_LEN}
								class="w-full px-2 py-1.5 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-sm"
								data-testid="case-intel-create-person-notes"
								bind:value={personNotes}
								disabled={submitting}
							></textarea>
						</div>
					</div>
				</div>
			{/if}

			{#if entityKind === 'VEHICLE'}
				<div class="space-y-2" data-testid="case-intel-create-vehicle-structured">
					<p class="text-[10px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Registration</p>
					<div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
						<div>
							<label class="block text-[11px] font-medium text-gray-600 dark:text-gray-400 mb-0.5" for="ci-v-plate">Plate</label>
							<input
								id="ci-v-plate"
								type="text"
								class="w-full px-2 py-1.5 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-sm"
								data-testid="case-intel-create-vehicle-plate"
								bind:value={vehiclePlate}
								disabled={submitting}
							/>
						</div>
						<div>
							<label class="block text-[11px] font-medium text-gray-600 dark:text-gray-400 mb-0.5" for="ci-v-plate-state">Plate state</label>
							<select
								id="ci-v-plate-state"
								class="w-full px-2 py-1.5 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-sm"
								data-testid="case-intel-create-vehicle-plate-state-select"
								bind:value={vehiclePlateStateSelect}
								disabled={submitting}
							>
								<option value="">—</option>
								{#each US_STATES as s}
									<option value={s.code}>{s.code}</option>
								{/each}
								<option value={DROPDOWN_OTHER}>Other…</option>
							</select>
							{#if vehiclePlateStateSelect === DROPDOWN_OTHER}
								<input
									type="text"
									class="mt-1 w-full px-2 py-1.5 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-sm"
									data-testid="case-intel-create-vehicle-plate-state-other"
									bind:value={vehiclePlateStateOther}
									disabled={submitting}
									placeholder="State / province"
								/>
							{/if}
						</div>
					</div>
					<p class="text-[10px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Vehicle details</p>
					<div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
						<div class="sm:col-span-2">
							<label class="block text-[11px] font-medium text-gray-600 dark:text-gray-400 mb-0.5" for="ci-v-vin">VIN</label>
							<input
								id="ci-v-vin"
								type="text"
								class="w-full px-2 py-1.5 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-sm"
								data-testid="case-intel-create-vehicle-vin"
								bind:value={vehicleVin}
								disabled={submitting}
							/>
						</div>
						<div>
							<label class="block text-[11px] font-medium text-gray-600 dark:text-gray-400 mb-0.5" for="ci-v-make">Make</label>
							<select
								id="ci-v-make"
								class="w-full px-2 py-1.5 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-sm"
								data-testid="case-intel-create-vehicle-make-select"
								bind:value={vehicleMakeSelect}
								disabled={submitting}
							>
								<option value="">—</option>
								{#each VEHICLE_MAKE_OPTIONS as m}
									<option value={m.value}>{m.label}</option>
								{/each}
							</select>
							{#if vehicleMakeSelect === DROPDOWN_OTHER}
								<input
									type="text"
									class="mt-1 w-full px-2 py-1.5 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-sm"
									data-testid="case-intel-create-vehicle-make-other"
									bind:value={vehicleMakeOther}
									disabled={submitting}
								/>
							{/if}
						</div>
						<div>
							<label class="block text-[11px] font-medium text-gray-600 dark:text-gray-400 mb-0.5" for="ci-v-model">Model</label>
							<input
								id="ci-v-model"
								type="text"
								class="w-full px-2 py-1.5 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-sm"
								data-testid="case-intel-create-vehicle-model"
								bind:value={vehicleModel}
								disabled={submitting}
							/>
						</div>
						<div>
							<label class="block text-[11px] font-medium text-gray-600 dark:text-gray-400 mb-0.5" for="ci-v-color">Color</label>
							<select
								id="ci-v-color"
								class="w-full px-2 py-1.5 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-sm"
								data-testid="case-intel-create-vehicle-color-select"
								bind:value={vehicleColorSelect}
								disabled={submitting}
							>
								<option value="">—</option>
								{#each VEHICLE_COLOR_OPTIONS as c}
									<option value={c.value}>{c.label}</option>
								{/each}
							</select>
							{#if vehicleColorSelect === DROPDOWN_OTHER}
								<input
									type="text"
									class="mt-1 w-full px-2 py-1.5 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-sm"
									data-testid="case-intel-create-vehicle-color-other"
									bind:value={vehicleColorOther}
									disabled={submitting}
								/>
							{/if}
						</div>
						<div>
							<label class="block text-[11px] font-medium text-gray-600 dark:text-gray-400 mb-0.5" for="ci-v-year">Year</label>
							<input
								id="ci-v-year"
								type="text"
								inputmode="numeric"
								maxlength="5"
								class="w-full px-2 py-1.5 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-sm"
								data-testid="case-intel-create-vehicle-year"
								bind:value={vehicleYearStr}
								disabled={submitting}
								placeholder="e.g. 2019"
							/>
						</div>
					</div>
					<div>
						<label class="block text-[11px] font-medium text-gray-600 dark:text-gray-400 mb-0.5" for="ci-v-notes">Notes</label>
						<textarea
							id="ci-v-notes"
							rows="2"
							maxlength={NOTES_MAX_LEN}
							class="w-full px-2 py-1.5 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-sm"
							data-testid="case-intel-create-vehicle-notes"
							bind:value={vehicleNotes}
							disabled={submitting}
						></textarea>
					</div>
				</div>
			{/if}

			{#if entityKind === 'LOCATION'}
				<div class="space-y-2" data-testid="case-intel-create-location-structured">
					<p class="text-[10px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Place / address</p>
					<div class="grid grid-cols-1 gap-2">
						<div>
							<label class="block text-[11px] font-medium text-gray-600 dark:text-gray-400 mb-0.5" for="ci-l-addr">Address line <span class="text-red-600 dark:text-red-400">*</span></label>
							<input
								id="ci-l-addr"
								type="text"
								class="w-full px-2 py-1.5 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-sm"
								data-testid="case-intel-create-location-address-line"
								bind:value={locAddressLine}
								disabled={submitting}
								required
							/>
						</div>
						<div class="grid grid-cols-1 sm:grid-cols-3 gap-2">
							<div>
								<label class="block text-[11px] font-medium text-gray-600 dark:text-gray-400 mb-0.5" for="ci-l-unit">Unit / suite</label>
								<input
									id="ci-l-unit"
									type="text"
									class="w-full px-2 py-1.5 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-sm"
									data-testid="case-intel-create-location-unit"
									bind:value={locUnit}
									disabled={submitting}
								/>
							</div>
							<div>
								<label class="block text-[11px] font-medium text-gray-600 dark:text-gray-400 mb-0.5" for="ci-l-city">City <span class="text-red-600 dark:text-red-400">*</span></label>
								<input
									id="ci-l-city"
									type="text"
									class="w-full px-2 py-1.5 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-sm"
									data-testid="case-intel-create-location-city"
									bind:value={locCity}
									disabled={submitting}
									required
								/>
							</div>
							<div>
								<label class="block text-[11px] font-medium text-gray-600 dark:text-gray-400 mb-0.5" for="ci-l-state">State <span class="text-red-600 dark:text-red-400">*</span></label>
								<select
									id="ci-l-state"
									class="w-full px-2 py-1.5 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-sm"
									data-testid="case-intel-create-location-state-select"
									bind:value={locStateSelect}
									disabled={submitting}
								>
									<option value="">—</option>
									{#each US_STATES as s}
										<option value={s.code}>{s.code}</option>
									{/each}
									<option value={DROPDOWN_OTHER}>Other…</option>
								</select>
							</div>
						</div>
						{#if locStateSelect === DROPDOWN_OTHER}
							<input
								type="text"
								class="w-full px-2 py-1.5 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-sm"
								data-testid="case-intel-create-location-state-other"
								bind:value={locStateOther}
								disabled={submitting}
								placeholder="State / region"
							/>
						{/if}
						<div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
							<div>
								<label class="block text-[11px] font-medium text-gray-600 dark:text-gray-400 mb-0.5" for="ci-l-country">Country</label>
								<select
									id="ci-l-country"
									class="w-full px-2 py-1.5 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-sm"
									data-testid="case-intel-create-location-country-select"
									bind:value={locCountrySelect}
									disabled={submitting}
								>
									<option value={COUNTRY_US}>United States</option>
									<option value={COUNTRY_OTHER}>Other…</option>
								</select>
							</div>
							{#if locCountrySelect === COUNTRY_OTHER}
								<div>
									<label class="block text-[11px] font-medium text-gray-600 dark:text-gray-400 mb-0.5" for="ci-l-country-other">Country</label>
									<input
										id="ci-l-country-other"
										type="text"
										class="w-full px-2 py-1.5 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-sm"
										data-testid="case-intel-create-location-country-other"
										bind:value={locCountryOther}
										disabled={submitting}
									/>
								</div>
							{/if}
						</div>
						<div>
							<label class="block text-[11px] font-medium text-gray-600 dark:text-gray-400 mb-0.5" for="ci-l-place">Place or business name</label>
							<input
								id="ci-l-place"
								type="text"
								class="w-full px-2 py-1.5 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-sm"
								data-testid="case-intel-create-location-place-name"
								bind:value={locPlaceName}
								disabled={submitting}
							/>
						</div>
					</div>
					<div>
						<label class="block text-[11px] font-medium text-gray-600 dark:text-gray-400 mb-0.5" for="ci-l-notes">Notes</label>
						<textarea
							id="ci-l-notes"
							rows="2"
							maxlength={NOTES_MAX_LEN}
							class="w-full px-2 py-1.5 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-sm"
							data-testid="case-intel-create-location-notes"
							bind:value={locNotes}
							disabled={submitting}
						></textarea>
					</div>
				</div>
			{/if}

			<!-- Registry label (all kinds) -->
			<div class="space-y-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50/90 dark:bg-gray-900/50 p-3">
				<p class="text-[10px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Registry label</p>
				<div class="flex flex-wrap items-end gap-2">
					<div class="min-w-0 flex-1 basis-[12rem]">
						<label class="block text-[11px] font-medium text-gray-600 dark:text-gray-400 mb-0.5" for="ci-create-label"
							>Shown in lists <span class="text-red-600 dark:text-red-400" aria-hidden="true">*</span></label
						>
						<input
							id="ci-create-label"
							type="text"
							class="w-full px-2 py-1.5 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-sm"
							data-testid="case-intel-create-display-label"
							bind:value={displayLabel}
							on:input={markLabelDirty}
							disabled={submitting}
							autocomplete="off"
							required
						/>
					</div>
					{#if entityKind === 'PERSON'}
						<button
							type="button"
							class="text-[11px] px-2 py-1.5 rounded-md border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 shrink-0"
							data-testid="case-intel-create-suggest-person-label"
							disabled={submitting}
							on:click={applySuggestedPersonLabel}
						>Regenerate from name</button>
					{/if}
					{#if entityKind === 'VEHICLE'}
						<button
							type="button"
							class="text-[11px] px-2 py-1.5 rounded-md border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 shrink-0"
							data-testid="case-intel-create-suggest-vehicle-label"
							disabled={submitting}
							on:click={applySuggestedVehicleLabel}
						>Suggest from fields</button>
					{/if}
					{#if entityKind === 'LOCATION'}
						<button
							type="button"
							class="text-[11px] px-2 py-1.5 rounded-md border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 shrink-0"
							data-testid="case-intel-create-suggest-location-label"
							disabled={submitting}
							on:click={applySuggestedLocationLabel}
						>Suggest from fields</button>
					{/if}
				</div>
			</div>

			<div
				class="rounded-lg border border-dashed border-gray-300 dark:border-gray-600 bg-gray-50/80 dark:bg-gray-900/40"
				data-testid="case-intel-create-advanced-json-region"
			>
				<button
					type="button"
					class="w-full flex items-center justify-between px-3 py-2 text-left text-[11px] font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100/80 dark:hover:bg-gray-800/60 rounded-lg"
					data-testid="case-intel-create-advanced-json-toggle"
					aria-expanded={advancedJsonOpen}
					on:click={() => (advancedJsonOpen = !advancedJsonOpen)}
				>
					<span>Advanced — optional JSON <span class="font-normal text-gray-500 dark:text-gray-400">(power users)</span></span>
					<span class="tabular-nums text-gray-400" aria-hidden="true">{advancedJsonOpen ? '▼' : '▶'}</span>
				</button>
				{#if advancedJsonOpen}
					<div class="px-3 pb-3 pt-0 space-y-1">
						<label class="block text-[10px] font-medium text-gray-500 dark:text-gray-400" for="ci-create-attrs">Additional `core_attributes` (object)</label>
						<textarea
							id="ci-create-attrs"
							rows="4"
							class="w-full px-2 py-1.5 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-xs font-mono"
							data-testid="case-intel-create-core-attrs-json"
							bind:value={coreAttributesJson}
							disabled={submitting}
							placeholder={'{}'}
						></textarea>
						<p class="text-[10px] text-gray-500 dark:text-gray-400 leading-snug">
							Structured fields above overwrite duplicate keys. Invalid JSON blocks submit only if this box is non-empty.
						</p>
					</div>
				{/if}
			</div>

			{#if submitError}
				<p class="text-sm text-red-700 dark:text-red-300" data-testid="case-intel-create-error" role="alert">{submitError}</p>
			{/if}
		</div>

		<div class="flex justify-end gap-2 px-4 py-3 border-t border-gray-100 dark:border-gray-800 shrink-0">
			<button
				type="button"
				class="px-3 py-1.5 text-sm rounded-md border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50"
				data-testid="case-intel-create-cancel"
				disabled={submitting}
				on:click={closeModal}
			>Cancel</button>
			<button
				type="submit"
				class="px-3 py-1.5 text-sm rounded-md font-medium bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
				data-testid="case-intel-create-submit"
				disabled={submitting}
			>{submitting ? 'Creating…' : 'Create'}</button>
		</div>
	</form>
</dialog>
