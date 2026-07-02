<template>
    <PageContainer
        title="الشركات"
        description="إدارة موظفي الشركات والتصاريح"
        dir="rtl"
    >
        <!-- Presence chart -->
        <AppCard
            class="mb-6"
            title="الحضور — آخر 7 أيام"
            subtitle="عدد الدخول والخروج اليومي للموظفين"
            padding="lg"
        >
            <Chart
                v-if="chartPresence.datasets[0].data.length"
                type="bar"
                :data="chartPresence"
                :options="PresenceOptions"
            />
            <p v-else class="py-10 text-center text-sm text-slate-500">لا توجد بيانات حضور لهذه الفترة.</p>
        </AppCard>

        <!-- General Search -->
        <AppCard class="mb-6" title="بحث عام عن الموظفين" subtitle="ابحث في جميع الشركات دون تحديد شركة" padding="md">
            <div class="relative">
                <input
                    type="search"
                    v-model="generalSearchQuery"
                    @keyup.enter="performGeneralSearch"
                    @input="handleGeneralSearchInput"
                    class="h-11 w-full rounded-xl border border-slate-200 bg-white py-2.5 pe-10 ps-10 text-sm text-slate-800 outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
                    placeholder="الاسم، الرقم العسكري، البطاقة الشخصية، الوظيفة..."
                    dir="rtl"
                />
                <i class="pi pi-search absolute end-3 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden="true" />
                <button
                    v-if="generalSearchQuery"
                    type="button"
                    class="absolute start-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    aria-label="مسح البحث"
                    @click="clearGeneralSearch"
                >
                    <i class="pi pi-times" />
                </button>
            </div>
        </AppCard>

        <!-- Search results panel -->
        <AppCard v-if="showGeneralSearchResults" class="mb-6" padding="md">
                <div class="mb-4 flex items-center justify-between">
                    <h3 class="text-lg font-bold text-slate-900">
                        نتائج البحث ({{ generalSearchResults.length }} موظف)
                    </h3>
                    <button type="button" class="text-slate-500 hover:text-slate-700" aria-label="إغلاق" @click="closeGeneralSearch">
                        <i class="pi pi-times text-lg" />
                    </button>
                </div>
                <div v-if="isGeneralSearchLoading" class="py-8 text-center">
                    <i class="pi pi-spinner pi-spin text-2xl text-brand" />
                    <p class="mt-2 text-slate-600">جاري البحث...</p>
                </div>
                <div v-else>
                    <AppDataGrid
                        ref="searchGrid"
                        :column-defs="searchColumnDefs"
                        :row-data="generalSearchResults"
                        :per-page="searchPerPage"
                        :total-rows="searchTotalRows"
                        pagination-mode="server"
                        height="400px"
                        line-height="56px"
                        row-selection="single"
                        :suppress-row-click-selection="false"
                        @grid-ready="onSearchGridReady"
                        @row-clicked="onSearchRowClicked"
                        @page-change="onSearchGridPageChange"
                        @update:per-page="searchPerPage = $event"
                    />
                    <div v-if="generalSearchResults.length === 0 && !isGeneralSearchLoading" class="py-8 text-center text-slate-500">
                        <i class="pi pi-info-circle mb-2 text-3xl" />
                        <p>لا يوجد موظفون مطابقون لمعايير البحث.</p>
                    </div>
                </div>
        </AppCard>

        <div class="w-full grid grid-cols-1 gap-4">
            <div id="tabPanel-timeline">
                <div class="mt-2 grid w-full grid-cols-1 gap-4 xl:grid-cols-2 2xl:grid-cols-3">

                    <!-- Company list -->
                    <AppCard class="flex flex-col" padding="none" style="max-height: calc(100vh - 200px);">

                        <!-- Header -->
                        <div class="flex flex-shrink-0 items-center justify-between border-b border-slate-100 px-4 pb-2 pt-4">
                            <h3 class="text-lg font-bold text-slate-900">قائمة الشركات</h3>
                            <button @click="OpenAddCompany" type="button" class="inline-flex items-center rounded-lg bg-brand px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-brand-dark">
                                <i class="pi pi-plus ms-1 text-xs" /> إضافة
                            </button>
                        </div>

                        <!-- Search -->
                        <div class="flex-shrink-0 px-3 pb-2 pt-3">
                            <div class="relative">
                                <input
                                    type="search"
                                    v-model="companySearch"
                                    @input="onCompanySearchInput"
                                    class="w-full rounded-xl border border-slate-200 py-2 pe-8 ps-8 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
                                    placeholder="ابحث عن شركة..."
                                    dir="rtl"
                                />
                                <i class="pi pi-search absolute end-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400" />
                                <button v-if="companySearch" type="button" @click="companySearch=''; onCompanySearchInput()" class="absolute start-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                                    <i class="pi pi-times text-xs" />
                                </button>
                            </div>
                        </div>

                        <!-- All companies -->
                        <div class="flex flex-shrink-0 items-center justify-between border-b border-slate-100 bg-slate-50 px-3 py-1 text-xs font-bold text-slate-600">
                            <span><i class="pi pi-building ms-1" /> كل الشركات</span>
                            <span class="font-normal text-slate-400">
                                صفحة {{ companyPage }} من {{ companyTotalPages }} ({{ filteredDepartments.length }} شركة)
                            </span>
                        </div>

                        <!-- Company rows -->
                        <div class="flex-1 overflow-y-auto">
                            <div
                                v-for="comp in pagedDepartments" :key="comp.id"
                                @click="infoComp(comp.id);"
                                class="group flex cursor-pointer items-center gap-2 border-b border-slate-50 px-3 py-2 text-sm hover:bg-brand-muted"
                                :class="currentCompanyId === comp.id ? 'bg-brand-muted font-semibold text-brand' : 'text-slate-700'"
                            >
                                <i class="pi pi-building flex-shrink-0 text-xs text-slate-300" />
                                <span class="flex-1 truncate">{{ comp.name_ar || comp.name_en }}</span>
                                <span class="max-w-[80px] truncate text-xs font-normal text-slate-400">{{ comp.name_en }}</span>
                                <div class="flex flex-shrink-0 gap-1 opacity-0 transition group-hover:opacity-100">
                                    <button type="button" @click.stop="editDep(comp.id)" class="text-brand hover:text-brand-dark" title="تعديل"><i class="pi pi-pencil text-xs" /></button>
                                    <button type="button" @click.stop="infoComp(comp.id)" class="text-emerald-600 hover:text-emerald-700" title="عرض"><i class="pi pi-eye text-xs" /></button>
                                   
                                </div>
                            </div>
                            <div v-if="pagedDepartments.length === 0" class="py-8 text-center text-sm text-slate-400">
                                <i class="pi pi-search mb-2 block text-2xl" />
                                لا توجد شركات مطابقة لـ "{{ companySearch }}"
                            </div>
                        </div>

                        <!-- Pagination -->
                        <div class="flex flex-shrink-0 items-center justify-between border-t border-slate-100 bg-slate-50 px-3 py-2">
                            <span class="text-xs text-slate-500">
                                {{ (companyPage - 1) * companyPageSize + 1 }}–{{ Math.min(companyPage * companyPageSize, filteredDepartments.length) }} من {{ filteredDepartments.length }}
                            </span>
                            <div class="flex items-center gap-1">
                                <button
                                    type="button"
                                    @click="companyPage = 1"
                                    :disabled="companyPage === 1"
                                    class="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 text-xs text-slate-500 hover:border-brand hover:bg-brand-muted disabled:opacity-30"
                                >«</button>
                                <button
                                    type="button"
                                    @click="companyPage--"
                                    :disabled="companyPage === 1"
                                    class="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 text-xs text-slate-500 hover:border-brand hover:bg-brand-muted disabled:opacity-30"
                                >‹</button>
                                <span
                                    v-for="p in visiblePageNumbers" :key="p"
                                    @click="companyPage = p"
                                    class="flex h-7 w-7 cursor-pointer items-center justify-center rounded-lg border text-xs"
                                    :class="p === companyPage ? 'border-brand bg-brand font-bold text-white' : 'border-slate-200 text-slate-600 hover:border-brand hover:bg-brand-muted'"
                                >{{ p }}</span>
                                <button
                                    type="button"
                                    @click="companyPage++"
                                    :disabled="companyPage === companyTotalPages"
                                    class="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 text-xs text-slate-500 hover:border-brand hover:bg-brand-muted disabled:opacity-30"
                                >›</button>
                                <button
                                    type="button"
                                    @click="companyPage = companyTotalPages"
                                    :disabled="companyPage === companyTotalPages"
                                    class="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 text-xs text-slate-500 hover:border-brand hover:bg-brand-muted disabled:opacity-30"
                                >»</button>
                            </div>
                        </div>
                    </AppCard>

                    <AppCard class="2xl:col-span-2" padding="md">
                        <div v-if="viewDetail">
                            <div class="mb-4 flex items-center justify-between">
                                <div>
                                    <h3 class="text-xl font-bold text-slate-900">{{ info ? (info.name_ar || info.name_en) : 'اختر شركة' }}</h3>
                                    <span class="text-sm text-slate-500">تاريخ الإنشاء: {{ info?.created_at ? formatDate(info.created_at) : '' }}</span>
                                </div>
                            </div>

                            <div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                                <div class="h-10 w-full min-w-[200px] max-w-[24rem]">
                                    <form class="relative flex">
                                        <input
                                            type="search"
                                            id="filter-text-box"
                                            v-on:input="onFilterTextBoxChanged()"
                                            class="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
                                            :placeholder="employeeQuickFilterPlaceholder"
                                            dir="rtl"
                                        />
                                    </form>
                                </div>

                                <div class="flex flex-wrap items-center gap-2" v-if="toolbar">
                                    <button @click="OpenAddEmployee" type="button" class="inline-flex items-center rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-dark">
                                        <i class="pi pi-user-plus ms-2" /> إضافة موظف
                                    </button>
                                </div>

                                <div class="flex flex-wrap items-center gap-2" v-if="toolbar2">
                                    <button @click="approveSelected(5)" type="button" class="inline-flex items-center rounded-lg bg-red-700 px-3 py-2 text-sm text-white hover:bg-red-800">
                                        <i class="pi pi-times ms-2" /> رفض
                                    </button>
                                    <button @click="deleteSelected" type="button" class="inline-flex items-center rounded-lg bg-red-500 px-3 py-2 text-sm text-white hover:bg-red-700">
                                        <i class="pi pi-trash ms-2" /> حذف
                                    </button>
                                    <button @click="approveSelected(1)" type="button" class="inline-flex items-center rounded-lg bg-emerald-600 px-3 py-2 text-sm text-white hover:bg-emerald-700">
                                        <i class="pi pi-check ms-2" /> اعتماد
                                    </button>
                                    <button @click="bulkprintCombined" type="button" class="inline-flex items-center rounded-lg bg-amber-500 px-3 py-2 text-sm text-white hover:bg-amber-600">
                                        <i class="pi pi-print ms-2" /> طباعة جماعية
                                    </button>
                                    <button @click="approveSelected(3)" type="button" class="inline-flex items-center rounded-lg bg-brand px-3 py-2 text-sm text-white hover:bg-brand-dark">
                                        <i class="pi pi-thumbs-up ms-2" /> استلام
                                    </button>
                                </div>
                            </div>

                            <AppDataGrid
                                ref="agGrid"
                                class="mt-4"
                                :column-defs="mergedColumnDefs"
                                :row-data="RawData"
                                :per-page="perPage"
                                :total-rows="totalRows"
                                pagination-mode="server"
                                height="calc(100vh - 250px)"
                                line-height="56px"
                                loading-label="جاري تحميل الموظفين…"
                                empty-message="لا يوجد موظفون في هذه الشركة."
                                @grid-ready="onGridReady"
                                @row-clicked="OnClicked"
                                @selection-changed="onSelectionChanged"
                                @page-change="onPageChange"
                                @update:per-page="perPage = $event"
                            />

                        </div>
                        <div v-else class="flex flex-col items-center justify-center py-20 text-center text-slate-500">
                            <i class="pi pi-building mb-3 text-4xl text-slate-300" />
                            <p class="text-sm">اختر شركة من القائمة لعرض موظفيها</p>
                        </div>
                    </AppCard>
                </div>
            </div>
        </div>
    </PageContainer>

    <!-- ===== CREATE COMPANY DIALOG ===== -->
    <Dialog v-model:visible="addCompany" modal header="Create New Company" :style="{ width: '25rem' }">
        <form novalidate="" @submit.prevent="addComp">
            <div class="flex h-full flex-col divide-y bg-white">
                <div class="flex min-h-0 flex-1 flex-col py-6">
                    <div class="relative flex-1 px-4 sm:px-6">
                        <div class="grid grid-cols-12 gap-x-4">
                            <div class="col-span-12">
                                <div class="mb-3">
                                    <label class="block text-sm font-medium text-neutral-700 mb-1 inline-flex items-center">
                                        <span>Name [En]</span>
                                        <span class="mr-1 text-sm text-red-500">*</span>
                                    </label>
                                    <input type="text" placeholder="Department Name" v-model="formDataDep.name_en" :class="{ 'border-red-500': !fieldValidity.name_en }" @input="fieldValidity.name_en = true" class="flex h-10 w-full items-center justify-center rounded-md border bg-white/0 p-3 text-sm outline-none border-gray-200">
                                </div>
                            </div>
                            <div class="col-span-12">
                                <div class="mb-3">
                                    <label class="block text-sm font-medium text-neutral-700 mb-1 inline-flex items-center"><span>Name [Ar]</span></label>
                                    <input type="text" placeholder="Department Name" v-model="formDataDep.name_ar" class="flex h-10 w-full items-center justify-center rounded-md border bg-white/0 p-3 text-sm outline-none border-gray-200">
                                </div>
                            </div>
                            <div class="col-span-6">
                                <div class="mb-3">
                                    <label class="block text-sm font-medium text-neutral-700 mb-1 inline-flex items-center"><span>Start Time</span></label>
                                    <input type="time" v-model="formDataDep.start_time" class="flex h-10 w-full items-center justify-center rounded-md border bg-white/0 p-3 text-sm outline-none border-gray-200">
                                </div>
                            </div>
                            <div class="col-span-6">
                                <div class="mb-3">
                                    <label class="block text-sm font-medium text-neutral-700 mb-1 inline-flex items-center"><span>End Time</span></label>
                                    <input type="time" v-model="formDataDep.end_time" class="flex h-10 w-full items-center justify-center rounded-md border bg-white/0 p-3 text-sm outline-none border-gray-200">
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="shrink-0 px-4 py-4">
                    <div class="flex flex-wrap justify-end space-x-3 sm:flex-nowrap">
                        <button @click="addCompany = false" type="button" class="inline-flex text-sm bg-white text-black border border-gray-500 hover:bg-gray-100 py-2 px-4 rounded">Cancel</button>
                        <button type="submit" class="inline-flex text-sm bg-blue-500 hover:bg-blue-700 text-white py-2 px-4 rounded" :disabled="isSavingCompany">
                            <i v-if="isSavingCompany" class="pi pi-spinner pi-spin mr-2"></i>
                            {{ isSavingCompany ? 'Saving...' : 'Save' }}
                        </button>
                    </div>
                </div>
            </div>
        </form>
    </Dialog>

    <!-- ===== EDIT COMPANY DIALOG ===== -->
    <Dialog v-model:visible="editCompany" modal header="Edit Company" :style="{ width: '25rem' }">
        <form novalidate="" @submit.prevent="updateComp">
            <div class="flex h-full flex-col divide-y bg-white">
                <div class="flex min-h-0 flex-1 flex-col py-6">
                    <div class="relative flex-1 px-4 sm:px-6">
                        <div class="grid grid-cols-12 gap-x-4">
                            <div class="col-span-12">
                                <div class="mb-3">
                                    <label class="block text-sm font-medium text-neutral-700 mb-1 inline-flex items-center">
                                        <span>Name [En]</span><span class="mr-1 text-sm text-red-500">*</span>
                                    </label>
                                    <input type="text" placeholder="Department Name" v-model="formEditDep.name_en" :class="{ 'border-red-500': !fieldValidity.name_en }" @input="fieldValidity.name_en = true" class="flex h-10 w-full items-center justify-center rounded-md border bg-white/0 p-3 text-sm outline-none border-gray-200">
                                </div>
                            </div>
                            <div class="col-span-12">
                                <div class="mb-3">
                                    <label class="block text-sm font-medium text-neutral-700 mb-1 inline-flex items-center"><span>Name [Ar]</span></label>
                                    <input type="text" placeholder="Department Name" v-model="formEditDep.name_ar" class="flex h-10 w-full items-center justify-center rounded-md border bg-white/0 p-3 text-sm outline-none border-gray-200">
                                </div>
                            </div>
                            <div class="col-span-6">
                                <div class="mb-3">
                                    <label class="block text-sm font-medium text-neutral-700 mb-1 inline-flex items-center"><span>Start Time</span></label>
                                    <input type="time" v-model="formEditDep.start_time" class="flex h-10 w-full items-center justify-center rounded-md border bg-white/0 p-3 text-sm outline-none border-gray-200">
                                </div>
                            </div>
                            <div class="col-span-6">
                                <div class="mb-3">
                                    <label class="block text-sm font-medium text-neutral-700 mb-1 inline-flex items-center"><span>End Time</span></label>
                                    <input type="time" v-model="formEditDep.end_time" class="flex h-10 w-full items-center justify-center rounded-md border bg-white/0 p-3 text-sm outline-none border-gray-200">
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="shrink-0 px-4 py-4">
                    <div class="flex flex-wrap justify-end space-x-3 sm:flex-nowrap">
                        <button @click="editCompany = false" type="button" class="inline-flex text-sm bg-white text-black border border-gray-500 hover:bg-gray-100 py-2 px-4 rounded">Cancel</button>
                        <button type="submit" class="inline-flex text-sm bg-blue-500 hover:bg-blue-700 text-white py-2 px-4 rounded">Save</button>
                    </div>
                </div>
            </div>
        </form>
    </Dialog>

    <!-- ===== ADD EMPLOYEE SIDE PANEL ===== -->
    <VueSidePanel v-model="addEmp" lock-scroll no-close="true" width="500px">
        <div>
            <form novalidate="" id="formguest" @submit.prevent="createguest">
                <div class="flex h-full flex-col bg-white dark:bg-neutral-900">
                    <div class="flex min-h-0 flex-1 flex-col py-6">
                        <div class="px-4 sm:px-6">
                            <div class="flex items-start justify-between">
                                <div class="space-y-1">
                                    <h2 class="text-lg font-medium text-neutral-700">Add Employee</h2>
                                </div>
                            </div>
                        </div>
                        <div class="relative mt-8 flex-1 px-4 sm:px-6">
                            <div class="grid grid-cols-12 gap-x-4">
                                <div class="col-span-12 grid grid-cols-2 gap-4">
                                    <Avatar icon="pi pi-user" class="mr-2" size="xlarge" shape="circle" />
                                    <div class="mb-3">
                                        <label class="block text-sm font-medium inline-flex items-center"><span>Ø§Ù„ØµÙˆØ±Ø©</span></label>
                                        <input type="file" placeholder="Ø§Ù„ØµÙˆØ±Ø©" name="photo" @change="handleFileChange('photo')" class="flex h-12 w-full items-center justify-center rounded-md border bg-white/0 p-3 text-sm outline-none">
                                    </div>
                                </div>
                                <div class="col-span-2">
                                    <div class="mb-3">
                                        <label class="block text-sm font-medium inline-flex items-center"><span>Gender</span></label>
                                        <Dropdown v-model="guest.gender_id" :options="gender" optionLabel="name_en" optionValue="id" placeholder="Gender" class="w-full md:w-14rem border border-dark-200" />
                                    </div>
                                </div>
                                <div class="col-span-5">
                                    <div class="mb-3">
                                        <label class="block text-sm font-medium inline-flex items-center"><span>Full Name</span></label>
                                        <input type="text" v-model="guest.fullname_en" :class="{ 'border-red-500': !fieldValidity.fullname_en }" @input="fieldValidity.fullname_en = true" placeholder="Full Name" name="fullname_en" class="flex h-12 w-full items-center justify-center rounded-md border hover:border-indigo-300 bg-white/0 p-3 text-sm outline-none">
                                    </div>
                                </div>
                                <div class="col-span-5">
                                    <div class="mb-3">
                                        <label class="block text-sm font-medium inline-flex items-center"><span>Ø§Ù„Ø§Ø³Ù… Ø§Ù„ÙƒØ§Ù…Ù„</span></label>
                                        <input type="text" v-model="guest.fullname_ar" :class="{ 'border-red-500': !fieldValidity.fullname_ar }" @input="fieldValidity.fullname_ar = true" placeholder="Ø§Ù„Ø§Ø³Ù… Ø§Ù„ÙƒØ§Ù…Ù„" name="fullname_ar" class="flex h-12 w-full items-center justify-center rounded-md border hover:border-indigo-300 bg-white/0 p-3 text-sm outline-none">
                                    </div>
                                </div>
                                <div class="col-span-6">
                                    <div class="mb-3">
                                        <label class="block text-sm font-medium inline-flex items-center"><span>Phone Number</span></label>
                                        <input type="text" placeholder="Phone Number" name="phone_number" class="flex h-12 w-full items-center justify-center rounded-md border hover:border-indigo-300 bg-white/0 p-3 text-sm outline-none">
                                    </div>
                                </div>
                                <div class="col-span-6">
                                    <div class="mb-3">
                                        <label class="block text-sm font-medium inline-flex items-center"><span>Job_Arabic</span></label>
                                        <input type="text" v-model="guest.Job_Arabic" :class="{ 'border-red-500': !fieldValidity.Job_Arabic }" @input="fieldValidity.Job_Arabic = true" placeholder="Job_Arabic" name="Job_Arabic" class="flex h-12 w-full items-center justify-center rounded-md border hover:border-indigo-300 bg-white/0 p-3 text-sm outline-none">
                                    </div>
                                </div>
                                <div class="col-span-6">
                                    <div class="mb-3">
                                        <label class="block text-sm font-medium inline-flex items-center"><span>Job_En</span></label>
                                        <input type="text" v-model="guest.Job_En" :class="{ 'border-red-500': !fieldValidity.Job_En }" @input="fieldValidity.Job_En = true" placeholder="Job_En" name="Job_En" class="flex h-12 w-full items-center justify-center rounded-md border hover:border-indigo-300 bg-white/0 p-3 text-sm outline-none">
                                    </div>
                                </div>
                                <div class="col-span-6">
                                    <div class="mb-3">
                                        <label class="block text-sm font-medium inline-flex items-center"><span>StartTime</span></label>
                                        <input type="time" v-model="guest.StartTime" :class="{ 'border-red-500': !fieldValidity.StartTime }" @input="fieldValidity.StartTime = true" placeholder="StartTime" name="StartTime" class="flex h-12 w-full items-center justify-center rounded-md border hover:border-indigo-300 bg-white/0 p-3 text-sm outline-none">
                                    </div>
                                </div>
                                <div class="col-span-6">
                                    <div class="mb-3">
                                        <label class="block text-sm font-medium inline-flex items-center"><span>EndTime</span></label>
                                        <input type="time" v-model="guest.EndTime" :class="{ 'border-red-500': !fieldValidity.EndTime }" @input="fieldValidity.EndTime = true" placeholder="EndTime" name="EndTime" class="flex h-12 w-full items-center justify-center rounded-md border hover:border-indigo-300 bg-white/0 p-3 text-sm outline-none">
                                    </div>
                                </div>
                                <div class="col-span-5">
                                    <div class="mb-3">
                                        <label class="block text-sm font-medium inline-flex items-center"><span>Ù…Ù„Ø§Ø­Ø¸Ø§Øª</span></label>
                                        <input type="text" v-model="guest.remarks" :class="{ 'border-red-500': !fieldValidity.remarks }" @input="fieldValidity.remarks = true" placeholder="Ù…Ù„Ø§Ø­Ø¸Ø§Øª" name="remarks" class="flex h-12 w-full items-center justify-center rounded-md border hover:border-indigo-300 bg-white/0 p-3 text-sm outline-none">
                                    </div>
                                </div>
                                <div class="col-span-6">
                                    <div class="mb-3">
                                        <label class="block text-sm font-medium inline-flex items-center"><span>Escort</span></label>
                                        <input type="text" v-model="guest.Escort" :class="{ 'border-red-500': !fieldValidity.Escort }" @input="fieldValidity.Escort = true" placeholder="Escort" name="Escort" class="flex h-12 w-full items-center justify-center rounded-md border hover:border-indigo-300 bg-white/0 p-3 text-sm outline-none">
                                    </div>
                                </div>
                                <div class="col-span-6">
                                    <div class="mb-3">
                                        <label class="block text-sm font-medium inline-flex items-center"><span>ØµÙ„Ø§Ø­ÙŠØ© Ø§Ù„Ø£Ø¬Ù‡Ø²Ø©</span></label>
                                        <select v-model="guest.device" :class="{ 'border-red-500': !fieldValidity.device }" @change="fieldValidity.device = true" name="device" class="flex h-12 w-full items-center justify-center rounded-md border hover:border-indigo-300 bg-white/0 p-3 text-sm outline-none">
                                            <option value="">-- SÃ©lectionnez --</option>
                                            <option value="phone">Phone</option>
                                            <option value="laptop">Laptop</option>
                                            <option value="none">None</option>
                                            <option value="phone + laptop">Phone + Laptop</option>
                                            <option value="phone + camera">phone + camera</option>
                                        </select>
                                    </div>
                                </div>
                                <div class="col-span-6">
                                    <div class="mb-3">
                                        <label class="block text-sm font-medium inline-flex items-center"><span>QID Number</span></label>
                                        <input type="text" v-model="guest.qid" :class="{ 'border-red-500': !fieldValidity.qid }" @input="fieldValidity.qid = true" placeholder="QID Number" name="qid" class="flex h-12 w-full items-center justify-center rounded-md border hover:border-indigo-300 bg-white/0 p-3 text-sm outline-none">
                                    </div>
                                </div>
                                <div class="col-span-6">
                                    <div class="mb-3">
                                        <label class="block text-sm font-medium inline-flex items-center"><span>Nationality</span></label>
                                        <Dropdown v-model="guest.nationality_id" :options="filteredNationalities" optionLabel="name_ar" optionValue="id" placeholder="Nationality" class="w-full md:w-14rem border border-dark-200" filter filterPlaceholder="Search nationality..." />
                                    </div>
                                </div>
                                <div class="col-span-6">
                                    <div class="mb-3">
                                        <label class="block text-sm font-medium inline-flex items-center"><span>Expiry Date</span></label>
                                        <input type="date" v-model="guest.expiry_date" :class="{ 'border-red-500': !fieldValidity.expiry_date }" @input="fieldValidity.expiry_date = true" placeholder="Expiry Date" name="expiry_date" class="flex h-12 w-full items-center justify-center rounded-md border hover:border-indigo-300 bg-white/0 p-3 text-sm outline-none">
                                    </div>
                                </div>
                                <div class="col-span-6">
                                    <input type="hidden" name="created_by" :value="userName">
                                    <input type="hidden" name="dep_parent_id" :value="guest.dep_id">
                                    <input type="hidden" name="dep_id" :value="guest.dep_id">
                                    <input type="hidden" name="rank_id" :value="guest.rank_id">
                                    <input type="hidden" name="is_employee" value="1">
                                </div>
                            </div>
                        </div>
                        <hr/>
                        <div class="flex justify-between px-8 py-4">
                            <h2 class="py-4 text-lg font-medium">Restriction</h2>
                            <Dropdown v-model="guest.default_base" :options="bases" optionLabel="name_en" optionValue="id" placeholder="Default Base" class="w-full md:w-14rem border border-dark-200" />
                        </div>
                        <div class="relative mb-5 flex-1 px-4 sm:px-6">
                            <div class="grid grid-cols-2 gap-4">
                                <Card v-for="base in bases" :key="base.id" class="bg-white text-gray-700 border shadow-md rounded-md">
                                    <template #title>
                                        <div><label class="ml-2">{{base.name_ar}}</label></div>
                                    </template>
                                    <template #content>
                                        <table class="min-w-full divide-y divide-gray-200">
                                            <tbody class="bg-white">
                                                <tr v-for="zone in base.zones" :key="zone.id">
                                                    <td class="p-2 whitespace-nowrap text-sm font-normal text-gray-900">
                                                        <Checkbox v-model="guest.selectedZones" name="zoning[]" :inputId="zone.id" :value="zone.id" class="border-2 w-6 h-6 text-gray-600 rounded-lg transition-colors duration-200" />
                                                    </td>
                                                    <td class="p-2 whitespace-nowrap text-sm font-normal text-gray-900"><span class="font-semibold">{{zone.name_en}}</span></td>
                                                    <td class="p-2 whitespace-nowrap text-sm font-normal text-gray-900">
                                                        <div class="relative h-5 w-5">
                                                            <span class="absolute right-0 bottom-0 h-5 w-5 rounded-full ring ring-white" :style="'background-color:'+zone.color"></span>
                                                        </div>
                                                    </td>
                                                </tr>
                                            </tbody>
                                        </table>
                                    </template>
                                </Card>
                            </div>
                        </div>
                        <div class="shrink-0 px-4 py-4">
                            <div class="flex flex-wrap justify-end space-x-3 sm:flex-nowrap">
                                <button @click="addEmp=false" type="button" class="inline-flex text-sm bg-white text-black border border-gray-500 hover:bg-gray-100 py-2 px-4 rounded">Cancel</button>
                                <button type="submit" class="inline-flex text-sm bg-blue-500 hover:bg-blue-700 text-white py-2 px-4 rounded-l-md" :disabled="isSavingEmployee">
                                    <i v-if="isSavingEmployee" class="pi pi-spinner pi-spin mr-2"></i>
                                    {{ isSavingEmployee ? 'Saving...' : 'Save Employee' }}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </form>
        </div>
    </VueSidePanel>

    <!-- ===== EDIT EMPLOYEE SIDE PANEL ===== -->
    <VueSidePanel v-model="blokGuest" lock-scroll no-close="true" width="600px">
        <div>
            <div class="flex items-center bg-neutral-200 justify-left">
                <div role="tablist" aria-orientation="horizontal" class="overflow-y-hidden -mb-px flex grow snap-x snap-mandatory overflow-x-auto px-4 scrollbar-thin scrollbar-track-neutral-200 scrollbar-thumb-neutral-300 sm:space-x-4 sm:grow-0">
                    <button @click="activeTab = 10" :class="activeTab === 10 ? 'text-green-500 border-green-500' : ''" class="border-primary-500 text-primary-600 group inline-flex min-w-full shrink-0 snap-start snap-always items-center justify-center whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium focus:outline-none sm:min-w-0" type="button">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" aria-hidden="true" class="text-primary-500 -ml-0.5 mr-1.5 h-5 w-5">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25H12"></path>
                        </svg>
                        <span>Personal Info</span>
                    </button>
                    <button @click="activeTab = 12" :class="activeTab === 12 ? 'text-green-500 border-green-500' : ''" class="border-transparent group inline-flex min-w-full shrink-0 snap-start snap-always items-center justify-center whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium focus:outline-none sm:min-w-0" type="button">
                        <i class="pi pi-car pr-2"></i><span>Ø§Ù„Ø³ÙŠØ§Ø±Ø§Øª</span>
                    </button>
                    <!-- Activity Log Tab Removed -->
                </div>
            </div>

            <div id="tabPanel-timeline">
                <!-- Personal Info Tab -->
                <div v-show="activeTab === 10" role="tabpanel">
                    <form novalidate="" id="formeditguest" @submit.prevent="updateguest">
                        <div class="flex h-full flex-col bg-white">
                            <div class="flex min-h-0 flex-1 flex-col py-6">
                                <div class="relative mt-8 flex-1 px-4 sm:px-6">
                                    <div class="grid grid-cols-12 gap-x-4">
                                        <div class="col-span-12 grid grid-cols-2 gap-4">
                                            <img v-if="guest.photo == null" src="/uploads/nopic.png" class="object-cover w-20 h-20 rounded-full mb-2" />
                                            <img v-else :src="'/'+guest.photo" class="object-cover w-20 h-20 rounded-full mb-2" />
                                            <div class="mb-3">
                                                <label class="block text-sm font-medium inline-flex items-center"><span>Photo</span></label>
                                        <input 
    :key="fileInputKey"
    type="file" 
    name="photo" 
    @change="handleEditFileChange" 
    class="flex h-12 w-full items-center justify-center rounded-md border bg-white/0 p-3 text-sm outline-none">        
                                            </div>
                                        </div>
                                        <div class="col-span-2">
                                            <div class="mb-3">
                                                <label class="block text-sm font-medium inline-flex items-center"><span>Gender</span></label>
                                                <Dropdown v-model="guest.gender_id" :options="gender" optionLabel="name_en" optionValue="id" placeholder="Gender" @change="onGenderChange" class="w-full md:w-14rem border border-dark-200" />
                                            </div>
                                        </div>
                                        <div class="col-span-5">
                                            <div class="mb-3">
                                                <label class="block text-sm font-medium inline-flex items-center"><span>Full Name</span></label>
                                                <input type="text" placeholder="Full Name" name="fullname_en" v-model="guest.fullname_en" class="flex h-12 w-full items-center justify-center rounded-md border border-slate-300 hover:border-indigo-300 bg-white/0 p-3 text-sm outline-none">
                                            </div>
                                        </div>
                                        <div class="col-span-5">
                                            <div class="mb-3">
                                                <label class="block text-sm font-medium inline-flex items-center"><span>Ø§Ù„Ø§Ø³Ù… Ø§Ù„ÙƒØ§Ù…Ù„</span></label>
                                                <input type="text" placeholder="" name="fullname_ar" v-model="guest.fullname_ar" class="flex h-12 w-full items-center justify-center rounded-md border border-slate-300 hover:border-indigo-300 bg-white/0 p-3 text-sm outline-none">
                                            </div>
                                        </div>
                                        <div class="col-span-6">
                                            <div class="mb-3">
                                                <label class="block text-sm font-medium inline-flex items-center"><span>Job_Arabic</span></label>
                                                <input type="text" placeholder="Job_Arabic" name="Job_Arabic" v-model="guest.Job_Arabic" class="flex h-12 w-full items-center justify-center rounded-md border border-slate-300 hover:border-indigo-300 bg-white/0 p-3 text-sm outline-none">
                                            </div>
                                        </div>
                                        <div class="col-span-6">
                                            <div class="mb-3">
                                                <label class="block text-sm font-medium inline-flex items-center"><span>Job_En</span></label>
                                                <input type="text" placeholder="Job_En" name="Job_En" v-model="guest.Job_En" class="flex h-12 w-full items-center justify-center rounded-md border border-slate-300 hover:border-indigo-300 bg-white/0 p-3 text-sm outline-none">
                                            </div>
                                        </div>
                                        <div class="col-span-6">
                                            <div class="mb-3">
                                                <label class="block text-sm font-medium inline-flex items-center"><span>StartTime</span></label>
                                                <input type="time" placeholder="StartTime" name="StartTime" v-model="guest.StartTime" class="flex h-12 w-full items-center justify-center rounded-md border border-slate-300 hover:border-indigo-300 bg-white/0 p-3 text-sm outline-none">
                                            </div>
                                        </div>
                                        <div class="col-span-6">
                                            <div class="mb-3">
                                                <label class="block text-sm font-medium inline-flex items-center"><span>EndTime</span></label>
                                                <input type="time" placeholder="EndTime" name="EndTime" v-model="guest.EndTime" class="flex h-12 w-full items-center justify-center rounded-md border border-slate-300 hover:border-indigo-300 bg-white/0 p-3 text-sm outline-none">
                                            </div>
                                        </div>

                                        <div class="col-span-12">
                                            <div class="mb-3">
                                                <label class="block text-sm font-medium inline-flex items-center"><span>Ù…Ù„Ø§Ø­Ø¸Ø§Øª</span></label>
                                                <input type="text" placeholder="Ù…Ù„Ø§Ø­Ø¸Ø§Øª" name="remarks" v-model="guest.remarks" class="flex h-12 w-full items-center justify-center rounded-md border border-slate-300 hover:border-indigo-300 bg-white/0 p-3 text-sm outline-none">
                                            </div>
                                        </div>

                                        <div class="col-span-6">
                                            <div class="mb-3">
                                                <label class="block text-sm font-medium inline-flex items-center"><span>Escort</span></label>
                                                <input type="text" placeholder="Escort" name="Escort" v-model="guest.Escort" class="flex h-12 w-full items-center justify-center rounded-md border border-slate-300 hover:border-indigo-300 bg-white/0 p-3 text-sm outline-none">
                                            </div>
                                        </div>
                                        <div class="col-span-6">
                                            <div class="mb-3">
                                                <label class="block text-sm font-medium inline-flex items-center"><span>QID Number</span></label>
                                                <input type="text" placeholder="QID Number" name="qid" v-model="guest.qid" class="flex h-12 w-full items-center justify-center rounded-md border border-slate-300 hover:border-indigo-300 bg-white/0 p-3 text-sm outline-none">
                                            </div>
                                        </div>
                                        <div class="col-span-6">
                                            <div class="mb-3">
                                                <label class="block text-sm font-medium inline-flex items-center"><span>Nationality</span></label>
                                                <Dropdown v-model="guest.nationality_id" :options="filteredNationalities" optionLabel="name_ar" optionValue="id" placeholder="Nationality" class="w-full md:w-14rem border border-dark-200" filter filterPlaceholder="Search nationality..." />
                                            </div>
                                        </div>
                                        <div class="col-span-6">
                                            <div class="mb-3">
                                                <label class="block text-sm font-medium inline-flex items-center"><span>ØµÙ„Ø§Ø­ÙŠØ© Ø§Ù„Ø£Ø¬Ù‡Ø²Ø©</span></label>
                                                <select v-model="guest.device" :class="{ 'border-red-500': !fieldValidity.device }" @change="fieldValidity.device = true" name="device" class="flex h-12 w-full items-center justify-center rounded-md border hover:border-indigo-300 bg-white/0 p-3 text-sm outline-none">
                                                    <option value="">-- SÃ©lectionnez --</option>
                                                    <option value="phone">Phone</option>
                                                    <option value="laptop">Laptop</option>
                                                    <option value="none">None</option>
                                                    <option value="phone + laptop">Phone + Laptop</option>
                                                    <option value="phone + camera">Phone + camera</option>
                                                </select>
                                            </div>
                                        </div>
                                        <div class="col-span-6">
                                            <div class="mb-3">
                                                <label class="block text-sm font-medium inline-flex items-center"><span>Expiry Date</span></label>
                                                <input type="date" placeholder="Expiry Date" name="expiry_date" v-model="guest.expiry_date" class="flex h-12 w-full items-center justify-center rounded-md border border-slate-300 hover:border-indigo-300 bg-white/0 p-3 text-sm outline-none">
                                            </div>
                                        </div>
                                        <div class="col-span-6">
                                            <input type="hidden" name="created_by" :value="userName">
                                            <input type="hidden" name="id" :value="guest.id">
                                        </div>
                                    </div>
                                </div>

                                <hr/>
                                <div class="flex justify-between px-8 py-4">
                                    <h2 class="py-4 text-lg font-medium">Restriction</h2>
                                    <Dropdown v-model="guest.default_base" :options="bases" optionLabel="name_en" optionValue="id" placeholder="Default Base" class="w-full md:w-14rem border border-dark-200" />
                                </div>
                                <div class="relative mb-5 flex-1 px-4 sm:px-6">
                                    <div class="grid grid-cols-2 gap-4">
                                        <Card v-for="base in bases" :key="base.id" class="bg-white text-gray-700 border shadow-md rounded-md">
                                            <template #title>
                                                <div><label class="ml-2">{{base.name_ar}}</label></div>
                                            </template>
                                            <template #content>
                                                <table class="min-w-full divide-y divide-gray-200">
                                                    <tbody class="bg-white">
                                                        <tr v-for="zone in base.zones" :key="zone.id">
                                                            <td class="p-2 whitespace-nowrap text-sm font-normal text-gray-900">
                                                                <Checkbox v-model="guest.selectedZones" name="zoning[]" :inputId="zone.id" :value="zone.id" class="border-2 w-6 h-6 text-gray-600 rounded-lg transition-colors duration-200" />
                                                            </td>
                                                            <td class="p-2 whitespace-nowrap text-sm font-normal text-gray-900"><span class="font-semibold">{{zone.name_en}}</span></td>
                                                            <td class="p-2 whitespace-nowrap text-sm font-normal text-gray-900">
                                                                <div class="relative h-5 w-5">
                                                                    <span class="absolute right-0 bottom-0 h-5 w-5 rounded-full ring ring-white" :style="'background-color:'+zone.color"></span>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    </tbody>
                                                </table>
                                            </template>
                                        </Card>
                                    </div>
                                </div>

                                <div class="shrink-0 px-4 py-4">
                                    <div class="flex flex-wrap justify-end space-x-3 sm:flex-nowrap">
                                        <button @click="blokGuest=false" type="button" class="inline-flex text-sm bg-white text-black border border-gray-500 hover:bg-gray-100 py-2 px-4 rounded">Cancel</button>
                                        <button type="submit" class="inline-flex text-sm bg-blue-500 hover:bg-blue-700 text-white py-2 px-4 rounded-l-md" :disabled="isUpdatingEmployee">
                                            <i v-if="isUpdatingEmployee" class="pi pi-spinner pi-spin mr-2"></i>
                                            {{ isUpdatingEmployee ? 'Saving...' : 'Save Employee' }}
                                        </button>
                                    </div>
                                </div>

                                <div class="bg-gray-100 p-4 flex justify-between items-center">
                                    <h3 class="text-lg font-semibold text-gray-800">
                                        Employee Details
                                        <span v-if="guest.fullname_en" class="text-sm text-gray-600"> - {{ guest.fullname_en }}</span>
                                    </h3>
                                    <div class="flex space-x-2">
                                        <button @click="printFromSidePanel" class="inline-flex items-center px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-white rounded-lg transition">
                                            <i class="pi pi-print mr-2"></i>Print Badge
                                        </button>
                                        <button @click="blokGuest = false" class="inline-flex items-center px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg transition">
                                            <i class="pi pi-times mr-2"></i>Close
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </form>
                </div>

                <!-- Cars Tab -->
                <div v-show="activeTab === 12" role="tabpanel">
                    <div class="align-middle inline-block min-w-full">
                        <div class="p-5">
                            <form class="relative flex" novalidate="" @submit.prevent="editCarMode ? updateCar() : addCar()">
                                <input type="text" v-model="car.plate_number"
                                    class="peer h-full w-full rounded-[7px] border border-gray-200 bg-white px-3 py-2.5 pr-32 font-sans text-sm font-normal text-blue-gray-700 outline outline-0 transition-all placeholder-shown:border focus:border-1 focus:border-t-transparent focus:outline-0"
                                    :placeholder="editCarMode ? 'Edit plate number...' : 'Add new plate number...'"
                                    required />
                                <div class="flex space-x-1 absolute right-1 top-1 z-10">
                                    <button v-if="editCarMode" @click="cancelEditCar" type="button" class="select-none rounded bg-gray-500 py-2 px-3 text-center align-middle font-sans text-xs font-bold uppercase text-white shadow-md transition-all hover:shadow-lg">Cancel</button>
                                    <button type="submit" class="select-none rounded bg-blue-500 py-2 px-4 text-center align-middle font-sans text-xs font-bold uppercase text-white shadow-md transition-all hover:shadow-lg peer-placeholder-shown:pointer-events-none peer-placeholder-shown:bg-blue-gray-500 peer-placeholder-shown:opacity-50 peer-placeholder-shown:shadow-none">
                                        {{ editCarMode ? 'Update' : 'Add' }} Car
                                    </button>
                                </div>
                            </form>
                        </div>
                        <table class="min-w-full divide-y divide-gray-200">
                            <thead class="bg-gray-50">
                                <tr>
                                    <th class="p-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                                    <th class="p-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Plate Number</th>
                                    <th class="p-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                    <th class="p-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr v-for="carItem in guest.cars" :key="carItem.id" class="bg-white hover:bg-gray-50">
                                    <td class="p-4 whitespace-nowrap text-sm font-normal text-gray-500"><i class="pi pi-car"></i></td>
                                    <td class="p-4 whitespace-nowrap text-sm font-normal text-gray-900"><span class="font-semibold">{{ carItem.plate_number }}</span></td>
                                    <td class="p-4 whitespace-nowrap text-sm font-normal text-gray-900">
                                        <span class="inline-flex items-center">
                                            <Tag v-if="carItem.active==0" icon="pi pi-exclamation-triangle" severity="warning" value="Disable"></Tag>
                                            <Tag v-if="carItem.active==1" icon="pi pi-check" severity="success" value="Enable"></Tag>
                                            <button v-if="carItem.active==1" @click="toggleCarStatus(carItem.id, 0)" class="ml-2 text-xs text-gray-500 hover:text-red-600" title="Disable"><i class="pi pi-times"></i></button>
                                            <button v-if="carItem.active==0" @click="toggleCarStatus(carItem.id, 1)" class="ml-2 text-xs text-gray-500 hover:text-green-600" title="Enable"><i class="pi pi-check"></i></button>
                                        </span>
                                    </td>
                                    <td class="p-4 whitespace-nowrap text-sm font-normal text-gray-900">
                                        <div class="flex space-x-2">
                                            <button @click="editExistingCar(carItem)" class="text-blue-500 hover:text-blue-700" title="Edit"><i class="pi pi-pencil"></i></button>
                                            <button @click="deleteCar(carItem.id)" class="text-red-500 hover:text-red-700" title="Delete"><i class="pi pi-trash"></i></button>
                                        </div>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                        <div v-if="!guest.cars || guest.cars.length === 0" class="text-center py-8 text-gray-500">
                            <i class="pi pi-car text-3xl mb-2"></i>
                            <p>No cars registered for this employee.</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </VueSidePanel>
    <Toast />

    <AppLoader :loading="isLoading" variant="overlay" label="جاري التحميل..." />
