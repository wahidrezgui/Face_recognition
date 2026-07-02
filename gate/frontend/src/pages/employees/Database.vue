<template>
    <PageContainer title="Employee Database" description="Manage employees, badges, and access permissions">

            <div class="sm:flex sm:items-start sm:justify-between">

                <div class="h-10 w-full min-w-[200px] max-w-[24rem]">
                    <form class="relative flex " novalidate="" @submit.prevent="filter" >
                <button
                    v-if="!isfiltered"
                    class="!absolute right-1 top-1 z-10 select-none rounded bg-brand py-2 px-4 text-center align-middle font-sans text-xs font-bold uppercase text-white shadow-md shadow-pink-500/20 transition-all hover:shadow-lg hover:shadow-pink-500/40 focus:opacity-[0.85] focus:shadow-none active:opacity-[0.85] active:shadow-none peer-placeholder-shown:pointer-events-none peer-placeholder-shown:bg-blue-gray-500 peer-placeholder-shown:opacity-50 peer-placeholder-shown:shadow-none"
                    type="submit"
                    data-ripple-light="true"
                >
                    بحث
                </button>
                <button
                    v-else
                    class="!absolute right-1 top-1 z-10 select-none rounded bg-brand py-2 px-4 text-center align-middle font-sans text-xs font-bold uppercase text-white shadow-md shadow-pink-500/20 transition-all hover:shadow-lg hover:shadow-pink-500/40 focus:opacity-[0.85] focus:shadow-none active:opacity-[0.85] active:shadow-none peer-placeholder-shown:pointer-events-none peer-placeholder-shown:bg-blue-gray-500 peer-placeholder-shown:opacity-50 peer-placeholder-shown:shadow-none"
                    type="button"
                    data-ripple-light="true"
                    @click="resetFilter"
                >
                    الغاء
                </button>
                <input
                    type="text" v-model="military_number"
                    :class="{ 'border-red-500': !fieldValidity.military_number }" @input="fieldValidity.military_number = true"
                    class="peer h-full w-full rounded-[7px] border border-gray-200 bg-white px-3 py-2.5 pr-20 font-sans text-sm font-normal text-blue-gray-700 outline outline-0 transition-all placeholder-shown:border  focus:border-1 focus:border-t-transparent focus:outline-0  "
                    placeholder="الرقم العسكري"
                    required
                />
                <input
                    type="text" v-model="fullname_ar"
                    :class="{ 'border-red-500': !fieldValidity.fullname_ar }" @input="fieldValidity.fullname_ar = true"
                    class="peer h-full w-full rounded-[7px] border border-gray-200 bg-white px-3 py-2.5 pr-20 font-sans text-sm font-normal text-blue-gray-700 outline outline-0 transition-all placeholder-shown:border  focus:border-1 focus:border-t-transparent focus:outline-0  "
                    placeholder="الإسم"
                    required
                />
                </form>
                </div>

                <form class="flex w-full max-w-6xl gap-3" @submit.prevent="searchMilitary">

<input
     type="text"
     v-model="search_military_number"
     class="flex-1 rounded-lg border border-gray-300 py-3 px-15
            text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
     placeholder="البحث حسب القواعد والمناطق"
 />

 <button
     type="submit"
     class="rounded-md bg-brand px-3 py-2 text-white text-sm
            whitespace-nowrap hover:bg-opacity-90 transition">
     بحث
 </button>

