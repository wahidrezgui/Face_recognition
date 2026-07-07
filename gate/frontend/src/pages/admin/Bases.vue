<template>
    <PageContainer
        dir="rtl"
        title="القواعد والبوابات"
        :description="`إجمالي ${bases.length} قاعدة`"
    >
        <template #actions>
            <AppButton @click="openCreateBase">
                <i class="pi pi-plus" aria-hidden="true" />
                إضافة قاعدة
            </AppButton>
        </template>

        <AppCard padding="lg">
            <div v-if="bases.length === 0" class="py-12 text-center text-sm text-slate-500">
                لا توجد قواعد لعرضها.
            </div>

            <div v-else class="grid grid-cols-1 gap-4 xl:grid-cols-2">
                <Card
                    v-for="base in bases"
                    :key="base.id"
                    class="rounded-md border bg-white text-gray-700 shadow-md"
                >
                    <template #title>
                        <div class="mt-4 flex w-full items-start justify-between gap-3">
                            <div class="min-w-0">
                                <div class="font-semibold">{{ base.name_ar || base.name_en }}</div>
                                <small v-if="base.name_en && base.name_ar !== base.name_en" class="text-slate-500" dir="ltr">
                                    {{ base.name_en }}
                                </small>
                            </div>
                            <AppTableActions
                                :show-delete="true"
                                @edit="openEditBase(base.id)"
                                @delete="deleteBase(base.id)"
                            />
                        </div>
                    </template>

                    <template #content>
                        <section class="mb-6">
                            <div class="mb-3 flex items-center justify-between gap-2">
                                <h4 class="text-sm font-semibold text-slate-800">المناطق</h4>
                                <AppButton variant="ghost" size="sm" class="text-cyan-600" @click="openCreateZone(base.id)">
                                    <i class="pi pi-plus-circle" aria-hidden="true" />
                                    إضافة منطقة
                                </AppButton>
                            </div>

                            <div class="overflow-x-auto rounded-lg border border-slate-200">
                                <table class="min-w-full divide-y divide-gray-200">
                                    <thead class="bg-gray-50">
                                        <tr>
                                            <th scope="col" class="p-2 text-start text-xs font-medium uppercase tracking-wider text-gray-500" />
                                            <th scope="col" class="p-2 text-start text-xs font-medium uppercase tracking-wider text-gray-500">
                                                المنطقة
                                            </th>
                                            <th scope="col" class="p-2 text-start text-xs font-medium uppercase tracking-wider text-gray-500">
                                                تاريخ الإنشاء
                                            </th>
                                            <th scope="col" class="p-2 text-end text-xs font-medium uppercase tracking-wider text-gray-500">
                                                إجراءات
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody class="divide-y divide-gray-100 bg-white">
                                        <tr v-if="!base.zones.length">
                                            <td colspan="4" class="p-4 text-center text-sm text-slate-500">لا توجد مناطق.</td>
                                        </tr>
                                        <tr v-for="zone in base.zones" :key="zone.id">
                                            <td class="p-2">
                                                <ZoneSwatch :zone="zone" size="lg" shape="circle" />
                                            </td>
                                            <td class="p-2 text-sm font-semibold text-gray-900">{{ zone.name_ar || zone.name_en }}</td>
                                            <td class="p-2 text-sm text-gray-500" dir="ltr">{{ zone.created_at }}</td>
                                            <td class="p-2">
                                                <AppTableActions
                                                    @edit="openEditZone(zone.id)"
                                                    @delete="deleteZone(zone.id)"
                                                />
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </section>

                        <section>
                            <div class="mb-3 flex items-center justify-between gap-2">
                                <h4 class="text-sm font-semibold text-slate-800">البوابات</h4>
                                <AppButton variant="ghost" size="sm" class="text-cyan-600" @click="openCreateGate(base.id)">
                                    <i class="pi pi-plus-circle" aria-hidden="true" />
                                    إضافة بوابة
                                </AppButton>
                            </div>

                            <div class="overflow-x-auto rounded-lg border border-slate-200">
                                <table class="min-w-full divide-y divide-gray-200">
                                    <thead class="bg-gray-50">
                                        <tr>
                                            <th scope="col" class="p-2 text-start text-xs font-medium uppercase tracking-wider text-gray-500">
                                                البوابة
                                            </th>
                                            <th scope="col" class="p-2 text-start text-xs font-medium uppercase tracking-wider text-gray-500">
                                                الاسم بالإنجليزية
                                            </th>
                                            <th scope="col" class="p-2 text-start text-xs font-medium uppercase tracking-wider text-gray-500">
                                                تاريخ الإنشاء
                                            </th>
                                            <th scope="col" class="p-2 text-end text-xs font-medium uppercase tracking-wider text-gray-500">
                                                إجراءات
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody class="divide-y divide-gray-100 bg-white">
                                        <tr v-if="!base.gates.length">
                                            <td colspan="4" class="p-4 text-center text-sm text-slate-500">لا توجد بوابات.</td>
                                        </tr>
                                        <tr v-for="gate in base.gates" :key="gate.id">
                                            <td class="p-2 text-sm font-semibold text-gray-900">{{ gate.name_ar || gate.name_en }}</td>
                                            <td class="p-2 text-sm text-gray-900" dir="ltr">{{ gate.name_en }}</td>
                                            <td class="p-2 text-sm text-gray-500" dir="ltr">{{ gate.created_at }}</td>
                                            <td class="p-2">
                                                <AppTableActions
                                                    @edit="openEditGate(gate.id)"
                                                    @delete="deleteGate(gate.id)"
                                                />
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </section>
                    </template>
                </Card>
            </div>
        </AppCard>
    </PageContainer>

    <VueSidePanel v-model="isOpenedC" lock-scroll hide-close-btn width="600px" @closed="resetCreateBaseForm">
        <div class="flex h-full flex-col bg-white" dir="rtl">
            <form novalidate class="flex h-full flex-col" @submit.prevent="addBase">
                <div class="flex-none border-b border-slate-200 bg-slate-50 px-6 py-4">
                    <div class="flex items-start justify-between">
                        <div>
                            <h2 class="text-lg font-semibold text-slate-800">إضافة قاعدة</h2>
                            <p class="mt-1 text-sm text-slate-500">إنشاء قاعدة جديدة</p>
                        </div>
                        <AppButton variant="ghost" size="sm" class="!p-1 text-slate-400 hover:text-slate-600" aria-label="إغلاق" @click="isOpenedC = false">
                            <i class="pi pi-times text-xl" aria-hidden="true" />
                        </AppButton>
                    </div>
                </div>

                <div class="flex-1 overflow-y-auto px-6 py-6">
                    <div class="space-y-4">
                        <div>
                            <label class="mb-1 block text-sm font-medium text-slate-700">
                                الاسم بالإنجليزية <span class="text-red-500">*</span>
                            </label>
                            <input
                                v-model="formDataBase.name_en"
                                type="text"
                                dir="ltr"
                                placeholder="Base name"
                                :class="inputClass('name_en')"
                                @input="fieldValidity.name_en = true"
                            />
                        </div>
                        <div>
                            <label class="mb-1 block text-sm font-medium text-slate-700">الاسم بالعربية</label>
                            <input
                                v-model="formDataBase.name_ar"
                                type="text"
                                placeholder="اسم القاعدة"
                                class="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
                            />
                        </div>
                    </div>
                </div>

                <div class="flex-none border-t border-slate-200 bg-slate-50 px-6 py-4">
                    <div class="flex justify-end gap-3">
                        <AppButton variant="secondary" @click="isOpenedC = false">
                            إلغاء
                        </AppButton>
                        <AppButton type="submit">
                            حفظ
                        </AppButton>
                    </div>
                </div>
            </form>
        </div>
    </VueSidePanel>

    <VueSidePanel v-model="isOpenedE" lock-scroll hide-close-btn width="600px">
        <div class="flex h-full flex-col bg-white" dir="rtl">
            <form novalidate class="flex h-full flex-col" @submit.prevent="editBase">
                <div class="flex-none border-b border-slate-200 bg-slate-50 px-6 py-4">
                    <div class="flex items-start justify-between">
                        <div>
                            <h2 class="text-lg font-semibold text-slate-800">تعديل قاعدة</h2>
                            <p class="mt-1 text-sm text-slate-500">تحديث بيانات القاعدة</p>
                        </div>
                        <AppButton variant="ghost" size="sm" class="!p-1 text-slate-400 hover:text-slate-600" aria-label="إغلاق" @click="isOpenedE = false">
                            <i class="pi pi-times text-xl" aria-hidden="true" />
                        </AppButton>
                    </div>
                </div>

                <div class="flex-1 overflow-y-auto px-6 py-6">
                    <div class="space-y-4">
                        <div>
                            <label class="mb-1 block text-sm font-medium text-slate-700">
                                الاسم بالإنجليزية <span class="text-red-500">*</span>
                            </label>
                            <input
                                v-model="formEditBase.name_en"
                                type="text"
                                dir="ltr"
                                placeholder="Base name"
                                :class="inputClass('name_en')"
                                @input="fieldValidity.name_en = true"
                            />
                        </div>
                        <div>
                            <label class="mb-1 block text-sm font-medium text-slate-700">الاسم بالعربية</label>
                            <input
                                v-model="formEditBase.name_ar"
                                type="text"
                                placeholder="اسم القاعدة"
                                class="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
                            />
                        </div>
                    </div>
                </div>

                <div class="flex-none border-t border-slate-200 bg-slate-50 px-6 py-4">
                    <div class="flex justify-end gap-3">
                        <AppButton variant="secondary" @click="isOpenedE = false">
                            إلغاء
                        </AppButton>
                        <AppButton type="submit">
                            تحديث
                        </AppButton>
                    </div>
                </div>
            </form>
        </div>
    </VueSidePanel>

    <VueSidePanel v-model="isOpenedG" lock-scroll hide-close-btn width="600px" @closed="resetCreateGateForm">
        <div class="flex h-full flex-col bg-white" dir="rtl">
            <form novalidate class="flex h-full flex-col" @submit.prevent="addGate">
                <div class="flex-none border-b border-slate-200 bg-slate-50 px-6 py-4">
                    <div class="flex items-start justify-between">
                        <div>
                            <h2 class="text-lg font-semibold text-slate-800">إضافة بوابة</h2>
                            <p class="mt-1 text-sm text-slate-500">إضافة بوابة جديدة للقاعدة</p>
                        </div>
                        <AppButton variant="ghost" size="sm" class="!p-1 text-slate-400 hover:text-slate-600" aria-label="إغلاق" @click="isOpenedG = false">
                            <i class="pi pi-times text-xl" aria-hidden="true" />
                        </AppButton>
                    </div>
                </div>

                <div class="flex-1 overflow-y-auto px-6 py-6">
                    <div class="space-y-4">
                        <div>
                            <label class="mb-1 block text-sm font-medium text-slate-700">
                                الاسم بالإنجليزية <span class="text-red-500">*</span>
                            </label>
                            <input
                                v-model="formDataGate.name_en"
                                type="text"
                                dir="ltr"
                                placeholder="Gate name"
                                :class="inputClass('name_en')"
                                @input="fieldValidity.name_en = true"
                            />
                        </div>
                        <div>
                            <label class="mb-1 block text-sm font-medium text-slate-700">الاسم بالعربية</label>
                            <input
                                v-model="formDataGate.name_ar"
                                type="text"
                                placeholder="اسم البوابة"
                                class="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
                            />
                        </div>
                    </div>
                </div>

                <div class="flex-none border-t border-slate-200 bg-slate-50 px-6 py-4">
                    <div class="flex justify-end gap-3">
                        <AppButton variant="secondary" @click="isOpenedG = false">
                            إلغاء
                        </AppButton>
                        <AppButton type="submit">
                            حفظ
                        </AppButton>
                    </div>
                </div>
            </form>
        </div>
    </VueSidePanel>

    <VueSidePanel v-model="isOpenedGE" lock-scroll hide-close-btn width="600px">
        <div class="flex h-full flex-col bg-white" dir="rtl">
            <form novalidate class="flex h-full flex-col" @submit.prevent="editGate">
                <div class="flex-none border-b border-slate-200 bg-slate-50 px-6 py-4">
                    <div class="flex items-start justify-between">
                        <div>
                            <h2 class="text-lg font-semibold text-slate-800">تعديل بوابة</h2>
                            <p class="mt-1 text-sm text-slate-500">تحديث بيانات البوابة</p>
                        </div>
                        <AppButton variant="ghost" size="sm" class="!p-1 text-slate-400 hover:text-slate-600" aria-label="إغلاق" @click="isOpenedGE = false">
                            <i class="pi pi-times text-xl" aria-hidden="true" />
                        </AppButton>
                    </div>
                </div>

                <div class="flex-1 overflow-y-auto px-6 py-6">
                    <div class="space-y-4">
                        <div>
                            <label class="mb-1 block text-sm font-medium text-slate-700">
                                الاسم بالإنجليزية <span class="text-red-500">*</span>
                            </label>
                            <input
                                v-model="formEditGate.name_en"
                                type="text"
                                dir="ltr"
                                placeholder="Gate name"
                                :class="inputClass('name_en')"
                                @input="fieldValidity.name_en = true"
                            />
                        </div>
                        <div>
                            <label class="mb-1 block text-sm font-medium text-slate-700">الاسم بالعربية</label>
                            <input
                                v-model="formEditGate.name_ar"
                                type="text"
                                placeholder="اسم البوابة"
                                class="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
                            />
                        </div>
                    </div>
                </div>

                <div class="flex-none border-t border-slate-200 bg-slate-50 px-6 py-4">
                    <div class="flex justify-end gap-3">
                        <AppButton variant="secondary" @click="isOpenedGE = false">
                            إلغاء
                        </AppButton>
                        <AppButton type="submit">
                            تحديث
                        </AppButton>
                    </div>
                </div>
            </form>
        </div>
    </VueSidePanel>

    <VueSidePanel v-model="isOpenedZ" lock-scroll hide-close-btn width="600px" @closed="resetCreateZoneForm">
        <div class="flex h-full flex-col bg-white" dir="rtl">
            <form novalidate class="flex h-full flex-col" @submit.prevent="addZone">
                <div class="flex-none border-b border-slate-200 bg-slate-50 px-6 py-4">
                    <div class="flex items-start justify-between">
                        <div>
                            <h2 class="text-lg font-semibold text-slate-800">إضافة منطقة</h2>
                            <p class="mt-1 text-sm text-slate-500">إضافة منطقة جديدة للقاعدة</p>
                        </div>
                        <AppButton variant="ghost" size="sm" class="!p-1 text-slate-400 hover:text-slate-600" aria-label="إغلاق" @click="isOpenedZ = false">
                            <i class="pi pi-times text-xl" aria-hidden="true" />
                        </AppButton>
                    </div>
                </div>

                <div class="flex-1 overflow-y-auto px-6 py-6">
                    <div class="space-y-4">
                        <div>
                            <label class="mb-1 block text-sm font-medium text-slate-700">
                                الاسم بالإنجليزية <span class="text-red-500">*</span>
                            </label>
                            <input
                                v-model="formDataZone.name_en"
                                type="text"
                                dir="ltr"
                                placeholder="Zone name"
                                :class="inputClass('name_en')"
                                @input="fieldValidity.name_en = true"
                            />
                        </div>
                        <div>
                            <label class="mb-1 block text-sm font-medium text-slate-700">الاسم بالعربية</label>
                            <input
                                v-model="formDataZone.name_ar"
                                type="text"
                                placeholder="اسم المنطقة"
                                class="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
                            />
                        </div>
                        <ZoneStyleEditor v-model="formDataZone" field-id="create-zone" />
                    </div>
                </div>

                <div class="flex-none border-t border-slate-200 bg-slate-50 px-6 py-4">
                    <div class="flex justify-end gap-3">
                        <AppButton variant="secondary" @click="isOpenedZ = false">
                            إلغاء
                        </AppButton>
                        <AppButton type="submit">
                            حفظ
                        </AppButton>
                    </div>
                </div>
            </form>
        </div>
    </VueSidePanel>

    <VueSidePanel v-model="isOpenedZE" lock-scroll hide-close-btn width="600px">
        <div class="flex h-full flex-col bg-white" dir="rtl">
            <form novalidate class="flex h-full flex-col" @submit.prevent="editZone">
                <div class="flex-none border-b border-slate-200 bg-slate-50 px-6 py-4">
                    <div class="flex items-start justify-between">
                        <div>
                            <h2 class="text-lg font-semibold text-slate-800">تعديل منطقة</h2>
                            <p class="mt-1 text-sm text-slate-500">تحديث بيانات المنطقة</p>
                        </div>
                        <AppButton variant="ghost" size="sm" class="!p-1 text-slate-400 hover:text-slate-600" aria-label="إغلاق" @click="isOpenedZE = false">
                            <i class="pi pi-times text-xl" aria-hidden="true" />
                        </AppButton>
                    </div>
                </div>

                <div class="flex-1 overflow-y-auto px-6 py-6">
                    <div class="space-y-4">
                        <div>
                            <label class="mb-1 block text-sm font-medium text-slate-700">
                                الاسم بالإنجليزية <span class="text-red-500">*</span>
                            </label>
                            <input
                                v-model="formEditZone.name_en"
                                type="text"
                                dir="ltr"
                                placeholder="Zone name"
                                :class="inputClass('name_en')"
                                @input="fieldValidity.name_en = true"
                            />
                        </div>
                        <div>
                            <label class="mb-1 block text-sm font-medium text-slate-700">الاسم بالعربية</label>
                            <input
                                v-model="formEditZone.name_ar"
                                type="text"
                                placeholder="اسم المنطقة"
                                class="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
                            />
                        </div>
                        <ZoneStyleEditor v-model="formEditZone" field-id="edit-zone" />
                    </div>
                </div>

                <div class="flex-none border-t border-slate-200 bg-slate-50 px-6 py-4">
                    <div class="flex justify-end gap-3">
                        <AppButton variant="secondary" @click="isOpenedZE = false">
                            إلغاء
                        </AppButton>
                        <AppButton type="submit">
                            تحديث
                        </AppButton>
                    </div>
                </div>
            </form>
        </div>
    </VueSidePanel>
