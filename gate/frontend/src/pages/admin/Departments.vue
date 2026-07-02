<template>
    <PageContainer title="Deparments List" description="Manage Departments">
            <AppCard padding="lg">
                            <div id="tabPanel-timeline">

                            <div v-show="activeTab === 10" role="tabpanel">

                                <div class="flex flex-wrap gap-2 mb-4">
                                <Button type="button" icon="pi pi-plus" label="Expand All" @click="expandAll" />
                                <Button type="button" icon="pi pi-minus" label="Collapse All" @click="collapseAll" />
                            </div>

                            <Tree v-model:expandedKeys="expandedKeys" :value="departments" :filter="true" filterMode="lenient" class="w-full md:w-30rem">
                                <template v-slot="{ node, data }">
                                    <div class="flex gap-4">
                                      <div>{{ node.name_en }}</div>  
                                                    <div class="flex gap-4">
                                                    <AppTableActions
                                                        @edit="editDep(node.id)"
                                                        @delete="deleteDepartment(node.id)"
                                                    />
                                                    <button type="button" @click="Assign(node)" class="inline-flex h-9 w-9 items-center justify-center rounded-lg text-emerald-600 hover:bg-emerald-50" title="عرض">
                                                    <i class="pi pi-eye" aria-hidden="true"></i>
                                                    </button>
                                                    <button type="button" @click="AddDep(node.id)" class="inline-flex h-9 w-9 items-center justify-center rounded-lg text-blue-500 hover:bg-blue-50" title="إضافة">
                                                    <i class="pi pi-plus" aria-hidden="true"></i>
                                                    </button>
                                                    </div>
                                    </div>
                                </template>
                            </Tree>
                            </div>

                            </div>

            </AppCard>
    </PageContainer>

    <VueSidePanel v-model="isOpenedC"  lock-scroll noClose="true" width="600px" >
    <div>
        <form novalidate="" @submit.prevent="addDepartment">
        <div class="flex h-full flex-col divide-y divide-neutral-200 bg-white dark:divide-neutral-700 dark:bg-neutral-900">
        <div class="flex min-h-0 flex-1 flex-col overflow-y-scroll py-6">
        <div class="px-4 sm:px-6">
        <div class="flex items-start justify-between">
        <div class="space-y-1">
        <h2 class="text-lg font-medium text-neutral-700 dark:text-white">
        Create Department
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
        <input type="text" placeholder="Department Name" v-model="formDataDep.name_en" :class="{ 'border-red-500': !fieldValidity.name_en }" @input="fieldValidity.name_en = true" class="flex h-10 w-full items-center justify-center rounded-md border bg-white/0 p-3 text-sm outline-none border-gray-200">
        </div>
        </div>
        </div>

        <div class="col-span-12">
        <div class="mb-3">
        <label class="block text-sm font-medium text-neutral-700 dark:text-neutral-100 mb-1 inline-flex items-center" >
        <span>Name [Ar]</span>
        </label>
        <div class="relative">
        <input type="text" placeholder="Department Name" v-model="formDataDep.name_ar" class="flex h-10 w-full items-center justify-center rounded-md border bg-white/0 p-3 text-sm outline-none border-gray-200">
        </div>
        </div>
        </div>

        </div>
        
        <hr class="my-8" />

        <div class="grid grid-cols-12 gap-x-4">

        <div class="col-span-6">
        <div class="mb-3">
        <label class="block text-sm font-medium text-neutral-700 dark:text-neutral-100 mb-1 inline-flex items-center" >
        <span>First Name</span>
        <span class="mr-1 text-sm text-danger-600">*</span>
        </label>
        <div class="relative">
        <input type="text" placeholder="First Name" v-model="formDataDep.firstname" :class="{ 'border-red-500': !fieldValidity.firstname }" @input="fieldValidity.firstname = true" class="flex h-10 w-full items-center justify-center rounded-md border bg-white/0 p-3 text-sm outline-none border-gray-200">
        </div>
        </div>
        </div>

        <div class="col-span-6">
        <div class="mb-3">
        <label class="block text-sm font-medium text-neutral-700 dark:text-neutral-100 mb-1 inline-flex items-center" >
        <span>Last Name</span>
        <span class="mr-1 text-sm text-danger-600">*</span>
        </label>
        <div class="relative">
        <input type="text" placeholder="Last Name" v-model="formDataDep.lastname" :class="{ 'border-red-500': !fieldValidity.lastname }" @input="fieldValidity.lastname = true" class="flex h-10 w-full items-center justify-center rounded-md border bg-white/0 p-3 text-sm outline-none border-gray-200">
        </div>
        </div>
        </div>

        <div class="col-span-6">
        <div class="mb-3">
        <label class="block text-sm font-medium text-neutral-700 dark:text-neutral-100 mb-1 inline-flex items-center" >
        <span>Email</span>
        <span class="mr-1 text-sm text-danger-600">*</span>
        </label>
        <div class="relative">
        <input type="text" placeholder="Email address" v-model="formDataDep.email" :class="{ 'border-red-500': !fieldValidity.email }" @input="fieldValidity.email = true" class="flex h-10 w-full items-center justify-center rounded-md border bg-white/0 p-3 text-sm outline-none border-gray-200">
        </div>
        </div>
        </div>

        <div class="col-span-6">
        <div class="mb-3">
        <label class="block text-sm font-medium text-neutral-700 dark:text-neutral-100 mb-1 inline-flex items-center" >
        <span>Password</span>
        <span class="mr-1 text-sm text-danger-600">*</span>
        </label>
        <div class="relative">
        <input type="text" placeholder="******" v-model="formDataDep.password" :class="{ 'border-red-500': !fieldValidity.password }" @input="fieldValidity.password = true" class="flex h-10 w-full items-center justify-center rounded-md border bg-white/0 p-3 text-sm outline-none border-gray-200">
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
        <form novalidate="" @submit.prevent="editDepartment">
        <div class="flex h-full flex-col bg-white">
        <div class="flex min-h-0 flex-1 flex-col py-6">
        <div class="px-4 sm:px-6">
        <div class="flex items-start justify-between">
        <div class="space-y-1">
        <h2 class="text-lg font-medium text-neutral-700 dark:text-white">
            <i class="pi pi-sitemap pr-2"></i> Edit Department
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
        <input type="text" placeholder="Department Name" v-model="formEditDep.name_en" :class="{ 'border-red-500': !fieldValidity.name_en }" @input="fieldValidity.name_en = true" class="flex h-10 w-full items-center justify-center rounded-md border bg-white/0 p-3 text-sm outline-none border-gray-200">
        </div>
        </div>
        </div>

        <div class="col-span-12">
        <div class="mb-3">
        <label class="block text-sm font-medium text-neutral-700 dark:text-neutral-100 mb-1 inline-flex items-center" >
        <span>Name [Ar]</span>
        </label>
        <div class="relative">
        <input type="text" placeholder="Department Name" v-model="formEditDep.name_ar" class="flex h-10 w-full items-center justify-center rounded-md border bg-white/0 p-3 text-sm outline-none border-gray-200">
        </div>
        </div>
        </div>
        </div>

        <hr class="my-8" />

        <h2 class="text-lg font-medium text-neutral-700 dark:text-white mb-5"><i class="pi pi-user pr-2"></i> Main User</h2>

        <div class="grid grid-cols-12 gap-x-4">

        <div class="col-span-6">
        <div class="mb-3">
        <label class="block text-sm font-medium text-neutral-700 dark:text-neutral-100 mb-1 inline-flex items-center" >
        <span>First Name</span>
        <span class="mr-1 text-sm text-danger-600">*</span>
        </label>
        <div class="relative">
        <input type="text" placeholder="First Name" v-model="formEditDep.user.firstname" :class="{ 'border-red-500': !fieldValidity.firstname }" @input="fieldValidity.firstname = true" class="flex h-10 w-full items-center justify-center rounded-md border bg-white/0 p-3 text-sm outline-none border-gray-200">
        </div>
        </div>
        </div>

        <div class="col-span-6">
        <div class="mb-3">
        <label class="block text-sm font-medium text-neutral-700 dark:text-neutral-100 mb-1 inline-flex items-center" >
        <span>Last Name</span>
        <span class="mr-1 text-sm text-danger-600">*</span>
        </label>
        <div class="relative">
        <input type="text" placeholder="Last Name" v-model="formEditDep.user.lastname" :class="{ 'border-red-500': !fieldValidity.lastname }" @input="fieldValidity.lastname = true" class="flex h-10 w-full items-center justify-center rounded-md border bg-white/0 p-3 text-sm outline-none border-gray-200">
        </div>
        </div>
        </div>

        <div class="col-span-6">
        <div class="mb-3">
        <label class="block text-sm font-medium text-neutral-700 dark:text-neutral-100 mb-1 inline-flex items-center" >
        <span>Email</span>
        <span class="mr-1 text-sm text-danger-600">*</span>
        </label>
        <div class="relative">
        <input type="text" placeholder="Email address" v-model="formEditDep.user.email" :class="{ 'border-red-500': !fieldValidity.email }" @input="fieldValidity.email = true" class="flex h-10 w-full items-center justify-center rounded-md border bg-white/0 p-3 text-sm outline-none border-gray-200">
        </div>
        </div>
        </div>

        <div class="col-span-6">
        <div class="mb-3">
        <label class="block text-sm font-medium text-neutral-700 dark:text-neutral-100 mb-1 inline-flex items-center" >
        <span>Password</span>
        <span class="mr-1 text-sm text-danger-600">*</span>
        </label>
        <div class="relative">
        <input type="text" placeholder="******" v-model="formEditDep.user.password" :class="{ 'border-red-500': !fieldValidity.password }" @input="fieldValidity.password = true" class="flex h-10 w-full items-center justify-center rounded-md border bg-white/0 p-3 text-sm outline-none border-gray-200">
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

    <VueSidePanel v-model="isOpenedAb"  lock-scroll noClose="true" width="600px" >
    <div>

        <div class="flex items-center bg-neutral-200 justify-left">
        <div role="tablist" aria-orientation="horizontal" class="overflow-y-hidden -mb-px flex grow snap-x snap-mandatory overflow-x-auto px-4 scrollbar-thin scrollbar-track-neutral-200 scrollbar-thumb-neutral-300 sm:space-x-4 sm:grow-0">
        <button @click="activeTabs = 10" :class="activeTabs === 10 ? 'text-green-500 border-green-500' : ''" class="border-primary-500 text-primary-600 dark:border-primary-400 dark:text-primary-300 group inline-flex min-w-full shrink-0 snap-start snap-always items-center justify-center whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium focus:outline-none sm:min-w-0" type="button">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" aria-hidden="true" class="text-primary-500 dark:text-primary-300 -ml-0.5 mr-1.5 h-5 w-5">
        <path stroke-linecap="round" stroke-linejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25H12"></path>
        </svg>
        <span>Bases</span>
        </button>

        <button @click="activeTabs = 11" :class="activeTabs === 11 ? 'text-green-500 border-green-500' : ''" class="border-transparent  group inline-flex min-w-full shrink-0 snap-start snap-always items-center justify-center whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium focus:outline-none sm:min-w-0" type="button">
        <i class="pi pi-qrcode"></i>
        <span class="pl-2">Checkin / checkout </span>
        </button>
        </div>
        </div>

        <div id="tabPanel-timeline">
        <div v-show="activeTabs === 10" role="tabpanel">
                    <form novalidate="" @submit.prevent="AssignBase">
                    <div class="flex h-full flex-col divide-y divide-neutral-200 bg-white">
                    <div class="flex min-h-0 flex-1 flex-col overflow-y-scroll py-6">
                    <div class="px-4 sm:px-6">
                    <div class="flex items-start justify-between">
                    <div class="space-y-1">
                    <h2 class="text-lg font-medium text-neutral-700 dark:text-white">
                    {{formEditDep.name_en}}
                    </h2>
                    </div>
                    </div>
                    </div>
                    <div class="relative mt-8 flex-1 px-4 sm:px-6">
                    <div>
                    <div class="">

                        <div class="grid gap-4 grid-cols-2">
                            <div v-for="base in bases" :key="base.id">
                                <Checkbox v-model="formAssignBase.selectedBases" :inputId="base.id" name="bases" :value="base.id" />
                                <label :for="base.id" class="ml-2"> {{base.name_en}} </label>
                            </div>
                        </div>

                    </div>
                    </div>
                    </div>
                    </div>
                    <div class="shrink-0 px-4 py-4 dark:bg-neutral-800">
                    <div class="flex flex-wrap justify-end space-x-3 sm:flex-nowrap">
                    <button @click="isOpenedAb = false" type="button" class="inline-flex text-sm bg-white text-black  border border-gray-500 hover:bg-blue-700 py-2 px-4 rounded">
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

     
        </div>

        
    </div>
    </VueSidePanel>
    <Toast />

