<template>
    <PageContainer title="Company Reporting" description="Basic company attendance reports">

            <div class="wrapper-card grid lg:grid-cols-6 grid-cols-1 md:grid-cols-2 gap-2 mb-5"  >
            
                    <div  class="text-green-900 border-green-500 bg-green-200 border-b-2 card w-full cursor-pointer rounded-md border flex" >
                        <div class="p-2 max-w-sm">
                            <div class="bg-neutral-500 text-center rounded-full w-14 h-14 text-lg p-3 text-white mx-auto" >
                            <span> <i class="pi pi-chart-bar" style="font-size:20px"></i> </span>
                            </div>
                        </div>
                        <div class="block p-2 w-full">
                            <p class="font-semibold text-gray-900 dark:text-gray-200 text-xl">
                            Basic
                            </p>
                            <h2 class="font-normal text-gray-400 text-md mt-1">Basic Reports</h2>
                        </div>
                    </div>

                    <router-link to="/companies-issues" >
                        <div  class="bg-white border-b-2 card w-full cursor-pointer rounded-md border flex" >
                            <div class="p-2 max-w-sm">
                                <div class="bg-neutral-500 text-center rounded-full w-14 h-14 text-lg p-3 text-white mx-auto" >
                                <span> <i class="pi pi-exclamation-triangle" style="font-size:20px"></i> </span>
                                </div>
                            </div>
                            <div class="block p-2 w-full">
                                <p class="font-semibold text-gray-900 dark:text-gray-200 text-xl">
                                Issues
                                </p>
                                <h2 class="font-normal text-gray-400 text-md mt-1">Issues Reports</h2>
                            </div>
                        </div>
                    </router-link>
            </div>

            <div class="flex items-start justify-between">

                <div>
                <Toast />
                </div>

                <div class="mt-5 mb-5 sm:mt-0 sm:flex sm:shrink-0 sm:items-center" >
                    <!--
                     <button @click="onBtExport" type="button" class="inline-flex text-sm bg-purple-500 hover:bg-purple-700 text-white py-2 px-4 rounded">
                <i class="pi pi-file-export pr-2"></i>
                Export CSV Data
                </button>   
                    -->
                <input type="date" v-model="day" @change="fetchData" placeholder="Filter by date"  class="w-full h-12 rounded border border-gray-200"  />
                </div>

                

            </div>


           
            <ag-grid-vue
            id="ag-grid"
            ref="agGrid"
            class="ag-theme-material"
            style="--ag-line-height:56px; height: calc(110vh - 250px); width:100%"
            @grid-ready="onGridReady"
            :columnDefs="mergedColumnDefs"
            :rowData="RawData"
            rowSelection="multiple"
            animateRows="true"
            :resizable= "true"
            :suppressRowClickSelection="true"
            :onRowClicked="OnClicked"
            @selection-changed="onSelectionChanged"
            >
            </ag-grid-vue>

            <div>
                <Paginator ref="myPaginator" :rows="perPage" :totalRecords="totalRows" @click="onPageChange">
                   
                </Paginator>
            </div>

    </PageContainer>

<VueSidePanel v-model="blokGuest" lock-scroll no-close="true" width="600px" >
<div>

<div class="flex items-center bg-neutral-200 justify-left">
<div role="tablist" aria-orientation="horizontal" class="overflow-y-hidden -mb-px flex grow snap-x snap-mandatory overflow-x-auto px-4 scrollbar-thin scrollbar-track-neutral-200 scrollbar-thumb-neutral-300 sm:space-x-4 sm:grow-0">
<button @click="activeTab = 10" :class="activeTab === 10 ? 'text-green-500 border-green-500' : ''" class="border-primary-500 text-primary-600 dark:border-primary-400 dark:text-primary-300 group inline-flex min-w-full shrink-0 snap-start snap-always items-center justify-center whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium focus:outline-none sm:min-w-0" type="button">
<i class="pi pi-book pr-2"></i>
<span>Reporting</span>
</button>
<button @click="activeTab = 11" :class="activeTab === 11 ? 'text-green-500 border-green-500' : ''" class="border-transparent  group inline-flex min-w-full shrink-0 snap-start snap-always items-center justify-center whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium focus:outline-none sm:min-w-0" type="button">
<i class="pi pi-calendar-times pr-2"></i>
<span>Activity Log</span>
</button>
</div>
</div>