</form>


                 <div>


    <div class="mb-3 flex">
      <input v-model="plate" type="text" placeholder="البحث بالسيارة العسكرية"
             class="border p-1 rounded w-40 text-sm" />
      <button @click="searchPlate(false)" class="ms-2 bg-blue-600 text-white px-3 py-1 rounded text-sm">
        Search
      </button>
    </div>

    <!-- Slide-up Modal Overlay -->
    <transition name="slide-up">
      <div v-if="lastMovement || allMovements.length"
           class="fixed inset-0 bg-black bg-opacity-40 flex items-end justify-center z-50">
        <!-- Modal Content -->
        <div class="bg-white w-full max-w-md max-h-[80vh] overflow-y-auto rounded-t-xl shadow-lg p-4 relative">
          <!-- Close Button -->
          <button @click="clearResults" class="absolute top-2 right-2 text-red-600 font-bold text-lg">✖</button>

          <!-- Last Transaction -->
          <div v-if="lastMovement" class="mb-4 border rounded p-2 bg-gray-50">
            <h3 class="font-semibold text-sm mb-2">Last Transaction</h3>
            <table class="text-xs w-full border">
              <tr>
                <td class="font-semibold border px-1 py-0.5">Employee:</td>
                <td class="border px-1 py-0.5">{{ lastMovement.employee || 'N/A' }}</td>
              </tr>
              <tr>
                <td class="font-semibold border px-1 py-0.5">Gate:</td>
                <td class="border px-1 py-0.5">{{ lastMovement.gate || 'N/A' }}</td>
              </tr>
              <tr>
                <td class="font-semibold border px-1 py-0.5">Base:</td>
                <td class="border px-1 py-0.5">{{ lastMovement.base || 'N/A' }}</td>
              </tr>
              <tr>
                <td class="font-semibold border px-1 py-0.5">Type:</td>
                <td class="border px-1 py-0.5">{{ lastMovement.mvtype }}</td>
              </tr>
              <tr>
                <td class="font-semibold border px-1 py-0.5">Date:</td>
                <td class="border px-1 py-0.5">{{ lastMovement.mvdate }}</td>
              </tr>
              <tr>
                <td class="font-semibold border px-1 py-0.5">Time:</td>
                <td class="border px-1 py-0.5">{{ lastMovement.mvtime }}</td>
              </tr>
            </table>

            <button @click="searchPlate(true)" class="mt-2 bg-green-600 text-white px-3 py-1 rounded text-xs">
              See All
            </button>
          </div>

          <!-- All Transactions -->
          <div v-if="allMovements.length > 0">
            <h3 class="font-semibold text-sm mb-2">All Transactions for {{ plate }}</h3>
            <table class="text-xs w-full border">
              <thead>
                <tr class="bg-gray-200">
                  <th class="border px-1 py-0.5">Emp</th>
                  <th class="border px-1 py-0.5">Gate</th>
                  <th class="border px-1 py-0.5">Base</th>
                  <th class="border px-1 py-0.5">Type</th>
                  <th class="border px-1 py-0.5">Date</th>
                  <th class="border px-1 py-0.5">Time</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="mv in allMovements" :key="mv.id">
                  <td class="border px-1 py-0.5">{{ mv.employee || 'N/A' }}</td>
                  <td class="border px-1 py-0.5">{{ mv.gate || 'N/A' }}</td>
                  <td class="border px-1 py-0.5">{{ mv.base || 'N/A' }}</td>
                  <td class="border px-1 py-0.5">{{ mv.mvtype }}</td>
                  <td class="border px-1 py-0.5">{{ mv.mvdate }}</td>
                  <td class="border px-1 py-0.5">{{ mv.mvtime }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </transition>
  </div>
                <!-- Plate Number Filter -->
<div class="h-10 w-full min-w-[200px] max-w-[24rem]">
    <form class="relative flex" novalidate @submit.prevent="filter">
        <button
            v-if="!isfiltered"
            class="!absolute right-1 top-1 z-10 select-none rounded bg-brand py-2 px-4 text-center align-middle font-sans text-xs font-bold uppercase text-white shadow-md shadow-pink-500/20 transition-all hover:shadow-lg hover:shadow-pink-500/40 focus:opacity-[0.85] focus:shadow-none active:opacity-[0.85] active:shadow-none peer-placeholder-shown:pointer-events-none peer-placeholder-shown:bg-blue-gray-500 peer-placeholder-shown:opacity-50 peer-placeholder-shown:shadow-none"
            type="submit"
            data-ripple-light="true"
        >
            بحث
        </button>
        <button
            v-else
            class="!absolute right-1 top-1 z-10 select-none rounded bg-brand py-2 px-4 text-center align-middle font-sans text-xs font-bold uppercase text-white shadow-md shadow-pink-500/20 transition-all hover:shadow-lg hover:shadow-pink-500/40 focus:opacity-[0.85] focus:shadow-none active:opacity-[0.85] active:shadow-none peer-placeholder-shown:pointer-events-none peer-placeholder-shown:bg-blue-gray-500 peer-placeholder-shown:opacity-50 peer-placeholder-shown:shadow-none"
            type="button"
            data-ripple-light="true"
            @click="resetFilter"
        >
            الغاء
        </button>
        <input
            type="text" v-model="plate_number"
            :class="{ 'border-red-500': !fieldValidity.plate_number }" @input="fieldValidity.plate_number = true"
            class="peer h-full w-full rounded-[7px] border border-gray-200 bg-white px-3 py-2.5 pr-20 font-sans text-sm font-normal text-blue-gray-700 outline outline-0 transition-all placeholder-shown:border  focus:border-1 focus:border-t-transparent focus:outline-0"
            placeholder="البحث بسيارة مدنية"
            required
        />
    </form>
</div>
                <div class="mt-5 mb-5 sm:ms-6 sm:mt-0 sm:flex sm:shrink-0 sm:items-center" v-if="toolbar">
                <button @click="OpenAddg" type="button" class="inline-flex mx-3  text-sm bg-blue-500 hover:bg-blue-700 text-white py-2 px-4 rounded">
                <i class="pi pi-user-plus pr-2"></i>
                اضافة موظف
                </button>
                <button @click="onBtImport" type="button" class="inline-flex mx-3  text-sm bg-gray-500 hover:bg-gray-700 text-white py-2 px-4 rounded">
                <i class="pi pi-file-import pr-2"></i>
                تحميل بيانات
                </button>
                <!--
                <button @click="onBtExport" type="button" class="inline-flex text-sm bg-purple-500 hover:bg-purple-700 text-white py-2 px-4 rounded">
                <i class="pi pi-file-export pr-2"></i>
                Export CSV Data
                </button>
                -->
                </div>

                <div class="mt-5 mb-5 sm:ms-6 sm:mt-0 sm:flex sm:shrink-0 sm:items-center" v-if="toolbar2">
                <button @click="deleteSelected" type="button" class="inline-flex mx-3 text-sm bg-red-500 hover:bg-red-700 text-white py-2 px-4 rounded">
                <i class="pi pi-times pr-2" ></i>
                مسح
                </button>
                <button v-if="step==0" @click="approveSelected(1)" type="button" class="inline-flex text-sm bg-green-500 hover:bg-green-700 text-white py-2 px-4 rounded">
                <i class="pi pi-check pr-2" ></i>
                معتمدة
                </button>
                <button v-if="step>0" @click="approveSelected(0)" type="button" class="inline-flex text-sm bg-green-500 hover:bg-green-700 text-white py-2 px-4 rounded">
                <i class="pi pi-circle pr-2" ></i>
                غير معتمدة
                </button>
                <button v-if="step==1" @click="bulkprintCombined" type="button" class=" mx-3 inline-flex text-sm bg-yellow-500 hover:bg-yellow-700 text-white py-2 px-4 rounded">
                <i class="pi pi-print pr-2"></i>
                PrintCard
                </button> 
                 <!-- <button v-if="step==1" @click="bulkprint2" type="button" class=" mx-3 inline-flex text-sm bg-yellow-500 hover:bg-yellow-700 text-white py-2 px-4 rounded">
                <i class="pi pi-print pr-2"></i>
                back
                </button> -->
                <button v-if="step==2" @click="approveSelected(3)" type="button" class="inline-flex mx-3 text-sm bg-blue-500 hover:bg-blue-700 text-white py-2 px-4 rounded">
                <i class="pi pi-thumbs-up pr-2" ></i> Collect
                </button>
             
                <button v-if="step==2" @click="bulkprintCombined" type="button" class="inline-flex mx-3 text-sm bg-blue-700 hover:bg-blue-500 text-white py-2 px-4 rounded">
                <i class="pi pi-print pr-2" ></i> PrintCard
                </button>
                <!-- <button v-if="step==2" @click="bulkprint2" type="button" class="inline-flex mx-3 text-sm bg-blue-700 hover:bg-blue-500 text-white py-2 px-4 rounded">
                <i class="pi pi-print pr-2" ></i> Back
                </button> -->
               
                </div>

            </div>

            <div class="wrapper-card grid lg:grid-cols-6 grid-cols-1 md:grid-cols-2 gap-2 mb-5"  >
            <div v-for="(statu,index) in RawDataStatus" :key="statu.id" @click="fetchList(index)" :class="agGridKey === index ? 'text-green-900 border-green-500 bg-green-200 border-b-2' : 'bg-white'"  class="card w-full cursor-pointer rounded-md border flex" >
            <div class="p-2 max-w-sm">
            <div class="bg-neutral-500 text-center rounded w-15 h-14 text-lg p-3 text-white mx-auto" >
            <span> {{statu.count}} </span>
            </div>
            </div>
            <div class="block p-2 w-full">
            <p class="font-semibold text-gray-900 dark:text-gray-200 text-xl">
            {{statu.status}}
            </p>
            <h2 class="font-normal text-gray-400 text-md mt-1">قائمة الموظفين</h2>
            </div>
            </div>
            </div>

         


           
                <AppDataGrid
                ref="agGrid"
                :column-defs="mergedColumnDefs"
                :row-data="RawData"
                :per-page="perPage"
                :total-rows="totalRows"
                pagination-mode="server"
                height="calc(100vh - 250px)"
                line-height="56px"
                @grid-ready="onGridReady"
                @row-clicked="OnClicked"
                @selection-changed="onSelectionChanged"
                @page-change="onPageChange"
                @update:per-page="perPage = $event"
                />

           
    </PageContainer>

<VueSidePanel v-model="addg" lock-scroll no-close="true" width="650px" >
            <div>
            <form novalidate="" id="formguest" @submit.prevent="createguest" >
            <div class="flex h-full flex-col bg-white dark:bg-neutral-900">
            <div class="flex min-h-0 flex-1 flex-col  py-6">

            <div class="px-4 sm:px-6">
            <div class="flex items-start justify-between">
            <div class="space-y-1">
            <h2 class="text-lg font-medium text-neutral-700">
            اضافة موظف
            </h2>
            </div>
            </div>
            </div>

            <div class="relative mt-8 flex-1 px-4 sm:px-6">
            <div class="grid grid-cols-12 gap-x-4">


            <div class="col-span-12 grid grid-cols-2 gap-4">
            <Avatar icon="pi pi-user" class="mr-2" size="xlarge" shape="circle" />
            <div class="mb-3">
            <label class="block text-sm font-medium inline-flex items-center" >
            <span>الصورة</span>
            </label>
            <div class="relative">
            <input type="file" placeholder="الصورة" name="photo" @change="handleFileChange('photo')" class="flex h-12 w-full items-center justify-center rounded-md border bg-white/0 p-3 text-sm outline-none ">
            </div>
            </div>
            </div>

            <div class="col-span-2">
            <div class="mb-3">
            <label class="block text-sm font-medium inline-flex items-center" >
            <span>الجنس</span>
            </label>
            <div class="relative">
            <Dropdown  v-model="guest.gender_id" :options="gender" optionLabel="name_en" optionValue="id" placeholder="Gender" class="w-full md:w-14rem border border-dark-200" />
            </div>
            </div>
            </div>

            <div class="col-span-5">
            <div class="mb-3">
            <label class="block text-sm font-medium inline-flex items-center" >
            <span>الاسم بالانجليزي</span>
            </label>
            <div class="relative">
            <input type="text" v-model="guest.fullname_en" :class="{ 'border-red-500': !fieldValidity.fullname_en }" @input="fieldValidity.fullname_en = true" placeholder="Full Name" name="fullname_en" class="flex h-12 w-full items-center justify-center rounded-md border hover:border-indigo-300 bg-white/0 p-3 text-sm outline-none ">
            </div>
            </div>
            </div>

            <div class="col-span-5">
            <div class="mb-3">
            <label class="block text-sm font-medium inline-flex items-center" >
            <span>الاسم الكامل</span>
            </label>
            <div class="relative">
            <input type="text" v-model="guest.fullname_ar" :class="{ 'border-red-500': !fieldValidity.fullname_ar }" @input="fieldValidity.fullname_ar = true" placeholder="الاسم الكامل" name="fullname_ar" class="flex h-12 w-full items-center justify-center rounded-md border hover:border-indigo-300 bg-white/0 p-3 text-sm outline-none ">
            </div>
            </div>
            </div>
            <div class="col-span-5">
            <div class="mb-3">
            <label class="block text-sm font-medium inline-flex items-center" >
            <span>ملاحظات</span>
            </label>
            <div class="relative">
            <input type="text" v-model="guest.remarks" :class="{ 'border-red-500': !fieldValidity.remarks }" @input="fieldValidity.remarks = true" placeholder="ملاحظات" name="remarks" class="flex h-12 w-full items-center justify-center rounded-md border hover:border-indigo-300 bg-white/0 p-3 text-sm outline-none ">
            </div>
            </div>
            </div>
            <div class="col-span-5">
            <div class="mb-3">
            <label class="block text-sm font-medium inline-flex items-center" >
            <span>مهنة</span>
            </label>
            <div class="relative">
            <input type="text" v-model="guest.Job_En" :class="{ 'border-red-500': !fieldValidity.Job_En }" @input="fieldValidity.Job_En = true" placeholder="مهنة" name="Job_En" class="flex h-12 w-full items-center justify-center rounded-md border hover:border-indigo-300 bg-white/0 p-3 text-sm outline-none ">
            </div>
            </div>
            </div>
            <div class="col-span-5">
            <div class="mb-3">
            <label class="block text-sm font-medium inline-flex items-center" >
            <span>فصيلةالدم</span>
            </label>
            <div class="relative">
            <input type="text" v-model="guest.bloodtype" :class="{ 'border-red-500': !fieldValidity.bloodtype }" @input="fieldValidity.bloodtype = true" placeholder="فصيلةالدم" name="bloodtype" class="flex h-12 w-full items-center justify-center rounded-md border hover:border-indigo-300 bg-white/0 p-3 text-sm outline-none ">
            </div>
            </div>
            </div>
            <div class="col-span-6">
            <div class="mb-3">
            <label class="block text-sm font-medium inline-flex items-center" >
            <span>الوحدة</span>
            </label>
            <div class="relative">
                <TreeSelect v-model="guest.dep_id" :options="departments" placeholder="اختر الجناح" showClear class="w-full md:w-14rem border border-dark-200" />
            </div>
            </div>
            </div>

            <div class="col-span-6">
            <div class="mb-3">
            <label class="block text-sm font-medium inline-flex items-center" >
            <span>الرتبة</span>
            </label>
            <div class="relative">
                <TreeSelect v-model="guest.rank_id" :options="ranks" optionLabel="name_ar" placeholder="اختر الرتبة" class="w-full md:w-14rem border border-dark-200" />
            </div>
            </div>
            </div>

            <div class="col-span-6">
            <div class="mb-3">
            <label class="block text-sm font-medium inline-flex items-center" >
            <span>رقم الهاتف</span>
            </label>
            <div class="relative">
            <input type="text" placeholder="رقم الهاتف" name="phone_number" class="flex h-12 w-full items-center justify-center rounded-md border hover:border-indigo-300 bg-white/0 p-3 text-sm outline-none ">
            </div>
            </div>
            </div>

            <div class="col-span-6">
            <div class="mb-3">
            <label class="block text-sm font-medium inline-flex items-center" >
            <span>الرقم العسكري</span>
            </label>
            <div class="relative">
            <input type="text" v-model="guest.military_number" :class="{ 'border-red-500': !fieldValidity.military_number }" @input="fieldValidity.military_number = true" placeholder="Military Number" name="military_number" class="flex h-12 w-full items-center justify-center rounded-md border hover:border-indigo-300 bg-white/0 p-3 text-sm outline-none ">
            </div>
            </div>
            </div>

            <div class="col-span-6">
            <div class="mb-3">
            <label class="block text-sm font-medium inline-flex items-center" >
            <span>البطاقة الشخصية</span>
            </label>
            <div class="relative">
            <input type="text" v-model="guest.qid" :class="{ 'border-red-500': !fieldValidity.qid }" @input="fieldValidity.qid = true" placeholder="البطاقة الشخصية" name="qid" class="flex h-12 w-full items-center justify-center rounded-md border hover:border-indigo-300 bg-white/0 p-3 text-sm outline-none ">
            </div>
            </div>
            </div>

            <div class="col-span-6">
            <div class="mb-3">
            <label class="block text-sm font-medium inline-flex items-center" >
            <span>الجنسية</span>
            </label>
            <div class="relative">
            <Dropdown  v-model="guest.nationality_id" :options="nationalities" optionLabel="name_ar" optionValue="id" placeholder="الجنسية" class="w-full md:w-14rem border border-dark-200" />
            </div>
            </div>
            </div>

            <div class="col-span-6">
            <div class="mb-3">
            <label class="block text-sm font-medium inline-flex items-center" >
            <span>انتهاء الصلاحية</span>
            </label>
            <div class="relative">
            <input type="date" v-model="guest.expiry_date" :class="{ 'border-red-500': !fieldValidity.expiry_date }" @input="fieldValidity.expiry_date = true" placeholder="Expiry Date" name="expiry_date" class="flex h-12 w-full items-center justify-center rounded-md border hover:border-indigo-300 bg-white/0 p-3 text-sm outline-none ">
            </div>
            </div>
            </div>

            <div class="col-span-6">
             <input type="hidden" name="created_by" :value="userName" >
            <input type="hidden" name="dep_parent_id" :value="depId" >   
            <input type="hidden" name="is_employee" value="0" >  
            </div>
            

            </div>
            </div>

            <hr/>
            <div class="flex justify-between px-8 py-4">
            <h2 class="py-4 text-lg font-medium">صلاحيات الدخول</h2>
            <div class="relative">
            <Dropdown  v-model="guest.default_base" :options="bases" optionLabel="name_en" optionValue="id" placeholder="القاعدة" class="w-full md:w-14rem border border-dark-200" />
            </div>
            </div>

            <div class="relative mb-5 flex-1 px-4 sm:px-6">
            <div class="grid grid-cols-2 gap-4">
                    <Card v-for="base in bases" :key="base.id" class="bg-white text-gray-700 border shadow-md rounded-md">
                            <template #title> 
                           
                            <div>
                                <label  class="ml-2"> {{base.name_ar}} </label>
                            </div>
                            
                            </template>
                            <template #content>
                                <table class="min-w-full divide-y divide-gray-200">
                                    <tbody class="bg-white">
                                    <tr v-for="zone in base.zones" :key="zone.id" :for="zone.id">
                                    <td class="p-2 whitespace-nowrap text-sm font-normal text-gray-900">
                                    <Checkbox v-model="guest.selectedZones" name="zoning[]" :inputId="zone.id" :value="zone.id" class="border-2 w-6 h-6 text-gray-600 rounded-lg transition-colors duration-200" />
                                    </td>
                                    <td class="p-2 whitespace-nowrap text-sm font-normal text-gray-900">
                                    <span class="font-semibold">{{zone.name_en}}</span>
                                    </td>
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


            <div class="shrink-0 px-4 py-4 dark:bg-neutral-800">
            <div class="flex flex-wrap justify-end space-x-3 sm:flex-nowrap">
            <button @click="addg=false" type="button" class="inline-flex text-sm bg-white text-black  border border-gray-500 hover:bg-blue-700 py-2 px-4 rounded">
            الغاء
            </button>
            <span class="relative z-0 inline-flex shadow-sm rounded-md">
            <button type="submit" class="inline-flex text-sm bg-blue-500 hover:bg-blue-700 text-white py-2 px-4 focus:z-10 rounded-l-md -mr-px">
            تسجيل
            </button>
            </span>
            </div>
            </div>

            </div>
            </div>
            </form>
            </div>
</VueSidePanel>


<VueSidePanel v-model="dataimport" lock-scroll no-close="true" width="400px" >
      <div v-if="headers!=''" class="px-4 py-2 sm:p-3 csv">
            
      <vue-csv-import :fields="{gender_id: {required: true, label: 'Gender'}, Job_En: {required: false, label: 'مهنة'}, fullname_en: {required: false, label: 'Full Name'}, fullname_ar: {required: true, label: 'الاسم الكامل'}, qrcode: {required: true, label: 'Registration Number'}}" >
      <vue-csv-toggle-headers></vue-csv-toggle-headers>
      <vue-csv-input name="file"></vue-csv-input>
      <vue-csv-map :auto-match="true"></vue-csv-map>
      <vue-csv-submit class="inline-flex mt-10 text-sm bg-blue-500 hover:bg-blue-700 text-white py-2 px-4 rounded" :url="'/api/employees/import?dep_id='+this.depId+'&by='+this.userName"  :config="{}" @click="handleImport"></vue-csv-submit>
      </vue-csv-import>

      </div>
</VueSidePanel>


<VueSidePanel v-model="blokGuest" lock-scroll no-close="true" width="600px" >
<div>

<div class="flex items-center bg-neutral-200 justify-left">
<div role="tablist" aria-orientation="horizontal" class="overflow-y-hidden -mb-px flex grow snap-x snap-mandatory overflow-x-auto px-4 scrollbar-thin scrollbar-track-neutral-200 scrollbar-thumb-neutral-300 sm:space-x-4 sm:grow-0">
<button @click="activeTab = 10" :class="activeTab === 10 ? 'text-green-500 border-green-500' : ''" class="border-primary-500 text-primary-600 dark:border-primary-400 dark:text-primary-300 group inline-flex min-w-full shrink-0 snap-start snap-always items-center justify-center whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium focus:outline-none sm:min-w-0" type="button">
<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" aria-hidden="true" class="text-primary-500 dark:text-primary-300 -ml-0.5 mr-1.5 h-5 w-5">
<path stroke-linecap="round" stroke-linejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25H12"></path>
</svg>
<span>البيانات الشخصية</span>
</button>
<button @click="activeTab = 12" :class="activeTab === 12 ? 'text-green-500 border-green-500' : ''" class="border-transparent  group inline-flex min-w-full shrink-0 snap-start snap-always items-center justify-center whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium focus:outline-none sm:min-w-0" type="button">
<i class="pi pi-car pr-2"></i>
<span>السيارات</span>
</button>
<button @click="activeTab = 11" :class="activeTab === 11 ? 'text-green-500 border-green-500' : ''" class="border-transparent  group inline-flex min-w-full shrink-0 snap-start snap-always items-center justify-center whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium focus:outline-none sm:min-w-0" type="button">
<i class="pi pi-calendar pr-2"></i>
<span>آخر العمليات</span>
</button>
</div>
</div>

<div id="tabPanel-timeline">

<div v-show="activeTab === 10" role="tabpanel">
    <form novalidate="" id="formeditguest" @submit.prevent="updateguest" >
            <div class="flex h-full flex-col bg-white">
            <div class="flex min-h-0 flex-1 flex-col  py-6">

            <div class="relative mt-8 flex-1 px-4 sm:px-6">
            <div class="grid grid-cols-12 gap-x-4">


            <div class="col-span-12 grid grid-cols-2 gap-4">
                <img v-if="guest.photo ==null" src="/uploads/nopic.png" class="object-cover w-20 h-20 rounded-full mb-2" /> 
                <img v-else :src="'/'+guest.photo" class="object-cover w-20 h-20 rounded-full mb-2" /> 
            <div class="mb-3">
            <label class="block text-sm font-medium inline-flex items-center" >
            <span>الصورة</span>
            </label>
            <div class="relative">
            <input type="file" placeholder="الصورة" name="photo" @change="handleFileChange('photo')" class="flex h-12 w-full items-center justify-center rounded-md border bg-white/0 p-3 text-sm outline-none ">
            </div>
            </div>
            </div>

            <div class="col-span-2">
            <div class="mb-3">
            <label class="block text-sm font-medium inline-flex items-center" >
            <span>الجنس</span>
            </label>
            <div class="relative">
            <Dropdown  v-model="guest.gender_id" :options="gender" optionLabel="name_en" optionValue="id" placeholder="Gender" class="w-full md:w-14rem border border-dark-200" />
            </div>
            </div>
            </div>

            <div class="col-span-5">
            <div class="mb-3">
            <label class="block text-sm font-medium inline-flex items-center" >
            <span>الاسم بالانجليزي</span>
            </label>
            <div class="relative">
            <input type="text" placeholder="Full Name" name="fullname_en" v-model="guest.fullname_en" class="flex h-12 w-full items-center justify-center rounded-md border border-slate-300 hover:border-indigo-300 bg-white/0 p-3 text-sm outline-none ">
            </div>
            </div>
            </div>

            <div class="col-span-5">
            <div class="mb-3">
            <label class="block text-sm font-medium inline-flex items-center" >
            <span>الاسم الكامل</span>
            </label>
            <div class="relative">
            <input type="text" placeholder="" name="fullname_ar" v-model="guest.fullname_ar" class="flex h-12 w-full items-center justify-center rounded-md border border-slate-300 hover:border-indigo-300 bg-white/0 p-3 text-sm outline-none ">
            </div>
            </div>
            </div>
 <div class="col-span-5">
            <div class="mb-3">
            <label class="block text-sm font-medium inline-flex items-center" >
            <span>ملاحظات</span>
            </label>
            <div class="relative">
            <input type="text" placeholder="" name="remarks" v-model="guest.remarks" class="flex h-12 w-full items-center justify-center rounded-md border border-slate-300 hover:border-indigo-300 bg-white/0 p-3 text-sm outline-none ">
            </div>
            </div>
            </div>
            <div class="col-span-5">
  <div class="mb-3">
    <label class="block text-sm font-medium inline-flex items-center gap-20">
      <span>فصيلة الدم</span>
      <span>سكن</span>
    </label>

    <div class="relative">
      <!-- vertical center line -->
      <div class="pointer-events-none absolute left-1/2 top-2 bottom-2 w-[3px] bg-black"></div>

      <input
        type="text"
        name="bloodtype"
        v-model="guest.bloodtype"
        placeholder=""
        class="flex h-12 w-full items-center justify-center rounded-md border border-slate-300 hover:border-indigo-300 bg-white/0 p-3 text-sm outline-none"
      >
    </div>
  </div>
</div>


            <div class="col-span-5">
            <div class="mb-3">
            <label class="block text-sm font-medium inline-flex items-center" >
            <span>مهنة</span>
            </label>
            <div class="relative">
            <input type="text" placeholder="مهنة" name="Job_En" v-model="guest.Job_En" class="flex h-12 w-full items-center justify-center rounded-md border border-slate-300 hover:border-indigo-300 bg-white/0 p-3 text-sm outline-none ">
            </div>
            </div>
            </div>
            <div class="col-span-6">
            <div class="mb-3">
            <label class="block text-sm font-medium inline-flex items-center" >
            <span>رقم الهاتف</span>
            </label>
            <div class="relative">
            <input type="text" placeholder="Phone Number" name="phone_number" v-model="guest.phone_number" class="flex h-12 w-full items-center justify-center rounded-md border border-slate-300 hover:border-indigo-300 bg-white/0 p-3 text-sm outline-none ">
            </div>
            </div>
            </div>

            <div class="col-span-6">
            <div class="mb-3">
            <label class="block text-sm font-medium inline-flex items-center" >
            <span>الرقم العسكري</span>
            </label>
            <div class="relative">
            <input type="text" placeholder="Military Number" name="military_number" v-model="guest.military_number" class="flex h-12 w-full items-center justify-center rounded-md border border-slate-300 hover:border-indigo-300 bg-white/0 p-3 text-sm outline-none ">
            </div>
            </div>
            </div>

            <div class="col-span-6">
            <div class="mb-3">
            <label class="block text-sm font-medium inline-flex items-center" >
            <span>البطاقة الشخصية</span>
            </label>
            <div class="relative">
            <input type="text" placeholder="QID Number" name="qid" v-model="guest.qid" class="flex h-12 w-full items-center justify-center rounded-md border border-slate-300 hover:border-indigo-300 bg-white/0 p-3 text-sm outline-none ">
            </div>
            </div>
            </div>

            <div class="col-span-6">
            <div class="mb-3">
            <label class="block text-sm font-medium inline-flex items-center" >
            <span>الجنسية</span>
            </label>
            <div class="relative">
            <Dropdown  v-model="guest.nationality_id" :options="nationalities" optionLabel="name_ar" optionValue="id" placeholder="Nationality" class="w-full md:w-14rem border border-dark-200" />
            </div>
            </div>
            </div>

            <div class="col-span-6">
            <div class="mb-3">
            <label class="block text-sm font-medium inline-flex items-center" >
            <span>الوحدة</span>
            </label>
            <div class="relative">
                <TreeSelect v-model="guest.dep_id" :options="departments" placeholder="Select Department" showClear class="w-full md:w-14rem border border-dark-200" />
            </div>
            </div>
            </div>

            <div class="col-span-6">
            <div class="mb-3">
            <label class="block text-sm font-medium inline-flex items-center" >
            <span>الرتبة</span>
            </label>
            <div class="relative">
                <TreeSelect v-model="guest.rank_id" :options="ranks" optionLabel="name_ar" placeholder="Select Rank" class="w-full md:w-14rem border border-dark-200" />
            </div>
            </div>
            </div>

            <div class="col-span-6">
            <div class="mb-3">
            <label class="block text-sm font-medium inline-flex items-center" >
            <span>صلاحية البطاقة</span>
            </label>
            <div class="relative">
            <input type="date" placeholder="صلاحية البطاقة" name="expiry_date" v-model="guest.expiry_date" class="flex h-12 w-full items-center justify-center rounded-md border border-slate-300 hover:border-indigo-300 bg-white/0 p-3 text-sm outline-none ">
            </div>
            </div>
            </div>

            <div class="col-span-6">
            <input type="hidden" name="created_by" :value="userName" >
            <input type="hidden" name="id" :value="guest.id" >
            </div>

            

            </div>
            </div>

            <hr/>
            <div class="flex justify-between px-8 py-4">
            <h2 class="py-4 text-lg font-medium">الصلاحيات</h2>
            <div class="relative">
            <Dropdown  v-model="guest.default_base" :options="bases" optionLabel="name_ar" optionValue="id" placeholder="Default Base" class="w-full md:w-14rem border border-dark-200" />
            </div>
            </div>

            <div class="relative mb-5 flex-1 px-4 sm:px-6">
            <div class="grid grid-cols-2 gap-4">
                   <!--  <Card v-for="base in bases" :key="base.id" class="bg-white text-gray-700 border shadow-md rounded-md">
                            <template #title> 
                           
                            <div>
                               <label class="ml-2"> {{base.name_ar}} </label>
                            </div>
                            
                            </template>
                            <template #content>
                                <table class="min-w-full divide-y divide-gray-200">
                                    <tbody class="bg-white">
                                    <tr v-for="zone in base.zones" :key="zone.id" :for="zone.id">
                                    <td class="p-2 whitespace-nowrap text-sm font-normal text-gray-900">
                                    <Checkbox v-model="guest.selectedZones" name="zoning[]" :inputId="zone.id" :value="zone.id" class="border-2 w-6 h-6 text-gray-600 rounded-lg transition-colors duration-200" />
                                    </td>
                                    <td class="p-2 whitespace-nowrap text-sm font-normal text-gray-900">
                                    <span class="font-semibold">{{zone.name_en}}</span>
                                    </td>
                                    <td class="p-2 whitespace-nowrap text-sm font-normal text-gray-900">
                                    <div class="relative h-5 w-5">
                                        <span class="absolute right-0 bottom-0 h-5 w-5 rounded-full ring ring-white" :style="'background-color:'+zone.color"></span>
                                    </div>
                                    </td>
                                    </tr>
                                    </tbody>
                                </table>
                            </template>
                    </Card> -->
                    <Card v-for="base in bases" :key="base.id" class="bg-white text-gray-700 border shadow-md rounded-md">
    <template #title> 
        <div>
            <label class="ml-2"> {{base.name_ar}} </label>
        </div>
    </template>
    <template #content>
        <table class="min-w-full divide-y divide-gray-200">
            <tbody class="bg-white">
            <tr v-for="zone in base.zones" :key="zone.id" :for="zone.id">
                <td class="p-2 whitespace-nowrap text-sm font-normal text-gray-900">
                    <Checkbox v-model="guest.selectedZones" name="zoning[]" :inputId="zone.id" :value="zone.id" class="border-2 w-6 h-6 text-gray-600 rounded-lg transition-colors duration-200" />
                </td>
                <td class="p-2 whitespace-nowrap text-sm font-normal text-gray-900">
                    <span class="font-semibold">{{zone.name_en}}</span>
                </td>
                <td class="p-2 whitespace-nowrap text-sm font-normal text-gray-900">
                    <div class="relative h-5 w-5">


                        <span 
    class="absolute right-0 bottom-0 h-5 w-5 rounded-full"
    :style="{
        backgroundColor: zone.color,
        border: needsWhiteBorder(zone.color) ? '2px solid white' : 'none'
    }">