</template>

<script>
import api from '../../api/client';
import { fetchBases, fetchBase } from '../../api/organization';
import { fetchNationalities } from '../../api/lookups';
import Toast from 'primevue/toast';
import Checkbox from 'primevue/checkbox';
import OrganizationChart from 'primevue/organizationchart';
import Tree from 'primevue/tree';
import Dialog from 'primevue/dialog';
import Button from 'primevue/button';
import PageContainer from '../../components/ui/PageContainer.vue';
import AppCard from '../../components/ui/AppCard.vue';
import AppDataGrid from '../../components/ui/AppDataGrid.vue';
import Dropdown from 'primevue/dropdown';
import { ref } from 'vue';
import html2pdf from 'html2pdf.js';
import Card from 'primevue/card';
import QRCode from 'qrcode-generator';
import Chart from 'primevue/chart';
import Avatar from 'primevue/avatar';
import Tag from 'primevue/tag';

const gridApi = ref();

function customCellRenderer(params) {
    var cellValue = params.value;
    var formattedValue = '';
    if (cellValue === 0) { formattedValue = '<span class="bg-orange-200 text-orange-600 py-1 px-3 rounded text-xs">Pending</span>'; }
    if (cellValue === 1) { formattedValue = '<span class="bg-green-200 text-green-600 py-1 px-3 rounded text-xs">Approved</span>'; }
    if (cellValue === 2) { formattedValue = '<span class="bg-blue-200 text-blue-600 py-1 px-3 rounded text-xs">Printed</span>'; }
    if (cellValue === 3) { formattedValue = '<span class="bg-green-500 text-green-200 py-1 px-3 rounded text-xs">Collected</span>'; }
    return formattedValue;
}