<div id="tabPanel-timeline">

<div v-show="activeTab === 10" role="tabpanel">
 
    <div class="p-5" id="printMe">
        <div class="md:flex no-wrap md:-mx-2 ">
            <div class="w-full md:w-3/12 md:mx-2">
                <img v-if="guest.photo ==null" src="/uploads/nopic.png" class="object-cover w-40 mb-2" /> 
                <img v-else :src="'/'+guest.photo" class="object-cover w-40 mb-2" /> 
            </div>
            <div class="w-full md:w-9/12 mx-2">
                
                <!-- About Section -->
                <div class="bg-white p-3 ">
                    <div class="flex items-center space-x-2 font-semibold text-gray-900 leading-8">
                        <span clas="text-green-500">
                            <Avatar icon="pi pi-user" class="mr-2" />
                        </span>
                        <span class="tracking-wide">About</span>
                    </div>
                    <div class="text-gray-700">
                        <div class=" text-sm">
                            <div class="grid grid-cols-2">
                                <div class="py-2 font-semibold">Full Name</div>
                                <div class="px-4 py-2">{{guest.fullname_en}}</div>
                            </div>
                            <div class="grid grid-cols-2">
                                <div class="py-2 font-semibold">Phone Number</div>
                                <div class="px-4 py-2">{{guest.phone_number}}</div>
                            </div>
                            <div class="grid grid-cols-2">
                                <div class="py-2 font-semibold">Gender</div>
                                <div class="px-4 py-2">{{guest.gender}}</div>
                            </div>
                            <div class="grid grid-cols-2">
                                <div class="py-2 font-semibold">Nationality</div>
                                <div class="px-4 py-2">{{guest.nationality}}</div>
                            </div>
                            <div class="grid grid-cols-2">
                                <div class="py-2 font-semibold">Company</div>
                                <div class="px-4 py-2">{{guest.department}}</div>
                            </div>
                        </div>
                    </div>
                </div>
                <!-- End of about section -->

            </div>
        </div>