</span>
                
                    </div>
                </td>
            </tr>
            </tbody>
        </table>
    </template>
</Card>
                </div>
            </div>


            <div class="shrink-0 px-4 py-4 dark:bg-neutral-800">
            <div class="flex flex-wrap justify-end space-x-3 sm:flex-nowrap">
            <button @click="addg=false" type="button" class="inline-flex text-sm bg-white text-black  border border-gray-500 hover:bg-blue-700 py-2 px-4 rounded">
            Cancel
            </button>
            <span class="relative z-0 inline-flex shadow-sm rounded-md">
            <button type="submit" class="inline-flex text-sm bg-blue-500 hover:bg-blue-700 text-white py-2 px-4 focus:z-10 rounded-l-md -mr-px">
            Save Employee
            </button>
            </span>
            </div>
            </div>

            </div>
            </div>
            </form>    
</div>

<div v-show="activeTab === 11" role="tabpanel">
            <div class="align-middle inline-block min-w-full">
                <table class="min-w-full divide-y divide-gray-200">
                    <thead class="bg-gray-50">
                        <tr>
                            <th scope="col" class="p-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                اليوم/التوقيت
                            </th>
                            <th scope="col" class="p-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                العملية
                            </th>
                            <th scope="col" class="p-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                القاعدة
                            </th>
                            <th scope="col" class="p-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                البوابة
                            </th>
                        </tr>
                    </thead>
                    <tbody class="bg-white">
                        <tr v-for="(movement, index) in guest.movements || []" :key="`movement-${index}`">
                            <td class="p-4 whitespace-nowrap text-sm font-normal text-gray-500">
                                {{ movement.mvdate }} <br> {{ movement.mvtime }}
                            </td>
                            <td class="p-4 whitespace-nowrap text-sm font-normal text-gray-900">
                                {{ movement.mvtype }}
                            </td>
                            <td class="p-4 whitespace-nowrap text-sm font-normal text-gray-900">
                                {{ movement.base_name_ar }}
                            </td>
                            <td class="p-4 whitespace-nowrap text-sm font-normal text-gray-900">
                                {{ movement.gate_name_ar }}
                            </td>
                        </tr>
                    </tbody>
                </table>
                                </div>
