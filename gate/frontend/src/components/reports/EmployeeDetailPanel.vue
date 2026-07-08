<template>
    <VueSidePanel :model-value="open" lock-scroll no-close="true" width="720px" @update:model-value="$emit('update:open', $event)">
        <div class="employee-detail-panel" dir="rtl">
            <nav class="panel-tabs" aria-label="تفاصيل الموظف">
                <button
                    type="button"
                    class="panel-tab"
                    :class="{ 'panel-tab--active': activeTab === 10 }"
                    @click="activeTab = 10"
                >
                    <i class="pi pi-id-card" aria-hidden="true"></i>
                    <span>التقرير</span>
                </button>
                <button
                    type="button"
                    class="panel-tab"
                    :class="{ 'panel-tab--active': activeTab === 11 }"
                    @click="activeTab = 11"
                >
                    <i class="pi pi-list" aria-hidden="true"></i>
                    <span>سجل الحركات</span>
                </button>
                <button
                    type="button"
                    class="panel-tab"
                    :class="{ 'panel-tab--active': activeTab === 13 }"
                    @click="activeTab = 13"
                >
                    <i class="pi pi-id-card" aria-hidden="true"></i>
                    <span>بطاقة الدخول</span>
                </button>
            </nav>

            <div v-show="activeTab === 10" role="tabpanel" class="panel-body">
                <div class="panel-toolbar">
                    <button type="button" class="panel-print-btn" @click="printReport">
                        <i class="pi pi-print" aria-hidden="true"></i>
                        طباعة
                    </button>
                </div>

                <div class="panel-content">
                    <article class="employee-card">
                        <div class="employee-card__banner">
                            <p class="employee-card__eyebrow">بيانات الموظف</p>
                            <div class="employee-card__photo-wrap">
                                <img
                                    :src="photoSrc"
                                    :alt="guest.fullname_en || 'صورة الموظف'"
                                    class="employee-card__photo"
                                />
                            </div>
                        </div>
                        <div class="employee-card__body">
                            <div class="employee-card__headline">
                                <h2 class="employee-card__name">{{ guest.fullname_en || '—' }}</h2>
                                <p v-if="guest.fullname_ar" class="employee-card__name-ar">{{ guest.fullname_ar }}</p>
                                <div class="employee-card__badges">
                                    <span v-if="guest.military_number" class="employee-badge">
                                        <i class="pi pi-hashtag" aria-hidden="true"></i>
                                        {{ guest.military_number }}
                                    </span>
                                    <span v-if="guest.rank" class="employee-badge employee-badge--muted">
                                        {{ guest.rank }}
                                    </span>
                                </div>
                            </div>

                            <dl class="employee-card__meta">
                                <div class="employee-card__meta-item">
                                    <dt><i class="pi pi-phone" aria-hidden="true"></i> الهاتف</dt>
                                    <dd>{{ guest.phone_number || '—' }}</dd>
                                </div>
                                <div class="employee-card__meta-item">
                                    <dt><i class="pi pi-user" aria-hidden="true"></i> الجنس</dt>
                                    <dd>{{ guest.gender || '—' }}</dd>
                                </div>
                                <div class="employee-card__meta-item">
                                    <dt><i class="pi pi-globe" aria-hidden="true"></i> الجنسية</dt>
                                    <dd>{{ guest.nationality || '—' }}</dd>
                                </div>
                                <div class="employee-card__meta-item employee-card__meta-item--wide">
                                    <dt><i class="pi pi-building" aria-hidden="true"></i> القسم</dt>
                                    <dd>{{ guest.department || '—' }}</dd>
                                </div>
                            </dl>
                        </div>
                    </article>

                    <section class="movement-summary">
                        <header class="section-heading">
                            <span class="section-heading__icon" aria-hidden="true">
                                <i class="pi pi-calendar"></i>
                            </span>
                            <div>
                                <h3 class="section-heading__title">ملخص اليوم</h3>
                                <p class="section-heading__subtitle">تفاصيل الحضور والملاحظات</p>
                            </div>
                        </header>

                        <div class="movement-summary__stats">
                            <div class="movement-stat">
                                <span class="movement-stat__label">التاريخ</span>
                                <span class="movement-stat__value">{{ guest.day || '—' }}</span>
                            </div>
                            <div class="movement-stat movement-stat--in">
                                <span class="movement-stat__label">أول دخول</span>
                                <span class="movement-stat__value">{{ guest.checkin || '—' }}</span>
                            </div>
                            <div class="movement-stat movement-stat--out">
                                <span class="movement-stat__label">آخر خروج</span>
                                <span class="movement-stat__value">{{ guest.checkout || '—' }}</span>
                            </div>
                        </div>

                        <div v-if="guest.defaut" class="movement-summary__status" v-html="guest.defaut"></div>

                        <div class="movement-summary__notes">
                            <div class="notes-header">
                                <label for="excuse" class="notes-header__label">
                                    <input
                                        id="excuse"
                                        type="checkbox"
                                        :checked="withExcuse"
                                        @change="$emit('update:withExcuse', $event.target.checked)"
                                    />
                                    <span>ملاحظات بعذر</span>
                                </label>
                            </div>

                            <div v-if="guest.notes !== ''" class="notes-display-wrap">
                                <div class="notes-display" v-html="guest.notes"></div>
                                <button
                                    v-if="allowDeleteNote"
                                    type="button"
                                    class="notes-delete-btn"
                                    @click="$emit('delete-note')"
                                >
                                    <i class="pi pi-trash" aria-hidden="true"></i>
                                    حذف الملاحظة
                                </button>
                            </div>

                            <form v-else novalidate class="notes-form" @submit.prevent="$emit('add-note')">
                                <div v-if="withExcuse" class="notes-form__inner">
                                    <textarea
                                        :value="noteText"
                                        rows="3"
                                        class="notes-form__textarea"
                                        placeholder="اكتب العذر هنا..."
                                        @input="$emit('update:noteText', $event.target.value)"
                                    ></textarea>
                                    <button type="submit" class="notes-form__submit" aria-label="إرسال الملاحظة">
                                        <i class="pi pi-send" aria-hidden="true"></i>
                                    </button>
                                </div>
                                <p v-if="withExcuse" class="notes-form__hint">
                                    هذه الخانة لإدخال الأعذار فقط — في حالة عدم وجود عذر يجب تركها فارغة
                                </p>
                            </form>
                        </div>
                    </section>

                    <section class="movement-log">
                        <header class="section-heading">
                            <span class="section-heading__icon" aria-hidden="true">
                                <i class="pi pi-arrows-h"></i>
                            </span>
                            <div>
                                <h3 class="section-heading__title">السجل اليومي</h3>
                                <p class="section-heading__subtitle">حركات اليوم المحدد فقط — {{ guest.day || '—' }}</p>
                            </div>
                        </header>

                        <AppDataGrid
                            :column-defs="movementColumnDefs"
                            :row-data="filteredTodayMovements"
                            pagination-mode="client"
                            :per-page="10"
                            :rows-per-page-options="[10, 20, 50]"
                            row-selection="none"
                            height="280px"
                            line-height="44px"
                            empty-message="لا توجد حركات لهذا اليوم."
                            :default-col-def="gridDefaultColDef"
                        />
                    </section>
                </div>

                <div id="printMe" class="print-document" aria-hidden="true">
                    <div class="print-report" dir="rtl">
                        <header class="print-report__header">
                            <div>
                                <p class="print-report__org">القوات المسلحة القطرية</p>
                                <h1 class="print-report__title">تقرير الحضور اليومي</h1>
                            </div>
                            <p class="print-report__date">{{ guest.day || '—' }}</p>
                        </header>

                        <section class="print-report__section">
                            <h2 class="print-report__section-title">بيانات الموظف</h2>
                            <div class="print-report__employee">
                                <img :src="printPhotoSrc" :alt="guest.fullname_en || 'صورة الموظف'" class="print-report__photo" />
                                <table class="print-report__info-table">
                                    <tbody>
                                        <tr>
                                            <th>الاسم</th>
                                            <td>{{ guest.fullname_en || '—' }}</td>
                                            <th>الاسم بالعربية</th>
                                            <td>{{ guest.fullname_ar || '—' }}</td>
                                        </tr>
                                        <tr>
                                            <th>الرقم العسكري</th>
                                            <td>{{ guest.military_number || '—' }}</td>
                                            <th>الرتبة</th>
                                            <td>{{ guest.rank || '—' }}</td>
                                        </tr>
                                        <tr>
                                            <th>الهاتف</th>
                                            <td>{{ guest.phone_number || '—' }}</td>
                                            <th>الجنس</th>
                                            <td>{{ guest.gender || '—' }}</td>
                                        </tr>
                                        <tr>
                                            <th>الجنسية</th>
                                            <td>{{ guest.nationality || '—' }}</td>
                                            <th>القسم</th>
                                            <td>{{ guest.department || '—' }}</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </section>

                        <section class="print-report__section">
                            <h2 class="print-report__section-title">ملخص اليوم</h2>
                            <table class="print-report__summary-table">
                                <tbody>
                                    <tr>
                                        <th>التاريخ</th>
                                        <td>{{ guest.day || '—' }}</td>
                                        <th>أول دخول</th>
                                        <td>{{ guest.checkin || '—' }}</td>
                                        <th>آخر خروج</th>
                                        <td>{{ guest.checkout || '—' }}</td>
                                    </tr>
                                </tbody>
                            </table>
                            <div v-if="guest.defaut" class="print-report__status" v-html="guest.defaut"></div>
                            <div v-if="guest.notes" class="print-report__notes">
                                <strong>ملاحظات:</strong>
                                <div v-html="guest.notes"></div>
                            </div>
                        </section>

                        <section class="print-report__section">
                            <h2 class="print-report__section-title">سجل حركات اليوم</h2>
                            <table class="print-report__data-table">
                                <thead>
                                    <tr>
                                        <th>التاريخ والوقت</th>
                                        <th>الحركة</th>
                                        <th>القاعدة</th>
                                        <th>البوابة</th>
                                        <th>المشغّل</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr v-for="(entry, index) in guest.history || []" :key="`print-history-${index}`">
                                        <td>{{ entry.created_at }}</td>
                                        <td>{{ entry.mvtype }}</td>
                                        <td>{{ entry.base }}</td>
                                        <td>{{ entry.gate }}</td>
                                        <td>{{ entry.operator_name || '—' }}</td>
                                    </tr>
                                    <tr v-if="!(guest.history || []).length">
                                        <td colspan="5" class="print-report__empty">لا توجد حركات لهذا اليوم.</td>
                                    </tr>
                                </tbody>
                            </table>
                        </section>
                    </div>
                </div>
            </div>

            <div v-show="activeTab === 11" role="tabpanel" class="panel-body panel-body--log">
                <header class="movement-log-header">
                    <div>
                        <h3 class="movement-log-header__title">سجل الحركات</h3>
                        <p class="movement-log-header__subtitle">
                            {{ guest.fullname_en || 'الموظف' }}
                            <span> · كل الحركات المسجّلة</span>
                        </p>
                    </div>
                </header>

                <label class="movement-log-search">
                    <i class="pi pi-search" aria-hidden="true"></i>
                    <input
                        v-model="allMovementFilter"
                        type="search"
                        placeholder="ابحث بالحركة أو القاعدة أو البوابة أو المشغّل..."
                    />
                </label>

                <AppDataGrid
                    :column-defs="movementColumnDefs"
                    :row-data="filteredAllMovements"
                    pagination-mode="client"
                    :per-page="15"
                    :rows-per-page-options="[10, 20, 50]"
                    row-selection="none"
                    height="calc(100vh - 240px)"
                    line-height="44px"
                    empty-message="لا توجد حركات مسجّلة لهذا الموظف."
                    :default-col-def="gridDefaultColDef"
                />
            </div>

            <div v-show="activeTab === 13" role="tabpanel" class="panel-body panel-body--log">
                <header class="movement-log-header">
                    <div>
                        <h3 class="movement-log-header__title">بطاقة الدخول</h3>
                        <p class="movement-log-header__subtitle">
                            {{ guest.fullname_ar || guest.fullname_en || 'الموظف' }}
                            <span> · سجل طباعة البطاقة</span>
                        </p>
                    </div>
                </header>
                <EmployeeBadgeLogTab :logs="guest.badge_logs || []" />
            </div>
        </div>
    </VueSidePanel>
