<template>
    <div ref="wrapRef" class="relative">
        <div class="relative">
            <input
                :id="inputId"
                v-model="query"
                type="text"
                :class="inputClass"
                :placeholder="placeholder"
                autocomplete="off"
                dir="rtl"
                @input="onInput"
                @focus="onFocus"
                @keydown="onKeydown"
            >
            <button
                v-if="query"
                type="button"
                class="absolute inset-y-0 left-2 flex w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                aria-label="مسح البحث"
                @mousedown.prevent="clearQuery"
            >
                <i class="pi pi-times text-xs" />
            </button>
        </div>

        <MilitarySearchPicker
            :open="pickerOpen && queryText.trim().length >= minCharsForQuery"
            :loading="loading"
            :results="results"
            :query="queryText.trim()"
            :anchor-rect="anchorRect"
            hint="نتائج البحث بالرقم العسكري أو الاسم"
            @select="onSelect"
        />
    </div>
</template>

<script>
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue';
import MilitarySearchPicker from '../gate/MilitarySearchPicker.vue';
import { useMilitaryEmployeeSearch } from '../../composables/useMilitaryEmployeeSearch';

const inputClass = 'h-11 w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-3 text-sm text-slate-800 text-right focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20';

function toQueryText(value) {
    return value == null ? '' : String(value);
}

function effectiveMinChars(text, fallback) {
    const trimmed = toQueryText(text).trim();
    if (/^\d+$/.test(trimmed)) {
        return 1;
    }
    return fallback;
}

export default {
    name: 'MilitaryEmployeeLookup',
    components: { MilitarySearchPicker },
    props: {
        modelValue: { type: String, default: '' },
        inputId: { type: String, default: 'militaryNumber' },
        placeholder: { type: String, default: 'الرقم العسكري' },
        minChars: { type: Number, default: 2 },
        mode: {
            type: String,
            default: 'military',
            validator: (value) => ['military', 'name'].includes(value),
        },
    },
    emits: ['update:modelValue', 'select', 'enter'],
    setup(props, { emit }) {
        const wrapRef = ref(null);
        const query = ref(toQueryText(props.modelValue));
        const queryText = computed(() => toQueryText(query.value));
        const minCharsForQuery = computed(() => effectiveMinChars(query.value, props.minChars));
        const pickerOpen = ref(false);
        const anchorRect = ref(null);
        const { results, loading, search, clear } = useMilitaryEmployeeSearch();

        watch(() => props.modelValue, (value) => {
            const normalized = toQueryText(value);
            if (normalized !== queryText.value) {
                query.value = normalized;
            }
        });

        function updateAnchorRect() {
            if (wrapRef.value) {
                anchorRect.value = wrapRef.value.getBoundingClientRect();
            }
        }

        function onInput() {
            query.value = toQueryText(query.value);
            emit('update:modelValue', query.value);
            pickerOpen.value = true;
            updateAnchorRect();
            search(query.value, minCharsForQuery.value);
        }

        function onFocus() {
            pickerOpen.value = true;
            updateAnchorRect();
            if (queryText.value.trim().length >= minCharsForQuery.value) {
                search(query.value, minCharsForQuery.value);
            }
        }

        function onKeydown(event) {
            if (event.key === 'Enter') {
                pickerOpen.value = false;
                emit('enter', event);
            }
        }

        function onSelect(employee) {
            if (props.mode === 'name') {
                const name = employee.fullname_ar || employee.fullname_en || '';
                query.value = name;
                emit('update:modelValue', name);
            } else {
                const militaryNumber = toQueryText(employee.military_number).trim();
                query.value = militaryNumber;
                emit('update:modelValue', militaryNumber);
            }
            emit('select', employee);
            pickerOpen.value = false;
            clear();
        }

        function clearQuery() {
            query.value = '';
            emit('update:modelValue', '');
            clear();
            pickerOpen.value = false;
        }

        function onDocPointerDown(event) {
            if (!pickerOpen.value) {
                return;
            }
            const picker = document.querySelector('.military-picker-root');
            if (wrapRef.value?.contains(event.target) || picker?.contains(event.target)) {
                return;
            }
            pickerOpen.value = false;
        }

        function onViewportChange() {
            if (pickerOpen.value) {
                updateAnchorRect();
            }
        }

        onMounted(() => {
            document.addEventListener('mousedown', onDocPointerDown);
            window.addEventListener('resize', onViewportChange);
            window.addEventListener('scroll', onViewportChange, true);
        });

        onBeforeUnmount(() => {
            document.removeEventListener('mousedown', onDocPointerDown);
            window.removeEventListener('resize', onViewportChange);
            window.removeEventListener('scroll', onViewportChange, true);
            clear();
        });

        return {
            wrapRef,
            query,
            queryText,
            minCharsForQuery,
            pickerOpen,
            anchorRect,
            results,
            loading,
            inputClass,
            onInput,
            onFocus,
            onKeydown,
            onSelect,
            clearQuery,
        };
    },
};
</script>
