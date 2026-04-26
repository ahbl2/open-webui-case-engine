<script>
	import { getContext } from 'svelte';
	const i18n = getContext('i18n');

	export let editor = null;

	/** Show H1 / H2 / H3 toggles (e.g. chat composer). Case Notes uses font size instead. */
	export let showHeadings = true;

	/** Inline font-size control (requires `TextStyle` + `FontSize` on the editor). */
	export let showFontSize = false;

	/** `{ label, value }` where `value` is a CSS length (e.g. `14px`) or `''` for default. */
	export let fontSizePresets = [
		{ label: 'Default', value: '' },
		{ label: '10px', value: '10px' },
		{ label: '11px', value: '11px' },
		{ label: '12px', value: '12px' },
		{ label: '13px', value: '13px' },
		{ label: '14px', value: '14px' },
		{ label: '16px', value: '16px' },
		{ label: '18px', value: '18px' },
		{ label: '20px', value: '20px' },
		{ label: '24px', value: '24px' },
		{ label: '28px', value: '28px' },
		{ label: '36px', value: '36px' }
	];

	import Bold from '$lib/components/icons/Bold.svelte';
	import CodeBracket from '$lib/components/icons/CodeBracket.svelte';
	import H1 from '$lib/components/icons/H1.svelte';
	import H2 from '$lib/components/icons/H2.svelte';
	import H3 from '$lib/components/icons/H3.svelte';
	import Italic from '$lib/components/icons/Italic.svelte';
	import ListBullet from '$lib/components/icons/ListBullet.svelte';
	import NumberedList from '$lib/components/icons/NumberedList.svelte';
	import Strikethrough from '$lib/components/icons/Strikethrough.svelte';
	import Underline from '$lib/components/icons/Underline.svelte';

	import Tooltip from '../Tooltip.svelte';
	import CheckBox from '$lib/components/icons/CheckBox.svelte';
	import ArrowLeftTag from '$lib/components/icons/ArrowLeftTag.svelte';
	import ArrowRightTag from '$lib/components/icons/ArrowRightTag.svelte';

	$: currentFontSize = editor ? editor.getAttributes('textStyle')?.fontSize ?? '' : '';

	$: fontSizeSelectOptions = (() => {
		const base = [...fontSizePresets];
		if (currentFontSize && !base.some((o) => o.value === currentFontSize)) {
			base.push({ label: currentFontSize, value: currentFontSize });
		}
		return base;
	})();

	function onFontSizeChange(e) {
		const v = e.currentTarget.value;
		if (!editor) return;
		if (!v) {
			editor.chain().focus().unsetFontSize().run();
		} else {
			editor.chain().focus().setFontSize(v).run();
		}
	}
</script>

<div
	class="flex min-w-0 flex-wrap items-center gap-0.5 rounded-xl border border-gray-100 bg-white p-0.5 text-gray-800 shadow-lg dark:border-gray-800 dark:bg-gray-850 dark:text-white min-w-fit"
