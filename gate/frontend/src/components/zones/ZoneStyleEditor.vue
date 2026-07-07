<template>
  <div class="zone-style-editor space-y-4" dir="rtl">
    <div>
      <label class="zone-style-editor__label" :for="`${fieldId}-color`">لون الخلفية</label>
      <input
        :id="`${fieldId}-color`"
        :value="modelValue.color"
        type="color"
        class="zone-style-editor__color-input"
        @input="updateField('color', $event.target.value)"
      />
    </div>

    <div>
      <span class="zone-style-editor__label">نمط التمييز</span>
      <div class="zone-style-editor__patterns" role="radiogroup" :aria-label="'نمط التمييز'">
        <button
          v-for="option in patternOptions"
          :key="option.value"
          type="button"
          class="zone-style-editor__pattern-btn"
          :class="{ 'zone-style-editor__pattern-btn--active': modelValue.pattern_type === option.value }"
          :aria-pressed="modelValue.pattern_type === option.value"
          @click="updatePatternType(option.value)"
        >
          {{ option.label }}
        </button>
      </div>
    </div>

    <div v-if="modelValue.pattern_type !== 'none'">
      <label class="zone-style-editor__label" :for="`${fieldId}-pattern-color`">لون الخط</label>
      <input
        :id="`${fieldId}-pattern-color`"
        :value="modelValue.pattern_color"
        type="color"
        class="zone-style-editor__color-input"
        @input="updateField('pattern_color', $event.target.value)"
      />
    </div>

    <div class="zone-style-editor__preview">
      <span class="zone-style-editor__label">معاينة</span>
      <div class="zone-style-editor__preview-row">
        <ZoneSwatch :zone="modelValue" size="xl" shape="rect" />
        <ZoneSwatch :zone="modelValue" size="lg" shape="circle" />
      </div>
      <p class="zone-style-editor__preview-hint">المستطيل يطابق شكل المنطقة على البطاقة</p>
    </div>
  </div>
</template>

<script>
import ZoneSwatch from './ZoneSwatch.vue';
import { ZONE_PATTERN_OPTIONS, defaultZoneStyleFields } from '../../lib/zones/zoneStyleCore.js';

export default {
  name: 'ZoneStyleEditor',
  components: {
    ZoneSwatch,
  },
  props: {
    modelValue: {
      type: Object,
      required: true,
    },
    fieldId: {
      type: String,
      default: 'zone-style',
    },
  },
  emits: ['update:modelValue'],
  computed: {
    patternOptions() {
      return ZONE_PATTERN_OPTIONS;
    },
  },
  methods: {
    updateField(field, value) {
      this.$emit('update:modelValue', {
        ...this.modelValue,
        [field]: value,
      });
    },
    updatePatternType(patternType) {
      const next = {
        ...defaultZoneStyleFields(),
        ...this.modelValue,
        pattern_type: patternType,
      };

      if (patternType === 'none') {
        next.pattern_color = defaultZoneStyleFields().pattern_color;
      } else if (!next.pattern_color) {
        next.pattern_color = defaultZoneStyleFields().pattern_color;
      }

      this.$emit('update:modelValue', next);
    },
  },
};
</script>

<style scoped>
.zone-style-editor__label {
  display: block;
  margin-bottom: 0.35rem;
  font-size: 0.875rem;
  font-weight: 500;
  color: #334155;
}

.zone-style-editor__color-input {
  height: 3rem;
  width: 100%;
  cursor: pointer;
  border-radius: 0.5rem;
  border: 1px solid #e2e8f0;
  background: #fff;
  padding: 0.25rem;
}

.zone-style-editor__patterns {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.5rem;
}

.zone-style-editor__pattern-btn {
  height: 2.5rem;
  border-radius: 0.5rem;
  border: 1px solid #e2e8f0;
  background: #fff;
  font-size: 0.875rem;
  font-weight: 500;
  color: #475569;
  transition: border-color 0.15s ease, background-color 0.15s ease, color 0.15s ease;
}

.zone-style-editor__pattern-btn:hover {
  border-color: #cbd5e1;
  background: #f8fafc;
}

.zone-style-editor__pattern-btn--active {
  border-color: var(--color-brand, #0d9488);
  background: color-mix(in srgb, var(--color-brand, #0d9488) 10%, #fff);
  color: #0f172a;
}

.zone-style-editor__preview {
  border-radius: 0.75rem;
  border: 1px dashed #e2e8f0;
  background: #f8fafc;
  padding: 0.85rem;
}

.zone-style-editor__preview-row {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.zone-style-editor__preview-hint {
  margin: 0.5rem 0 0;
  font-size: 0.75rem;
  color: #64748b;
}
</style>