</template>

<script>
import api from '../../api/client';
import { fetchBases, fetchBase, fetchDepartment, createDepartment, updateDepartment, assignBase } from '../../api/organization';
import Toast from 'primevue/toast';
import { useToast } from 'primevue/usetoast';
import Checkbox from 'primevue/checkbox';
import OrganizationChart from 'primevue/organizationchart';
import Tree from 'primevue/tree';

import Button from 'primevue/button';
import PageContainer from '../../components/ui/PageContainer.vue';
import AppCard from '../../components/ui/AppCard.vue';

export default {
  components: {
        Toast, Checkbox, OrganizationChart, Tree, Button, PageContainer, AppCard
  },
  data() {
        return {
            expandedKeys:{},
            activeTabs:10,
            activeTab:10,
            isOpenedAb:false,
            departments:[],
            deptree:[],
            bases:[],
            depId: localStorage.getItem('dep_id'),
            formAssignBase:{
                selectedBases:[],
                dep_id:null,
            },
            formDataDep:{
                name_en:'',
                name_ar:'',
                parent_id:localStorage.getItem('dep_id'),
                firstname:'',
                lastname:'',
                email:'',
                password:''
            },
            formEditDep:{
                name_en:'',
                name_ar:'',
                id:0,
                user:{
                    firstname:'',
                    lastname:'',
                    email:'',
                    password:'',
                    id:0
                }
            },
            fieldValidity: {
                name_en: true,
                firstname: true,
                lastname: true,
                email: true,
                password: true,
            },
            isOpenedC: false,
            isOpenedE: false
        }
    },
    mounted() {
        this.fetchData();
    },
    methods: {
        expandAll() {
        for (let node of this.departments) {
            this.expandNode(node);
        }

        this.expandedKeys = { ...this.expandedKeys };
    },
    collapseAll() {
        this.expandedKeys = {};
    },
    expandNode(node) {
        if (node.children && node.children.length) {
            this.expandedKeys[node.key] = true;

            for (let child of node.children) {
                this.expandNode(child);
            }
        }
    },
        Assign(item) {
                this.formEditDep=item;
                this.formAssignBase.dep_id=item.id;
                this.isOpenedAb = !this.isOpenedAb;
        },
        AssignBase(){
                assignBase(this.formAssignBase)
                .then(response => {
                    this.fetchData();
                })
                .catch(error => {
                    console.error('API error:', error);
                });
        },
        AddDep(id) {
                this.formDataDep.parent_id=id;
                this.isOpenedC = !this.isOpenedC;
        },
        addDepartment(){

                if (this.formDataDep.name_en.trim() === '') {
                this.fieldValidity.name_en = false;
                return;
                }
                if (this.formDataDep.firstname.trim() === '') {
                this.fieldValidity.firstname = false;
                return;
                }
                if (this.formDataDep.lastname.trim() === '') {
                this.fieldValidity.lastname = false;
                return;
                }
                if (this.formDataDep.email.trim() === '') {
                this.fieldValidity.email = false;
                return;
                }
                if (this.formDataDep.password.trim() === '') {
                this.fieldValidity.password = false;
                return;
                }

                createDepartment(this.formDataDep)
                .then(response => {
                    this.fetchData();
                    this.isOpenedC=false;
                })
                .catch(error => {
                    console.error('API error:', error);
                });
          },
          editNode(node){
            console.log('Edit node:', node);
          },
          editDep(id) {
                fetchDepartment(id) 
                .then(response => {
                    this.formEditDep = response.data;
                });
                this.isOpenedE = !this.isOpenedE;
        },
        editDepartment(){

                    if (this.formEditDep.user.firstname.trim() === '') {
                    this.fieldValidity.firstname = false;
                    return;
                    }
                    if (this.formEditDep.user.lastname.trim() === '') {
                    this.fieldValidity.lastname = false;
                    return;
                    }
                    if (this.formEditDep.user.email.trim() === '') {
                    this.fieldValidity.email = false;
                    return;
                    }
                    if (this.formEditDep.user.password.trim() === '') {
                    this.fieldValidity.password = false;
                    return;
                    }

                updateDepartment(this.formEditDep)
                .then(response => {
                    this.fetchData();
                    this.isOpenedE=false;
                })
                .catch(error => {
                    console.error('API error:', error);
                });
        },
        fetchData(){
            api.get('/api/departments/all') 
            .then(response => {
                this.departments = response.data.departments;
            }).catch(error => {
                console.error(error);
            });

            

            fetchBases() 
            .then(response => {
                this.bases = response.data;
            }).catch(error => {
                console.error(error);
            });

        },
        deleteDepartment(i){
                this.$confirm.require({
                message: 'Do you want to delete this record?',
                header: 'Delete Confirmation',
                icon: 'pi pi-info-circle',
                acceptClass: 'p-button-danger',
                accept: () => {
                
                        api.post('/api/departments/delete', {id:i})
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