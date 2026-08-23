<script setup lang="ts">
import { trans } from 'laravel-vue-i18n';
import Tag from 'primevue/tag';

const props = defineProps<{
    online: boolean;
    syncing: boolean;
    pendingCount: number;
}>();
</script>

<template>
    <div class="flex items-center gap-2">
        <Tag
            v-if="props.syncing"
            severity="info"
            :value="trans('gate.connectivity.syncing')"
            icon="pi pi-spin pi-sync"
        />
        <Tag
            v-else
            :severity="props.online ? 'success' : 'danger'"
            :value="
                trans(
                    props.online
                        ? 'gate.connectivity.online'
                        : 'gate.connectivity.offline',
                )
            "
            :icon="props.online ? 'pi pi-wifi' : 'pi pi-ban'"
        />
        <Tag
            v-if="props.pendingCount > 0"
            severity="warn"
            :value="
                trans('gate.connectivity.pending', {
                    count: String(props.pendingCount),
                })
            "
        />
    </div>
</template>
