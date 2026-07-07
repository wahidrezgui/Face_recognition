<template>
    <div class="html-code-editor" dir="rtl">
        <div class="mb-2 flex flex-wrap items-center gap-2">
            <label class="text-xs font-medium text-slate-600">إدراج وسم</label>
            <select
                v-model="selectedTag"
                class="h-9 min-w-[12rem] rounded-lg border border-slate-200 bg-white px-2 text-xs text-slate-700"
                @change="insertSelectedTag"
            >
                <option value="">اختر وسمًا…</option>
                <optgroup
                    v-for="group in tagGroups"
                    :key="group.group"
                    :label="group.group"
                >
                    <option
                        v-for="item in group.items"
                        :key="item.tag"
                        :value="item.tag"
                    >
                        {{ item.text }}
                    </option>
                </optgroup>
            </select>
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
import { ref, shallowRef } from 'vue';
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
        const selectedTag = ref('');
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

        function insertSelectedTag() {
            if (!selectedTag.value) {
                return;
            }

            insertAtCursor(`{{${selectedTag.value}}}`);
            selectedTag.value = '';
        }

        return {
            selectedTag,
            tagGroups,
            extensions,
            editorStyle,
            onEditorReady,
            insertSelectedTag,
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
