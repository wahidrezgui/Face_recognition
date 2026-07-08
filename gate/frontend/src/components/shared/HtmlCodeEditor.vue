<template>
    <div class="html-code-editor" dir="rtl">
        <div class="mb-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
            <p class="mb-2 text-xs font-medium text-slate-700">
                الحقول المتاحة
                <span class="font-normal text-slate-500">— انقر لإدراج الحقل عند موضع المؤشر</span>
            </p>

            <div
                v-for="group in tagGroups"
                :key="group.group"
                class="mb-3 last:mb-0"
            >
                <p class="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                    {{ group.group }}
                </p>
                <div class="flex flex-wrap gap-1.5">
                    <button
                        v-for="item in group.items"
                        :key="item.tag"
                        type="button"
                        class="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] text-slate-700 shadow-sm transition hover:border-brand hover:bg-brand-muted hover:text-brand"
                        :title="`إدراج {{${item.tag}}}`"
                        @click="insertTag(item.tag)"
                    >
                        <span class="font-medium">{{ item.text }}</span>
                        <code class="rounded bg-slate-100 px-1 font-mono text-[10px] text-slate-500" dir="ltr">
                            {{ formatTag(item.tag) }}
                        </code>
                    </button>
                </div>
            </div>
        </div>

        <div dir="ltr" class="html-code-editor__code">
            <Codemirror
                :model-value="modelValue"
                :extensions="extensions"
                :style="editorStyle"
                class="html-code-editor__surface overflow-hidden rounded-xl border border-slate-200"
                @update:model-value="$emit('update:modelValue', $event)"
                @ready="onEditorReady"
            />
        </div>
    </div>
</template>

<script>
import { shallowRef } from 'vue';
import { Codemirror } from 'vue-codemirror';
import { html } from '@codemirror/lang-html';
import { EditorView } from '@codemirror/view';
import { BADGE_EDITOR_TAGS } from '../../lib/badges/badgeBuilderCore';

export default {
    name: 'HtmlCodeEditor',
    components: { Codemirror },
    props: {
        modelValue: { type: String, default: '' },
        minHeight: { type: String, default: '320px' },
    },
    emits: ['update:modelValue'],
    setup(props, { emit }) {
        const editorView = shallowRef(null);
        const tagGroups = BADGE_EDITOR_TAGS;

        const extensions = [
            html(),
            EditorView.lineWrapping,
            EditorView.theme({
                '&': {
                    fontSize: '13px',
                    backgroundColor: '#ffffff',
                },
                '.cm-content': {
                    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                    padding: '12px 0',
                },
                '.cm-gutters': {
                    backgroundColor: '#f8fafc',
                    borderRight: '1px solid #e2e8f0',
                },
                '&.cm-focused': {
                    outline: '2px solid rgba(122, 41, 79, 0.25)',
                    outlineOffset: '0px',
                },
            }),
        ];

        const editorStyle = {
            minHeight: props.minHeight,
            height: props.minHeight,
        };

        function onEditorReady(payload) {
            editorView.value = payload.view;
        }

        function formatTag(tag) {
            return `{{${tag}}}`;
        }

        function insertAtCursor(text) {
            const view = editorView.value;
            if (!view) {
                emit('update:modelValue', `${props.modelValue || ''}${text}`);
                return;
            }

            const { from, to } = view.state.selection.main;
            view.dispatch({
                changes: { from, to, insert: text },
                selection: { anchor: from + text.length },
            });
            view.focus();
        }

        function insertTag(tag) {
            insertAtCursor(`{{${tag}}}`);
        }

        return {
            tagGroups,
            extensions,
            editorStyle,
            onEditorReady,
            formatTag,
            insertTag,
        };
    },
};
</script>

<style>
.html-code-editor__surface .cm-editor {
    min-height: inherit;
    height: 100%;
}

.html-code-editor__surface .cm-scroller {
    min-height: inherit;
}
</style>