>
	{#if showFontSize}
		<label class="sr-only" for="rich-text-font-size">{$i18n.t('Font size')}</label>
		<select
			id="rich-text-font-size"
			class="max-w-[7.5rem] shrink-0 rounded-lg border border-gray-200 bg-white px-1.5 py-1 text-[11px] font-medium text-gray-800 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
			value={currentFontSize}
			on:change={onFontSizeChange}
		>
			{#each fontSizeSelectOptions as opt (opt.value === '' ? 'default' : opt.value)}
				<option value={opt.value}>{opt.label}</option>
			{/each}
		</select>
	{/if}

	{#if showHeadings}
		<Tooltip placement="top" content={$i18n.t('H1')}>
			<button
				on:click={() => editor?.chain().focus().toggleHeading({ level: 1 }).run()}
				class="{editor?.isActive('heading', { level: 1 })
					? 'bg-gray-50 dark:bg-gray-700'
					: ''} hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg p-1.5 transition-all"
				type="button"
			>
				<H1 />
			</button>
		</Tooltip>

		<Tooltip placement="top" content={$i18n.t('H2')}>
			<button
				on:click={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}
				class="{editor?.isActive('heading', { level: 2 })
					? 'bg-gray-50 dark:bg-gray-700'
					: ''} hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg p-1.5 transition-all"
				type="button"
			>
				<H2 />
			</button>
		</Tooltip>

		<Tooltip placement="top" content={$i18n.t('H3')}>
			<button
				on:click={() => editor?.chain().focus().toggleHeading({ level: 3 }).run()}
				class="{editor?.isActive('heading', { level: 3 })
					? 'bg-gray-50 dark:bg-gray-700'
					: ''} hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg p-1.5 transition-all"
				type="button"
			>
				<H3 />
			</button>
		</Tooltip>
	{/if}

	{#if editor?.isActive('bulletList') || editor?.isActive('orderedList') || editor?.isActive('taskList')}
		<Tooltip placement="top" content={$i18n.t('Lift List')}>
			<button
				on:click={() => {
					editor?.commands.liftListItem(editor?.isActive('taskList') ? 'taskItem' : 'listItem');
				}}
				class="hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg p-1.5 transition-all"
				type="button"
			>
				<ArrowLeftTag />
			</button>
		</Tooltip>
		<Tooltip placement="top" content={$i18n.t('Sink List')}>
			<button
				on:click={() =>
					editor?.commands.sinkListItem(editor?.isActive('taskList') ? 'taskItem' : 'listItem')}
				class="hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg p-1.5 transition-all"
				type="button"
			>
				<ArrowRightTag />
			</button>
		</Tooltip>
	{/if}

	<Tooltip placement="top" content={$i18n.t('Bullet List')}>
		<button
			on:click={() => editor?.chain().focus().toggleBulletList().run()}
			class="{editor?.isActive('bulletList')
				? 'bg-gray-50 dark:bg-gray-700'
				: ''} hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg p-1.5 transition-all"
			type="button"
		>
			<ListBullet />
		</button>
	</Tooltip>

	<Tooltip placement="top" content={$i18n.t('Ordered List')}>
		<button
			on:click={() => editor?.chain().focus().toggleOrderedList().run()}
			class="{editor?.isActive('orderedList')
				? 'bg-gray-50 dark:bg-gray-700'
				: ''} hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg p-1.5 transition-all"
			type="button"
		>
			<NumberedList />
		</button>
	</Tooltip>

	<Tooltip placement="top" content={$i18n.t('Task List')}>
		<button
			on:click={() => editor?.chain().focus().toggleTaskList().run()}
			class="{editor?.isActive('taskList')
				? 'bg-gray-50 dark:bg-gray-700'
				: ''} hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg p-1.5 transition-all"
			type="button"
		>
			<CheckBox />
		</button>
	</Tooltip>

	<Tooltip placement="top" content={$i18n.t('Bold')}>
		<button
			on:click={() => editor?.chain().focus().toggleBold().run()}
			class="{editor?.isActive('bold')
				? 'bg-gray-50 dark:bg-gray-700'
				: ''} hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg p-1.5 transition-all"
			type="button"
		>
			<Bold />
		</button>
	</Tooltip>

	<Tooltip placement="top" content={$i18n.t('Italic')}>
		<button
			on:click={() => editor?.chain().focus().toggleItalic().run()}
			class="{editor?.isActive('italic')
				? 'bg-gray-50 dark:bg-gray-700'
				: ''} hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg p-1.5 transition-all"
			type="button"
		>
			<Italic />
		</button>
	</Tooltip>

	<Tooltip placement="top" content={$i18n.t('Underline')}>
		<button
			on:click={() => editor?.chain().focus().toggleUnderline().run()}
			class="{editor?.isActive('underline')
				? 'bg-gray-50 dark:bg-gray-700'
				: ''} hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg p-1.5 transition-all"
			type="button"
		>
			<Underline />
		</button>
	</Tooltip>

	<Tooltip placement="top" content={$i18n.t('Strikethrough')}>
		<button
			on:click={() => editor?.chain().focus().toggleStrike().run()}
			class="{editor?.isActive('strike')
				? 'bg-gray-50 dark:bg-gray-700'
				: ''} hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg p-1.5 transition-all"
			type="button"
		>
			<Strikethrough />
		</button>
	</Tooltip>

	<Tooltip placement="top" content={$i18n.t('Code Block')}>
		<button
			on:click={() => editor?.chain().focus().toggleCodeBlock().run()}
			class="{editor?.isActive('codeBlock')
				? 'bg-gray-50 dark:bg-gray-700'
				: ''} hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg p-1.5 transition-all"
			type="button"
		>
			<CodeBracket />
		</button>
	</Tooltip>
</div>