</div>

<div v-show="activeTab === 12" role="tabpanel">
            <div class="align-middle inline-block min-w-full">

                <div class="p-5">
                    <form class="relative flex" novalidate="" @submit.prevent="addCar" >
                <button
                    class="!absolute right-1 top-1 z-10 select-none rounded bg-brand py-2 px-4 text-center align-middle font-sans text-xs font-bold uppercase text-white shadow-md shadow-pink-500/20 transition-all hover:shadow-lg hover:shadow-pink-500/40 focus:opacity-[0.85] focus:shadow-none active:opacity-[0.85] active:shadow-none peer-placeholder-shown:pointer-events-none peer-placeholder-shown:bg-blue-gray-500 peer-placeholder-shown:opacity-50 peer-placeholder-shown:shadow-none"
                    type="submit"
                    data-ripple-light="true"
                >
                    اضافة سيارة
                </button>
                <input
                    type="text" v-model="car.plate_number"
                    class="peer h-full w-full rounded-[7px] border border-gray-200 bg-white px-3 py-2.5 pr-20 font-sans text-sm font-normal text-blue-gray-700 outline outline-0 transition-all placeholder-shown:border  focus:border-1 focus:border-t-transparent focus:outline-0  "
                    placeholder="النوع - اللون - رقم اللوحة"
                    required
                />
                </form>
            </div>

                                        <table class="min-w-full divide-y divide-gray-200">
                                            
                                            <thead class="bg-gray-50">
                                            <tr>
                                            <th scope="col" class="p-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            </th>
                                            <th scope="col" class="p-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                 رقم اللوحة	- النوع - اللون
                                            </th>
                                            <th scope="col" class="p-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            الحالة
                                            </th>
                                            </tr>
                                            </thead>

                                            <tbody v-for="car in guest.cars" :key="car.id" class="bg-white">
                                            
                                            <tr>
                                            <td class="p-4 whitespace-nowrap text-sm font-normal text-gray-500">
                                            <i class="pi pi-car"></i>
                                            </td>
                                            <td class="p-4 whitespace-nowrap text-sm font-normal text-gray-900">
                                            <span class="font-semibold">{{car.plate_number}}</span>
                                            </td>
                                            <td class="p-4 whitespace-nowrap text-sm font-normal text-gray-900">
                                                <Tag v-if="car.active==0" icon="pi pi-exclamation-triangle" severity="warning" value="غير معتمدة"></Tag>
                                                <Tag v-if="car.active==1" icon="pi pi-check" severity="success" value="معتمدة"></Tag>
                                               
                                               
                                               
                                               
    
    
        <div class="flex space-x-4">
            <button @click="delCar(car.id)">
                <i class="pi pi-trash"></i>
            </button>
        </div>
    

                                            </td>
                                            </tr>

                                            </tbody>

                                        </table>
                                </div>