</template>

<script>
import {
    fetchBases,
    fetchBase,
    createBase,
    updateBase,
    deleteBase,
    fetchGate,
    createGate,
    updateGate,
    deleteGate,
    fetchZone,
    createZone,
    updateZone,
    deleteZone,
} from '../../api/organization';
import Card from 'primevue/card';
import PageContainer from '../../components/ui/PageContainer.vue';
import AppCard from '../../components/ui/AppCard.vue';
import AppButton from '../../components/ui/AppButton.vue';
import ZoneSwatch from '../../components/zones/ZoneSwatch.vue';
import ZoneStyleEditor from '../../components/zones/ZoneStyleEditor.vue';
import { defaultZoneStyleFields } from '../../lib/zones/zoneStyleCore.js';

function normalizeBase(base) {
    return {
        ...base,
        gates: base.gates || base.Gates || [],
        zones: base.zones || base.Zones || [],
    };
}

export default {
    name: 'Bases',
    components: {
        Card,
        PageContainer,
        AppCard,
        AppButton,
        ZoneSwatch,
        ZoneStyleEditor,
    },
    data() {
        return {
            bases: [],
            formDataBase: {
                name_en: '',
                name_ar: '',
            },
            formEditBase: {
                name_en: '',
                name_ar: '',
                id: 0,
            },
            formDataGate: {
                name_en: '',
                name_ar: '',
                base_id: null,
            },
            formEditGate: {
                name_en: '',
                name_ar: '',
                id: 0,
            },
            formDataZone: {
                name_en: '',
                name_ar: '',
                ...defaultZoneStyleFields(),
                base_id: null,
            },
            formEditZone: {
                name_en: '',
                name_ar: '',
                ...defaultZoneStyleFields(),
                id: 0,
            },
            fieldValidity: {
                name_en: true,
            },
            isOpenedC: false,
            isOpenedE: false,
            isOpenedG: false,
            isOpenedGE: false,
            isOpenedZ: false,
            isOpenedZE: false,
        };
    },
    mounted() {
        this.fetchData();
    },
    methods: {
        inputClass(field) {
            return [
                'w-full rounded-lg border px-3 py-2 text-sm outline-none transition focus:ring-2 focus:ring-brand/20',
                this.fieldValidity[field] ? 'border-slate-200 focus:border-brand' : 'border-red-500 focus:border-red-500',
            ];
        },

        validateEnglishName(value) {
            if (String(value || '').trim() === '') {
                this.fieldValidity.name_en = false;
                return false;
            }
            return true;
        },

        openCreateBase() {
            this.resetCreateBaseForm();
            this.isOpenedC = true;
        },

        resetCreateBaseForm() {
            this.formDataBase = { name_en: '', name_ar: '' };
            this.fieldValidity.name_en = true;
        },

        resetCreateGateForm() {
            this.formDataGate = { name_en: '', name_ar: '', base_id: null };
            this.fieldValidity.name_en = true;
        },

        resetCreateZoneForm() {
            this.formDataZone = {
                name_en: '',
                name_ar: '',
                ...defaultZoneStyleFields(),
                base_id: null,
            };
            this.fieldValidity.name_en = true;
        },

        addBase() {
            if (!this.validateEnglishName(this.formDataBase.name_en)) {
                return;
            }

            createBase(this.formDataBase)
                .then(() => {
                    this.fetchData();
                    this.isOpenedC = false;
                    this.resetCreateBaseForm();
                    this.showToast('success', 'تم الحفظ', 'تم إنشاء القاعدة بنجاح');
                })
                .catch((error) => {
                    console.error('API error:', error);
                    this.showToast('error', 'خطأ', 'تعذر إنشاء القاعدة');
                });
        },

        openEditBase(id) {
            fetchBase(id)
                .then((response) => {
                    this.formEditBase = response.data;
                    this.fieldValidity.name_en = true;
                    this.isOpenedE = true;
                })
                .catch((error) => {
                    console.error('Error fetching base:', error);
                    this.showToast('error', 'خطأ', 'تعذر تحميل بيانات القاعدة');
                });
        },

        editBase() {
            if (!this.validateEnglishName(this.formEditBase.name_en)) {
                return;
            }

            updateBase(this.formEditBase)
                .then(() => {
                    this.fetchData();
                    this.isOpenedE = false;
                    this.showToast('success', 'تم التحديث', 'تم تحديث القاعدة بنجاح');
                })
                .catch((error) => {
                    console.error('API error:', error);
                    this.showToast('error', 'خطأ', 'تعذر تحديث القاعدة');
                });
        },

        openCreateZone(baseId) {
            this.formDataZone = {
                name_en: '',
                name_ar: '',
                ...defaultZoneStyleFields(),
                base_id: baseId,
            };
            this.fieldValidity.name_en = true;
            this.isOpenedZ = true;
        },

        openCreateGate(baseId) {
            this.formDataGate = {
                name_en: '',
                name_ar: '',
                base_id: baseId,
            };
            this.fieldValidity.name_en = true;
            this.isOpenedG = true;
        },

        addZone() {
            if (!this.validateEnglishName(this.formDataZone.name_en)) {
                return;
            }

            createZone(this.formDataZone)
                .then(() => {
                    this.fetchData();
                    this.isOpenedZ = false;
                    this.resetCreateZoneForm();
                    this.showToast('success', 'تم الحفظ', 'تم إنشاء المنطقة بنجاح');
                })
                .catch((error) => {
                    console.error('API error:', error);
                    this.showToast('error', 'خطأ', 'تعذر إنشاء المنطقة');
                });
        },

        openEditZone(id) {
            fetchZone(id)
                .then((response) => {
                    const defaults = defaultZoneStyleFields();
                    this.formEditZone = {
                        ...response.data,
                        color: response.data.color || defaults.color,
                        pattern_type: response.data.pattern_type || defaults.pattern_type,
                        pattern_color: response.data.pattern_color || defaults.pattern_color,
                    };
                    this.fieldValidity.name_en = true;
                    this.isOpenedZE = true;
                })
                .catch((error) => {
                    console.error('Error fetching zone:', error);
                    this.showToast('error', 'خطأ', 'تعذر تحميل بيانات المنطقة');
                });
        },

        editZone() {
            if (!this.validateEnglishName(this.formEditZone.name_en)) {
                return;
            }

            updateZone(this.formEditZone)
                .then(() => {
                    this.fetchData();
                    this.isOpenedZE = false;
                    this.showToast('success', 'تم التحديث', 'تم تحديث المنطقة بنجاح');
                })
                .catch((error) => {
                    console.error('API error:', error);
                    this.showToast('error', 'خطأ', 'تعذر تحديث المنطقة');
                });
        },

        addGate() {
            if (!this.validateEnglishName(this.formDataGate.name_en)) {
                return;
            }

            createGate(this.formDataGate)
                .then(() => {
                    this.fetchData();
                    this.isOpenedG = false;
                    this.resetCreateGateForm();
                    this.showToast('success', 'تم الحفظ', 'تم إنشاء البوابة بنجاح');
                })
                .catch((error) => {
                    console.error('API error:', error);
                    this.showToast('error', 'خطأ', 'تعذر إنشاء البوابة');
                });
        },

        openEditGate(id) {
            fetchGate(id)
                .then((response) => {
                    this.formEditGate = response.data;
                    this.fieldValidity.name_en = true;
                    this.isOpenedGE = true;
                })
                .catch((error) => {
                    console.error('Error fetching gate:', error);
                    this.showToast('error', 'خطأ', 'تعذر تحميل بيانات البوابة');
                });
        },

        editGate() {
            if (!this.validateEnglishName(this.formEditGate.name_en)) {
                return;
            }

            updateGate(this.formEditGate)
                .then(() => {
                    this.fetchData();
                    this.isOpenedGE = false;
                    this.showToast('success', 'تم التحديث', 'تم تحديث البوابة بنجاح');
                })
                .catch((error) => {
                    console.error('API error:', error);
                    this.showToast('error', 'خطأ', 'تعذر تحديث البوابة');
                });
        },

        fetchData() {
            fetchBases()
                .then((response) => {
                    this.bases = (response.data || []).map(normalizeBase);
                })
                .catch((error) => {
                    console.error(error);
                    this.showToast('error', 'خطأ', 'تعذر تحميل القواعد');
                });
        },

        confirmDelete(message, onAccept) {
            this.$confirm.require({
                message,
                header: 'تأكيد الحذف',
                icon: 'pi pi-info-circle',
                acceptClass: 'p-button-danger',
                accept: onAccept,
            });
        },

        deleteBase(id) {
            this.confirmDelete('هل تريد حذف هذه القاعدة؟', () => {
                deleteBase({ id })
                    .then(() => {
                        this.fetchData();
                        this.showToast('info', 'تم الحذف', 'تم حذف القاعدة بنجاح');
                    })
                    .catch((error) => {
                        console.error(error);
                        this.showToast('error', 'خطأ', 'تعذر حذف القاعدة');
                    });
            });
        },

        deleteZone(id) {
            this.confirmDelete('هل تريد حذف هذه المنطقة؟', () => {
                deleteZone({ id })
                    .then(() => {
                        this.fetchData();
                        this.showToast('info', 'تم الحذف', 'تم حذف المنطقة بنجاح');
                    })
                    .catch((error) => {
                        console.error(error);
                        this.showToast('error', 'خطأ', 'تعذر حذف المنطقة');
                    });
            });
        },

        deleteGate(id) {
            this.confirmDelete('هل تريد حذف هذه البوابة؟', () => {
                deleteGate({ id })
                    .then(() => {
                        this.fetchData();
                        this.showToast('info', 'تم الحذف', 'تم حذف البوابة بنجاح');
                    })
                    .catch((error) => {
                        console.error(error);
                        this.showToast('error', 'خطأ', 'تعذر حذف البوابة');
                    });
            });
        },

        showToast(severity, summary, detail) {
            this.$toast?.add({ severity, summary, detail, life: 3000 });
        },
    },
};
</script>