</template>

<script>
import AppDataGrid from '../ui/AppDataGrid.vue';
import EmployeeBadgeLogTab from '../employees/EmployeeBadgeLogTab.vue';
import { customMvtypeRenderer } from '../../lib/reports/agGridRenderers.js';
import { employeeDetailPrintStyles } from '../../lib/employeeDetailPrintStyles.js';

export default {
    name: 'EmployeeDetailPanel',
    components: { AppDataGrid, EmployeeBadgeLogTab },
    props: {
        open: {
            type: Boolean,
            default: false,
        },
        guest: {
            type: Object,
            required: true,
        },
        noteText: {
            type: String,
            default: '',
        },
        withExcuse: {
            type: Boolean,
            default: true,
        },
        allowDeleteNote: {
            type: Boolean,
            default: false,
        },
    },
    emits: ['update:open', 'update:noteText', 'update:withExcuse', 'add-note', 'delete-note', 'print'],
    data() {
        return {
            activeTab: 10,
            todayMovementFilter: '',
            allMovementFilter: '',
        };
    },
    computed: {
        photoSrc() {
            if (!this.guest.photo) {
                return '/uploads/nopic.png';
            }
            return `/${this.guest.photo}`;
        },
        printPhotoSrc() {
            const src = this.photoSrc;
            if (/^https?:\/\//i.test(src)) {
                return src;
            }
            return `${window.location.origin}${src.startsWith('/') ? src : `/${src}`}`;
        },
        gridDefaultColDef() {
            return {
                sortable: true,
                resizable: true,
                filter: false,
                flex: 1,
                minWidth: 100,
                cellStyle: { textAlign: 'right', direction: 'rtl' },
                headerClass: 'ag-right-aligned-header',
            };
        },
        movementColumnDefs() {
            return [
                { field: 'created_at', headerName: 'التاريخ والوقت', minWidth: 160 },
                {
                    field: 'mvtype',
                    headerName: 'الحركة',
                    minWidth: 120,
                    cellRenderer: customMvtypeRenderer,
                },
                { field: 'base', headerName: 'القاعدة', minWidth: 110 },
                { field: 'gate', headerName: 'البوابة', minWidth: 110 },
                {
                    field: 'operator_name',
                    headerName: 'المشغّل',
                    minWidth: 120,
                    valueFormatter: (params) => params.value || '—',
                },
            ];
        },
        todayMovementRows() {
            return Array.isArray(this.guest.history) ? this.guest.history : [];
        },
        allMovementRows() {
            return Array.isArray(this.guest.all_movements) ? this.guest.all_movements : [];
        },
        filteredTodayMovements() {
            return this.filterRows(this.todayMovementRows, this.todayMovementFilter);
        },
        filteredAllMovements() {
            return this.filterRows(this.allMovementRows, this.allMovementFilter);
        },
    },
    watch: {
        open(value) {
            if (value) {
                this.activeTab = 10;
                this.resetFilters();
            }
        },
        guest() {
            this.resetFilters();
        },
    },
    methods: {
        printReport() {
            this.$htmlToPaper('printMe', {
                inlineStyles: employeeDetailPrintStyles,
                styles: [],
                title: `تقرير الحضور — ${this.guest.fullname_en || 'الموظف'}`,
            });
        },
        resetFilters() {
            this.todayMovementFilter = '';
            this.allMovementFilter = '';
        },
        filterRows(rows, query) {
            const list = Array.isArray(rows) ? rows : [];
            const normalizedQuery = query.trim().toLowerCase();

            if (!normalizedQuery) {
                return list;
            }

            return list.filter((row) =>
                Object.values(row || {}).some((value) => String(value ?? '').toLowerCase().includes(normalizedQuery)),
            );
        },
    },
};
</script>

