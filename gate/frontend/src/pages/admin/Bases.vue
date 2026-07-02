<template>
        <PageContainer title="Bases List" :description="`From total of ${bases.length} Bases`">
                <template #actions>
                    <button @click="Addbas" class="rounded-lg p-2 text-sm font-medium text-brand hover:bg-brand-muted">
                        <i class="pi pi-plus-circle"></i> Create Base
                    </button>
                </template>

                <AppCard padding="lg">
                                <div class="flex flex-col mt-8">
                                <div class="overflow-x-auto rounded-lg">
                                <div class="align-middle inline-block min-w-full">

                                <div class="grid grid-cols-2 gap-4">
                                    <Card v-for="data in bases" :key="data.id" class="bg-white text-gray-700 border shadow-md rounded-md">
                                        <template #title> 
                                        <div class="mt-4 w-full flex justify-between">
                                        <div>
                                                {{data.name_en}} 
                                            <br>    <small> {{data.name_ar}} </small>
                                        </div>
                                        <div>
                                                <div class="flex gap-1">
                                                    <AppTableActions
                                                        :show-delete="true"
                                                        @edit="editBas(data.id)"
                                                        @delete="deleteBase(data.id)"
                                                    />
                                                </div>
                                        </div>
                                        </div>
                                        </template>
                                        <template #content>
                                            
                                                    <div class="flex items-center justify-between">
                                                    <div>
                                                    
                                                    </div>
                                                    <div class="flex-shrink-0">
                                                    <button @click="AddZon(data.id)" class="text-sm font-medium text-cyan-600 hover:bg-gray-100 rounded-lg p-2"> <i class="pi pi-plus-circle"></i> Create Zone</button>
                                                    </div>
                                                    </div>
                                                    <table class="min-w-full divide-y divide-gray-200">
                                            
                                                    <thead class="bg-gray-50">
                                                    <tr>
                                                    <th scope="col" class="p-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                    Zone
                                                    </th>
                                                    <th scope="col" class="p-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                    
                                                    </th>
                                                    <th scope="col" class="p-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                    Created At
                                                    </th>
                                                    <th scope="col" class="p-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                    </th>
                                                    </tr>
                                                    </thead>

                                                    <tbody class="bg-white">
                                                    <tr v-for="zone in data.zones" :key="zone.id">
                                                    <td class="p-2 whitespace-nowrap text-sm font-normal text-gray-900">
                                                    <div class="relative h-10 w-10">
                                                        <span class="absolute right-0 bottom-0 h-10 w-10 rounded-full ring ring-white" :style="'background-color:'+zone.color"></span>
                                                    </div>
                                                    </td>
                                                    <td class="p-2 whitespace-nowrap text-sm font-normal text-gray-900">
                                                    <span class="font-semibold">{{zone.name_en}}</span>
                                                    </td>
                                                    <td class="p-2 whitespace-nowrap text-sm font-normal text-gray-500">
                                                    {{zone.created_at}}
                                                    </td>
                                                    <td class="p-2 whitespace-nowrap text-sm font-semibold text-gray-900">
                                                    <div class="flex justify-end gap-1">
                                                    <AppTableActions
                                                        @edit="editZon(zone.id)"
                                                        @delete="deleteZone(zone.id)"
                                                    />
                                                    </div>
                                                    </td>
                                                    </tr>
                                                    </tbody>
                                                </table>


                                                <hr class="my-8" />
                                           
                                                    <div class="flex items-center justify-between">
                                                    <div>
                                                    
                                                    </div>
                                                    <div class="flex-shrink-0">
                                                    <button @click="AddGat(data.id)" class="text-sm font-medium text-cyan-600 hover:bg-gray-100 rounded-lg p-2"> <i class="pi pi-plus-circle"></i> Create Gate</button>
                                                    </div>
                                                    </div>
                                                    <table class="min-w-full divide-y divide-gray-200">
                                            
                                                    <thead class="bg-gray-50">
                                                    <tr>
                                                    <th scope="col" class="p-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                    Gate
                                                    </th>
                                                    <th scope="col" class="p-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                    
                                                    </th>
                                                    <th scope="col" class="p-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                    Created At
                                                    </th>
                                                    <th scope="col" class="p-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                    </th>
                                                    </tr>
                                                    </thead>

                                                    <tbody class="bg-white">
                                                    <tr v-for="gate in data.gates" :key="gate.id">
                                                    <td class="p-2 whitespace-nowrap text-sm font-normal text-gray-900">
                                                    <span class="font-semibold">{{gate.name_en}}</span>
                                                    </td>
                                                    <td class="p-2 whitespace-nowrap text-sm font-normal text-gray-900">
                                                    <span class="font-semibold">{{gate.name_ar}}</span>
                                                    </td>
                                                    <td class="p-2 whitespace-nowrap text-sm font-normal text-gray-500">
                                                    {{gate.created_at}}
                                                    </td>
                                                    <td class="p-2 whitespace-nowrap text-sm font-semibold text-gray-900">
                                                    <div class="flex space-x-4 justify-end">
                                                    <button @click="deleteGate(gate.id)" class="relative z-10 block w-10 h-10 ">
                                                    <i class="pi pi-trash"></i>
                                                    </button>
                                                    <button @click="editGat(gate.id)" class="relative z-10 block w-10 h-10 ">
                                                    <i class="pi pi-pencil"></i>
                                                    </button>
                                                    </div>
                                                    </td>
                                                    </tr>
                                                    </tbody>
                                                </table>
                                          
                                        </template>
                                    </Card>
                                </div>


                                        
                                </div>
                                </div>
                                </div>
                </AppCard>
        </PageContainer>

        <VueSidePanel v-model="isOpenedC"  lock-scroll noClose="true" width="600px" >
        <div>
            <form novalidate="" @submit.prevent="addBase">
            <div class="flex h-full flex-col divide-y divide-neutral-200 bg-white dark:divide-neutral-700 dark:bg-neutral-900">
            <div class="flex min-h-0 flex-1 flex-col overflow-y-scroll py-6">
            <div class="px-4 sm:px-6">
            <div class="flex items-start justify-between">
            <div class="space-y-1">
            <h2 class="text-lg font-medium text-neutral-700 dark:text-white">
            Create Base
            </h2>
            </div>
            </div>
            </div>
            <div class="relative mt-8 flex-1 px-4 sm:px-6">
            <div>
            <div class="">
            <div class="grid grid-cols-12 gap-x-4">

            <div class="col-span-12">
            <div class="mb-3">
            <label class="block text-sm font-medium text-neutral-700 dark:text-neutral-100 mb-1 inline-flex items-center" >
            <span>Name [En]</span>
            <span class="mr-1 text-sm text-danger-600">*</span>
            </label>
            <div class="relative">
            <input type="text" placeholder="Base Name" v-model="formDataBase.name_en" :class="{ 'border-red-500': !fieldValidity.name_en }" @input="fieldValidity.name_en = true" class="flex h-10 w-full items-center justify-center rounded-md border bg-white/0 p-3 text-sm outline-none border-gray-200">
            </div>
            </div>
            </div>

            <div class="col-span-12">
            <div class="mb-3">
            <label class="block text-sm font-medium text-neutral-700 dark:text-neutral-100 mb-1 inline-flex items-center" >
            <span>Name [Ar]</span>
            </label>
            <div class="relative">
            <input type="text" placeholder="Department Name" v-model="formDataBase.name_ar" class="flex h-10 w-full items-center justify-center rounded-md border bg-white/0 p-3 text-sm outline-none border-gray-200">
            </div>
            </div>
            </div>


            </div>
            </div>
            </div>
            </div>
            </div>
            <div class="shrink-0 px-4 py-4 dark:bg-neutral-800">
            <div class="flex flex-wrap justify-end space-x-3 sm:flex-nowrap">
            <button @click="isOpenedC = false" type="button" class="inline-flex text-sm bg-white text-black  border border-gray-500 hover:bg-blue-700 py-2 px-4 rounded">
            Cancel
            </button>
            <span class="relative z-0 inline-flex shadow-sm rounded-md">
            <button type="submit" class="inline-flex text-sm bg-blue-500 hover:bg-blue-700 text-white py-2 px-4 focus:z-10 rounded-l-md -mr-px">
            Save
            </button>
            </span>
            </div>
            </div>
            </div>
            </form>
        </div>
        </VueSidePanel>

        <VueSidePanel v-model="isOpenedE"  lock-scroll noClose="true" width="600px" >
        <div>
            <form novalidate="" @submit.prevent="editBase">
            <div class="flex h-full flex-col divide-y divide-neutral-200 bg-white">
            <div class="flex min-h-0 flex-1 flex-col overflow-y-scroll py-6">
            <div class="px-4 sm:px-6">
            <div class="flex items-start justify-between">
            <div class="space-y-1">
            <h2 class="text-lg font-medium text-neutral-700 dark:text-white">
            Edit Base
            </h2>
            </div>
            </div>
            </div>
            <div class="relative mt-8 flex-1 px-4 sm:px-6">
            <div>
            <div class="">
            <div class="grid grid-cols-12 gap-x-4">

            <div class="col-span-12">
            <div class="mb-3">
            <label class="block text-sm font-medium text-neutral-700 dark:text-neutral-100 mb-1 inline-flex items-center" >
            <span>Name [En]</span>
            <span class="mr-1 text-sm text-danger-600">*</span>
            </label>
            <div class="relative">
            <input type="text" placeholder="Base Name" v-model="formEditBase.name_en" :class="{ 'border-red-500': !fieldValidity.name_en }" @input="fieldValidity.name_en = true" class="flex h-10 w-full items-center justify-center rounded-md border bg-white/0 p-3 text-sm outline-none border-gray-200">
            </div>
            </div>
            </div>

            <div class="col-span-12">
            <div class="mb-3">
            <label class="block text-sm font-medium text-neutral-700 dark:text-neutral-100 mb-1 inline-flex items-center" >
            <span>Name [Ar]</span>
            </label>
            <div class="relative">
            <input type="text" placeholder="Department Name" v-model="formEditBase.name_ar" class="flex h-10 w-full items-center justify-center rounded-md border bg-white/0 p-3 text-sm outline-none border-gray-200">
            </div>
            </div>
            </div>


            </div>
            </div>
            </div>
            </div>
            </div>
            <div class="shrink-0 px-4 py-4 dark:bg-neutral-800">
            <div class="flex flex-wrap justify-end space-x-3 sm:flex-nowrap">
            <button @click="isOpenedE = false" type="button" class="inline-flex text-sm bg-white text-black  border border-gray-500 hover:bg-blue-700 py-2 px-4 rounded">
            Cancel
            </button>
            <span class="relative z-0 inline-flex shadow-sm rounded-md">
            <button type="submit" class="inline-flex text-sm bg-blue-500 hover:bg-blue-700 text-white py-2 px-4 focus:z-10 rounded-l-md -mr-px">
            Save
            </button>
            </span>
            </div>
            </div>
            </div>
            </form>
        </div>
        </VueSidePanel>


        <VueSidePanel v-model="isOpenedG"  lock-scroll noClose="true" width="600px" >
        <div>
            <form novalidate="" @submit.prevent="addGate">
            <div class="flex h-full flex-col divide-y divide-neutral-200 bg-white dark:divide-neutral-700 dark:bg-neutral-900">
            <div class="flex min-h-0 flex-1 flex-col overflow-y-scroll py-6">
            <div class="px-4 sm:px-6">
            <div class="flex items-start justify-between">
            <div class="space-y-1">
            <h2 class="text-lg font-medium text-neutral-700 dark:text-white">
            Create Gate
            </h2>
            </div>
            </div>
            </div>
            <div class="relative mt-8 flex-1 px-4 sm:px-6">
            <div>
            <div class="">
            <div class="grid grid-cols-12 gap-x-4">

            <div class="col-span-12">
            <div class="mb-3">
            <label class="block text-sm font-medium text-neutral-700 dark:text-neutral-100 mb-1 inline-flex items-center" >
            <span>Name [En]</span>
            <span class="mr-1 text-sm text-danger-600">*</span>
            </label>
            <div class="relative">
            <input type="text" placeholder="Gate Name" v-model="formDataGate.name_en" :class="{ 'border-red-500': !fieldValidity.name_en }" @input="fieldValidity.name_en = true" class="flex h-10 w-full items-center justify-center rounded-md border bg-white/0 p-3 text-sm outline-none border-gray-200">
            </div>
            </div>
            </div>

            <div class="col-span-12">
            <div class="mb-3">
            <label class="block text-sm font-medium text-neutral-700 dark:text-neutral-100 mb-1 inline-flex items-center" >
            <span>Name [Ar]</span>
            </label>
            <div class="relative">
            <input type="text" placeholder="Gate Name" v-model="formDataGate.name_ar" class="flex h-10 w-full items-center justify-center rounded-md border bg-white/0 p-3 text-sm outline-none border-gray-200">
            </div>
            </div>
            </div>


            </div>
            </div>
            </div>
            </div>
            </div>
            <div class="shrink-0 px-4 py-4 dark:bg-neutral-800">
            <div class="flex flex-wrap justify-end space-x-3 sm:flex-nowrap">
            <button @click="isOpenedG = false" type="button" class="inline-flex text-sm bg-white text-black  border border-gray-500 hover:bg-blue-700 py-2 px-4 rounded">
            Cancel
            </button>
            <span class="relative z-0 inline-flex shadow-sm rounded-md">
            <button type="submit" class="inline-flex text-sm bg-blue-500 hover:bg-blue-700 text-white py-2 px-4 focus:z-10 rounded-l-md -mr-px">
            Save
            </button>
            </span>
            </div>
            </div>
            </div>
            </form>
        </div>
        </VueSidePanel>

        <VueSidePanel v-model="isOpenedGE"  lock-scroll noClose="true" width="600px" >
        <div>
            <form novalidate="" @submit.prevent="editGate">
            <div class="flex h-full flex-col divide-y divide-neutral-200 bg-white">
            <div class="flex min-h-0 flex-1 flex-col overflow-y-scroll py-6">
            <div class="px-4 sm:px-6">
            <div class="flex items-start justify-between">
            <div class="space-y-1">
            <h2 class="text-lg font-medium text-neutral-700 dark:text-white">
            Edit Gate
            </h2>
            </div>
            </div>
            </div>
            <div class="relative mt-8 flex-1 px-4 sm:px-6">
            <div>
            <div class="">
            <div class="grid grid-cols-12 gap-x-4">

            <div class="col-span-12">
            <div class="mb-3">
            <label class="block text-sm font-medium text-neutral-700 dark:text-neutral-100 mb-1 inline-flex items-center" >
            <span>Name [En]</span>
            <span class="mr-1 text-sm text-danger-600">*</span>
            </label>
            <div class="relative">
            <input type="text" placeholder="Gate Name" v-model="formEditGate.name_en" :class="{ 'border-red-500': !fieldValidity.name_en }" @input="fieldValidity.name_en = true" class="flex h-10 w-full items-center justify-center rounded-md border bg-white/0 p-3 text-sm outline-none border-gray-200">
            </div>
            </div>
            </div>

            <div class="col-span-12">
            <div class="mb-3">
            <label class="block text-sm font-medium text-neutral-700 dark:text-neutral-100 mb-1 inline-flex items-center" >
            <span>Name [Ar]</span>
            </label>
            <div class="relative">
            <input type="text" placeholder="Gate Name" v-model="formEditGate.name_ar" class="flex h-10 w-full items-center justify-center rounded-md border bg-white/0 p-3 text-sm outline-none border-gray-200">
            </div>
            </div>
            </div>


            </div>
            </div>
            </div>
            </div>
            </div>
            <div class="shrink-0 px-4 py-4 dark:bg-neutral-800">
            <div class="flex flex-wrap justify-end space-x-3 sm:flex-nowrap">
            <button @click="isOpenedGE = false" type="button" class="inline-flex text-sm bg-white text-black  border border-gray-500 hover:bg-blue-700 py-2 px-4 rounded">
            Cancel
            </button>
            <span class="relative z-0 inline-flex shadow-sm rounded-md">
            <button type="submit" class="inline-flex text-sm bg-blue-500 hover:bg-blue-700 text-white py-2 px-4 focus:z-10 rounded-l-md -mr-px">
            Save
            </button>
            </span>
            </div>
            </div>
            </div>
            </form>
        </div>
        </VueSidePanel>

        <VueSidePanel v-model="isOpenedZ" lock-scroll hide-close-btn width="600px">
            <div class="flex h-full flex-col bg-white" dir="ltr">
                <form novalidate class="flex h-full flex-col" @submit.prevent="addZone">
                    <div class="flex-none border-b border-slate-200 bg-slate-50 px-6 py-4">
                        <div class="flex items-start justify-between">
                            <div>
                                <h2 class="text-lg font-semibold text-slate-800">Create Zone</h2>
                                <p class="mt-1 text-sm text-slate-500">Add a new zone to this base</p>
                            </div>
                            <button type="button" class="text-slate-400 transition hover:text-slate-600" @click="isOpenedZ = false">
                                <i class="pi pi-times text-xl" aria-hidden="true" />
                            </button>
                        </div>
                    </div>

                    <div class="flex-1 overflow-y-auto px-6 py-6">
                        <div class="space-y-4">
                            <div>
                                <label class="mb-1 block text-sm font-medium text-slate-700">
                                    Name [En] <span class="text-red-500">*</span>
                                </label>
                                <input
                                    v-model="formDataZone.name_en"
                                    type="text"
                                    placeholder="Zone Name"
                                    :class="zoneInputClass('name_en')"
                                    @input="fieldValidity.name_en = true"
                                />
                            </div>
                            <div>
                                <label class="mb-1 block text-sm font-medium text-slate-700">Zone Color</label>
                                <input
                                    v-model="formDataZone.color"
                                    type="color"
                                    class="h-12 w-full cursor-pointer rounded-lg border border-slate-200 bg-white p-1"
                                />
                            </div>
                        </div>
                    </div>

                    <div class="flex-none border-t border-slate-200 bg-slate-50 px-6 py-4">
                        <div class="flex justify-end gap-3">
                            <button
                                type="button"
                                class="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                                @click="isOpenedZ = false"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                class="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-dark"
                            >
                                Save
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </VueSidePanel>

        <VueSidePanel v-model="isOpenedZE" lock-scroll hide-close-btn width="600px">
            <div class="flex h-full flex-col bg-white" dir="ltr">
                <form novalidate class="flex h-full flex-col" @submit.prevent="editZone">
                    <div class="flex-none border-b border-slate-200 bg-slate-50 px-6 py-4">
                        <div class="flex items-start justify-between">
                            <div>
                                <h2 class="text-lg font-semibold text-slate-800">Edit Zone</h2>
                                <p class="mt-1 text-sm text-slate-500">Update zone details</p>
                            </div>
                            <button type="button" class="text-slate-400 transition hover:text-slate-600" @click="isOpenedZE = false">
                                <i class="pi pi-times text-xl" aria-hidden="true" />
                            </button>
                        </div>
                    </div>

                    <div class="flex-1 overflow-y-auto px-6 py-6">
                        <div class="space-y-4">
                            <div>
                                <label class="mb-1 block text-sm font-medium text-slate-700">
                                    Name [En] <span class="text-red-500">*</span>
                                </label>
                                <input
                                    v-model="formEditZone.name_en"
                                    type="text"
                                    placeholder="Zone Name"
                                    :class="zoneInputClass('name_en')"
                                    @input="fieldValidity.name_en = true"
                                />
                            </div>
                            <div>
                                <label class="mb-1 block text-sm font-medium text-slate-700">Color</label>
                                <input
                                    v-model="formEditZone.color"
                                    type="color"
                                    class="h-12 w-full cursor-pointer rounded-lg border border-slate-200 bg-white p-1"
                                />
                            </div>
                        </div>
                    </div>

                    <div class="flex-none border-t border-slate-200 bg-slate-50 px-6 py-4">
                        <div class="flex justify-end gap-3">
                            <button
                                type="button"
                                class="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                                @click="isOpenedZE = false"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                class="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-dark"
                            >
                                Save
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </VueSidePanel>
        <Toast />