<div class="my-4"></div>

                <!-- Checkin-Checkout Section -->
                <div class="bg-white p-3 ">
                    <div class="flex items-center space-x-2 font-semibold text-gray-900 leading-8">
                        <span clas="text-green-500">
                            <Avatar icon="pi pi-qrcode" class="mr-2" />
                        </span>
                        <span class="tracking-wide">Checkin / checkout</span>
                    </div>
                    <div class="text-gray-700">
                        <div class=" text-sm">
                            <div class="grid grid-cols-2">
                                <div class="py-2 font-semibold">Date</div>
                                <div class="px-4 py-2">{{guest.day}}</div>
                            </div>
                            <div class="grid grid-cols-2">
                                <div class="py-2 font-semibold">First checkin</div>
                                <div class="px-4 py-2">{{guest.checkin}}</div>
                            </div>
                            <div class="grid grid-cols-2">
                                <div class="py-2 font-semibold">Last Checkout</div>
                                <div class="px-4 py-2">{{guest.checkout}}</div>
                            </div>
                            <div class="grid grid-cols-2">
                                <div class="py-2 font-semibold">Status</div>
                                <div class="px-4 py-2" v-html="guest.defaut"></div>
                            </div>
                        </div>
                    </div>
                </div>
                <!-- End of Checkin-Checkout section -->

        <div class="my-4"></div>

                <!-- History Section -->
                <div class="bg-white p-3 ">
                    <div class="flex items-center space-x-2 font-semibold text-gray-900 leading-8">
                        <span clas="text-green-500">
                            <Avatar icon="pi pi-qrcode" class="mr-2" />
                        </span>
                        <span class="tracking-wide">History</span>
                    </div>
                    <div class="text-gray-700">
                        <div class=" text-sm">
                                        <table class="min-w-full divide-y divide-gray-200">
                                            
                                            <thead class="bg-gray-50">
                                            <tr>
                                            <th scope="col" class="p-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Date & Time
                                            </th>
                                            <th scope="col" class="p-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Task
                                            </th>
                                            <th scope="col" class="p-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Base
                                            </th>
                                            <th scope="col" class="p-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Gate
                                            </th>
                                            </tr>
                                            </thead>

                                            <tbody v-for="data in guest.history" :key="data.id" class="bg-white">
                                            
                                            <tr>
                                            <td class="p-4 whitespace-nowrap text-sm font-normal text-gray-500">
                                            {{data.created_at}}
                                            </td>
                                            <td class="p-4 whitespace-nowrap text-sm font-normal text-gray-900">
                                            <span class="font-semibold">{{data.mvtype}}</span>
                                            </td>
                                            <td class="p-4 whitespace-nowrap text-sm font-normal text-gray-900">
                                            <span >{{data.base}}</span>
                                            </td>
                                            <td class="p-4 whitespace-nowrap text-sm font-normal text-gray-900">
                                            <span >{{data.gate}}</span>
                                            </td>
                                            </tr>

                                            </tbody>

                                        </table>
                        </div>
                    </div>
                </div>
                <!-- End of History section -->

    </div>  
</div>

<div v-show="activeTab === 11" role="tabpanel">
            <div class="align-middle inline-block min-w-full">
                                        <table class="min-w-full divide-y divide-gray-200">
                                            
                                            <thead class="bg-gray-50">
                                            <tr>
                                            <th scope="col" class="p-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Date & Time
                                            </th>
                                            <th scope="col" class="p-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Task
                                            </th>
                                            <th scope="col" class="p-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Base
                                            </th>
                                            <th scope="col" class="p-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Gate
                                            </th>
                                            <th scope="col" class="p-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Operator
                                            </th>
                                            </tr>
                                            </thead>

                                            <tbody v-for="(data, index) in guest.all_movements || []" :key="`movement-${index}`" class="bg-white">
                                            
                                            <tr>
                                            <td class="p-4 whitespace-nowrap text-sm font-normal text-gray-500">
                                            {{data.created_at}}
                                            </td>
                                            <td class="p-4 whitespace-nowrap text-sm font-normal text-gray-900">
                                            <span class="font-semibold">{{data.mvtype}}</span>
                                            </td>
                                            <td class="p-4 whitespace-nowrap text-sm font-normal text-gray-900">
                                            <span >{{data.base}}</span>
                                            </td>
                                            <td class="p-4 whitespace-nowrap text-sm font-normal text-gray-900">
                                            <span >{{data.gate}}</span>
                                            </td>
                                            <td class="p-4 whitespace-nowrap text-sm font-normal text-gray-900">
                                            <span >{{ data.operator_name || '—' }}</span>
                                            </td>
                                            </tr>

                                            </tbody>

                                        </table>
                                </div>
</div>

</div>
</div>
</VueSidePanel>





</template>

<script>
import api from '../../api/client';
import { AgGridVue } from "ag-grid-vue3"; 
import "ag-grid-community/styles/ag-grid.css"; 
import "ag-grid-community/styles/ag-theme-material.css";import Toast from 'primevue/toast';
import { ref } from 'vue';
import Dropdown from 'primevue/dropdown';
import Checkbox from 'primevue/checkbox';
import Card from 'primevue/card';
import Avatar from 'primevue/avatar';
import Paginator from 'primevue/paginator';
import PageContainer from '../../components/ui/PageContainer.vue';

const gridApi = ref();

