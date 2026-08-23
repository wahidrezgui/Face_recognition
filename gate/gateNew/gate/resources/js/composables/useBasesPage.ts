import { router, useForm, usePage } from '@inertiajs/vue3';
import { trans } from 'laravel-vue-i18n';
import { useConfirm } from 'primevue/useconfirm';
import { computed, ref } from 'vue';
import {
    destroy,
    destroyGate,
    destroyZone,
    store,
    storeGate,
    storeZone,
    update,
    updateGate,
    updateZone,
} from '@/actions/App/Http/Controllers/Inertia/BaseController';
import { useToast } from '@/composables/useToast';
import { canWriteResource } from '@/lib/auth-roles';
import { defaultZoneStyleFields } from '@/lib/zones/zoneStyleCore';
import type { ZoneStyle } from '@/lib/zones/zoneStyleCore';
import type { BaseEntity, GateEntity, ZoneEntity } from '@/types';

interface BasesPageProps {
    bases: BaseEntity[];
    [key: string]: unknown;
}

interface NameFormData {
    name_en: string;
    name_ar: string;
}

interface ZoneFormData extends NameFormData, ZoneStyle {}

function emptyNameForm(): NameFormData {
    return { name_en: '', name_ar: '' };
}

function emptyZoneForm(): ZoneFormData {
    return { ...emptyNameForm(), ...defaultZoneStyleFields() };
}