<style scoped>
.employee-detail-panel {
    --panel-accent: #8a1538;
    --panel-accent-light: #a52d52;
    --panel-accent-dark: #6e1029;
    --panel-accent-soft: #f3e4e9;
    --panel-ink: #0f172a;
    --panel-muted: #64748b;
    --panel-surface: #f8fafc;
    --panel-border: #e2e8f0;
    min-height: 100%;
    background: var(--panel-surface);
}

.panel-tabs {
    display: flex;
    gap: 0.25rem;
    padding: 0.75rem 1rem 0;
    background: #fff;
    border-bottom: 1px solid var(--panel-border);
}

.panel-tab {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.75rem 1rem;
    border: none;
    border-bottom: 2px solid transparent;
    background: transparent;
    color: var(--panel-muted);
    font-size: 0.875rem;
    font-weight: 600;
    cursor: pointer;
    transition: color 0.15s ease, border-color 0.15s ease;
}

.panel-tab:hover {
    color: var(--panel-accent);
}

.panel-tab--active {
    color: var(--panel-accent);
    border-bottom-color: var(--panel-accent);
}

.panel-body {
    padding: 1rem 1.25rem 1.5rem;
}

.panel-body--log {
    padding-top: 1.25rem;
}

.panel-toolbar {
    display: flex;
    justify-content: flex-end;
    margin-bottom: 1rem;
}

