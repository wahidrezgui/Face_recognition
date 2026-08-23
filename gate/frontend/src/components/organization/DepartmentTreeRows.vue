<template>
    <ul class="dept-tree-rows" :class="{ 'dept-tree-rows--root': depth === 0 }">
        <li
            v-for="node in nodes"
            :key="node.key ?? node.id"
            class="dept-tree-rows__item"
        >
            <div class="dept-tree-row" :class="rowClasses(node)">
                <button
                    v-if="hasChildren(node)"
                    type="button"
                    class="dept-tree-row__toggle"
                    :aria-expanded="isExpanded(node)"
                    :aria-label="
                        isExpanded(node)
                            ? t('departments.row.collapse')
                            : t('departments.row.expand')
                    "
                    @click="toggle(node)"
                >
                    <i
                        :class="
                            isExpanded(node)
                                ? 'pi pi-chevron-up'
                                : 'pi pi-chevron-down'
                        "
                        aria-hidden="true"
                    />
                </button>
                <span
                    v-else
                    class="dept-tree-row__toggle dept-tree-row__toggle--spacer"
                    aria-hidden="true"
                />

                <span class="dept-tree-row__icon">
                    <i :class="iconClass(node)" aria-hidden="true" />
                </span>

                <div class="dept-tree-row__titles">
                    <span class="dept-tree-row__title">
                        {{ nodeLabel(node, locale) }}
                        <span
                            v-if="badgeLabel(node)"
                            class="dept-tree-row__badge"
                            :class="`dept-tree-row__badge--${node.cardVariant}`"
                        >
                            {{ badgeLabel(node) }}
                        </span>
                    </span>
                    <span
                        v-if="
                            node.name_en &&
                            node.name_en !== nodeLabel(node, locale)
                        "
                        class="dept-tree-row__subtitle"
                        dir="ltr"
                    >
                        {{ node.name_en }}
                    </span>
                    <div
                        v-if="linkedBases(node).length"
                        class="dept-tree-row__bases"
                    >
                        <span
                            v-for="base in linkedBases(node)"
                            :key="base.id"
                            class="dept-tree-row__base-tag"
                            :title="base.name_en"
                        >
                            {{ baseLabel(base, locale) }}
                        </span>
                    </div>
                </div>

                <span
                    v-if="node.childCount"
                    class="dept-tree-row__count"
                    :title="
                        t('departments.row.childCount', {
                            count: node.childCount,
                        })
                    "
                >
                    {{ node.childCount }}
                </span>

                <div v-if="canManage" class="dept-tree-row__actions">
                    <button
                        type="button"
                        class="dept-tree-row__action dept-tree-row__action--add"
                        :title="t('departments.row.addChild')"
                        :aria-label="t('departments.row.addChild')"
                        @click.stop="$emit('create-child', nodeId(node))"
                    >
                        <i class="pi pi-plus" aria-hidden="true" />
                    </button>
                    <button
                        type="button"
                        class="dept-tree-row__action dept-tree-row__action--edit"
                        :title="t('departments.row.editTitle')"
                        :aria-label="t('departments.row.editLabel')"
                        @click.stop="$emit('edit', nodeId(node))"
                    >
                        <i class="pi pi-pencil" aria-hidden="true" />
                    </button>
                    <button
                        v-if="canDelete"
                        type="button"
                        class="dept-tree-row__action dept-tree-row__action--delete"
                        :title="t('departments.row.deleteTitle')"
                        :aria-label="t('departments.row.deleteLabel')"
                        @click.stop="$emit('delete', nodeId(node))"
                    >
                        <i class="pi pi-trash" aria-hidden="true" />
                    </button>
                </div>
            </div>

            <DepartmentTreeRows
                v-if="hasChildren(node) && isExpanded(node)"
                :nodes="node.children"
                :depth="depth + 1"
                :collapsed-keys="collapsedKeys"
                :can-delete="canDelete"
                :can-manage="canManage"
                @update:collapsed-keys="$emit('update:collapsedKeys', $event)"
                @create-child="$emit('create-child', $event)"
                @edit="$emit('edit', $event)"
                @delete="$emit('delete', $event)"
            />
        </li>
    </ul>
</template>

<script>
import { useI18n } from "vue-i18n";
import {
    baseLabel,
    linkedBases,
    nodeLabel,
    nodeId,
} from "../../lib/organization/departmentTreeHelpers";