</div>

</div>
</div>
</VueSidePanel>
<Toast />

<AppLoader :loading="isLoading" variant="overlay" label="جاري التحميل..." />
<div v-if="showModal" class="report-modal">

<div class="report-modal-content w-[450px] max-h-[80vh] overflow-y-auto rounded-[10px]">

    <!-- HEADER -->
    <div class="flex justify-between items-center mb-3">
        <h3 class="font-bold text-sm">Search Result</h3>

        <button @click="showModal = false"
            class="bg-red-500 text-white px-2 rounded text-xs">
            X
        </button>
    </div>

    <!-- CLEAR -->
    <button @click="clearSearch"
        class="mb-3 bg-gray-200 px-2 py-1 rounded text-xs">
        Clear
    </button>

    <div v-if="searchResult?.logs">

<div v-for="log in searchResult.logs" :key="log.id"
     class="border p-2 text-xs mb-2">

    <div><b>Name:</b> {{ log.fullname_en }}</div>
    <div><b>Military:</b> {{ log.military_number }}</div>
    <div><b>Task:</b> {{ log.task }}</div>
    <div><b>Date:</b> {{ log.created_at }}</div>

</div>

</div>

    <!-- MESSAGE -->
    <div v-if="searchResult?.message"
        class="text-red-500 text-xs mt-2">
        {{ searchResult.message }}
    </div>

</div>

</div>
</template>

<script>
import api from '../../api/client';
import { fetchBases, fetchBase, fetchDepartment } from '../../api/organization';
import { fetchRanks, fetchNationalities } from '../../api/lookups';
import AppDataGrid from '../../components/ui/AppDataGrid.vue';
import Toast from 'primevue/toast';
import { useToast } from 'primevue/usetoast';
import { ref } from 'vue';
import Dropdown from 'primevue/dropdown';
import Checkbox from 'primevue/checkbox';
import FileUpload from 'primevue/fileupload';
import {VueCsvToggleHeaders, VueCsvSubmit, VueCsvMap, VueCsvInput, VueCsvErrors, VueCsvImport} from 'vue-csv-import';
import html2pdf from 'html2pdf.js';
import QRCode from 'qrcode-generator';
import Card from 'primevue/card';
import Avatar from 'primevue/avatar';
import TreeSelect from 'primevue/treeselect';
import Tag from 'primevue/tag';
import PageContainer from '../../components/ui/PageContainer.vue';

const gridApi = ref();

function customCellRenderer(params) {
    var cellValue = params.value;
    var formattedValue='';
    if(cellValue===0){formattedValue='<span class="bg-orange-200 text-orange-600 py-1 px-3 rounded text-xs">Pending</span>';}
    if(cellValue===1){formattedValue='<span class="bg-green-200 text-green-600 py-1 px-3 rounded text-xs">Approved</span>';}
    if(cellValue===2){formattedValue='<span class="bg-blue-200 text-blue-600 py-1 px-3 rounded text-xs">Printed</span>';}
    if(cellValue===3){formattedValue='<span class="bg-green-500 text-green-200 py-1 px-3 rounded text-xs">Collected</span>';}

    return formattedValue;
}

function customCellImgRenderer(params) {
    var cellValue = params.value;
    var formattedValue='';
    if(cellValue!=null){formattedValue='<img src="'+cellValue+'" class="object-cover w-8 h-8 rounded-full mt-2" />';}
    else{formattedValue='<img src="/uploads/nopic.png" class="object-cover w-8 h-8 rounded-full mt-2" />';}

    return formattedValue;
}