function customCellRendererIn(params) {
    var cellValue = params.value;
     if(cellValue!=''){return '<span class="font-bold p-4">'+params.value+'</span>';} 
}

function customCellRendererOut(params) {
    var cellValue = params.value;
   if(cellValue!=''){return '<span class="font-bold p-4">'+params.value+'</span>';} 
}

function customCellImgRenderer(params) {
    var cellValue = params.value;
    var formattedValue='';
    if(cellValue!=null){formattedValue='<img src="/'+cellValue+'" class="object-cover w-8 h-8 rounded-full mt-2" />';}
    else{formattedValue='<img src="/uploads/nopic.png" class="object-cover w-8 h-8 rounded-full mt-2" />';}

    return formattedValue;
}

export default {
        components: {
                    AgGridVue, Toast, Dropdown, Checkbox, Card, Avatar, Paginator, PageContainer
                    },
        data() {
            return {
                activeTab:10,
                day:'',
                depId: localStorage.getItem('dep_id'),
                userName: localStorage.getItem('user_name'),
                ColumnsDef:[],
                RawData:[],
                blokGuest:false,
                editguest:false,
                guest:{
                    fullname_en:'',
                    fullname_ar:'',
                    qrcode:'',
                    military_number:'',
                    phone_number:null,
                    qid:null,
                    gender_id:null,
                    nationality_id:null,
                    dep_id:null,
                    rank_id:null,
                    default_base:0,
                    selectedZones:null,
                    id:null
                },
                currentPage:1,
                perPage:25,
                totalRows: 0,
            }
        },
        mounted() {
            const d = new Date();
            this.day = d.getFullYear() + '-' + (d.getMonth()+1) + '-' + d.getDate();
            this.fetchData();
        },
        computed: {
            mergedColumnDefs() {
                    const modifiedColumnDefs = [...this.ColumnsDef];

                    const columnIn = modifiedColumnDefs.findIndex( (column) => column.field === "checkin" );
                    if (columnIn !== -1) { modifiedColumnDefs[columnIn].cellRenderer = customCellRendererIn;  }

                    const columnOut = modifiedColumnDefs.findIndex( (column) => column.field === "checkout" );
                    if (columnOut !== -1) { modifiedColumnDefs[columnOut].cellRenderer = customCellRendererOut;  }

                    const colIndex = modifiedColumnDefs.findIndex( (column) => column.headerName === "Photo" );
                    if (colIndex !== -1) { modifiedColumnDefs[colIndex].cellRenderer = customCellImgRenderer; }

                    return modifiedColumnDefs;
                    }
                },
        methods: {
                fetchData(){
                    api.get('/api/dashboard-reports/companies',{
                        params: {
                            day: this.day,
                            dep_id: this.depId,
                            page: this.currentPage,
                            per_page: this.perPage,
                        },
                    })
                    .then(response => {
                        this.totalRows = response.data.pagination.total;
                        this.ColumnsDef = response.data.columns;
                        this.RawData = response.data.data;
                        
                    });

                },
                onGridReady(params){
                        gridApi.value = params.api;
                },
                onSelectionChanged(event) {
                        var selectedRows = event.api.getSelectedRows();
                        let checkedState = false;

                        selectedRows.forEach(function (selectedRow, index) {
                        if (index >= 0) {
                        checkedState = true;
                        }
                        });

                        
                },
                onBtExport(){
                        gridApi.value.exportDataAsCsv();
                },
                OnClicked(event){
                        var id = event.data.id;
                        this.editguest=false;
                        this.activeTab=10;

                        api.get('/api/employees/'+id+'?day='+this.day) 
                        .then(response => {
                        this.guest = response.data[0];
                        });

                        this.blokGuest=true;

                },
                onPageChange() {
                    console.log('Page:', (this.$refs.myPaginator.page+1));
                    this.currentPage=(this.$refs.myPaginator.page+1);
                   this.fetchData();
                },
        }
}
</script>