export function useBasesPage() {
    const page = usePage<BasesPageProps>();
    const toast = useToast();
    const confirm = useConfirm();

    const bases = computed(() => page.props.bases);
    const user = computed(() => page.props.auth.user);
    const canManage = computed(() =>
        canWriteResource('departments', user.value),
    );

    // ---- base ----
    const isOpenedCreateBase = ref(false);
    const isOpenedEditBase = ref(false);
    const editingBaseId = ref<number | null>(null);
    const createBaseForm = useForm<NameFormData>(emptyNameForm());
    const editBaseForm = useForm<NameFormData>(emptyNameForm());

    function openCreateBase() {
        createBaseForm.reset();
        createBaseForm.clearErrors();
        isOpenedCreateBase.value = true;
    }

    function submitCreateBase() {
        createBaseForm.post(store.url(), {
            preserveScroll: true,
            onSuccess: () => {
                isOpenedCreateBase.value = false;
                toast.success(
                    trans('bases.toast.baseCreated'),
                    trans('bases.toast.successTitle'),
                );
            },
            onError: () =>
                toast.error(
                    trans('bases.toast.baseCreateFailed'),
                    trans('bases.toast.errorTitle'),
                ),
        });
    }

    function openEditBase(base: BaseEntity) {
        editingBaseId.value = base.id;
        editBaseForm.clearErrors();
        editBaseForm.name_en = base.name_en;
        editBaseForm.name_ar = base.name_ar ?? '';
        isOpenedEditBase.value = true;
    }

    function submitEditBase() {
        if (!editingBaseId.value) {
            return;
        }

        editBaseForm.put(update.url(editingBaseId.value), {
            preserveScroll: true,
            onSuccess: () => {
                isOpenedEditBase.value = false;
                toast.success(
                    trans('bases.toast.baseUpdated'),
                    trans('bases.toast.successTitle'),
                );
            },
            onError: () =>
                toast.error(
                    trans('bases.toast.baseUpdateFailed'),
                    trans('bases.toast.errorTitle'),
                ),
        });
    }

    function deleteBase(base: BaseEntity) {
        confirm.require({
            message: trans('bases.toast.deleteBaseConfirm'),
            header: trans('bases.toast.confirmHeader'),
            acceptProps: { severity: 'danger', label: trans('common.confirm') },
            rejectProps: {
                severity: 'secondary',
                outlined: true,
                label: trans('common.cancel'),
            },
            accept: () => {
                router.delete(destroy.url(base.id), {
                    preserveScroll: true,
                    onSuccess: () =>
                        toast.success(
                            trans('bases.toast.baseDeleted'),
                            trans('bases.toast.successTitle'),
                        ),
                    onError: () =>
                        toast.error(
                            trans('bases.toast.baseDeleteFailed'),
                            trans('bases.toast.errorTitle'),
                        ),
                });
            },
        });
    }

    // ---- gate ----
    const isOpenedCreateGate = ref(false);
    const isOpenedEditGate = ref(false);
    const creatingGateForBaseId = ref<number | null>(null);
    const editingGateId = ref<number | null>(null);
    const createGateForm = useForm<NameFormData>(emptyNameForm());
    const editGateForm = useForm<NameFormData>(emptyNameForm());

    function openCreateGate(baseId: number) {
        creatingGateForBaseId.value = baseId;
        createGateForm.reset();
        createGateForm.clearErrors();
        isOpenedCreateGate.value = true;
    }

    function submitCreateGate() {
        if (!creatingGateForBaseId.value) {
            return;
        }

        createGateForm.post(storeGate.url(creatingGateForBaseId.value), {
            preserveScroll: true,
            onSuccess: () => {
                isOpenedCreateGate.value = false;
                toast.success(
                    trans('bases.toast.gateCreated'),
                    trans('bases.toast.successTitle'),
                );
            },
            onError: () =>
                toast.error(
                    trans('bases.toast.gateCreateFailed'),
                    trans('bases.toast.errorTitle'),
                ),
        });
    }

    function openEditGate(gate: GateEntity) {
        editingGateId.value = gate.id;
        editGateForm.clearErrors();
        editGateForm.name_en = gate.name_en;
        editGateForm.name_ar = gate.name_ar ?? '';
        isOpenedEditGate.value = true;
    }

    function submitEditGate() {
        if (!editingGateId.value) {
            return;
        }

        editGateForm.put(updateGate.url(editingGateId.value), {
            preserveScroll: true,
            onSuccess: () => {
                isOpenedEditGate.value = false;
                toast.success(
                    trans('bases.toast.gateUpdated'),
                    trans('bases.toast.successTitle'),
                );
            },
            onError: () =>
                toast.error(
                    trans('bases.toast.gateUpdateFailed'),
                    trans('bases.toast.errorTitle'),
                ),
        });
    }

    function deleteGate(gate: GateEntity) {
        confirm.require({
            message: trans('bases.toast.deleteGateConfirm'),
            header: trans('bases.toast.confirmHeader'),
            acceptProps: { severity: 'danger', label: trans('common.confirm') },
            rejectProps: {
                severity: 'secondary',
                outlined: true,
                label: trans('common.cancel'),
            },
            accept: () => {
                router.delete(destroyGate.url(gate.id), {
                    preserveScroll: true,
                    onSuccess: () =>
                        toast.success(
                            trans('bases.toast.gateDeleted'),
                            trans('bases.toast.successTitle'),
                        ),
                    onError: () =>
                        toast.error(
                            trans('bases.toast.gateDeleteFailed'),
                            trans('bases.toast.errorTitle'),
                        ),
                });
            },
        });
    }

    // ---- zone ----
    const isOpenedCreateZone = ref(false);
    const isOpenedEditZone = ref(false);
    const creatingZoneForBaseId = ref<number | null>(null);
    const editingZoneId = ref<number | null>(null);
    const createZoneForm = useForm<ZoneFormData>(emptyZoneForm());
    const editZoneForm = useForm<ZoneFormData>(emptyZoneForm());

    function openCreateZone(baseId: number) {
        creatingZoneForBaseId.value = baseId;
        createZoneForm.reset();
        createZoneForm.clearErrors();
        Object.assign(createZoneForm, emptyZoneForm());
        isOpenedCreateZone.value = true;
    }

    function submitCreateZone() {
        if (!creatingZoneForBaseId.value) {
            return;
        }

        createZoneForm.post(storeZone.url(creatingZoneForBaseId.value), {
            preserveScroll: true,
            onSuccess: () => {
                isOpenedCreateZone.value = false;
                toast.success(
                    trans('bases.toast.zoneCreated'),
                    trans('bases.toast.successTitle'),
                );
            },
            onError: () =>
                toast.error(
                    trans('bases.toast.zoneCreateFailed'),
                    trans('bases.toast.errorTitle'),
                ),
        });
    }

    function openEditZone(zone: ZoneEntity) {
        editingZoneId.value = zone.id;
        editZoneForm.clearErrors();
        const defaults = defaultZoneStyleFields();
        Object.assign(editZoneForm, {
            name_en: zone.name_en,
            name_ar: zone.name_ar ?? '',
            color: zone.color || defaults.color,
            pattern_type: zone.pattern_type || defaults.pattern_type,
            pattern_color: zone.pattern_color || defaults.pattern_color,
        });
        isOpenedEditZone.value = true;
    }

    function submitEditZone() {
        if (!editingZoneId.value) {
            return;
        }

        editZoneForm.put(updateZone.url(editingZoneId.value), {
            preserveScroll: true,
            onSuccess: () => {
                isOpenedEditZone.value = false;
                toast.success(
                    trans('bases.toast.zoneUpdated'),
                    trans('bases.toast.successTitle'),
                );
            },
            onError: () =>
                toast.error(
                    trans('bases.toast.zoneUpdateFailed'),
                    trans('bases.toast.errorTitle'),
                ),
        });
    }

    function deleteZone(zone: ZoneEntity) {
        confirm.require({
            message: trans('bases.toast.deleteZoneConfirm'),
            header: trans('bases.toast.confirmHeader'),
            acceptProps: { severity: 'danger', label: trans('common.confirm') },
            rejectProps: {
                severity: 'secondary',
                outlined: true,
                label: trans('common.cancel'),
            },
            accept: () => {
                router.delete(destroyZone.url(zone.id), {
                    preserveScroll: true,
                    onSuccess: () =>
                        toast.success(
                            trans('bases.toast.zoneDeleted'),
                            trans('bases.toast.successTitle'),
                        ),
                    onError: () =>
                        toast.error(
                            trans('bases.toast.zoneDeleteFailed'),
                            trans('bases.toast.errorTitle'),
                        ),
                });
            },
        });
    }

    return {
        bases,
        canManage,
        isOpenedCreateBase,
        isOpenedEditBase,
        createBaseForm,
        editBaseForm,
        openCreateBase,
        submitCreateBase,
        openEditBase,
        submitEditBase,
        deleteBase,
        isOpenedCreateGate,
        isOpenedEditGate,
        createGateForm,
        editGateForm,
        openCreateGate,
        submitCreateGate,
        openEditGate,
        submitEditGate,
        deleteGate,
        isOpenedCreateZone,
        isOpenedEditZone,
        createZoneForm,
        editZoneForm,
        openCreateZone,
        submitCreateZone,
        openEditZone,
        submitEditZone,
        deleteZone,
    };
}
