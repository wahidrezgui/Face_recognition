<template>
    <PageContainer title="Settings" description="Check-In Time, Check-Out Time">
        <div class="grid grid-cols-1 gap-4 xl:grid-cols-2 2xl:grid-cols-3">
                  <AppCard class="2xl:col-span-2" title="Time Settings" subtitle="Check-In Time, Check-Out Time" padding="lg">
                     <template #headerAction>
                           <button @click="AddTime" class="rounded-lg p-2 text-sm font-medium text-brand hover:bg-brand-muted">
                              <i class="pi pi-plus-circle"></i> Create New
                           </button>
                     </template>
                     <div class="flex flex-col mt-8">
                        <div class="overflow-x-auto rounded-lg">
                           <div class="align-middle inline-block min-w-full">
                              <div class="shadow overflow-hidden sm:rounded-lg">
                                 <table class="min-w-full divide-y divide-gray-200">
                                    <thead class="bg-gray-50">
                                       <tr>
                                          <th scope="col" class="p-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                             Gender
                                          </th>
                                          <th scope="col" class="p-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                             Rank
                                          </th>
                                          <th scope="col" class="p-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                             Time
                                          </th>
                                          <th></th>
                                       </tr>
                                    </thead>
                                    <tbody class="bg-white">
                                      <tr v-for="data in times" :key="data.id">
                                          <td class="p-4 whitespace-nowrap text-sm font-normal text-gray-900">
                                            <span class="font-semibold ml-2">{{data.gender}}</span>
                                          </td>
                                          <td class="p-4 whitespace-nowrap text-sm font-normal text-gray-500">
                                            {{data.rank}}
                                          </td>
                                          <td class="p-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                                             <Tag icon="pi pi-clock" severity="success" :value="data.start_time" class="mr-2"></Tag>
                                            <Tag icon="pi pi-clock" severity="info" :value="data.end_time"></Tag>
                                          </td>
                                          <td class="p-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                                            <div class="flex space-x-4">
                                                <button @click="editTime(data.id)" >
                                                <i class="pi pi-pencil"></i>
                                                </button>
                                                <button @click="deleteTime(data.id)" >
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
                  </AppCard>

                  <AppCard padding="lg">
                     <div class="mb-4">
                        
                     </div>
                  </AppCard>
        </div>
    </PageContainer>


        <Dialog v-model:visible="isOpenedT" modal header="Edit Time" :style="{ width: '50rem' }" :breakpoints="{ '1199px': '75vw', '575px': '90vw' }">
            <form novalidate="" @submit.prevent="addCheckTime">
                  <div class="grid grid-cols-12 gap-x-4">

                  <div class="col-span-6">
                  <div class="mb-3">
                  <label class="block text-sm font-medium text-neutral-700 dark:text-neutral-100 mb-1 inline-flex items-center" >
                  <span>Gender</span>
                  <span class="mr-1 text-sm text-danger-600">*</span>
                  </label>
                  <div class="relative">
                  <Dropdown  v-model="formDataCTime.gender_id" :options="gender" optionLabel="name_en" optionValue="id" placeholder="Gender" class="w-full md:w-14rem border border-dark-200" />
                  </div>
                  </div>
                  </div>

                  <div class="col-span-6">
                  <div class="mb-3">
                  <label class="block text-sm font-medium text-neutral-700 dark:text-neutral-100 mb-1 inline-flex items-center" >
                  <span>Rank</span>
                  </label>
                  <div class="relative">
                     <Dropdown  v-model="formDataCTime.rank_id" :options="rankscateg" optionLabel="name_en" optionValue="id" placeholder="Rank" class="w-full md:w-14rem border border-dark-200" />
                  </div>
                  </div>
                  </div>

                  </div>

                  <div class="grid grid-cols-12 gap-x-4">



                  <div class="col-span-3">
                  <div class="mb-3">
                  <label class="block text-sm font-medium text-neutral-700 dark:text-neutral-100 mb-1 inline-flex items-center" >
                  <span>Checkin</span>
                  <span class="mr-1 text-sm text-danger-600">*</span>
                  </label>
                  <div class="relative">
                  <input type="text" v-model="formDataCTime.start_time" placeholder="06:00" class="flex h-12 w-full items-center justify-center rounded-md border bg-white/0 p-3 text-sm outline-none ">
                  </div>
                  </div>
                  </div>

                  <div class="col-span-3">
                  <div class="mb-3">
                  <label class="block text-sm font-medium text-neutral-700 dark:text-neutral-100 mb-1 inline-flex items-center" >
                  <span>Checkout </span>
                  <span class="mr-1 text-sm text-danger-600">*</span>
                  </label>
                  <div class="relative">
                  <input type="text" v-model="formDataCTime.end_time" placeholder="13:00" class="flex h-12 w-full items-center justify-center rounded-md border bg-white/0 p-3 text-sm outline-none ">
                  </div>
                  </div>
                  </div>

                  <div class="col-span-3">
                  <div class="mt-6">
                  <button type="submit" class=" text-sm bg-blue-500 hover:bg-blue-700 text-white p-4 focus:z-10 rounded">
                  Save Data
                  </button>
                  </div>
                  </div>

                  </div>
            </form>
        </Dialog>

        <Dialog v-model:visible="editModal" modal header="Edit Time" :style="{ width: '50rem' }" :breakpoints="{ '1199px': '75vw', '575px': '90vw' }">
            <form novalidate="" @submit.prevent="editCheckTime">
                  <div class="grid grid-cols-12 gap-x-4">

                  <div class="col-span-6">
                  <div class="mb-3">
                  <label class="block text-sm font-medium text-neutral-700 dark:text-neutral-100 mb-1 inline-flex items-center" >
                  <span>Gender</span>
                  <span class="mr-1 text-sm text-danger-600">*</span>
                  </label>
                  <div class="relative">
                  <Dropdown  v-model="timing.gender_id" :options="gender" optionLabel="name_en" optionValue="id" placeholder="Gender" class="w-full md:w-14rem border border-dark-200" />
                  </div>
                  </div>
                  </div>

                  <div class="col-span-6">
                  <div class="mb-3">
                  <label class="block text-sm font-medium text-neutral-700 dark:text-neutral-100 mb-1 inline-flex items-center" >
                  <span>Rank</span>
                  </label>
                  <div class="relative">
                     <Dropdown  v-model="timing.rank_id" :options="rankscateg" optionLabel="name_en" optionValue="id" placeholder="Rank" class="w-full md:w-14rem border border-dark-200" />
                  </div>
                  </div>
                  </div>

                  </div>

                  <div class="grid grid-cols-12 gap-x-4">



                  <div class="col-span-3">
                  <div class="mb-3">
                  <label class="block text-sm font-medium text-neutral-700 dark:text-neutral-100 mb-1 inline-flex items-center" >
                  <span>Checkin</span>
                  <span class="mr-1 text-sm text-danger-600">*</span>
                  </label>
                  <div class="relative">
                  <input type="text" v-model="timing.start_time" placeholder="06:00" class="flex h-12 w-full items-center justify-center rounded-md border bg-white/0 p-3 text-sm outline-none ">
                  </div>
                  </div>
                  </div>

                  <div class="col-span-3">
                  <div class="mb-3">
                  <label class="block text-sm font-medium text-neutral-700 dark:text-neutral-100 mb-1 inline-flex items-center" >
                  <span>Checkout </span>
                  <span class="mr-1 text-sm text-danger-600">*</span>
                  </label>
                  <div class="relative">
                  <input type="text" v-model="timing.end_time" placeholder="13:00" class="flex h-12 w-full items-center justify-center rounded-md border bg-white/0 p-3 text-sm outline-none ">
                  </div>
                  </div>
                  </div>

                  <div class="col-span-3">
                  <div class="mt-6">
                  <button type="submit" class=" text-sm bg-blue-500 hover:bg-blue-700 text-white p-4 focus:z-10 rounded">
                  Update Data
                  </button>
                  </div>
                  </div>

                  </div>
            </form>
        </Dialog>
