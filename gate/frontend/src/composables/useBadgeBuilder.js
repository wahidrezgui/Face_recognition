import {
    computed,
    getCurrentInstance,
    onMounted,
    reactive,
    ref,
    watch,
} from 'vue';
import { useToast } from 'primevue/usetoast';
import { fetchAllDepartments, fetchDepartmentTree } from '../api/organization';
import {
    fetchBadgeBackPreview,
    fetchBadgePreview,
    fetchDepartmentBadgeDesign,
    updateBadge,
    updateBadge2,
} from '../api/employees';
import {
    applyTreeSelectValue,
    collectDescendantDeptIds,
    extractDeptKey,
    findDepartmentLabel,
    normalizeDepartmentTree,
} from '../lib/departmentTree';
import {
    BADGE_SIDES,
    BADGE_SIDE_LABELS,
    badgeSidesEqual,
    buildBadgePreviewHtml,
    buildPreviewTemplateValues,
    cloneBadgeSide,
    createEmptyBadgeSide,
    normalizeBadgeRecord,
} from '../lib/badges/badgeBuilderCore';
import { getBadgeBlock, insertBadgeBlockHtml } from '../lib/badges/badgeBlocks';
import { getAuthUser } from '../lib/auth-session';
import { isGlobalScope } from '../lib/auth-roles';

function createSideState() {
    return {
        id: null,
        dep_id: null,
        content: '',
        width: null,
        heigth: null,
    };
}