function customCellImgRenderer(params) {
    var cellValue = params.value;
    var formattedValue = '';
    if (cellValue != null) { formattedValue = '<img src="' + cellValue + '" class="object-cover w-8 h-8 rounded-full mt-2" />'; }
    else { formattedValue = '<img src="/uploads/nopic.png" class="object-cover w-8 h-8 rounded-full mt-2" />'; }
    return formattedValue;
}

export default {
    components: {
        Toast, Checkbox, OrganizationChart, Tree, Button, Dialog,
        AppDataGrid, Dropdown, Chart, Card, Avatar, Tag, PageContainer, AppCard
    },
    data() {
        return {
            fileInputKey: 0,
            agGridKey: '',
            departments: [],
            depId: localStorage.getItem('dep_id'),
            userName: localStorage.getItem('user_name'),
            formDataDep: {
                name_en: '',
                name_ar: '',
                start_time: '',
                end_time: '',
                parent_id: localStorage.getItem('dep_id'),
            },
            formEditDep: {
                name_en: '',
                name_ar: '',
                start_time: '',
                end_time: '',
                id: 0,
            },
            car: {
                plate_number: '',
                active: 1,
                emp_id: null,
                id: null
            },
            editCarMode: false,
            guest: {
                fullname_en: '',
                fullname_ar: '',
                qrcode: '',
                phone_number: '',
                expiry_date: '',
                Job_Arabic: '',
                Job_En: '',
                StartTime: '',
                EndTime: '',
                Escort: '',
                device: '',
                qid: '',
                gender_id: null,
                nationality_id: null,
                default_base: 0,
                dep_id: null,
                rank_id: 109,
                selectedZones: [],
                idguest: '',
                photo: null,
                remarks: '',
                logs: [],
                cars: [],
                military_number: ''
            },
            guestBackup: null, // For preserving form data during dropdown changes
            fieldValidity: {
                fullname_ar: true,
                fullname_en: true,
                qid: true,
                Job_Arabic: true,
                Job_En: true,
                StartTime: true,
                EndTime: true,
                Escort: true,
                device: true,
                expiry_date: true,
                name_en: true,
                military_number: true,
                remarks: true
            },
            currentPage: 1,
            perPage: 125,
            totalRows: 0,
            q: '',
            isfiltered: false,
            addEmp: false,
            gender: [{ id: 1, name_en: 'Male' }, { id: 2, name_en: 'Female' }],
            bases: [],
            nationalities: [],
            addCompany: false,
            editCompany: false,
            info: {},
            ColumnsDef: [],
            RawData: [],
            viewDetail: false,
            isLoading: false,
            toolbar: true,
            toolbar2: false,
            blokGuest: false,
            dataimport: false,
            editguest: false,
            activeTab: 10,
            chartPresence: {
                labels: [],
                datasets: [
                    { label: 'دخول', backgroundColor: '', borderColor: '', data: [] },
                    { label: 'خروج', backgroundColor: '', borderColor: '', data: [] },
                ],
            },
            PresenceOptions: null,
            currentCompanyId: null,
            isSavingCompany: false,
            isSavingEmployee: false,
            isUpdatingEmployee: false,

            // General search
            generalSearchQuery: '',
            generalSearchResults: [],
            showGeneralSearchResults: false,
            isGeneralSearchLoading: false,
            searchTotalRows: 0,
            searchPerPage: 50,
            searchCurrentPage: 1,
            searchGridApi: null,
            debounceTimer: null,

            // Company list â€” Option 7 Variant C
            companySearch: '',
            companyPage: 1,
            companyPageSize: 10,
            pinnedCompanies: JSON.parse(localStorage.getItem('pinnedCompanies') || '[]'),
            
        };
    },
    mounted() {
        this.fetchData();
        this.PresenceOptions = this.setPresenceOptions();
        window.vueApp = this;
    },
    computed: {
        mergedColumnDefs() {
            const modifiedColumnDefs = this.ColumnsDef.map((column) => {
                const col = { ...column };
                if (col.field === 'photo' || col.headerName === 'Photo') {
                    col.headerName = 'الصورة';
                }
                if (col.field === 'expiry_date') {
                    col.valueFormatter = (params) => this.formatDate(params.value, { dateOnly: true });
                }
                return col;
            });
            const columnIndex = modifiedColumnDefs.findIndex((column) => column.headerName === 'Status');
            if (columnIndex !== -1) { modifiedColumnDefs[columnIndex].cellRenderer = customCellRenderer; }
            const colIndex = modifiedColumnDefs.findIndex((column) => column.field === 'photo');
            if (colIndex !== -1) { modifiedColumnDefs[colIndex].cellRenderer = customCellImgRenderer; }
            return modifiedColumnDefs;
        },

        employeeQuickFilterPlaceholder() {
            const skipFields = new Set(['photo', 'actions', '__actions']);
            const labels = this.mergedColumnDefs
                .filter((col) => col.field && !skipFields.has(col.field) && col.headerName)
                .map((col) => col.headerName);
            if (!labels.length) {
                return 'بحث…';
            }
            return `بحث بـ ${labels.join('، ')}…`;
        },

        searchColumnDefs() {
            return [
                { headerName: 'رقم التصريح', field: 'id', sortable: true, width: 120 },
                { headerName: 'الصورة', field: 'photo', sortable: true, width: 90, cellRenderer: customCellImgRenderer },
                { headerName: 'الاسم (EN)', field: 'fullname_en', sortable: true, width: 200 },
                { headerName: 'الاسم', field: 'fullname_ar', sortable: true, width: 200 },
                { headerName: 'البطاقة الشخصية', field: 'qid', sortable: true, width: 150 },
                { headerName: 'الشركة', field: 'company_name', sortable: true, width: 200 },
                {
                    headerName: 'إجراءات', field: 'actions', width: 200,
                    cellRenderer: (params) => `
                        <div class="flex gap-1">
                            <button onclick="vueApp.viewEmployeeFromSearch(${params.data.id})" class="rounded bg-brand px-3 py-1 text-xs text-white hover:bg-brand-dark"><i class="pi pi-eye"></i> عرض</button>
                            <button onclick="vueApp.printSingleBadge(${params.data.id})" class="rounded bg-amber-500 px-3 py-1 text-xs text-white hover:bg-amber-600"><i class="pi pi-print"></i> طباعة</button>
                        </div>`
                }
            ];
        },

        // Company list computed
        filteredDepartments() {
            const list = Array.isArray(this.departments) ? this.departments : [];
            const query = String(this.companySearch ?? '').trim();
            if (!query) return list;
            const q = query.toLowerCase();
            return list.filter(c =>
                (c.name_en && c.name_en.toLowerCase().includes(q)) ||
                (c.name_ar && c.name_ar.includes(query))
            );
        },
        companyTotalPages() {
            return Math.max(1, Math.ceil(this.filteredDepartments.length / this.companyPageSize));
        },
        pagedDepartments() {
            const start = (this.companyPage - 1) * this.companyPageSize;
            return this.filteredDepartments.slice(start, start + this.companyPageSize);
        },
        visiblePageNumbers() {
            const total = this.companyTotalPages;
            const current = this.companyPage;
            if (total <= 5) return Array.from({ length: total }, (_, i) => i + 1);
            if (current <= 3) return [1, 2, 3, 4, 5];
            if (current >= total - 2) return [total - 4, total - 3, total - 2, total - 1, total];
            return [current - 2, current - 1, current, current + 1, current + 2];
        },
        // Add filter for nationalities dropdown
        filteredNationalities() {
            return this.nationalities;
        },
    },
    methods: {
        // ---- Preserve form data during dropdown changes ----
        onGenderChange() {
            // Form data is preserved automatically when using proper v-model binding
            // This method ensures reactivity is maintained
            this.$forceUpdate();
        },

        // ---- Company list helpers ----
        onCompanySearchInput() {
            this.companyPage = 1; // reset to page 1 on search
        },
        pinCompany(comp) {
            if (!this.pinnedCompanies.find(p => p.id === comp.id)) {
                this.pinnedCompanies.push({ id: comp.id, name_en: comp.name_en, name_ar: comp.name_ar });
                localStorage.setItem('pinnedCompanies', JSON.stringify(this.pinnedCompanies));
                this.$toast.add({ severity: 'success', summary: 'Pinned', detail: `${comp.name_en} pinned`, life: 2000 });
            }
        },
        unpinCompany(id) {
            this.pinnedCompanies = this.pinnedCompanies.filter(p => p.id !== id);
            localStorage.setItem('pinnedCompanies', JSON.stringify(this.pinnedCompanies));
        },
        

        // ---- Print ----
        printSingleBadge(employeeId) {
            this.isLoading = true;

            function generateQRCode(text, size = 300) {
                const qr = QRCode(0, 'L');
                qr.addData(text);
                qr.make();
                return `<img src="${qr.createDataURL(15)}" alt="QR Code" width="${size}" height="${size}" />`;
            }
            function generatePhoto(hussain, size = 1, shape = 'rounded-square') {
                const photo = hussain ? `/${hussain}` : '/uploads/nopic.png';
                return `<img src="${photo}" alt="Photo" style="width: ${size}px; height: ${size}px; border-radius: ${shape === 'rounded-square' ? '5%' : '5'};" />`;
            }
            function generatePhotot(hussain, size = 1, shape = 'rounded-square') {
                const photot = hussain ? `/${hussain}` : '/uploads/nopic.png';
                return `<img src="${photot}" alt="Photot" style="width: ${size}px; height: ${size}px; border-radius: ${shape === 'rounded-square' ? '5%' : '5'};" />`;
            }
            function generatePhoto2(hussain, size = 1, shape = 'rounded-square') {
                const base_photo = hussain ? `/${hussain}` : null;
                if (!base_photo) return '/uploads/nopic.png';
                return `<img src="${base_photo}" alt="Photo" style="width: ${size}px; height: ${size}px; border-radius: ${shape === 'rounded-square' ? '5%' : '5'};" />`;
            }
            function generatePlateNumbers(plateNumbers) {
                if (!plateNumbers || plateNumbers.length === 0) return '';
                return plateNumbers.join(' // ');
            }
            function generateZone(zones) {
                var zoning = '<ul style="list-style:none; padding: 0px 0px 0px 0px;">';
                zones.forEach(function (item) {
                    const color = item.color || '';
                    const needsLine = needsWhiteLine(color);
                    zoning += `<li style="display: inline-block; margin-left: 10px; width: 25px; height: 20px;"><svg width="25" height="20" viewBox="0 0 25 20"><rect width="25" height="20" fill="${color}"/>${needsLine ? `<line x1="0" y1="20" x2="25" y2="0" stroke="white" stroke-width="3" stroke-linecap="round"/>` : ''}</svg></li>`;
                });
                zoning += '</ul>';
                return zoning;
            }
            function needsWhiteLine(color) {
                if (!color) return false;
                if (color.startsWith('rgb(')) {
                    const rgb = color.match(/\d+/g);
                    if (rgb && rgb.length >= 3) {
                        const brightness = (parseInt(rgb[0]) * 299 + parseInt(rgb[1]) * 587 + parseInt(rgb[2]) * 114) / 1000;
                        return brightness > 180;
                    }
                    return false;
                }
                let normalizedColor = color.trim().toUpperCase();
                if (!normalizedColor.startsWith('#')) normalizedColor = '#' + normalizedColor;
                const lineColors = ['#020202', '#87CEEB'];
                return lineColors.includes(normalizedColor);
            }

            const pdfConfig = {
                margin: -9,
                filename: `badge_${employeeId}.pdf`,
                image: { type: 'jpeg', quality: 2 },
                html2canvas: { scale: 5 },
                jsPDF: { unit: 'mm', format: [54, 94.0], orientation: 'portrait' },
            };

            api.get('/api/badges/' + employeeId)
                .then(response => {
                    var data = response.data;
                    const replacedHTML = this.replaceTemplateValues(data.badge2.content, {
                        qrcode: generateQRCode(data.qrcode),
                        guest_photo_circle: generatePhoto(data.photo, 'circle'),
                        guest_photo_square: generatePhoto(data.photo, 'square'),
                        guest_photo_circlet: generatePhotot(data.photot, 'circle'),
                        guest_photo_squaret: generatePhotot(data.photot, 'square'),
                        guest_photo_circleb: generatePhoto2(data.base_photo, 'circle'),
                        guest_photo_squareb: generatePhoto2(data.base_photo, 'square'),
                        fullname_en: data.fullname_en, fullname_ar: data.fullname_ar,
                        department: data.department, rank: data.rank,
                        Job_Arabic: data.Job_Arabic, Job_En: data.Job_En,
                        military_number: data.military_number, default_base: data.default_base,
                        zones: generateZone(data.ZoneColor), expiry_date: data.expiry_date,
                        ranke: data.ranke, plate_numbers: generatePlateNumbers(data.plate_numbers),
                        idguest: data.idguest || data.id || ''
                    });
                    const containerDiv = document.createElement('div');
                    containerDiv.style.cssText = 'height:94.0mm;padding:6mm;background-image:url("/uploads/012.png");background-color:white;background-position:center center;background-size:cover;background-repeat:no-repeat;';
                    containerDiv.innerHTML = replacedHTML;
                    let contentu = containerDiv.outerHTML;

                    return api.post('/api/employees/approved', { 'guests': [employeeId], by: this.userName, 'status': 2 })
                        .then(() => api.get('/api/badges2/' + employeeId))
                        .then(response2 => {
                            var data2 = response2.data;
                            const replacedHTML2 = this.replaceTemplateValues(data2.badge2.content, {
                                qrcode: generateQRCode(data2.qrcode),
                                guest_photo_circle: generatePhoto(data2.photo, 'circle'),
                                guest_photo_square: generatePhoto(data2.photo, 'square'),
                                guest_photo_circlet: generatePhotot(data2.photot, 'circle'),
                                guest_photo_squaret: generatePhotot(data2.photot, 'square'),
                                guest_photo_circleb: generatePhoto2(data2.base_photo, 'circle'),
                                guest_photo_squareb: generatePhoto2(data2.base_photo, 'square'),
                                fullname_en: data2.fullname_en, fullname_ar: data2.fullname_ar,
                                department: data2.department, rank: data2.rank,
                                remarks: data2.remarks, Escort: data2.Escort,
                                device: data2.device, StartTime: data2.StartTime, EndTime: data2.EndTime,
                                bloodtype: data2.bloodtype, military_number: data2.military_number,
                                default_base: data2.default_base, zones: generateZone(data2.ZoneColor),
                                expiry_date: data2.expiry_date, plate_numbers: generatePlateNumbers(data2.plate_numbers),
                                dep_id: data2.dep_id, dep_name: data2.dep_name, dep3: data2.dep3,
                                nationality: data2.nationality, nationalitye: data2.nationalitye,
                                idguest: data.idguest || data.id || ''
                            });
                            const containerDiv2 = document.createElement('div');
                            containerDiv2.style.cssText = 'height:93.0mm;padding:1mm;background-image:url("/uploads/20.png");background-position:center center;background-size:cover;background-repeat:no-repeat;';
                            containerDiv2.innerHTML = replacedHTML2;
                            const finalContent = `<div>${contentu}</div><div style="page-break-before: always;">${containerDiv2.outerHTML}</div>`;
                            html2pdf().from(finalContent).set(pdfConfig).outputPdf().get('pdf').then(function (pdfObj) {
                                pdfObj.autoPrint();
                                window.open(pdfObj.output("bloburl"), "F");
                            });
                            this.isLoading = false;
                            this.performGeneralSearch();
                            this.$toast.add({ severity: 'success', summary: 'Success', detail: 'Badge printed successfully', life: 3000 });
                        });
                })
                .catch(error => {
                    console.error('Print error:', error);
                    this.isLoading = false;
                    this.$toast.add({ severity: 'error', summary: 'Error', detail: 'Failed to print badge', life: 3000 });
                });
        },

        viewEmployeeFromSearch(employeeId) {
            api.get('/api/employees/' + employeeId)
                .then(response => {
                    const employee = response.data;
                    this.guest.dep_id = employee.dep_id;
                    this.currentCompanyId = employee.dep_id;
                    return api.get('/api/guests/' + employeeId);
                })
                .then(response => {
                    this.guest = response.data[0];
                    this.guest.dep_id = this.currentCompanyId;
                    this.infoComp(this.guest.dep_id);
                    setTimeout(() => {
                        if (gridApi.value) {
                            gridApi.value.forEachNode((node) => {
                                if (node.data && node.data.id === employeeId) {
                                    node.setSelected(true);
                                    gridApi.value.ensureNodeVisible(node);
                                }
                            });
                        }
                    }, 500);
                    this.closeGeneralSearch();
                    this.blokGuest = true;
                })
                .catch(error => {
                    console.error('Error fetching employee:', error);
                    this.$toast.add({ severity: 'error', summary: 'Error', detail: 'Failed to load employee details', life: 3000 });
                });
        },

        printFromSidePanel() {
            if (this.guest && this.guest.id) {
                api.get('/api/guests/' + this.guest.id)
                    .then(response => {
                        this.guest = response.data[0];
                        this.printSingleBadge(this.guest.id);
                    })
                    .catch(error => {
                        console.error('error refreshing guest data:', error);
                        this.printSingleBadge(this.guest.id);
                    });
            } else {
                this.$toast.add({ severity: 'warn', summary: 'Warning', detail: 'No employee selected to print', life: 3000 });
            }
        },

        setPresenceOptions() {
            const documentStyle = getComputedStyle(document.documentElement);
            const textColor = documentStyle.getPropertyValue('--text-color');
            const textColorSecondary = documentStyle.getPropertyValue('--text-color-secondary');
            const surfaceBorder = documentStyle.getPropertyValue('--surface-border');
            return {
                maintainAspectRatio: true, aspectRatio: 5,
                plugins: { legend: { labels: { color: textColor } } },
                scales: {
                    x: { ticks: { color: textColorSecondary, font: { weight: 500 } }, grid: { display: false, drawBorder: false } },
                    y: { ticks: { color: textColorSecondary }, grid: { color: surfaceBorder, drawBorder: false } }
                }
            };
        },

        getEmployees() {
            api.get('/api/employees', { params: { dep_id: this.depId, page: this.currentPage, per_page: this.perPage } })
                .then(response => {
                    const gridData = response.data.data[this.agGridKey];
                    if (gridData) {
                        this.step = gridData.id;
                        this.ColumnsDef = response.data.columns;
                        this.RawDataStatus = response.data.data;
                        if (gridData.guests && gridData.guests.data) {
                            this.RawData = gridData.guests.data;
                            this.totalRows = gridData.pagination.total;
                        } else { this.RawData = []; }
                    } else { this.RawData = []; }
                })
                .catch(error => console.error('Error fetching employees:', error));
        },

        onPageChange({ page, perPage }) {
            this.currentPage = page;
            if (perPage) {
                this.perPage = perPage;
            }
            if (this.guest.dep_id) this.infoComp(this.guest.dep_id);
        },

        replaceTemplateValues(template, values) {
            for (const key in values) {
                if (Object.hasOwnProperty.call(values, key)) {
                    const regex = new RegExp(`{{${key}}}`, 'g');
                    template = template.replace(regex, values[key]);
                }
            }
            return template;
        },

        OpenAddEmployee() {
            if (!this.guest.dep_id && !this.currentCompanyId) {
                this.$toast.add({ severity: 'warn', summary: 'Warning', detail: 'Please select a company first', life: 3000 });
                return;
            }
            if (this.currentCompanyId && !this.guest.dep_id) this.guest.dep_id = this.currentCompanyId;
            this.addEmp = !this.addEmp;
            if (this.addEmp) {
                this.resetGuestForm();
                this.guest.dep_id = this.currentCompanyId || this.guest.dep_id;
            }
        },

        OpenAddCompany() {
            this.addCompany = true;
        },

        addComp() {
            if (this.formDataDep.name_en.trim() === '') {
                this.fieldValidity.name_en = false;
                return;
            }
            
            // Prevent multiple submissions
            if (this.isSavingCompany) return;
            this.isSavingCompany = true;
            
            api.post('/api/companies', this.formDataDep)
                .then(response => {
                    this.fetchData();
                    this.addCompany = false;
                    this.isSavingCompany = false;
                    this.$toast.add({ severity: 'success', summary: 'Success', detail: 'Company created successfully', life: 3000 });
                })
                .catch(error => {
                    console.error('API error:', error);
                    this.isSavingCompany = false;
                    this.$toast.add({ severity: 'error', summary: 'Error', detail: 'Failed to create company', life: 3000 });
                });
        },

        editNode(node) { console.log('Edit node:', node); },

        infoComp(id) {
            this.viewDetail = true;
            this.guest.dep_id = id;
            this.currentCompanyId = id;
            this.toolbar = true;
            this.toolbar2 = false;
            api.get('/api/companies/' + id + '/info', { params: { dep_id: id, page: this.currentPage, per_page: this.perPage } })
                .then(response => {
                    this.info = response.data.info;
                    this.ColumnsDef = response.data.columns;
                    const guests = response.data.guests;
                    this.RawData = guests?.data?.data ?? [];
                    this.totalRows = guests?.pagination?.total ?? 0;
                })
                .catch(error => {
                    console.error('Error loading company info:', error);
                    this.$toast.add({ severity: 'error', summary: 'خطأ', detail: 'تعذر تحميل بيانات الشركة', life: 3000 });
                });
        },

        editDep(id) {
            api.get('/api/companies/' + id + '/summary').then(response => { this.formEditDep = response.data; });
            this.editCompany = true;
        },

        updateComp() {
            api.post('/api/companies', this.formEditDep)
                .then(response => {
                    this.fetchData();
                    this.editCompany = false;
                })
                .catch(error => console.error('API error:', error));
        },

        onFilterTextBoxChanged() {
            if (gridApi.value) {
                gridApi.value.setQuickFilter(document.getElementById('filter-text-box').value);
            }
        },

        formatDate(value, { dateOnly = false } = {}) {
            if (!value) {
                return '—';
            }
            try {
                const options = dateOnly
                    ? { dateStyle: 'medium' }
                    : { dateStyle: 'medium', timeStyle: 'short' };
                return new Intl.DateTimeFormat('ar-QA', options).format(new Date(value));
            } catch {
                return value;
            }
        },

        fetchData() {
            const parentId = this.depId;
            if (!parentId) {
                this.departments = [];
                return;
            }

            api.get('/api/companies/' + parentId)
                .then(response => {
                    this.departments = response.data.companies ?? [];
                })
                .catch(error => {
                    console.error(error);
                    this.departments = [];
                    this.$toast.add({ severity: 'error', summary: 'خطأ', detail: 'تعذر تحميل قائمة الشركات', life: 3000 });
                });

            fetchBases().then(response => { this.bases = response.data; });
            fetchNationalities().then(response => { this.nationalities = response.data; });

            api.get('/api/companies/' + parentId + '/check-in-out')
                .then(response => {
                    const presence = response.data?.presence;
                    if (!presence) {
                        return;
                    }
                    this.chartPresence = {
                        labels: presence.dayIn ?? [],
                        datasets: [
                            {
                                label: 'دخول',
                                backgroundColor: getComputedStyle(document.documentElement).getPropertyValue('--green-600'),
                                borderColor: getComputedStyle(document.documentElement).getPropertyValue('--green-600'),
                                data: presence.nbIn ?? [],
                            },
                            {
                                label: 'خروج',
                                backgroundColor: getComputedStyle(document.documentElement).getPropertyValue('--red-600'),
                                borderColor: getComputedStyle(document.documentElement).getPropertyValue('--red-600'),
                                data: presence.nbOut ?? [],
                            },
                        ],
                    };
                })
                .catch(error => console.error(error));
        },

        onGridReady(params) { gridApi.value = params.api; },

        deleteDepartment(i) {
            this.$confirm.require({
                message: 'Do you want to delete this record?', header: 'Delete Confirmation', icon: 'pi pi-info-circle', acceptClass: 'p-button-danger',
                accept: () => {
                    api.post('/api/departments/delete', { id: i }).then(response => {
                        this.fetchData();
                        this.$toast.add({ severity: 'info', summary: 'Confirmed', detail: 'Deleted Successfully', life: 3000 });
                    });
                },
                reject: () => { }
            });
        },

        bulkprintCombined() {
            this.isLoading = true;
            function generateQRCode(text, size = 300) { const qr = QRCode(0, 'L'); qr.addData(text); qr.make(); return `<img src="${qr.createDataURL(15)}" alt="QR Code" width="${size}" height="${size}" />`; }
            function generatePhoto(hussain, size = 1, shape = 'rounded-square') { const photo = hussain ? `/${hussain}` : '/uploads/nopic.png'; return `<img src="${photo}" alt="Photo" style="width: ${size}px; height: ${size}px; border-radius: ${shape === 'rounded-square' ? '5%' : '5'};" />`; }
            function generatePhotot(hussain, size = 1, shape = 'rounded-square') { const photot = hussain ? `/${hussain}` : '/uploads/nopic.png'; return `<img src="${photot}" alt="Photot" style="width: ${size}px; height: ${size}px; border-radius: ${shape === 'rounded-square' ? '5%' : '5'};" />`; }
            function generatePhoto2(hussain, size = 1, shape = 'rounded-square') { const base_photo = hussain ? `/${hussain}` : null; if (!base_photo) return '/uploads/nopic.png'; return `<img src="${base_photo}" alt="Photo" style="width: ${size}px; height: ${size}px; border-radius: ${shape === 'rounded-square' ? '5%' : '5'};" />`; }
            function generatePlateNumbers(plateNumbers) { if (!plateNumbers || plateNumbers.length === 0) return ''; return plateNumbers.join(' // '); }
            function generateZone(zones) {
                var zoning = '<ul style="list-style:none; padding: 0px 0px 0px 0px;">';
                zones.forEach(function (item) {
                    const color = item.color || '';
                    const needsLine = needsWhiteLine(color);
                    zoning += `<li style="display: inline-block; margin-left: 10px; width: 25px; height: 20px;"><svg width="25" height="20" viewBox="0 0 25 20"><rect width="25" height="20" fill="${color}"/>${needsLine ? `<line x1="0" y1="20" x2="25" y2="0" stroke="white" stroke-width="3" stroke-linecap="round"/>` : ''}</svg></li>`;
                });
                zoning += '</ul>';
                return zoning;
            }
            function needsWhiteLine(color) {
                if (!color) return false;
                if (color.startsWith('rgb(')) { const rgb = color.match(/\d+/g); if (rgb && rgb.length >= 3) { const brightness = (parseInt(rgb[0]) * 299 + parseInt(rgb[1]) * 587 + parseInt(rgb[2]) * 114) / 1000; return brightness > 180; } return false; }
                let normalizedColor = color.trim().toUpperCase();
                if (!normalizedColor.startsWith('#')) normalizedColor = '#' + normalizedColor;
                return ['#020202', '#87CEEB'].includes(normalizedColor);
            }

            const pdfConfig = { margin: -9, filename: 'badge_combined.pdf', image: { type: 'jpeg', quality: 2 }, html2canvas: { scale: 5 }, jsPDF: { unit: 'mm', format: [54, 94.0], orientation: 'portrait' } };
            let contentu = '';
            const selectedRows = gridApi.value.getSelectedRows();
            const guestIds = selectedRows.map(row => row.id);

            const axiosPromises = guestIds.map((guestId) => {
                return api.get('/api/badges/' + guestId).then(response => {
                    var data = response.data;
                    const replacedHTML = this.replaceTemplateValues(data.badge2.content, {
                        qrcode: generateQRCode(data.qrcode), guest_photo_circle: generatePhoto(data.photo, 'circle'), guest_photo_square: generatePhoto(data.photo, 'square'),
                        guest_photo_circlet: generatePhotot(data.photot, 'circle'), guest_photo_squaret: generatePhotot(data.photot, 'square'),
                        guest_photo_circleb: generatePhoto2(data.base_photo, 'circle'), guest_photo_squareb: generatePhoto2(data.base_photo, 'square'),
                        fullname_en: data.fullname_en, fullname_ar: data.fullname_ar, department: data.department, rank: data.rank,
                        Job_Arabic: data.Job_Arabic, Job_En: data.Job_En, idguest: data.idguest, default_base: data.default_base,
                        zones: generateZone(data.ZoneColor), expiry_date: data.expiry_date, ranke: data.ranke, plate_numbers: generatePlateNumbers(data.plate_numbers)
                    });
                    const containerDiv = document.createElement('div');
                    containerDiv.style.cssText = 'height:94.0mm;padding:6mm;background-image:url("/uploads/012.png");background-color:white;background-position:center center;background-size:cover;background-repeat:no-repeat;';
                    containerDiv.innerHTML = replacedHTML;
                    contentu += containerDiv.outerHTML;
                });
            });

            Promise.all(axiosPromises)
                .then(() => api.post('/api/employees/approved', { 'guests': guestIds, by: this.userName, 'status': 2 }))
                .then(response => {
                    this.getEmployees();
                    let contentu2 = '';
                    const axiosPromises2 = guestIds.map((guestId) => {
                        return api.get('/api/badges2/' + guestId).then(response => {
                            var data = response.data;
                            const replacedHTML = this.replaceTemplateValues(data.badge2.content, {
                                qrcode: generateQRCode(data.qrcode), guest_photo_circle: generatePhoto(data.photo, 'circle'), guest_photo_square: generatePhoto(data.photo, 'square'),
                                guest_photo_circlet: generatePhotot(data.photot, 'circle'), guest_photo_squaret: generatePhotot(data.photot, 'square'),
                                guest_photo_circleb: generatePhoto2(data.base_photo, 'circle'), guest_photo_squareb: generatePhoto2(data.base_photo, 'square'),
                                fullname_en: data.fullname_en, fullname_ar: data.fullname_ar, department: data.department, rank: data.rank,
                                remarks: data.remarks, Escort: data.Escort, device: data.device, StartTime: data.StartTime, EndTime: data.EndTime,
                                bloodtype: data.bloodtype, military_number: data.military_number, default_base: data.default_base,
                                zones: generateZone(data.ZoneColor), expiry_date: data.expiry_date, plate_numbers: generatePlateNumbers(data.plate_numbers),
                                dep_id: data.dep_id, dep_name: data.dep_name, dep3: data.dep3, nationality: data.nationality, nationalitye: data.nationalitye
                            });
                            const containerDiv = document.createElement('div');
                            containerDiv.style.cssText = 'height:93.0mm;padding:1mm;background-image:url("/uploads/20.png");background-position:center center;background-size:cover;background-repeat:no-repeat;';
                            containerDiv.innerHTML = replacedHTML;
                            contentu2 += containerDiv.outerHTML;
                        });
                    });
                    Promise.all(axiosPromises2).then(() => {
                        const finalContent = `<div>${contentu}</div><div style="page-break-before: always;">${contentu2}</div>`;
                        html2pdf().from(finalContent).set(pdfConfig).outputPdf().get('pdf').then(function (pdfObj) { pdfObj.autoPrint(); window.open(pdfObj.output("bloburl"), "F"); });
                        setTimeout(() => { this.isLoading = false; }, 5000);
                    });
                });
        },

        updateguest(event) {
            if (event) event.preventDefault();
            
            // Prevent multiple submissions
            if (this.isUpdatingEmployee) return;
            this.isUpdatingEmployee = true;
            
            const formData = new FormData(document.getElementById('formeditguest'));
            formData.append('gender_id', this.guest.gender_id);
            formData.append('nationality_id', this.guest.nationality_id);
            formData.append('default_base', this.guest.default_base);
            if (this.guest.selectedZones && Array.isArray(this.guest.selectedZones)) {
                formData.delete('zoning[]');
                this.guest.selectedZones.forEach(zoneId => { formData.append('zoning[]', zoneId); });
            }
            
            api.post('/api/employees', formData)
                .then(response => {
                    this.isUpdatingEmployee = false;
                    this.blokGuest = false;
                    this.$toast.add({ severity: 'success', summary: 'Success', detail: 'Employee updated successfully', life: 2000 });
                    this.refreshListSafely();
                    if (response.data.employee) { this.updateEmployeeInList(response.data.employee); }
                })
                .catch(error => {
                    console.error('Update error:', error);
                    this.isUpdatingEmployee = false;
                    this.$toast.add({ severity: 'error', summary: 'Error', detail: 'Failed to update employee', life: 3000 });
                });
        },

        refreshListSafely() {
            if (this.guest.dep_id) { this.infoComp(this.guest.dep_id); }
            else if (this.info?.id) { this.infoComp(this.info.id); }
            else if (this.currentCompanyId) { this.infoComp(this.currentCompanyId); }
            else { this.fetchData(); }
        },

        updateEmployeeInList(updatedEmployee) {
            const index = this.RawData.findIndex(emp => emp.id == updatedEmployee.id);
            if (index !== -1) {
                this.RawData[index] = { ...this.RawData[index], ...updatedEmployee };
                this.RawData = [...this.RawData];
                if (gridApi.value) {
                    const rowNode = gridApi.value.getRowNode(String(updatedEmployee.id));
                    if (rowNode) rowNode.setData(this.RawData[index]);
                    gridApi.value.refreshCells();
                }
            } else {
                setTimeout(() => { this.infoComp(this.guest.dep_id); }, 500);
            }
        },

        editExistingCar(carItem) {
            this.car = { id: carItem.id, plate_number: carItem.plate_number, active: carItem.active, emp_id: carItem.emp_id };
            this.editCarMode = true;
        },
        cancelEditCar() {
            this.car = { plate_number: '', active: 1, emp_id: this.guest.id, id: null };
            this.editCarMode = false;
        },
        updateCar() {
            if (!this.car.plate_number.trim()) { this.$toast.add({ severity: 'error', summary: 'Error', detail: 'Plate number is required', life: 3000 }); return; }
            api.post('/api/employees/cars', this.car)
                .then(response => { this.$toast.add({ severity: 'success', summary: 'Success', detail: 'Car updated successfully', life: 3000 }); this.refreshCarList(); this.cancelEditCar(); })
                .catch(error => { console.error('Update car error:', error); this.$toast.add({ severity: 'error', summary: 'Error', detail: 'Failed to update car', life: 3000 }); });
        },
        addCar() {
            if (!this.car.plate_number.trim()) { this.$toast.add({ severity: 'error', summary: 'Error', detail: 'Plate number is required', life: 3000 }); return; }
            this.car.emp_id = this.guest.id;
            api.post('/api/employees/cars', this.car)
                .then(response => { this.$toast.add({ severity: 'success', summary: 'Success', detail: 'Car added successfully', life: 3000 }); this.refreshCarList(); this.car = { plate_number: '', active: 1, emp_id: this.guest.id, id: null }; })
                .catch(error => { console.error('Add car error:', error); this.$toast.add({ severity: 'error', summary: 'Error', detail: 'Failed to add car', life: 3000 }); });
        },
        toggleCarStatus(carId, status) {
            const car = this.guest.cars.find(c => c.id === carId);
            if (!car) return;
            api.post('/api/employees/cars', { id: carId, active: status, plate_number: car.plate_number, emp_id: car.emp_id })
                .then(response => { this.$toast.add({ severity: 'success', summary: 'Success', detail: status === 1 ? 'Car enabled successfully' : 'Car disabled successfully', life: 3000 }); this.refreshCarList(); })
                .catch(error => { console.error('Toggle car status error:', error); this.$toast.add({ severity: 'error', summary: 'Error', detail: 'Failed to update car status', life: 3000 }); });
        },
        deleteCar(carId) {
            this.$confirm.require({
                message: 'Are you sure you want to delete this car?', header: 'Delete Confirmation', icon: 'pi pi-exclamation-triangle', acceptClass: 'p-button-danger',
                accept: () => {
                    api.post('/api/employees/cars', { id: carId })
                        .then(response => { this.$toast.add({ severity: 'success', summary: 'Success', detail: 'Car deleted successfully', life: 3000 }); this.refreshCarList(); })
                        .catch(error => { console.error('Delete car error:', error); this.$toast.add({ severity: 'error', summary: 'Error', detail: 'Failed to delete car', life: 3000 }); });
                },
                reject: () => { }
            });
        },
        refreshCarList() {
            if (this.guest.id) {
                api.get('/api/guests/' + this.guest.id)
                    .then(response => { this.guest.cars = response.data[0].cars || []; })
                    .catch(error => console.error('Error refreshing car list:', error));
            }
        },

        createguest() {
            if (!this.guest.fullname_ar || this.guest.fullname_ar.trim() === '') { this.fieldValidity.fullname_ar = false; this.$toast.add({ severity: 'error', summary: 'Error', detail: 'Arabic full name is required', life: 3000 }); return; }
            if (!this.guest.fullname_en || this.guest.fullname_en.trim() === '') { this.fieldValidity.fullname_en = false; this.$toast.add({ severity: 'error', summary: 'Error', detail: 'English full name is required', life: 3000 }); return; }
            if (!this.guest.qid || this.guest.qid.trim() === '') { this.fieldValidity.qid = false; this.$toast.add({ severity: 'error', summary: 'Error', detail: 'QID is required', life: 3000 }); return; }
            if (!this.guest.expiry_date || this.guest.expiry_date.trim() === '') { this.fieldValidity.expiry_date = false; this.$toast.add({ severity: 'error', summary: 'Error', detail: 'Expiry date is required', life: 3000 }); return; }
            if (!this.guest.Job_Arabic || this.guest.Job_Arabic.trim() === '') { this.fieldValidity.Job_Arabic = false; this.$toast.add({ severity: 'error', summary: 'Error', detail: 'Arabic job title is required', life: 3000 }); return; }
            if (!this.guest.Job_En || this.guest.Job_En.trim() === '') { this.fieldValidity.Job_En = false; this.$toast.add({ severity: 'error', summary: 'Error', detail: 'English job title is required', life: 3000 }); return; }
            if (!this.guest.StartTime) { this.fieldValidity.StartTime = false; this.$toast.add({ severity: 'error', summary: 'Error', detail: 'Start time is required', life: 3000 }); return; }
            if (!this.guest.EndTime) { this.fieldValidity.EndTime = false; this.$toast.add({ severity: 'error', summary: 'Error', detail: 'End time is required', life: 3000 }); return; }
            if (this.guest.Escort !== null && this.guest.Escort !== undefined && this.guest.Escort.trim() === '') this.guest.Escort = null;
            if (this.guest.device === '') this.guest.device = null;
            if (this.guest.remarks !== null && this.guest.remarks !== undefined && this.guest.remarks.trim() === '') this.guest.remarks = null;
            if (this.guest.military_number !== null && this.guest.military_number !== undefined && this.guest.military_number.trim() === '') this.guest.military_number = null;
            if (this.guest.default_base == 0) { this.$toast.add({ severity: 'error', summary: 'Error', detail: 'Select Default Base', life: 3000 }); return; }
            if (!this.guest.dep_id) { this.$toast.add({ severity: 'error', summary: 'Error', detail: 'Please select a company first', life: 3000 }); return; }

            // Prevent multiple submissions
            if (this.isSavingEmployee) return;
            this.isSavingEmployee = true;
            
            const formData = new FormData(document.getElementById('formguest'));
            formData.append('gender_id', this.guest.gender_id);
            formData.append('nationality_id', this.guest.nationality_id);
            formData.append('default_base', this.guest.default_base);
            formData.append('dep_id', this.guest.dep_id);
            if (this.guest.selectedZones && Array.isArray(this.guest.selectedZones)) {
                formData.delete('zoning[]');
                this.guest.selectedZones.forEach(zoneId => { formData.append('zoning[]', zoneId); });
            }
            this.isLoading = true;
            api.post('/api/employees', formData)
                .then(response => {
                    this.isSavingEmployee = false;
                    this.$toast.add({ severity: 'success', summary: 'Success', detail: 'Employee created successfully', life: 3000 });
                    this.infoComp(this.guest.dep_id);
                    this.addEmp = false;
                    this.resetGuestForm();
                })
                .catch(error => {
                    console.error('Create employee error:', error);
                    this.isSavingEmployee = false;
                    let errorMessage = 'Failed to create employee';
                    if (error.response?.data?.message) errorMessage = error.response.data.message;
                    else if (error.response?.data?.errors) errorMessage = Object.values(error.response.data.errors).join(', ');
                    this.$toast.add({ severity: 'error', summary: 'Error', detail: errorMessage, life: 3000 });
                })
                .finally(() => { this.isLoading = false; });
        },

        onSelectionChanged(event) {
            var selectedRows = event.api.getSelectedRows();
            let checkedState = selectedRows.length > 0;
            this.toolbar = !checkedState;
            this.toolbar2 = checkedState;
        },

        OnClicked(event) {
            this.closeGeneralSearch();
            var id = event.data.id;
            this.editguest = false;
            this.activeTab = 10;
            this.car.emp_id = event.data.id;
            this.currentCompanyId = event.data.dep_id;
            
            // Store the current employee's photo before loading new one
            const currentPhoto = this.guest.photo;
            api.get('/api/guests/' + id).then(response => {
    this.guest = response.data[0];
    this.guest.dep_id = this.currentCompanyId;

    // âŒ remove this (not needed and causing confusion)
    // if (!this.guest.photo && currentPhoto) {
    //     this.guest.photo = null;
    // }

    // âœ… ADD THIS LINE (important)
    this.fileInputKey++;

    // backup
    this.guestBackup = JSON.parse(JSON.stringify(this.guest));
});
            this.blokGuest = true;
        },

        deleteSelected() {
            this.$confirm.require({
                message: 'Do you want to delete this record?', header: 'Delete Confirmation', icon: 'pi pi-info-circle', acceptClass: 'p-button-danger',
                accept: () => {
                    const selectedRows = gridApi.value.getSelectedRows();
                    const guestIds = selectedRows.map(row => row.id);
                    api.post('/api/employees', { 'guests': guestIds }).then(response => { this.infoComp(this.guest.dep_id); });
                    this.$toast.add({ severity: 'info', summary: 'Confirmed', detail: 'Deleted Successfully', life: 3000 });
                },
                reject: () => { }
            });
        },

        approveSelected(status) {
            this.$confirm.require({
                message: 'Are you sure you want to proceed?', header: 'Approved Confirmation', icon: 'pi pi-exclamation-triangle', acceptClass: 'p-button-success',
                accept: () => {
                    const selectedRows = gridApi.value.getSelectedRows();
                    const guestIds = selectedRows.map(row => row.id);
                    api.post('/api/employees/approved', { guests: guestIds, by: this.userName, 'status': status }).then(response => { this.infoComp(this.guest.dep_id); });
                    this.$toast.add({ severity: 'info', summary: 'Confirmed', detail: 'Approved Successfully', life: 3000 });
                },
                reject: () => { }
            });
        },

        resetGuestForm() {
            this.guest = {
                fullname_en: '', fullname_ar: '', qrcode: '', phone_number: null, expiry_date: null,
                Job_Arabic: null, Job_En: null, StartTime: null, EndTime: null, Escort: null,
                device: null, qid: null, gender_id: null, nationality_id: null, default_base: 0,
                dep_id: null, rank_id: 109, selectedZones: null, idguest: '', photo: null,
                remarks: null, logs: [], cars: []
            };
            Object.keys(this.fieldValidity).forEach(key => { this.fieldValidity[key] = true; });
        },

        handleGeneralSearchInput() {
            clearTimeout(this.debounceTimer);
            if (this.generalSearchQuery.trim().length >= 2) {
                this.debounceTimer = setTimeout(() => { this.performGeneralSearch(); }, 500);
            } else if (this.generalSearchQuery.trim() === '') { this.clearGeneralSearch(); }
        },

        performGeneralSearch() {
            if (!this.generalSearchQuery.trim()) return;
            this.isGeneralSearchLoading = true;
            this.showGeneralSearchResults = true;
            api.get('/api/employees/search', { params: { query: this.generalSearchQuery, page: this.searchCurrentPage, per_page: this.searchPerPage } })
                .then(response => {
                    this.generalSearchResults = response.data.data;
                    this.searchTotalRows = response.data.total;
                    this.isGeneralSearchLoading = false;
                    setTimeout(() => {
                        const resultsElement = document.querySelector('.search-results-container');
                        if (resultsElement) resultsElement.scrollIntoView({ behavior: 'smooth' });
                    }, 100);
                })
                .catch(error => {
                    console.error('Search error:', error);
                    this.isGeneralSearchLoading = false;
                    this.$toast.add({ severity: 'error', summary: 'Error', detail: 'Failed to perform search', life: 3000 });
                });
        },

        onSearchGridReady(params) { this.searchGridApi = params.api; },
        onSearchRowClicked(event) { this.viewEmployeeFromSearch(event.data.id); },
        onSearchGridPageChange({ page, perPage }) {
            this.searchCurrentPage = page;
            if (perPage) {
                this.searchPerPage = perPage;
            }
            this.performGeneralSearch();
        },

        onSearchPageChange(event) { this.searchCurrentPage = event.page + 1; this.performGeneralSearch(); },

        clearGeneralSearch() {
            this.generalSearchQuery = '';
            this.generalSearchResults = [];
            this.showGeneralSearchResults = false;
            this.searchCurrentPage = 1;
        },
        closeGeneralSearch() {
            this.showGeneralSearchResults = false;
            this.generalSearchResults = [];
            this.searchCurrentPage = 1;
        },
        handleFileChange(field) { console.log('File changed for field:', field); },
        
        // Handle file change for edit panel - ensures proper photo handling
        handleEditFileChange(event) {
            const file = event.target.files[0];
            if (file) {
                // The file will be handled by the form submission
                console.log('New photo selected for editing');
            }
        }
    }
};
</script>