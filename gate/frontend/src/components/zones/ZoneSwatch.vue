<template>
  <span
    class="zone-swatch"
    :class="[
      `zone-swatch--${size}`,
      `zone-swatch--${shape}`,
      { 'zone-swatch--bordered': showBorder },
    ]"
    aria-hidden="true"
  >
    <span class="zone-swatch__canvas" v-html="svgMarkup" />
  </span>
</template>

<script>
import { buildZoneSvgMarkup, needsSwatchBorder, normalizeZone } from '../../lib/zones/zoneStyleCore.js';

const SIZE_MAP = {
  sm: 16,
  md: 20,
  lg: 40,
  xl: 56,
};

const RECT_RATIOS = {
  sm: { width: 20, height: 16 },
  md: { width: 25, height: 20 },
  lg: { width: 40, height: 32 },
  xl: { width: 56, height: 44 },
};

export default {
  name: 'ZoneSwatch',
  props: {
    zone: {
      type: Object,
      required: true,
    },
    size: {
      type: String,
      default: 'md',
      validator: (value) => ['sm', 'md', 'lg', 'xl'].includes(value),
    },
    shape: {
      type: String,
      default: 'circle',
      validator: (value) => ['circle', 'rect'].includes(value),
    },
  },
  computed: {
    normalizedZone() {
      return normalizeZone(this.zone);
    },
    dimensions() {
      if (this.shape === 'rect') {
        return RECT_RATIOS[this.size] || RECT_RATIOS.md;
      }

      const edge = SIZE_MAP[this.size] || SIZE_MAP.md;
      return { width: edge, height: edge };
    },
    strokeWidth() {
      const scale = this.dimensions.width / 25;
      return Math.max(2, Math.round(3 * scale));
    },
    svgMarkup() {
      return buildZoneSvgMarkup(this.normalizedZone, {
        width: this.dimensions.width,
        height: this.dimensions.height,
        strokeWidth: this.strokeWidth,
      });
    },
    showBorder() {
      return needsSwatchBorder(this.normalizedZone);
    },
  },
};
</script>

<style scoped>
.zone-swatch {
  display: inline-flex;
  flex-shrink: 0;
  overflow: hidden;
  vertical-align: middle;
}

.zone-swatch--circle {
  border-radius: 9999px;
}

.zone-swatch--rect {
  border-radius: 0.35rem;
}

.zone-swatch--bordered {
  box-shadow: inset 0 0 0 2px #fff, 0 0 0 1px #e2e8f0;
}

.zone-swatch--sm {
  width: 1rem;
  height: 1rem;
}

.zone-swatch--md {
  width: 1.25rem;
  height: 1.25rem;
}

.zone-swatch--lg {
  width: 2.5rem;
  height: 2.5rem;
}

.zone-swatch--xl {
  width: 3.5rem;
  height: 3.5rem;
}

.zone-swatch__canvas {
  display: flex;
  width: 100%;
  height: 100%;
  align-items: center;
  justify-content: center;
}

.zone-swatch__canvas :deep(svg) {
  display: block;
  width: 100%;
  height: 100%;
}
</style>
