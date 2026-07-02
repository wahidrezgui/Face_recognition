<template>
    <div
        v-if="loading"
        :class="rootClasses"
        role="status"
        aria-live="polite"
        :aria-label="label"
    >
        <template v-if="variant === 'card'">
            <div class="app-loader-card-grid">
                <div v-for="index in 6" :key="index" class="app-loader-card-skeleton">
                    <div class="app-loader-card-icon" />
                    <div class="app-loader-card-lines">
                        <div class="app-loader-line app-loader-line--lg" />
                        <div class="app-loader-line app-loader-line--sm" />
                    </div>
                </div>
            </div>
        </template>

        <template v-else>
            <div class="app-loader-spinner" aria-hidden="true" />
            <p v-if="label" class="app-loader-label">{{ label }}</p>
        </template>
    </div>
</template>

<script>
export default {
    name: 'AppLoader',
    props: {
        loading: {
            type: Boolean,
            default: true,
        },
        label: {
            type: String,
            default: 'جاري التحميل…',
        },
        variant: {
            type: String,
            default: 'inline',
            validator: (value) => ['overlay', 'inline', 'card'].includes(value),
        },
        fullscreen: {
            type: Boolean,
            default: true,
        },
    },
    computed: {
        rootClasses() {
            if (this.variant === 'overlay') {
                return [
                    'app-loader-overlay',
                    this.fullscreen ? 'app-loader-overlay--fullscreen' : 'app-loader-overlay--section',
                ];
            }

            if (this.variant === 'card') {
                return ['app-loader-card'];
            }

            return ['app-loader-inline'];
        },
    },
};
</script>

<style scoped>
.app-loader-overlay {
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    gap: 0.75rem;
    z-index: 9999;
}

.app-loader-overlay--fullscreen {
    position: fixed;
    inset: 0;
    background: rgba(255, 255, 255, 0.82);
    backdrop-filter: blur(2px);
}

.app-loader-overlay--section {
    position: absolute;
    inset: 0;
    background: rgba(255, 255, 255, 0.75);
}

.app-loader-inline {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 0.75rem;
    padding: 3rem 1rem;
    color: rgb(71 85 105);
}

.app-loader-card {
    width: 100%;
}

.app-loader-spinner {
    border: 4px solid rgba(138, 21, 56, 0.15);
    border-top-color: #8a1538;
    border-radius: 50%;
    width: 50px;
    height: 50px;
    animation: app-loader-spin 0.9s linear infinite;
}

.app-loader-label {
    margin: 0;
    font-size: 0.875rem;
    font-weight: 500;
    color: rgb(71 85 105);
}

.app-loader-card-grid {
    display: grid;
    grid-template-columns: repeat(1, minmax(0, 1fr));
    gap: 1rem;
}

@media (min-width: 640px) {
    .app-loader-card-grid {
        grid-template-columns: repeat(2, minmax(0, 1fr));
    }
}

@media (min-width: 1280px) {
    .app-loader-card-grid {
        grid-template-columns: repeat(3, minmax(0, 1fr));
    }
}

@media (min-width: 1536px) {
    .app-loader-card-grid {
        grid-template-columns: repeat(6, minmax(0, 1fr));
    }
}

.app-loader-card-skeleton {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 1.25rem;
    border-radius: 0.75rem;
    border: 1px solid rgb(226 232 240);
    background: white;
    animation: app-loader-pulse 1.5s ease-in-out infinite;
}

.app-loader-card-icon {
    width: 3rem;
    height: 3rem;
    border-radius: 9999px;
    background: rgb(241 245 249);
    flex-shrink: 0;
}

.app-loader-card-lines {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
}

.app-loader-line {
    height: 0.75rem;
    border-radius: 0.375rem;
    background: rgb(241 245 249);
}

.app-loader-line--lg {
    width: 55%;
}

.app-loader-line--sm {
    width: 35%;
}

@keyframes app-loader-spin {
    to {
        transform: rotate(360deg);
    }
}

@keyframes app-loader-pulse {
    0%,
    100% {
        opacity: 1;
    }

    50% {
        opacity: 0.55;
    }
}
</style>
