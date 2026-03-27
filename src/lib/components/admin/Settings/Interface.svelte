<script lang="ts">
	import { getModels, getTaskConfig, updateTaskConfig } from '$lib/apis';
	import { pickAdminInterfaceGovernedTaskConfig } from '$lib/constants/settingsGovernance';
	import { createEventDispatcher, onMount, getContext } from 'svelte';
	import { toast } from 'svelte-sonner';

	import { getBaseModels } from '$lib/apis/models';

	import Tooltip from '$lib/components/common/Tooltip.svelte';
	import Spinner from '$lib/components/common/Spinner.svelte';

	const dispatch = createEventDispatcher();

	const i18n = getContext('i18n');

	let taskConfig = {
		TASK_MODEL: '',
		TASK_MODEL_EXTERNAL: ''
	};

	const buildGovernedTaskPayload = () => {
		return pickAdminInterfaceGovernedTaskConfig(taskConfig);
	};

	const updateInterfaceHandler = async () => {
		taskConfig = await updateTaskConfig(localStorage.token, buildGovernedTaskPayload());
	};

	let workspaceModels = null;
	let baseModels = null;

	let models = null;

	const init = async () => {
		try {
			const fetchedTaskConfig = await getTaskConfig(localStorage.token);
			taskConfig = pickAdminInterfaceGovernedTaskConfig(fetchedTaskConfig ?? {});

			workspaceModels = await getBaseModels(localStorage.token);
			baseModels = await getModels(localStorage.token, null, false);

			models = baseModels.map((m) => {
				const workspaceModel = workspaceModels.find((wm) => wm.id === m.id);

				if (workspaceModel) {
					return {
						...m,
						...workspaceModel
					};
				} else {
					return {
						...m,
						id: m.id,
						name: m.name,

						is_active: true
					};
				}
			});

			console.debug('models', models);
		} catch (err) {
			console.error('Failed to initialize Interface settings:', err);
			toast.error(err?.detail ?? err?.message ?? $i18n.t('Failed to load Interface settings'));
			models = [];
		}
	};

	onMount(async () => {
		await init();
	});
</script>

{#if models !== null && taskConfig}
	<form
		class="flex flex-col h-full justify-between space-y-3 text-sm"
		on:submit|preventDefault={() => {
			updateInterfaceHandler();
			dispatch('save');
		}}
	>
		<div class="  overflow-y-scroll scrollbar-hidden h-full pr-1.5">
			<div class="mb-3.5">
				<div class=" mt-0.5 mb-2.5 text-base font-medium">{$i18n.t('Tasks')}</div>

				<hr class=" border-gray-100/30 dark:border-gray-850/30 my-2" />

				<div class=" mb-2 font-medium flex items-center">
					<div class=" text-xs mr-1">{$i18n.t('Task Model')}</div>
					<Tooltip
						content={$i18n.t(
							'A task model is used for background assistant tasks such as title generation.'
						)}
					>
						<svg
							xmlns="http://www.w3.org/2000/svg"
							fill="none"
							viewBox="0 0 24 24"
							stroke-width="1.5"
							stroke="currentColor"
							class="size-3.5"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								d="m11.25 11.25.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z"
							/>
						</svg>
					</Tooltip>
				</div>

				<div class=" mb-2.5 flex w-full gap-2">
					<div class="flex-1">
						<div class=" text-xs mb-1">{$i18n.t('Local Task Model')}</div>
						<select
							class="w-full rounded-lg py-2 px-4 text-sm bg-gray-50 dark:text-gray-300 dark:bg-gray-850 outline-hidden"
							bind:value={taskConfig.TASK_MODEL}
							placeholder={$i18n.t('Select a model')}
							on:change={() => {
								if (taskConfig.TASK_MODEL) {
									const model = models.find((m) => m.id === taskConfig.TASK_MODEL);
									if (model) {
										if (
											model?.access_grants &&
											!model.access_grants.some(
												(g) =>
													g.principal_type === 'user' &&
													g.principal_id === '*' &&
													g.permission === 'read'
											)
										) {
											toast.error(
												$i18n.t(
													'This model is not publicly available. Please select another model.'
												)
											);
										}

										taskConfig.TASK_MODEL = model.id;
									} else {
										taskConfig.TASK_MODEL = '';
									}
								}
							}}
						>
							<option value="" selected>{$i18n.t('Current Model')}</option>
							{#each models as model}
								<option value={model.id} class="bg-gray-100 dark:bg-gray-700">
									{model.name}
									{model?.connection_type === 'local' ? `(${$i18n.t('Local')})` : ''}
								</option>
							{/each}
						</select>
					</div>

					<div class="flex-1">
						<div class=" text-xs mb-1">{$i18n.t('External Task Model')}</div>
						<select
							class="w-full rounded-lg py-2 px-4 text-sm bg-gray-50 dark:text-gray-300 dark:bg-gray-850 outline-hidden"
							bind:value={taskConfig.TASK_MODEL_EXTERNAL}
							placeholder={$i18n.t('Select a model')}
							on:change={() => {
								if (taskConfig.TASK_MODEL_EXTERNAL) {
									const model = models.find((m) => m.id === taskConfig.TASK_MODEL_EXTERNAL);
									if (model) {
										if (
											model?.access_grants &&
											!model.access_grants.some(
												(g) =>
													g.principal_type === 'user' &&
													g.principal_id === '*' &&
													g.permission === 'read'
											)
										) {
											toast.error(
												$i18n.t(
													'This model is not publicly available. Please select another model.'
												)
											);
										}

										taskConfig.TASK_MODEL_EXTERNAL = model.id;
									} else {
										taskConfig.TASK_MODEL_EXTERNAL = '';
									}
								}
							}}
						>
							<option value="" selected>{$i18n.t('Current Model')}</option>
							{#each models as model}
								<option value={model.id} class="bg-gray-100 dark:bg-gray-700">
									{model.name}
									{model?.connection_type === 'local' ? `(${$i18n.t('Local')})` : ''}
								</option>
							{/each}
						</select>
					</div>
				</div>

				<div class="mb-2 text-xs text-gray-500 dark:text-gray-400">
					{$i18n.t(
						'System Interface is intentionally reduced in this deployment. Task model selection remains available; advanced prompt-engineering controls are hidden.'
					)}
				</div>
			</div>
		</div>

		<div class="flex justify-end text-sm font-medium">
			<button
				class="px-3.5 py-1.5 text-sm font-medium bg-black hover:bg-gray-900 text-white dark:bg-white dark:text-black dark:hover:bg-gray-100 transition rounded-full"
				type="submit"
			>
				{$i18n.t('Save')}
			</button>
		</div>
	</form>
{:else}
	<div class=" h-full w-full flex justify-center items-center">
		<Spinner className="size-5" />
	</div>
{/if}
