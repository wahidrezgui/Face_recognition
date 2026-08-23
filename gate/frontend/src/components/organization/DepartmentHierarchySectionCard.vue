<template>
    <AppCard padding="md" class="dept-hierarchy-card">
        <div class="dept-hierarchy-card__toolbar">
            <input
                v-model="treeFilter"
                type="search"
                :placeholder="searchPlaceholder"
                class="dept-hierarchy-card__search"
            />

            <div class="dept-hierarchy-card__actions">
                <button
                    type="button"
                    class="dept-hierarchy-card__action-btn"
                    :title="t('departments.hierarchy.expandAll')"
                    @click="expandAll"
                >
                    <i class="pi pi-plus text-xs" aria-hidden="true" />
                </button>
                <button
                    type="button"
                    class="dept-hierarchy-card__action-btn"
                    :title="t('departments.hierarchy.collapseAll')"
                    @click="collapseAll"
                >
                    <i class="pi pi-minus text-xs" aria-hidden="true" />
                </button>
            </div>
        </div>

        <div v-if="!section" class="dept-hierarchy-card__empty">
            {{ t("departments.hierarchy.noResults") }}
        </div>

        <div v-else class="dept-tree-viewport" :style="viewportStyle">
            <DepartmentHierarchySection
                :section="section"
                :collapsed-keys="collapsedKeys"
                :can-delete="canDelete"
                :can-manage="canManage"
                @update:collapsed-keys="collapsedKeys = $event"
                @create-child="$emit('create-child', $event)"
                @edit="$emit('edit', $event)"
                @delete="$emit('delete', $event)"
            />
        </div>
    </AppCard>
</template>

<script>
import { useI18n } from "vue-i18n";
import AppCard from "../ui/AppCard.vue";
import DepartmentHierarchySection from "./DepartmentHierarchySection.vue";
import {
    buildDefaultCollapsedKeysForForest,
    buildHierarchySections,
    collectChartRootsFromSections,
    collectCollapsibleKeysFromForest,
    filterDepartmentTree,
} from "../../lib/organization/departmentTreeHelpers";

export default {
    name: "DepartmentHierarchySectionCard",
    components: {
        AppCard,
        DepartmentHierarchySection,
    },
    props: {
        rootNode: { type: Object, required: true },
        canDelete: { type: Boolean, default: false },
        canManage: { type: Boolean, default: true },
    },
    emits: ["create-child", "edit", "delete"],
    setup() {
        const { t, locale } = useI18n();
        return { t, locale };
    },
    data() {
        return {
            treeFilter: "",
            collapsedKeys: {},
        };
    },
    computed: {
        rootIdentity() {
            return this.rootNode?.id ?? this.rootNode?.key ?? null;
        },
        searchPlaceholder() {
            return this.t("departments.hierarchy.searchPlaceholder");
        },
        section() {
            const filtered = filterDepartmentTree(
                [this.rootNode],
                this.treeFilter,
            );
            const sections = buildHierarchySections(filtered, { locale: this.locale });
            return sections[0] || null;
        },
        viewportStyle() {
            return {
                minHeight: "calc(100vh - 15rem)",
            };
        },
    },
    watch: {
        rootIdentity: {
            immediate: true,
            handler(newId, oldId) {
                if (newId !== oldId) {
                    this.applyDefaultCollapse();
                }
            },
        },
        treeFilter(value) {
            if (value?.trim()) {
                this.collapsedKeys = {};
            } else {
                this.applyDefaultCollapse();
            }
        },
    },
    methods: {
        expandAll() {
            this.collapsedKeys = {};
        },
        collapseAll() {
            const sections = buildHierarchySections(
                filterDepartmentTree([this.rootNode], this.treeFilter),
                { locale: this.locale },
            );
            const roots = collectChartRootsFromSections(sections);
            this.collapsedKeys = collectCollapsibleKeysFromForest(roots);
        },
        applyDefaultCollapse() {
            const sections = buildHierarchySections([this.rootNode], { locale: this.locale });
            const roots = collectChartRootsFromSections(sections);
            this.collapsedKeys = buildDefaultCollapsedKeysForForest(roots, 1);
        },
    },
};
</script>

<style scoped>
.dept-hierarchy-card {
    display: flex;
    flex: 1;
    flex-direction: column;
    min-height: 0;
}

.dept-hierarchy-card :deep(> div) {
    display: flex;
    flex: 1;
    flex-direction: column;
    min-height: 0;
}

.dept-hierarchy-card__toolbar {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 0.65rem;
    flex-shrink: 0;
}

.dept-hierarchy-card__search {
    height: 2.25rem;
    min-width: 0;
    flex: 1;
    border-radius: 0.5rem;
    border: 1px solid #e2e8f0;
    background: #fff;
    padding: 0 0.75rem;
    font-size: 0.8125rem;
    outline: none;
}

.dept-hierarchy-card__search:focus {
    border-color: var(--brand, #8b1538);
    box-shadow: 0 0 0 2px rgba(139, 21, 56, 0.1);
}

.dept-hierarchy-card__actions {
    display: flex;
    align-items: center;
    gap: 0.2rem;
    flex-shrink: 0;
}

.dept-hierarchy-card__action-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 2rem;
    height: 2rem;
    border-radius: 0.4rem;
    border: 1px solid #e2e8f0;
    background: #fff;
    color: #475569;
}

.dept-hierarchy-card__action-btn:hover {
    background: #f8fafc;
}

.dept-hierarchy-card__empty {
    border-radius: 0.5rem;
    border: 1px dashed #e2e8f0;
    padding: 1rem;
    text-align: center;
    font-size: 0.8125rem;
    color: #64748b;
}

.dept-tree-viewport {
    flex: 1;
    overflow-y: auto;
    overflow-x: hidden;
    width: 100%;
    padding: 0.75rem;
    border-radius: 0.65rem;
    border: 1px solid #e2e8f0;
    background: #fafbfc;
}
</style>