<Toast/>
</template>

<script>
import { fetchDepartment, fetchDepartments } from '../../api/organization';
import { fetchRankCategories } from '../../api/lookups';
import { createCheckTime, fetchCheckTimes } from '../../api/employees';
import Toast from 'primevue/toast';
import { useToast } from 'primevue/usetoast';
import Tag from 'primevue/tag';
import Dropdown from 'primevue/dropdown';
import Dialog from 'primevue/dialog';
import TreeSelect from 'primevue/treeselect';
import PageContainer from '../../components/ui/PageContainer.vue';
import AppCard from '../../components/ui/AppCard.vue';

export default{
    components: {
        Tag, Toast, Dropdown, Dialog, TreeSelect, PageContainer, AppCard
    },
    data() {
            return {
                isOpenedT:false,
                editModal:false,
                gender:[{id:1,name_en:'Male'},{id:2,name_en:'Female'}],
                rankscateg:[],
                times:[],
                timing:{},
                departments:[],
                gender:[{id:1,name_en:'Male'},{id:2,name_en:'Female'}],
                depId: localStorage.getItem('dep_id'),
                formDataCTime:{
                     gender_id:'',
                     dep_id:localStorage.getItem('dep_id'),
                     rank_id:'',
                     start_time:'',
                     end_time:''
                }
            }
    },
    mounted() {
            this.fetchData();
    },
    methods:{
      AddTime(){
            this.isOpenedT=true;
      },
      addCheckTime(){
         createCheckTime(this.formDataCTime)
                    .then(response => {
                        this.fetchData();
                        this.isOpenedT=false;
                    });
      },
      editTime(i){
         this.editModal=true;
         fetchCheckTimes(this.depId, { id: i })
                    .then(response => {
                        this.timing = response.data;
                    });
      },
      editCheckTime(){
         createCheckTime(this.timing)
                    .then(response => {
                        this.fetchData();
                        this.editModal=false;
                    });
      },
      deleteTime(i){
                    this.$confirm.require({
                    message: 'Do you want to delete this record?',
                    header: 'Delete Confirmation',
                    icon: 'pi pi-info-circle',
                    acceptClass: 'p-button-danger',
                    accept: () => {
                    
                            createCheckTime({ id: i })
                            .then(response => {
                                this.fetchData();
                                 this.$toast.add({ severity: 'info', summary: 'Confirmed', detail: 'Deleted Successfuly', life: 3000 });
                            })
                            
                    },
                    reject: () => {

                    }
                    });
            },
        fetchData(){

            fetchRankCategories() 
                    .then(response => {
                        this.rankscateg = response.data;
                    });
            
            fetchDepartments({ idparent: this.depId }) 
                    .then(response => {
                        this.departments = response.data.children;
                    }).catch(error => {
                        console.error(error);
                    });

            fetchCheckTimes(this.depId)
                    .then(response => {
                        this.times = response.data;
                    });
            

        }   
    }
}
</script>