export default {
    name: "DepartmentTreeRows",
    props: {
        nodes: { type: Array, default: () => [] },
        depth: { type: Number, default: 0 },
        collapsedKeys: { type: Object, default: () => ({}) },
        canDelete: { type: Boolean, default: false },
        canManage: { type: Boolean, default: true },
    },
    emits: ["update:collapsedKeys", "create-child", "edit", "delete"],
    setup() {
        const { t, locale } = useI18n();
        return { t, locale };
    },
    methods: {
        nodeLabel,
        nodeId,
        baseLabel,
        linkedBases,
        hasChildren(node) {
            return Boolean(node?.children?.length);
        },
        isExpanded(node) {
            return this.collapsedKeys[node.key] === undefined;
        },
        toggle(node) {
            const next = { ...this.collapsedKeys };

            if (next[node.key] === undefined) {
                next[node.key] = true;
            } else {
                delete next[node.key];
            }

            this.$emit("update:collapsedKeys", next);
        },
        badgeLabel(node) {
            if (node.isTreeRoot) {
                return this.t("departments.row.rootBadge");
            }

            if (node.isCompany) {
                return this.t("departments.row.companyBadge");
            }

            return "";
        },
        iconClass(node) {
            if (node.isCompany) {
                return "pi pi-briefcase";
            }

            if (node.isTreeRoot) {
                return "pi pi-sitemap";
            }

            return "pi pi-building";
        },
        rowClasses(node) {
            return [
                `dept-tree-row--depth-${Math.min(node.depth ?? this.depth, 4)}`,
                node.isTreeRoot ? "dept-tree-row--root" : "",
            ].filter(Boolean);
        },
    },
};
</script>

<style scoped>
.dept-tree-rows {
    list-style: none;
    margin: 0;
    padding: 0;
}

.dept-tree-rows:not(.dept-tree-rows--root) {
    padding-inline-start: 1.5rem;
    margin-inline-start: 0.85rem;
    border-inline-start: 1px dashed #dbe3ee;
}

.dept-tree-rows__item + .dept-tree-rows__item {
    margin-top: 0.4rem;
}

.dept-tree-row {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.45rem 0.65rem;
    border-radius: 0.5rem;
    border: 1px solid #e2e8f0;
    border-inline-start-width: 3px;
    background: #fff;
}

.dept-tree-row--depth-0 {
    border-inline-start-color: #8b1538;
}
.dept-tree-row--depth-1 {
    border-inline-start-color: #2563eb;
}
.dept-tree-row--depth-2 {
    border-inline-start-color: #059669;
}
.dept-tree-row--depth-3 {
    border-inline-start-color: #d97706;
}
.dept-tree-row--depth-4 {
    border-inline-start-color: #64748b;
}

.dept-tree-row--root {
    background: linear-gradient(180deg, #fff 0%, #fdf2f5 100%);
    border-color: rgba(139, 21, 56, 0.35);
}

.dept-tree-row__toggle {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 1.5rem;
    height: 1.5rem;
    flex-shrink: 0;
    border-radius: 999px;
    border: 1px solid #e2e8f0;
    background: #fff;
    color: #475569;
    font-size: 0.65rem;
}

.dept-tree-row__toggle:hover {
    background: #f8fafc;
}

.dept-tree-row__toggle--spacer {
    border-color: transparent;
    background: transparent;
}

.dept-tree-row__icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 1.75rem;
    height: 1.75rem;
    flex-shrink: 0;
    border-radius: 0.45rem;
    background: rgba(139, 21, 56, 0.08);
    color: #8b1538;
    font-size: 0.8rem;
}

.dept-tree-row__titles {
    display: flex;
    flex-direction: column;
    min-width: 0;
    flex: 1;
}

.dept-tree-row__title {
    display: inline-flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 0.4rem;
    font-size: 0.85rem;
    font-weight: 600;
    color: #0f172a;
}

.dept-tree-row__subtitle {
    font-size: 0.7rem;
    color: #64748b;
}

.dept-tree-row__bases {
    display: flex;
    flex-wrap: wrap;
    gap: 0.25rem;
    margin-top: 0.2rem;
}

.dept-tree-row__base-tag {
    display: inline-flex;
    align-items: center;
    padding: 0.08rem 0.4rem;
    border-radius: 999px;
    background: #ecfdf5;
    border: 1px solid #a7f3d0;
    color: #047857;
    font-size: 0.6rem;
    font-weight: 600;
    line-height: 1.3;
}

.dept-tree-row__badge {
    padding: 0.1rem 0.4rem;
    border-radius: 999px;
    background: #8b1538;
    color: #fff;
    font-size: 0.6rem;
    font-weight: 700;
}

.dept-tree-row__badge--company {
    background: #d97706;
}

.dept-tree-row__count {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 1.4rem;
    height: 1.4rem;
    padding: 0 0.3rem;
    flex-shrink: 0;
    border-radius: 999px;
    background: #f1f5f9;
    color: #475569;
    font-size: 0.68rem;
    font-weight: 700;
}

.dept-tree-row__actions {
    display: flex;
    align-items: center;
    gap: 0.15rem;
    flex-shrink: 0;
}

.dept-tree-row__action {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 1.7rem;
    height: 1.7rem;
    border: none;
    border-radius: 0.4rem;
    background: transparent;
    cursor: pointer;
    transition: background 0.15s ease;
}

.dept-tree-row__action--add {
    color: #8b1538;
}
.dept-tree-row__action--add:hover {
    background: rgba(139, 21, 56, 0.08);
}
.dept-tree-row__action--edit {
    color: #2563eb;
}
.dept-tree-row__action--edit:hover {
    background: #eff6ff;
}
.dept-tree-row__action--delete {
    color: #dc2626;
}
.dept-tree-row__action--delete:hover {
    background: #fef2f2;
}
</style>
