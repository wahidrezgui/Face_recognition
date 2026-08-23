import { usePage } from '@inertiajs/vue3';
import { trans } from 'laravel-vue-i18n';
import { useConfirm } from 'primevue/useconfirm';
import { computed, reactive, ref } from 'vue';
import {
    show,
    storeBack,
    storeFront,
} from '@/actions/App/Http/Controllers/Inertia/BadgeDesignController';
import { useLocale } from '@/composables/useLocale';
import { useToast } from '@/composables/useToast';
import {
    clampToCard,
    createImageElement,
    createLineElement,
    createRectangleElement,
    createTextElement,
    createZonesElement,
} from '@/lib/badgeDesigner/badgeElementFactory';
import {
    deserializeSide,
    serializeSide,
} from '@/lib/badgeDesigner/badgeElementSerializer';
import { csrfPost } from '@/lib/csrfFetch';
import {
    extractDeptKey,
    normalizeDepartmentTree,
    toTreeSelectValue,
} from '@/lib/organization/departmentTree';
import type {
    BadgeCompanyOption,
    BadgeElement,
    BadgeDesignerLoadResponse,
    BadgeImageShape,
    BadgeSide,
    BadgeSideRecord,
    BadgeToken,
} from '@/types';
import type { BaseWithZones, DepartmentNode } from '@/types';

interface BadgeDesignerPageProps {
    departments: DepartmentNode[];
    companies?: BadgeCompanyOption[];
    tokenKeys: BadgeToken[];
    bases: BaseWithZones[];
    [key: string]: unknown;
}

type SideKey = 'front' | 'back';

function emptySide(width: number, height: number): BadgeSide {
    return { format: 'empty', elements: [], width, height, rawContent: null };
}

function sideFromRecord(
    record: BadgeSideRecord | null,
    defaultWidth: number,
    defaultHeight: number,
): BadgeSide {
    if (!record) {
        return emptySide(defaultWidth, defaultHeight);
    }

    const { format, elements } = deserializeSide(record.content);

    return {
        format,
        elements,
        width: record.width,
        height: record.height,
        rawContent: record.content,
    };
}

function snapshot(side: BadgeSide): string {
    return JSON.stringify({
        elements: side.elements,
        width: side.width,
        height: side.height,
    });
}

function countDescendants(nodes: DepartmentNode[], targetId: number): number {
    function countAll(children: DepartmentNode[]): number {
        return children.reduce(
            (total, child) => total + 1 + countAll(child.children ?? []),
            0,
        );
    }

    function findAndCount(list: DepartmentNode[]): number | null {
        for (const node of list) {
            if (node.id === targetId) {
                return countAll(node.children ?? []);
            }

            const found = findAndCount(node.children ?? []);

            if (found !== null) {
                return found;
            }
        }

        return null;
    }

    return findAndCount(nodes) ?? 0;
}