export function useBadgeBuilder() {
    const toast = useToast();
    const instance = getCurrentInstance();

    const departments = ref([]);
    const departmentsLoading = ref(false);
    const selectedDeptTree = ref(null);
    const selectedDeptId = ref(null);
    const activeSide = ref(BADGE_SIDES.front);
    const isLoading = ref(false);
    const isSaving = ref(false);
    const previewEmployee = ref(null);
    const previewEmployeeData = ref(null);
    const previewEmployeeLoading = ref(false);
    const useSamplePreviewData = ref(true);
    const applyToChildren = ref(false);

    const front = reactive(createSideState());
    const back = reactive(createSideState());
    const savedFront = ref(null);
    const savedBack = ref(null);

    const selectedDeptLabel = computed(() => (
        findDepartmentLabel(departments.value, selectedDeptId.value)
    ));

    const activeBadge = computed(() => (
        activeSide.value === BADGE_SIDES.front ? front : back
    ));

    const frontExists = computed(() => Boolean(savedFront.value?.id));
    const backExists = computed(() => Boolean(savedBack.value?.id));

    const previewDimensionsLabel = computed(() => {
        const width = activeBadge.value.width || '—';
        const height = activeBadge.value.heigth || '—';
        return `${width} × ${height} mm`;
    });

    const isDirty = computed(() => {
        if (!selectedDeptId.value) {
            return false;
        }

        const frontDirty = !badgeSidesEqual(front, savedFront.value ?? createEmptyBadgeSide(selectedDeptId.value, BADGE_SIDES.front));
        const backDirty = !badgeSidesEqual(back, savedBack.value ?? createEmptyBadgeSide(selectedDeptId.value, BADGE_SIDES.back));

        return frontDirty || backDirty;
    });

    const isActiveSideDirty = computed(() => {
        if (!selectedDeptId.value) {
            return false;
        }

        const saved = activeSide.value === BADGE_SIDES.front ? savedFront.value : savedBack.value;
        const baseline = saved ?? createEmptyBadgeSide(selectedDeptId.value, activeSide.value);

        return !badgeSidesEqual(activeBadge.value, baseline);
    });

    const previewTemplateValues = computed(() => {
        if (!useSamplePreviewData.value && previewEmployeeData.value) {
            return buildPreviewTemplateValues(previewEmployeeData.value);
        }

        return buildPreviewTemplateValues(null);
    });

    const previewHtml = computed(() => (
        buildBadgePreviewHtml(activeBadge.value.content, activeSide.value, {
            width: Number(activeBadge.value.width) || undefined,
            heigth: Number(activeBadge.value.heigth) || undefined,
            templateValues: previewTemplateValues.value,
            backContainerStyle: activeSide.value === BADGE_SIDES.back ? 'standard' : undefined,
        })
    ));

    const hasTemplate = computed(() => Boolean(activeBadge.value.content?.trim()));
    const isSamplePreview = computed(() => useSamplePreviewData.value || !previewEmployeeData.value);

    const descendantDeptIds = computed(() => {
        if (!selectedDeptId.value) {
            return [];
        }

        return collectDescendantDeptIds(departments.value, selectedDeptId.value);
    });

    const childDeptCount = computed(() => Math.max(0, descendantDeptIds.value.length - 1));

    const targetDeptIds = computed(() => {
        if (!selectedDeptId.value) {
            return [];
        }

        if (!applyToChildren.value) {
            return [String(selectedDeptId.value)];
        }

        return descendantDeptIds.value;
    });

    function applySide(target, source) {
        const normalized = source
            ? cloneBadgeSide(source, activeSide.value)
            : createEmptyBadgeSide(selectedDeptId.value, activeSide.value);

        target.id = normalized.id;
        target.dep_id = normalized.dep_id;
        target.content = normalized.content;
        target.width = normalized.width;
        target.heigth = normalized.heigth;
    }

    async function loadDepartments() {
        departmentsLoading.value = true;

        try {
            const userDepId = String(getAuthUser()?.dep_id ?? localStorage.getItem('dep_id') ?? '').trim();
            const response = isGlobalScope('departments')
                ? await fetchAllDepartments()
                : await fetchDepartmentTree(userDepId);
            departments.value = normalizeDepartmentTree(response.data?.departments ?? []);
        } catch (error) {
            console.error('Failed to load departments:', error);
            toast.add({
                severity: 'error',
                summary: 'خطأ',
                detail: 'تعذر تحميل الوحدات',
                life: 3000,
            });
        } finally {
            departmentsLoading.value = false;
        }
    }

    async function loadBadgeDesign(depId) {
        if (!depId) {
            return;
        }

        isLoading.value = true;

        try {
            const { front: frontPayload, back: backPayload } = await fetchDepartmentBadgeDesign(depId);
            const frontRecord = normalizeBadgeRecord(frontPayload)
                ?? createEmptyBadgeSide(depId, BADGE_SIDES.front);
            const backRecord = normalizeBadgeRecord(backPayload)
                ?? createEmptyBadgeSide(depId, BADGE_SIDES.back);

            applySide(front, frontRecord);
            applySide(back, backRecord);
            savedFront.value = cloneBadgeSide(frontRecord, BADGE_SIDES.front);
            savedBack.value = cloneBadgeSide(backRecord, BADGE_SIDES.back);
        } catch (error) {
            console.error('Failed to load badge design:', error);
            toast.add({
                severity: 'error',
                summary: 'خطأ',
                detail: 'تعذر تحميل قالب البطاقة',
                life: 3000,
            });
        } finally {
            isLoading.value = false;
        }
    }

    async function loadPreviewEmployeeData(employeeId) {
        if (!employeeId) {
            previewEmployeeData.value = null;
            return;
        }

        previewEmployeeLoading.value = true;

        try {
            const fetchFn = activeSide.value === BADGE_SIDES.front
                ? fetchBadgePreview
                : fetchBadgeBackPreview;
            const { data } = await fetchFn(employeeId);
            previewEmployeeData.value = data;
            useSamplePreviewData.value = false;
        } catch (error) {
            console.error('Failed to load preview employee data:', error);
            previewEmployeeData.value = null;
            toast.add({
                severity: 'error',
                summary: 'خطأ',
                detail: 'تعذر تحميل بيانات الموظف للمعاينة',
                life: 3000,
            });
        } finally {
            previewEmployeeLoading.value = false;
        }
    }

    async function onPreviewEmployeeSelect(employee) {
        if (!employee?.id) {
            previewEmployee.value = null;
            previewEmployeeData.value = null;
            useSamplePreviewData.value = true;
            return;
        }

        previewEmployee.value = employee;
        await loadPreviewEmployeeData(employee.id);
    }

    function setUseSamplePreviewData(value) {
        useSamplePreviewData.value = value;
    }

    function insertTag(tag) {
        const token = `{{${tag}}}`;
        const content = activeBadge.value.content ?? '';

        activeBadge.value.content = content
            ? `${content}\n${token}`
            : token;
    }

    function insertBlock(blockId) {
        const block = getBadgeBlock(blockId);
        if (!block) {
            return;
        }

        activeBadge.value.content = insertBadgeBlockHtml(activeBadge.value.content, block.html);
    }

    function updateBadgeContent(content) {
        activeBadge.value.content = content;
    }

    function confirmDiscard(message) {
        const dialog = instance?.proxy?.$dialog;

        if (!dialog?.confirm) {
            return Promise.resolve(window.confirm(message));
        }

        return new Promise((resolve) => {
            dialog.confirm({
                type: 'warning',
                title: 'تغييرات غير محفوظة',
                message,
                confirmLabel: 'متابعة',
                cancelLabel: 'إلغاء',
                confirmVariant: 'danger',
                onConfirm: () => resolve(true),
                onCancel: () => resolve(false),
            });
        });
    }

    async function guardUnsaved(message) {
        if (!isDirty.value) {
            return true;
        }

        return confirmDiscard(message);
    }

    async function onDepartmentTreeChange() {
        const nextDepId = extractDeptKey(selectedDeptTree.value);

        if (nextDepId && String(nextDepId) === String(selectedDeptId.value)) {
            return;
        }

        if (!(await guardUnsaved('لديك تغييرات غير محفوظة. هل تريد تغيير الوحدة؟'))) {
            await applyTreeSelectValue((value) => {
                selectedDeptTree.value = value;
            }, selectedDeptId.value);
            return;
        }

        selectedDeptId.value = nextDepId ? parseInt(nextDepId, 10) : null;
        previewEmployee.value = null;
        previewEmployeeData.value = null;
        useSamplePreviewData.value = true;

        if (selectedDeptId.value) {
            await loadBadgeDesign(selectedDeptId.value);
        }
    }

    async function setActiveSide(side) {
        if (side === activeSide.value) {
            return;
        }

        activeSide.value = side;

        if (previewEmployee.value?.id) {
            await loadPreviewEmployeeData(previewEmployee.value.id);
        }
    }

    function createDefaultForActiveSide() {
        const defaults = createEmptyBadgeSide(selectedDeptId.value, activeSide.value);
        applySide(activeBadge.value, defaults);
    }

    function buildSavePayload(depId) {
        const isParent = String(depId) === String(selectedDeptId.value);

        return {
            id: isParent && activeBadge.value.id ? activeBadge.value.id : undefined,
            dep_id: parseInt(depId, 10),
            content: activeBadge.value.content,
            width: Number(activeBadge.value.width),
            heigth: Number(activeBadge.value.heigth),
        };
    }

    async function saveActiveSide() {
        if (!selectedDeptId.value) {
            toast.add({
                severity: 'warn',
                summary: 'تنبيه',
                detail: 'اختر الوحدة أولاً',
                life: 3000,
            });
            return;
        }

        isSaving.value = true;

        const deptIds = targetDeptIds.value;
        const saveFn = activeSide.value === BADGE_SIDES.front ? updateBadge : updateBadge2;
        const parentId = String(selectedDeptId.value);

        try {
            const parentResponse = await saveFn(buildSavePayload(parentId));
            const saved = normalizeBadgeRecord(parentResponse.data) ?? parentResponse.data?.data;

            if (saved) {
                applySide(activeBadge.value, saved);

                if (activeSide.value === BADGE_SIDES.front) {
                    savedFront.value = cloneBadgeSide(activeBadge.value, BADGE_SIDES.front);
                } else {
                    savedBack.value = cloneBadgeSide(activeBadge.value, BADGE_SIDES.back);
                }
            }

            const childIds = deptIds.filter((depId) => depId !== parentId);

            if (childIds.length > 0) {
                await Promise.all(childIds.map((depId) => saveFn(buildSavePayload(depId))));
            }

            const unitCount = deptIds.length;
            const detail = unitCount > 1
                ? `تم حفظ ${BADGE_SIDE_LABELS[activeSide.value]} لـ ${unitCount} وحدة`
                : `تم حفظ ${BADGE_SIDE_LABELS[activeSide.value]} بنجاح`;

            toast.add({
                severity: 'success',
                summary: 'تم الحفظ',
                detail,
                life: 3000,
            });
        } catch (error) {
            console.error('Failed to save badge:', error);
            toast.add({
                severity: 'error',
                summary: 'خطأ',
                detail: 'تعذر حفظ القالب',
                life: 3000,
            });
        } finally {
            isSaving.value = false;
        }
    }

    watch(activeSide, async (side, previousSide) => {
        if (side !== previousSide && previewEmployee.value?.id) {
            await loadPreviewEmployeeData(previewEmployee.value.id);
        }
    });

    onMounted(async () => {
        await loadDepartments();
    });

    return {
        departments,
        departmentsLoading,
        selectedDeptTree,
        selectedDeptId,
        activeSide,
        isLoading,
        isSaving,
        front,
        back,
        previewEmployee,
        previewEmployeeData,
        previewEmployeeLoading,
        useSamplePreviewData,
        applyToChildren,
        childDeptCount,
        selectedDeptLabel,
        activeBadge,
        frontExists,
        backExists,
        isDirty,
        isActiveSideDirty,
        previewHtml,
        previewDimensionsLabel,
        hasTemplate,
        isSamplePreview,
        BADGE_SIDES,
        BADGE_SIDE_LABELS,
        onDepartmentTreeChange,
        setActiveSide,
        createDefaultForActiveSide,
        saveActiveSide,
        loadBadgeDesign,
        onPreviewEmployeeSelect,
        setUseSamplePreviewData,
        insertTag,
        insertBlock,
        updateBadgeContent,
    };
}