</template>

<script>
import { fetchBases, fetchBase, createBase, updateBase, deleteBase, fetchGate, createGate, updateGate, deleteGate, fetchZone, createZone, updateZone, deleteZone } from '../../api/organization';
import Toast from 'primevue/toast';
import { useToast } from 'primevue/usetoast';

import Card from 'primevue/card';
import PageContainer from '../../components/ui/PageContainer.vue';
import AppCard from '../../components/ui/AppCard.vue';

export default {
      components: {
            Toast, Card, PageContainer, AppCard
      },
      data() {
            return {
                bases:[],
                formDataBase:{
                    name_en:'',
                    name_ar:'',
                },
                formEditBase:{
                    name_en:'',
                    name_ar:'',
                    id:0
                },
                formDataGate:{
                    name_en:'',
                    name_ar:'',
                    base_id:null
                },
                formEditGate:{
                    name_en:'',
                    name_ar:'',
                    id:0
                },
                formDataZone:{
                    name_en:'',
                    name_ar:'',
                    color:'',
                    base_id:null
                },
                formEditZone:{
                    name_en:'',
                    name_ar:'',
                    color:'',
                    id:0
                },
                fieldValidity: {
                    name_en: true,
                },
                isOpenedC: false,
                isOpenedE: false,
                isOpenedG: false,
                isOpenedGE: false,
                isOpenedZ:false,
                isOpenedZE:false
            }
        },
        mounted() {
            this.fetchData();
        },
        methods: {
            zoneInputClass(field) {
                return [
                    'w-full rounded-lg border px-3 py-2 text-sm outline-none transition focus:ring-2 focus:ring-brand/20',
                    this.fieldValidity[field] ? 'border-slate-200 focus:border-brand' : 'border-red-500 focus:border-red-500',
                ];
            },

            Addbas() {
                    this.isOpenedC = !this.isOpenedC;
            },
            addBase(){

                    if (this.formDataBase.name_en.trim() === '') {
                    this.fieldValidity.name_en = false;
                    return;
                    }

                    createBase(this.formDataBase)
                    .then(response => {
                        this.fetchData();
                        this.isOpenedC=false;
                    })
                    .catch(error => {
                        console.error('API error:', error);
                    });
              },
              editBas(id) {
                    fetchBase(id) 
                    .then(response => {
                        this.formEditBase = response.data;
                    });
                    this.isOpenedE = !this.isOpenedE;
            },
            editBase(){
                    updateBase(this.formEditBase)
                    .then(response => {
                        this.fetchData();
                        this.isOpenedE=false;
                    })
                    .catch(error => {
                        console.error('API error:', error);
                    });
            },
            AddZon(id) {
                    this.formDataZone = {
                        name_en: '',
                        name_ar: '',
                        color: '#3b82f6',
                        base_id: id,
                    };
                    this.fieldValidity.name_en = true;
                    this.isOpenedZ = true;
            },
            AddGat(id) {
                    this.formDataGate.base_id=id;
                    this.isOpenedG = !this.isOpenedG;
            },
            addZone(){

                    if (this.formDataZone.name_en.trim() === '') {
                    this.fieldValidity.name_en = false;
                    return;
                    }

                    createZone(this.formDataZone)
                    .then(response => {
                        this.fetchData();
                        this.isOpenedZ=false;
                    })
                    .catch(error => {
                        console.error('API error:', error);
                    });
              },
              editZon(id) {
                    fetchZone(id)
                    .then(response => {
                        this.formEditZone = {
                            ...response.data,
                            color: response.data.color || '#3b82f6',
                        };
                        this.fieldValidity.name_en = true;
                        this.isOpenedZE = true;
                    })
                    .catch((error) => {
                        console.error('Error fetching zone:', error);
                        this.$toast.add({
                            severity: 'error',
                            summary: 'Error',
                            detail: 'Could not load zone details',
                            life: 3000,
                        });
                    });
            },
            editZone(){
                    updateZone(this.formEditZone)
                    .then(response => {
                        this.fetchData();
                        this.isOpenedZE=false;
                    })
                    .catch(error => {
                        console.error('API error:', error);
                    });
            },
            addGate(){

                    if (this.formDataGate.name_en.trim() === '') {
                    this.fieldValidity.name_en = false;
                    return;
                    }

                    createGate(this.formDataGate)
                    .then(response => {
                        this.fetchData();
                        this.isOpenedG=false;
                    })
                    .catch(error => {
                        console.error('API error:', error);
                    });
              },
              editGat(id) {
                    fetchGate(id) 
                    .then(response => {
                        this.formEditGate = response.data;
                    });
                    this.isOpenedGE = !this.isOpenedGE;
            },
            editGate(){
                    updateGate(this.formEditGate)
                    .then(response => {
                        this.fetchData();
                        this.isOpenedGE=false;
                    })
                    .catch(error => {
                        console.error('API error:', error);
                    });
            },
            fetchData(){
                fetchBases() 
                .then(response => {
                    this.bases = response.data;
                }).catch(error => {
                    console.error(error);
                });
            },
            deleteBase(i){
                    this.$confirm.require({
                    message: 'Do you want to delete this record?',
                    header: 'Delete Confirmation',
                    icon: 'pi pi-info-circle',
                    acceptClass: 'p-button-danger',
                    accept: () => {
                    
                        deleteBase({ id: i })
                            .then(response => {
                                this.fetchData();
                                 this.$toast.add({ severity: 'info', summary: 'Confirmed', detail: 'Deleted Successfuly', life: 3000 });
                            })
                   
                    },
                    reject: () => {

                    }
                    });
            },
            deleteZone(i){
                    this.$confirm.require({
                    message: 'Do you want to delete this record?',
                    header: 'Delete Confirmation',
                    icon: 'pi pi-info-circle',
                    acceptClass: 'p-button-danger',
                    accept: () => {
                    
                        deleteZone({ id: i })
                            .then(response => {
                                this.fetchData();
                                 this.$toast.add({ severity: 'info', summary: 'Confirmed', detail: 'Deleted Successfuly', life: 3000 });
                            })

                    },
                    reject: () => {

                    }
                    });
            },
            deleteGate(i){
                    this.$confirm.require({
                    message: 'Do you want to delete this record?',
                    header: 'Delete Confirmation',
                    icon: 'pi pi-info-circle',
                    acceptClass: 'p-button-danger',
                    accept: () => {
                    
                        deleteGate({ id: i })
                            .then(response => {
                                this.fetchData();
                                 this.$toast.add({ severity: 'info', summary: 'Confirmed', detail: 'Deleted Successfuly', life: 3000 });
                            })
                    
                    },
                    reject: () => {

                    }
                    });
            },
        }
}
</script>