export function useBadgeDesigner() {
    const page = usePage<BadgeDesignerPageProps>();
    const toast = useToast();
    const confirm = useConfirm();
    const { locale } = useLocale();

    const departments = computed(() => page.props.departments);
    // Presence of `companies` (only sent by companyIndex()) is the mode switch — the
    // department-picker route never includes the key at all.
    const isCompanyMode = computed(() => Array.isArray(page.props.companies));
    const companies = computed(() => page.props.companies ?? []);
    const tokenKeys = computed(() => page.props.tokenKeys);
    const bases = computed(() => page.props.bases);
    const departmentOptions = computed(() =>
        normalizeDepartmentTree(departments.value || [], locale.value),
    );

    const selectedDepId = ref<number | null>(null);
    const departmentTree = ref<Record<string, boolean> | null>(null);
    const loading = ref(false);
    const saving = ref(false);
    const applyToChildren = ref(false);

    const activeSide = ref<SideKey>('front');
    const front = reactive<BadgeSide>(emptySide(90, 140));
    const back = reactive<BadgeSide>(emptySide(54, 85));
    let lastSavedFront = snapshot(front);
    let lastSavedBack = snapshot(back);

    const selectedElementId = ref<string | null>(null);

    const activeSideState = computed(() =>
        activeSide.value === 'front' ? front : back,
    );
    const selectedElement = computed(
        () =>
            activeSideState.value.elements.find(
                (el) => el.id === selectedElementId.value,
            ) ?? null,
    );

    const isDirty = computed(
        () =>
            snapshot(front) !== lastSavedFront ||
            snapshot(back) !== lastSavedBack,
    );
    const childCount = computed(() =>
        selectedDepId.value
            ? countDescendants(departments.value || [], selectedDepId.value)
            : 0,
    );

    async function loadDepartment(depId: number) {
        loading.value = true;
        selectedElementId.value = null;

        try {
            const response = await fetch(show.url(depId), {
                headers: { Accept: 'application/json' },
            });
            const data: BadgeDesignerLoadResponse = await response.json();

            Object.assign(
                front,
                sideFromRecord(data.front, front.width, front.height),
            );
            Object.assign(
                back,
                sideFromRecord(data.back, back.width, back.height),
            );
            lastSavedFront = snapshot(front);
            lastSavedBack = snapshot(back);
        } catch {
            toast.error(
                trans('badgeDesigner.toast.loadFailed'),
                trans('badgeDesigner.toast.errorTitle'),
            );
        } finally {
            loading.value = false;
        }
    }

    function selectDepartment(depId: number) {
        selectedDepId.value = depId;
        departmentTree.value = toTreeSelectValue(depId);
        void loadDepartment(depId);
    }

    function onDepartmentChange(value: Record<string, boolean> | null) {
        const depId = Number(extractDeptKey(value) || 0);

        if (!depId) {
            return;
        }

        if (isDirty.value) {
            confirm.require({
                message: trans('badgeDesigner.confirm.switchDepartmentMessage'),
                header: trans('badgeDesigner.confirm.switchDepartmentHeader'),
                acceptProps: {
                    severity: 'danger',
                    label: trans('common.confirm'),
                },
                rejectProps: {
                    severity: 'secondary',
                    outlined: true,
                    label: trans('common.cancel'),
                },
                accept: () => selectDepartment(depId),
                reject: () => {
                    // Revert the TreeSelect display back to the still-active department.
                    departmentTree.value = selectedDepId.value
                        ? toTreeSelectValue(selectedDepId.value)
                        : null;
                },
            });

            return;
        }

        selectDepartment(depId);
    }

    // Companies pick a plain id from a flat Select rather than a TreeSelect value object,
    // but funnel into the same selectDepartment()/loadDepartment() flow either way — a
    // company is just a Department row under the hood.
    function onCompanySelect(id: number | null) {
        if (!id) {
            return;
        }

        if (isDirty.value) {
            confirm.require({
                message: trans('badgeDesigner.confirm.switchDepartmentMessage'),
                header: trans('badgeDesigner.confirm.switchDepartmentHeader'),
                acceptProps: {
                    severity: 'danger',
                    label: trans('common.confirm'),
                },
                rejectProps: {
                    severity: 'secondary',
                    outlined: true,
                    label: trans('common.cancel'),
                },
                accept: () => selectDepartment(id),
            });

            return;
        }

        selectDepartment(id);
    }

    function selectElement(id: string | null) {
        selectedElementId.value = id;
    }

    function addElement(
        kind:
            | 'text'
            | 'photo'
            | 'qr'
            | 'basePhoto'
            | 'zones'
            | 'rectangle'
            | 'line',
        shape: BadgeImageShape = 'square',
    ) {
        const side = activeSideState.value;
        let element: BadgeElement;

        if (kind === 'text') {
            element = createTextElement();
        } else if (kind === 'zones') {
            element = createZonesElement();
        } else if (kind === 'rectangle') {
            element = createRectangleElement();
        } else if (kind === 'line') {
            element = createLineElement();
        } else {
            const tokenMap: Record<'photo' | 'qr' | 'basePhoto', string> = {
                photo:
                    shape === 'circle'
                        ? 'guest_photo_circle'
                        : 'guest_photo_square',
                basePhoto:
                    shape === 'circle'
                        ? 'guest_photo_circleb'
                        : 'guest_photo_squareb',
                qr: 'qrcode',
            };
            element = createImageElement(
                tokenMap[kind],
                kind === 'qr' ? 'qr' : shape,
            );
        }

        side.elements.push(clampToCard(element, side.width, side.height));
        selectedElementId.value = element.id;
    }

    function updateElement(id: string, patch: Partial<BadgeElement>) {
        const side = activeSideState.value;
        const index = side.elements.findIndex((el) => el.id === id);

        if (index === -1) {
            return;
        }

        const merged = clampToCard(
            { ...side.elements[index], ...patch },
            side.width,
            side.height,
        );
        side.elements.splice(index, 1, merged);
    }

    function deleteElement(id: string) {
        const side = activeSideState.value;
        side.elements = side.elements.filter((el) => el.id !== id);

        if (selectedElementId.value === id) {
            selectedElementId.value = null;
        }
    }

    // "raw" content (legacy-authored or hand-edited HTML) can't be reconstructed as
    // discrete elements — the only way forward in the designer is to replace it wholesale.
    function clearSide() {
        const side = activeSideState.value;
        side.format = 'designer';
        side.elements = [];
        side.rawContent = null;
        selectedElementId.value = null;
    }

    function reorderElement(id: string, direction: 'front' | 'back') {
        const side = activeSideState.value;
        const index = side.elements.findIndex((el) => el.id === id);

        if (index === -1) {
            return;
        }

        const [element] = side.elements.splice(index, 1);

        if (direction === 'front') {
            side.elements.push(element);
        } else {
            side.elements.unshift(element);
        }
    }

    function updateCardSize(width: number, height: number) {
        const side = activeSideState.value;
        side.width = width;
        side.height = height;
        side.elements = side.elements.map((el) =>
            clampToCard(el, width, height),
        );
    }

    function doSave(depId: number, side: SideKey, applyToChildren: boolean) {
        const state = side === 'front' ? front : back;
        const action = side === 'front' ? storeFront : storeBack;

        return csrfPost<BadgeSideRecord>(action.url(depId), {
            content: serializeSide(state.elements),
            width: state.width,
            height: state.height,
            apply_to_children: applyToChildren,
        });
    }

    async function saveActiveSide() {
        if (!selectedDepId.value) {
            return;
        }

        const runSave = async () => {
            saving.value = true;

            try {
                const saved = await doSave(
                    selectedDepId.value as number,
                    activeSide.value,
                    applyToChildren.value,
                );
                const state = activeSideState.value;
                Object.assign(
                    state,
                    sideFromRecord(saved, state.width, state.height),
                );

                if (activeSide.value === 'front') {
                    lastSavedFront = snapshot(front);
                } else {
                    lastSavedBack = snapshot(back);
                }

                toast.success(
                    trans('badgeDesigner.toast.saveSuccess'),
                    trans('badgeDesigner.toast.successTitle'),
                );
            } catch {
                toast.error(
                    trans('badgeDesigner.toast.saveFailed'),
                    trans('badgeDesigner.toast.errorTitle'),
                );
            } finally {
                saving.value = false;
            }
        };

        if (applyToChildren.value && childCount.value > 0) {
            confirm.require({
                message: trans('badgeDesigner.confirm.applyToChildrenMessage', {
                    count: String(childCount.value),
                }),
                header: trans('badgeDesigner.confirm.applyToChildrenHeader'),
                acceptProps: {
                    severity: 'danger',
                    label: trans('common.confirm'),
                },
                rejectProps: {
                    severity: 'secondary',
                    outlined: true,
                    label: trans('common.cancel'),
                },
                accept: () => void runSave(),
            });

            return;
        }

        await runSave();
    }

    return {
        departmentOptions,
        isCompanyMode,
        companies,
        tokenKeys,
        bases,
        selectedDepId,
        departmentTree,
        onDepartmentChange,
        onCompanySelect,
        loading,
        saving,
        applyToChildren,
        activeSide,
        front,
        back,
        activeSideState,
        selectedElementId,
        selectedElement,
        isDirty,
        childCount,
        selectElement,
        addElement,
        updateElement,
        deleteElement,
        clearSide,
        reorderElement,
        updateCardSize,
        saveActiveSide,
    };
}