export default {
     name: "PlateSearch",
        components: {
                    AppDataGrid, Toast, Dropdown, Checkbox, FileUpload, Card, Avatar, TreeSelect,
                    VueCsvToggleHeaders,
                    VueCsvSubmit,
                    VueCsvMap,
                    VueCsvInput,
                    VueCsvErrors,
                    VueCsvImport,
                    Tag,
                    PageContainer
                    },
        data() {
            return {
                search_military_number: '',
searchResult: null,
showModal: false,

                  plate: "",
      lastMovement: null,
      allMovements: [],
                cars: [
        { id: 1, plate_number: 'ABC123', emp_id: 1, active: 1 },
        { id: 2, plate_number: 'XYZ789', emp_id: 2, active: 1 },
        // ...more cars
      ],
                currentPage:1,
                perPage:25,
                totalRows: 0,
                isfiltered:false,
                military_number:'',
                activeTab:10,
                plate_number: '',
                depId: localStorage.getItem('dep_id'),
                userName: localStorage.getItem('user_name'),
                agGridKey: 0,
                step:0,
                ColumnsDef:[],
                RawData:[],
                RawDataStatus:[],
                isLoading:false,
                toolbar:true,
                toolbar2:false,
                addg:false,
                blokGuest:false,
                dataimport:false,
                editguest:false,
                car:{
                    plate_number:'',
                    active:1,
                    emp_id:null
                },
                guest:{
                    fullname_en:'',
                    Job_En:'',
                    fullname_ar:'',
                    qrcode:'',
                    military_number:'',
                    phone_number:null,
                    expiry_date:'',
                    qid:null,
                    gender_id:null,
                    nationality_id:null,
                    dep_id:null,
                    rank_id:null,
                    default_base:0,
                    selectedZones:null,
                    id:null,
                    plate_number:'',
                    dep_name:'',
                    nationality:'',
                    ranke:'',
                    dep3:'',
                    bloodtype:'',
                    nationalitye:''
                   
                },
                formDataGuest:{
                    fullname_en:'',
                    Job_En:'',
                    fullname_ar:'',
                    qrcode:'',
                    military_number:'',
                    phone_number:null,
                    expiry_date:'',
                    qid:'',
                    gender_id:null,
                    nationality_id:null,
                    dep_id:null,
                    rank_id:null,
                    default_base:0,
                    selectedZones:null,
                    plate_number:'',
                    dep_name:'',
                    nationality:'',
                    ranke:'',
                    dep3:'',
                    nationalitye:'',
                    bloodtype:'',
                    
                  
                },
           
                fieldValidity: {
                    military_number: true,
                    fullname_ar:true,
                    remarks:true,
                    bloodtype:true,
                    fullname_en:true,
                    Job_En:true,
                    qid:true,
                    expiry_date:true
                },
                selectedGender:null,
                selectedDep:null,
                selectedRank:null,
                selectedNationality:null,
                selectedBases:null,
                gender:[{id:1,name_en:'Male'},{id:2,name_en:'Female'}],
                departments:[],
                bases:[],
                ranks:[],
                nationalities:[],
            }
        },
        mounted() {
            this.fetchData();
            this.getEmployees();
        },
        computed: {
            mergedColumnDefs() {
                    const modifiedColumnDefs = [...this.ColumnsDef];

                    const columnIndex = modifiedColumnDefs.findIndex( (column) => column.headerName === "الحالة" );
                    if (columnIndex !== -1) { modifiedColumnDefs[columnIndex].cellRenderer = customCellRenderer; }

                    const colIndex = modifiedColumnDefs.findIndex( (column) => column.headerName === "الصورة" );
                    if (colIndex !== -1) { modifiedColumnDefs[colIndex].cellRenderer = customCellImgRenderer; }

                    return modifiedColumnDefs;
                    }
                },
        methods: {
            searchMilitary() {
    if (!this.search_military_number) return;

    api.post('/api/employees/search-military', {
        military_number: this.search_military_number
    })
    .then(res => {
        this.searchResult = res.data;
        this.showModal = true;
    })
    .catch(err => {
        console.log(err);
    });
},

clearSearch() {
    this.search_military_number = '';
    this.searchResult = null;
    this.showModal = false;
},

            async searchPlate(showAll) {
      if (!this.plate) return alert("Enter plate number");
      try {
        const { data } = await api.get(`/api/employees/cars/search-plate`, {
          params: { platenumber: this.plate, all: showAll ? 1 : 0 }
        });
        this.lastMovement = data.lastMovement;
        this.allMovements = data.allMovements || [];
      } catch (err) {
        console.error(err);
        alert("Error fetching records");
      }
    },
    clearResults() {
      this.lastMovement = null;
      this.allMovements = [];
      this.plate = "";
    },
  

            
            
            needsWhiteBorder(color) {
        const lightColors = ['#FFFFFF', '#FFFF00', '#00FFFF', '#FFCC00', /* add more */];
        return lightColors.includes(color.toUpperCase());
    },
            selectGuest(guestData){
                    this.guest = guestData;
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
                resetFilter() {
        this.military_number = '';
        this.fullname_ar = '';
        this.plate_number = '';
        this.getEmployees();
        this.isfiltered = false;
    },
    filter() {
        if (this.military_number.trim() === '' && this.plate_number.trim() === '' && this.fullname_ar.trim() === '') {
            this.fieldValidity.military_number = false;
            this.fieldValidity.fullname_ar = false;
            this.fieldValidity.plate_number = false;
            return;
        }

        this.ColumnsDef = [];
        this.RawData = [];
        this.RawDataStatus = [];
        this.totalRows = 0;

        this.isfiltered = true;
        this.agGridKey = 0;
        
        api.get('/api/employees', {
            params: {
                dep_id: this.depId,
                page: this.currentPage,
                per_page: this.perPage,
                military_number: this.military_number,
                fullname_ar: this.fullname_ar,
                plate_number: this.plate_number,
            },
        })
        .then(response => {
            this.step = '';
            this.ColumnsDef = response.data.columns;
            this.RawDataStatus = response.data.data;
            console.log(response.data.data);
            
            if (this.RawDataStatus && this.RawDataStatus[this.agGridKey] && this.RawDataStatus[this.agGridKey].guests) {
                this.RawData = this.RawDataStatus[this.agGridKey].guests.data;
                this.totalRows = this.RawDataStatus[this.agGridKey].pagination.total;
            } else {
                this.RawData = [];   
            }
        })
        .catch(error => {
            console.error("Error fetching data:", error);
        });
    },
                getEmployees(){
                    api.get('/api/employees',{
                        params: {
                            dep_id: this.depId,
                            page: this.currentPage,
                            per_page: this.perPage,
                        },
                    })
                    .then(response => {
                        this.step=response.data.data[this.agGridKey].id;
                        this.ColumnsDef = response.data.columns;
                        this.RawDataStatus=response.data.data;
                        
                        if(response.data.data[this.agGridKey].guests)
                        {
                        this.RawData = response.data.data[this.agGridKey].guests.data;
                        this.totalRows = response.data.data[this.agGridKey].pagination.total;
                        }
                        else
                        {
                            this.RawData =[];   
                        }
                    });
                },
                fetchData(){

                    this.toolbar=true;
                    this.toolbar2=false;

                    fetchDepartment(this.depId) 
                    .then(response => {
                        this.departments = response.data.departments;
                    }).catch(error => {
                        console.error(error);
                    });

                    fetchBases() 
                    .then(response => {
                        this.bases = response.data;
                    });

                    fetchRanks() 
                    .then(response => {
                        this.ranks = response.data;
                    });

                    fetchNationalities() 
                    .then(response => {
                        this.nationalities = response.data;
                    });  
                    api.get('/api/cars')
        .then(response => {
          this.cars = response.data;
        })
        .catch(error => {
          console.error('Error fetching data:', error);
        });

                },
                fetchList(i){
                        this.agGridKey=i;
                        this.getEmployees();
                },
                onGridReady(params){
                        gridApi.value = params.api;
                },
                onPageChange({ page, perPage }) {
                    this.currentPage = page;
                    if (perPage) {
                        this.perPage = perPage;
                    }
                   this.getEmployees();
                },
                onSelectionChanged(event) {
                        var selectedRows = event.api.getSelectedRows();
                        let checkedState = false;

                        selectedRows.forEach(function (selectedRow, index) {
                        if (index >= 0) {
                        checkedState = true;
                        }
                        });

                        if (checkedState) {
                        this.toolbar=false;
                        this.toolbar2=true;
                        } else {
                        this.toolbar=true;
                        this.toolbar2=false;
                        }
                },
                onBtExport(){
                        gridApi.value.exportDataAsCsv();
                },
                onBtImport(){
                        this.dataimport=true;
                },
                handleImport() {
                            this.dataimport=false; 
                },
                OpenInvite() {
                        this.invite = !this.invite;
                },
                OpenAddg() {
                        this.addg = !this.addg;
                },
                bulkprintCombined() {
    this.isLoading = true;

    function generateQRCode(text, size = 300) {
        const qr = QRCode(0, 'L');
        qr.addData(text);
        qr.make();
        const qrCodeHTML = `<img src="${qr.createDataURL(15)}" alt="QR Code" width="${size}" height="${size}" />`;
        return qrCodeHTML;
    }

    function generatePhoto(hussain, size = 1, shape = 'rounded-square') {
        const photo = hussain ? `/${hussain}` : '/uploads/nopic.png';
        const picHTML = `<img src="${photo}" alt="Photo" style="width: ${size}px; height: ${size}px; border-radius: ${shape === 'rounded-square' ? '5%' : '5'};" />`;
        return picHTML;
    }

    function generatePhotot(hussain, size = 1, shape = 'rounded-square') {
        const photot = hussain ? `/${hussain}` : '/uploads/nopic.png';
        const picHTML = `<img src="${photot}" alt="Photot" style="width: ${size}px; height: ${size}px; border-radius: ${shape === 'rounded-square' ? '5%' : '5'};" />`;
        return picHTML;
    }

    function generatePhoto2(hussain, size = 1, shape = 'rounded-square') {
        const base_photo = hussain ? `/${hussain}` : null; // Check for null
        if (!base_photo) {
            return '/uploads/nopic.png'; // Return default image if no base photo
        }
        const picHTML = `<img src="${base_photo}" alt="Photo" style="width: ${size}px; height: ${size}px; border-radius: ${shape === 'rounded-square' ? '5%' : '5'};" />`;
        return picHTML;
    }

    function generatePlateNumbers(plateNumbers) {
        if (!plateNumbers || plateNumbers.length === 0) {
            return '';
        }
        return plateNumbers.join('<br>');
    }
/* 
    function generateZone(zones){
        var zoning='<ul style="list-style:none;  padding: 0px 0px 0px 0px;">';
        zones.forEach(function(item) {
            zoning+='<li style="display:inline-block; margin-left:10px; width: 25px; height: 20px; background-color:'+item.color+';"></li>';
        });
        zoning+='</ul>';
        return zoning;  
    } */
    function generateZone(zones) {
    var zoning = '<ul style="list-style:none; padding: 0px 0px 0px 0px;">';
    
    zones.forEach(function(item) {
        const color = item.color || '';
        const needsLine = needsWhiteLine(color); // Renamed function
        
      zoning += `
<li style="display: inline-block; margin-left: 10px; width: 25px; height: 20px;">
    <svg width="25" height="20" viewBox="0 0 25 20">
        <rect width="25" height="20" fill="${color}"/>
        ${needsLine ? `
        <line x1="0" y1="20" x2="25" y2="0" 
              stroke="white" stroke-width="3" stroke-linecap="round"/>
        ` : ''}
    </svg>
</li>`;
    });
    
    zoning += '</ul>';
    return zoning;  
}

// Helper function (same colors as before)
function needsWhiteLine(color) {
    if (!color) return false;
    
    // Handle rgb() format
    if (color.startsWith('rgb(')) {
        const rgb = color.match(/\d+/g);
        if (rgb && rgb.length >= 3) {
            // Convert RGB to brightness
            const brightness = (parseInt(rgb[0]) * 299 + 
                              parseInt(rgb[1]) * 587 + 
                              parseInt(rgb[2]) * 114) / 1000;
            return brightness > 180;
        }
        return false;
    }
    
    // Handle hex format
    let normalizedColor = color.trim().toUpperCase();
    if (!normalizedColor.startsWith('#')) {
        normalizedColor = '#' + normalizedColor;
    }
    
    const lineColors = [
        '#020202', '#87CEEB', 
        // Add any other color values you find in your debug output
    ];
    
    return lineColors.includes(normalizedColor);
}

    const pdfConfig = {
        margin: -9,
        filename: 'badge_combined.pdf',
        image: { type: 'jpeg', quality: 2},
        html2canvas: { scale: 5},
        jsPDF: { unit: 'mm', format: [54, 94.0], orientation: 'portrait' },
    };

    let contentu = '';
    const selectedRows = gridApi.value.getSelectedRows();
    const guestIds = selectedRows.map(row => row.id);

    const axiosPromises = guestIds.map((guestId, index) => {
        return api.get('/api/badges/' + guestId)
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
                    fullname_en: data.fullname_en,
                    Job_En: data.Job_En,
                    fullname_ar: data.fullname_ar,
                    department: data.department,
                    rank: data.rank,
                    military_number: data.military_number,
                    default_base: data.default_base,
                    zones: generateZone(data.ZoneColor),
                    expiry_date: data.expiry_date,
                    ranke: data.ranke,
                    plate_numbers: generatePlateNumbers(data.plate_numbers) // Adjusted for multiple plate numbers
                });

                const containerDiv = document.createElement('div');
                containerDiv.style.height = '94.0mm';
                containerDiv.style.padding = '6mm';
                containerDiv.style.backgroundImage = 'url("/uploads/012.png")';
                containerDiv.style.backgroundPosition = 'center center'; // centers the image
                containerDiv.style.backgroundSize = 'cover'; // ensures the image covers the container fully
                containerDiv.style.backgroundRepeat = 'no-repeat'; // prevents the image from repeating
                containerDiv.innerHTML = replacedHTML;

                contentu += containerDiv.outerHTML;
            });
    });

    Promise.all(axiosPromises)
        .then(() => {
            api.post('/api/employees/approved', {'guests': guestIds, by: this.userName, 'status': 2})
                .then(response => {
                    this.getEmployees();
                });

            const pdfConfig2 = {
                margin: -4,
                filename: 'badge_combined.pdf',
                image: { type: 'jpeg', quality: 2},
                html2canvas: { scale: 5},
                jsPDF: { unit: 'mm', format: [54, 86.0], orientation: 'portrait' },
            };

            let contentu2 = '';
            const axiosPromises2 = guestIds.map((guestId, index) => {
                return api.get('/api/badges2/' + guestId)
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
                            fullname_en: data.fullname_en,
                            Job_En: data.Job_En,
                            fullname_ar: data.fullname_ar,
                            department: data.department,
                            rank: data.rank,
                            bloodtype: data.bloodtype,
                            military_number: data.military_number,
                            default_base: data.default_base,
                            zones: generateZone(data.ZoneColor),
                            expiry_date: data.expiry_date,
                            plate_numbers: generatePlateNumbers(data.plate_numbers),
                            dep_id: data.dep_id,
                            dep_name: data.dep_name,
                            dep3: data.dep3,
                            nationality: data.nationality,
                            nationalitye: data.nationalitye
                        });

                        const containerDiv = document.createElement('div');
                        containerDiv.style.height = '93.0mm';
                        containerDiv.style.padding = '1mm';
                        containerDiv.style.backgroundImage = 'url("/uploads/20.png")';
                        containerDiv.style.backgroundPosition = 'center center'; // centers the image
                        containerDiv.style.backgroundSize = 'cover'; // ensures the image covers the container fully
                        containerDiv.style.backgroundRepeat = 'no-repeat'; // prevents the image from repeating
                        containerDiv.innerHTML = replacedHTML;

                        contentu2 += containerDiv.outerHTML;
                    });
            });

            Promise.all(axiosPromises2)
                .then(() => {
                    const finalContent = `
                        <div>${contentu}</div>
                        <div style="page-break-before: always;">${contentu2}</div>
                    `;

                    html2pdf().from(finalContent).set(pdfConfig).outputPdf()
                        .get('pdf')
                        .then(function (pdfObj) {
                            pdfObj.autoPrint();
                            window.open(pdfObj.output("bloburl"), "F");
                        });

                    setTimeout(() => {
                        this.isLoading = false;
                    }, 5000);
                });
        });
},



                bulkprint2(){
                    this.isLoading = true;

                    function generateQRCode(text, size = 700) {
    const qr = QRCode(0, 'L');
    qr.addData(text);
    qr.make();
    const qrCodeHTML = `<img src="${qr.createDataURL(15)}" alt="QR Code" width="${size}" height="${size}" />`;
    return qrCodeHTML;
}

function generatePhoto(hussain, size = 1, shape = 'rounded-square') {
    const photo = hussain ? `/${hussain}` : '/uploads/nopic.png';
    const picHTML = `<img src="${photo}" alt="Photo" style="width: ${size}px; height: ${size}px; border-radius: ${shape === 'rounded-square' ? '5%' : '5'};" />`;
    return picHTML;
}
function generatePhotot(hussain, size = 1, shape = 'rounded-square') {
    const photot = hussain ? `/${hussain}` : '/uploads/nopic.png';
    const picHTML = `<img src="${photot}" alt="Photot" style="width: ${size}px; height: ${size}px; border-radius: ${shape === 'rounded-square' ? '5%' : '5'};" />`;
    return picHTML;
}
function generatePhoto2(hussain, size = 1, shape = 'rounded-square') {
  const base_photo = hussain ? `/${hussain}` : null; // Check for null
  if (!base_photo) {
    return '/uploads/nopic.png'; // Return default image if no base photo
  }
  const picHTML = `<img src="${base_photo}" alt="Photo" style="width: ${size}px; height: ${size}px; border-radius: ${shape === 'rounded-square' ? '5%' : '5'};" />`;
  return picHTML;
}
function generatePlateNumbers(plateNumbers) {
            if (!plateNumbers || plateNumbers.length === 0) {
                return '';
            }
            return plateNumbers.join(' // ');
        }




                                function generateZone(zones){
    var zoning='<ul style="list-style:none;  padding: 0px 0px 0px 0px;">';
    zones.forEach(function(item) {
        zoning+='<li style="display:inline-block; margin-left:10px; width: 25px; height: 20px; background-color:'+item.color+';"></li>';
    });
    zoning+='</ul>';
    return zoning;  
}



                                const pdfConfig = {
                                                margin: 0,
                                                filename: 'badge2.pdf',
                                                image: { type: 'jpeg', quality: 2},
                                                html2canvas: { scale: 5},
                                                jsPDF: { unit: 'mm', format: [54,86.0], orientation: 'portrait' },
                                        };

                                
                                        let contentu = '';
                                        const selectedRows = gridApi.value.getSelectedRows();
                                        const guestIds = selectedRows.map(row => row.id);

                                        
                                        const axiosPromises = guestIds.map((guestId, index) => {
                                        return api.get('/api/badges2/' + guestId)
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
                          /*               base_photo: generatePhoto2(data.base_photo), */
                                        fullname_en: data.fullname_en,
                                        Job_En: data.Job_En,
                                        fullname_ar: data.fullname_ar,
                                        department: data.department,
                                        rank: data.rank,
                                        bloodtype: data.bloodtype,
                                        military_number: data.military_number,
                                        default_base: data.default_base,
                                        zones: generateZone(data.ZoneColor),
                                        expiry_date: data.expiry_date,
                                             plate_numbers: generatePlateNumbers(data.plate_numbers),
                                             dep_id : data.dep_id, // Adjusted for multiple plate numbers
                                             dep_name: data.dep_name,
                                             dep3: data.dep3,
                                    nationality: data.nationality,
                                    nationalitye: data.nationalitye
                                        });

                                        const containerDiv = document.createElement('div');
                                        containerDiv.style.height = '86.0mm';
                                        containerDiv.style.padding = '1mm';
                                        containerDiv.style.backgroundImage = 'url("/uploads/20.png")';
containerDiv.style.backgroundPosition = 'center center'; // centers the image
containerDiv.style.backgroundSize = 'cover'; // ensures the image covers the container fully
containerDiv.style.backgroundRepeat = 'no-repeat'; // prevents the image from repeating
                                        containerDiv.innerHTML = replacedHTML;

                                        contentu += containerDiv.outerHTML;
                                        });
                                        });

                                        
                                        Promise.all(axiosPromises)
                                        .then(() => {

                                            api.post('/api/employees/approved', {'guests':guestIds,by:this.userName,'status':2})
                                            .then(response => {
                                            this.getEmployees();             
                                            });

                                            html2pdf().from(contentu).set(pdfConfig).outputPdf()  
                                            .get('pdf')
                                            .then(function (pdfObj) {
                                            pdfObj.autoPrint();
                                            window.open(pdfObj.output("bloburl"), "F")
                                            });

                                    
                                        });

                        setTimeout(() => {
                        this.isLoading = false;
                    }, 5000);       


                    },
                    bulkprint(){
                    this.isLoading = true;

                    function generateQRCode(text, size = 300) {
    const qr = QRCode(0, 'L');
    qr.addData(text);
    qr.make();
    const qrCodeHTML = `<img src="${qr.createDataURL(15)}" alt="QR Code" width="${size}" height="${size}" />`;
    return qrCodeHTML;
}

function generatePhoto(hussain, size = 1, shape = 'rounded-square') {
    const photo = hussain ? `/${hussain}` : '/uploads/nopic.png';
    const picHTML = `<img src="${photo}" alt="Photo" style="width: ${size}px; height: ${size}px; border-radius: ${shape === 'rounded-square' ? '5%' : '5'};" />`;
    return picHTML;
}
function generatePhotot(hussain, size = 1, shape = 'rounded-square') {
    const photot = hussain ? `/${hussain}` : '/uploads/nopic.png';
    const picHTML = `<img src="${photot}" alt="Photot" style="width: ${size}px; height: ${size}px; border-radius: ${shape === 'rounded-square' ? '5%' : '5'};" />`;
    return picHTML;
}
function generatePhoto2(hussain, size = 1, shape = 'rounded-square') {
  const base_photo = hussain ? `/${hussain}` : null; // Check for null
  if (!base_photo) {
    return '/uploads/nopic.png'; // Return default image if no base photo
  }
  const picHTML = `<img src="${base_photo}" alt="Photo" style="width: ${size}px; height: ${size}px; border-radius: ${shape === 'rounded-square' ? '5%' : '5'};" />`;
  return picHTML;
}
function generatePlateNumbers(plateNumbers) {
            if (!plateNumbers || plateNumbers.length === 0) {
                return '';
            }
            return plateNumbers.join(' (2) ');
        }




                                function generateZone(zones){
    var zoning='<ul style="list-style:none;  padding: 0px 0px 0px 0px;">';
    zones.forEach(function(item) {
        zoning+='<li style="display:inline-block; margin-left:10px; width: 25px; height: 20px; background-color:'+item.color+';"></li>';
    });
    zoning+='</ul>';
    return zoning;  
}



                                const pdfConfig = {
                                                margin: -9,
                                                filename: 'badge2.pdf',
                                                image: { type: 'jpeg', quality: 2},
                                                html2canvas: { scale: 5},
                                                jsPDF: { unit: 'mm', format: [54,94.0], orientation: 'portrait' },
                                        };

                                
                                        let contentu = '';
                                        const selectedRows = gridApi.value.getSelectedRows();
                                        const guestIds = selectedRows.map(row => row.id);

                                        
                                        const axiosPromises = guestIds.map((guestId, index) => {
                                        return api.get('/api/badges/' + guestId)
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
                          /*               base_photo: generatePhoto2(data.base_photo), */
                                        fullname_en: data.fullname_en,
                                        Job_En: data.Job_En,
                                        fullname_ar: data.fullname_ar,
                                        department: data.department,
                                        rank: data.rank,
                                        military_number: data.military_number,
                                        default_base: data.default_base,
                                        zones: generateZone(data.ZoneColor),
                                        expiry_date: data.expiry_date,
                                        ranke: data.ranke,
                                             plate_numbers: generatePlateNumbers(data.plate_numbers) // Adjusted for multiple plate numbers
                                        });

                                        const containerDiv = document.createElement('div');
                                        containerDiv.style.height = '94.0mm';
                                        containerDiv.style.padding = '6mm';
                                        containerDiv.style.backgroundImage = 'url("/uploads/012.png")';
containerDiv.style.backgroundPosition = 'center center'; // centers the image
containerDiv.style.backgroundSize = 'cover'; // ensures the image covers the container fully
containerDiv.style.backgroundRepeat = 'no-repeat'; // prevents the image from repeating
                                        containerDiv.innerHTML = replacedHTML;

                                        contentu += containerDiv.outerHTML;
                                        });
                                        });

                                        
                                        Promise.all(axiosPromises)
                                        .then(() => {

                                            api.post('/api/employees/approved', {'guests':guestIds,by:this.userName,'status':2})
                                            .then(response => {
                                            this.getEmployees();             
                                            });

                                            html2pdf().from(contentu).set(pdfConfig).outputPdf()  
                                            .get('pdf')
                                            .then(function (pdfObj) {
                                            pdfObj.autoPrint();
                                            window.open(pdfObj.output("bloburl"), "F")
                                            });

                                    
                                        });

                        setTimeout(() => {
                        this.isLoading = false;
                    }, 5000);       


                    },  updateguest(){
                        const formData = new FormData(document.getElementById('formeditguest'));
                        formData.append('gender_id', this.guest.gender_id);
                        formData.append('dep_id', Object.keys(this.guest.dep_id)[0]);
                        formData.append('nationality_id', this.guest.nationality_id);
                        formData.append('rank_id', Object.keys(this.guest.rank_id)[0]);
                        formData.append('default_base', this.guest.default_base);
                        formData.append('zones', this.guest.selectedZones);

                        api.post('/api/employees', formData)
                        .then(response => {
                            this.getEmployees();
                            this.blokGuest=false;
                            window.location.href = "https://gate.qatar.gov/database";
                        });

                },
                addCar(){

                        if (this.car.plate_number == '') {
                            this.$toast.add({ severity: 'Field Required', summary: 'Error', detail: 'Plate number', life: 3000 });
                            return;
                        }

                        api.post('/api/employees/cars', this.car)
                        .then(response => {

                            api.get('/api/guests/'+response.data.guest_id) 
                            .then(response => {
                            this.guest = response.data[0];
                            });
                            
                        }).catch(error => {
                            this.$toast.add({ severity: 'Field Required', summary: 'Error', detail: 'Plate number', life: 3000 });
                        });
                },
                delCar(id) {
      console.log('Delete method called with ID:', id); // Debugging log
      if (!id) {
        console.error('ID is undefined or null'); // Debugging log
        return;
      }
      this.$confirm.require({
        message: 'Do you want to delete this record?',
        header: 'Delete Confirmation',
        icon: 'pi pi-info-circle',
        acceptClass: 'p-button-danger',
        accept: () => {
          console.log('Accepted deletion'); // Debugging log
          api.post('/api/employees/cars', { id: id })
            .then(response => {
              console.log('Response:', response); // Debugging log
              if (response.data.status === 'success') {
                this.fetchData();
                this.$toast.add({ severity: 'info', summary: 'Confirmed', detail: 'Deleted Successfully', life: 3000 });
              } else {
                this.$toast.add({ severity: 'error', summary: 'Error', detail: response.data.message, life: 3000 });
              }
            })
            .catch(error => {
              console.log('Error:', error); // Debugging log
              this.$toast.add({ severity: 'error', summary: 'Error', detail: 'An error occurred.', life: 3000 });
            });
        },
        reject: () => {
          console.log('Deletion rejected'); // Debugging log
        }
      });
    },
                createguest(){

                    if (this.guest.military_number.trim() === '') {
                    this.fieldValidity.military_number = false;
                    return;
                    }

                    if (this.guest.fullname_ar.trim() === '') {
                    this.fieldValidity.fullname_ar = false;
                    return;
                    }
                  if (this.guest.remarks.trim() === '') {
                    this.fieldValidity.remarks = false;
                    return;
                    }
                    if (this.guest.bloodtype.trim() === '') {
                    this.fieldValidity.bloodtype = false;
                    return;
                    }
                    if (this.guest.fullname_en.trim() === '') {
                    this.fieldValidity.fullname_en = false;
                    return;
                    }
                    if (this.guest.Job_En.trim() === '') {
                    this.fieldValidity.Job_En = false;
                    return;
                    }

                    if (this.guest.qid.trim() === '') {
                    this.fieldValidity.qid = false;
                    return;
                    }

                    if (this.guest.expiry_date.trim() === '') {
                    this.fieldValidity.expiry_date = false;
                    return;
                    }

                        const formData = new FormData(document.getElementById('formguest'));
                        formData.append('gender_id', this.guest.gender_id);
                        formData.append('dep_id', Object.keys(this.guest.dep_id)[0]);
                        formData.append('nationality_id', this.guest.nationality_id);
                        formData.append('rank_id', Object.keys(this.guest.rank_id)[0]);
                        formData.append('default_base', this.guest.default_base);
                        formData.append('zones', this.guest.selectedZones);

                        if (this.guest.default_base == 0) {
                            this.$toast.add({ severity: 'error', summary: 'Error', detail: 'Select Default Base', life: 3000 });
                            return;
                        }

                        api.post('/api/employees', formData)
                        .then(response => {
                            this.getEmployees();
                            this.addg=false;
                        }).catch(error => {
                            this.$toast.add({ severity: 'error', summary: 'Error', detail: 'Please fill all the mandatory fields.', life: 3000 });
                        });
                },
                OnClicked(event){
                        var id = event.data.id;
                        this.editguest=false;
                        this.activeTab=10;
                        this.car.emp_id=event.data.id;

                        api.get('/api/guests/'+id) 
                        .then(response => {
                        this.guest = response.data[0];
                        this.guest.dep_id={ [response.data[0].dep_id]: true };
                        this.guest.rank_id={ [response.data[0].rank_id]: true };
                        });

                        this.blokGuest=true;

                },
                deleteSelected(){
                        this.$confirm.require({
                        message: 'Do you want to delete this record?',
                        header: 'Delete Confirmation',
                        icon: 'pi pi-info-circle',
                        acceptClass: 'p-button-danger',
                        accept: () => {
                        const selectedRows = gridApi.value.getSelectedRows();
                        const guestIds = selectedRows.map(row => row.id);

                        api.post('/api/employees', {'guests':guestIds})
                        .then(response => {
                        this.getEmployees();
                        });

                        this.$toast.add({ severity: 'info', summary: 'Confirmed', detail: 'Deleted Successfuly', life: 3000 });
                        },
                        reject: () => {

                        }
                        });
                },
                approveSelected(status){
                        this.$confirm.require({
                        message: 'Are you sure you want to proceed?',
                        header: 'Approved Confirmation',
                        icon: 'pi pi-exclamation-triangle',
                        acceptClass: 'p-button-success',
                        accept: () => {
                        const selectedRows = gridApi.value.getSelectedRows();
                        const guestIds = selectedRows.map(row => row.id);

                        api.post('/api/employees/approved', {guests:guestIds,by:this.userName,'status':status})
                        .then(response => {
                        this.getEmployees();
                        });

                        this.$toast.add({ severity: 'info', summary: 'Confirmed', detail: 'Approved Successfuly', life: 3000 });
                        },
                        reject: () => {

                        }
                        });
                },
        }
}
</script>