.panel-print-btn {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 0.9rem;
    border: 1px solid var(--panel-border);
    border-radius: 0.65rem;
    background: #fff;
    color: var(--panel-ink);
    font-size: 0.875rem;
    font-weight: 600;
    cursor: pointer;
    transition: border-color 0.15s ease, box-shadow 0.15s ease;
}

.panel-print-btn:hover {
    border-color: var(--panel-accent);
    box-shadow: 0 0 0 3px rgb(15 118 110 / 0.12);
}

.panel-content {
    display: flex;
    flex-direction: column;
    gap: 1rem;
}

.employee-card {
    position: relative;
    border: 1px solid var(--panel-border);
    border-radius: 1.25rem;
    background: #fff;
    box-shadow: 0 10px 30px rgb(15 23 42 / 0.06);
    overflow: visible;
}

.employee-card__banner {
    position: relative;
    display: flex;
    align-items: flex-start;
    min-height: 5.75rem;
    padding: 1rem 1.25rem 4.75rem;
    border-radius: 1.25rem 1.25rem 0 0;
    background: linear-gradient(135deg, var(--panel-accent) 0%, var(--panel-accent-dark) 55%, #3f1726 100%);
}

.employee-card__body {
    padding: 0 1.25rem 1.25rem;
}

.employee-card__photo-wrap {
    position: absolute;
    inset-inline-end: 1.25rem;
    bottom: -3.85rem;
    z-index: 2;
    padding: 0.3rem;
    border-radius: 1.1rem;
    background: #fff;
    box-shadow: 0 8px 24px rgb(15 23 42 / 0.12);
}

.employee-card__photo {
    display: block;
    width: 7.75rem;
    height: 7.75rem;
    border-radius: 0.9rem;
    object-fit: cover;
}

.employee-card__headline {
    min-width: 0;
    padding-top: 0.35rem;
    padding-inline-end: 9.25rem;
}

.employee-card__eyebrow {
    margin: 0;
    font-size: 0.75rem;
    font-weight: 600;
    letter-spacing: 0.04em;
    color: rgb(255 255 255 / 0.82);
}

.employee-card__name {
    margin: 0;
    font-size: 1.35rem;
    font-weight: 800;
    line-height: 1.2;
    color: var(--panel-ink);
}

.employee-card__name-ar {
    margin: 0.2rem 0 0;
    font-size: 0.95rem;
    color: var(--panel-muted);
}

.employee-card__badges {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    margin-top: 0.65rem;
}

.employee-badge {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    padding: 0.25rem 0.65rem;
    border-radius: 999px;
    background: var(--panel-accent-soft);
    color: var(--panel-accent-dark);
    font-size: 0.78rem;
    font-weight: 700;
}

.employee-badge--muted {
    background: #f1f5f9;
    color: #334155;
}

.employee-card__meta {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 0.75rem;
    margin: 1.1rem 0 0;
    padding-top: 1rem;
    border-top: 1px dashed var(--panel-border);
}

.employee-card__meta-item {
    min-width: 0;
}

.employee-card__meta-item--wide {
    grid-column: 1 / -1;
}

.employee-card__meta dt {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    margin-bottom: 0.2rem;
    font-size: 0.75rem;
    font-weight: 600;
    color: var(--panel-muted);
}

.employee-card__meta dd {
    margin: 0;
    font-size: 0.9rem;
    font-weight: 600;
    color: var(--panel-ink);
    word-break: break-word;
}

.movement-summary,
.movement-log {
    border: 1px solid var(--panel-border);
    border-radius: 1.1rem;
    background: #fff;
    padding: 1.15rem 1.1rem 1.1rem;
    overflow: visible;
}

.section-heading {
    display: flex;
    align-items: flex-start;
    gap: 0.75rem;
    margin-bottom: 1rem;
}

.section-heading__icon {
    display: inline-flex;
    flex-shrink: 0;
    align-items: center;
    justify-content: center;
    width: 2.5rem;
    height: 2.5rem;
    border-radius: 0.75rem;
    background: var(--panel-accent-soft);
    color: var(--panel-accent);
    font-size: 1rem;
    line-height: 1;
}

.section-heading__title {
    margin: 0;
    font-size: 1rem;
    font-weight: 800;
    color: var(--panel-ink);
}

.section-heading__subtitle {
    margin: 0.15rem 0 0;
    font-size: 0.78rem;
    color: var(--panel-muted);
}

.movement-summary__stats {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 0.65rem;
    margin-bottom: 0.85rem;
}

.movement-stat {
    padding: 0.7rem 0.8rem;
    border-radius: 0.8rem;
    background: #f8fafc;
    border: 1px solid var(--panel-border);
}

.movement-stat--in {
    background: #ecfdf5;
    border-color: #a7f3d0;
}

.movement-stat--out {
    background: #fff1f2;
    border-color: #fecdd3;
}

.movement-stat__label {
    display: block;
    font-size: 0.72rem;
    font-weight: 600;
    color: var(--panel-muted);
}

.movement-stat__value {
    display: block;
    margin-top: 0.2rem;
    font-size: 0.95rem;
    font-weight: 800;
    color: var(--panel-ink);
}

.movement-summary__status :deep(.text-red),
.movement-summary__status :deep(li) {
    color: #dc2626;
    font-size: 0.85rem;
    font-weight: 600;
}

.movement-summary__status :deep(ul) {
    margin: 0;
    padding: 0.65rem 0.85rem;
    list-style: none;
    border-radius: 0.75rem;
    background: #fef2f2;
    border: 1px solid #fecaca;
}

.movement-summary__notes {
    margin-top: 1rem;
    padding-top: 1rem;
    border-top: 1px dashed var(--panel-border);
}

.notes-header__label {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.875rem;
    font-weight: 700;
    color: var(--panel-ink);
    cursor: pointer;
}

.notes-display-wrap {
    margin-top: 0.75rem;
}

.notes-display {
    padding: 0.75rem 0.9rem;
    border-radius: 0.75rem;
    background: #f8fafc;
    border: 1px solid var(--panel-border);
    font-size: 0.875rem;
}

.notes-delete-btn {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    margin-top: 0.5rem;
    padding: 0.4rem 0.75rem;
    border: none;
    border-radius: 0.5rem;
    background: #fee2e2;
    color: #b91c1c;
    font-size: 0.8125rem;
    font-weight: 600;
    cursor: pointer;
}

.notes-delete-btn:hover {
    background: #fecaca;
}

.notes-form__inner {
    display: flex;
    align-items: flex-end;
    gap: 0.5rem;
    margin-top: 0.75rem;
}

.notes-form__textarea {
    flex: 1;
    min-height: 5rem;
    padding: 0.75rem 0.9rem;
    border: 1px solid var(--panel-border);
    border-radius: 0.85rem;
    background: #fff;
    font-size: 0.875rem;
    resize: vertical;
    outline: none;
}

.notes-form__textarea:focus {
    border-color: var(--panel-accent);
    box-shadow: 0 0 0 3px rgb(15 118 110 / 0.15);
}

.notes-form__submit {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 2.75rem;
    height: 2.75rem;
    border: none;
    border-radius: 999px;
    background: var(--panel-accent);
    color: #fff;
    cursor: pointer;
    transition: transform 0.15s ease, background 0.15s ease;
}

.notes-form__submit:hover {
    background: var(--panel-accent-dark);
    transform: translateY(-1px);
}

.notes-form__hint {
    margin: 0.65rem 0 0;
    font-size: 0.78rem;
    line-height: 1.5;
    color: #dc2626;
    text-align: center;
}

.movement-log-header__title {
    margin: 0;
    font-size: 1.05rem;
    font-weight: 800;
    color: var(--panel-ink);
}

.movement-log-header__subtitle {
    margin: 0.25rem 0 0;
    font-size: 0.82rem;
    color: var(--panel-muted);
}

.movement-log-search {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    margin: 1rem 0 0.85rem;
    padding: 0 0.85rem;
    height: 2.65rem;
    border: 1px solid var(--panel-border);
    border-radius: 0.8rem;
    background: #fff;
    color: var(--panel-muted);
}

.movement-log-search input {
    flex: 1;
    border: none;
    outline: none;
    background: transparent;
    font-size: 0.875rem;
    color: var(--panel-ink);
}

.print-table {
    width: 100%;
    border-collapse: collapse;
    margin-top: 0.5rem;
}

.print-table th,
.print-table td {
    padding: 0.5rem;
    border: 1px solid #e5e7eb;
    font-size: 0.8rem;
    text-align: right;
}

.print-table th {
    background: #f9fafb;
    font-weight: 700;
}

.print-document {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
}

@media (max-width: 640px) {
    .employee-card__banner {
        padding-bottom: 5.25rem;
    }

    .employee-card__photo-wrap {
        inset-inline-end: 50%;
        transform: translateX(50%);
    }

    [dir='rtl'] .employee-card__photo-wrap {
        transform: translateX(50%);
    }

    .employee-card__headline {
        padding-top: 4rem;
        padding-inline-end: 0;
        text-align: center;
    }

    .employee-card__badges {
        justify-content: center;
    }

    .employee-card__meta {
        grid-template-columns: 1fr;
    }

    .movement-summary__stats {
        grid-template-columns: 1fr;
    }
}

@media (prefers-reduced-motion: reduce) {
    .panel-tab,
    .panel-print-btn,
    .notes-form__submit {
        transition: none;
    }
}
</style>
