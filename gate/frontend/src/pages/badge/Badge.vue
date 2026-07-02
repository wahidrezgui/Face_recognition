<template>
<PageContainer title="Badge Designer" description="Customize badge layout and preview">
<div class="lg:grid lg:grid-cols-12 lg:gap-8">

<AppCard class="col-span-6" padding="lg">
        <form novalidate="" id="editbadg" @submit.prevent="editBadge" enctype="multipart/form-data">
                <div class="grid grid-cols-12 gap-x-4">
                 
                <div class="col-span-8">
                <div class="mb-3">
                <div>
                <label class="block text-sm font-medium text-neutral-700 dark:text-neutral-100 mb-1 inline-flex items-center" >
                <span>Background Color</span>
                </label>
                <div class="relative">
                <input type="color" name="background" class="mt-2 flex h-10 w-full items-center justify-center rounded-l border bg-white/0 p-3 text-sm outline-none border-gray-200">
                </div>
                </div>
                </div>
                </div>
                
                 <div class="col-span-2">
                <div class="mb-3">
                <div>
                <label class="block text-sm font-medium text-neutral-700 dark:text-neutral-100 mb-1 inline-flex items-center" >
                <span>Width</span>
                </label>
                <div class="relative">
                <input type="text" name="width" v-model="info.width" class="mt-2 flex h-10 w-full items-center justify-center rounded-l border bg-white/0 p-3 text-sm outline-none border-gray-200">
                </div>
                </div>
                </div>
                </div> 

                <div class="col-span-2">
                <div class="mb-3">
                <div>
                <label class="block text-sm font-medium text-neutral-700 dark:text-neutral-100 mb-1 inline-flex items-center" >
                <span>Height</span>
                </label>
                <div class="relative">
                <input type="text" name="heigth" v-model="info.heigth" class="mt-2 flex h-10 w-full items-center justify-center rounded-l border bg-white/0 p-3 text-sm outline-none border-gray-200">
                </div>
                </div>
                </div>
                </div>

                <div class="col-span-12">
                <div class="mb-3">
                <div>
                <label class="block text-sm font-medium text-neutral-700 dark:text-neutral-100 mb-1 inline-flex items-center" >
                <span>Content</span>
                </label>
                <div class="relative">

                <TinyEditor
                :init="editorConfig"
                v-model="info.content"
                 />

                </div>
                </div>
                </div>
                </div>

                <input type="hidden" name="id" v-model="info.id" >

                <div class="col-span-12">
                <div class="flex flex-wrap justify-end space-x-3 sm:flex-nowrap">
                <span class="relative z-0 inline-flex shadow-sm rounded-md">
                <button type="submit" class="inline-flex text-sm bg-blue-500 hover:bg-blue-700 text-white py-2 px-4 focus:z-10 rounded-l-md">
                Save
                </button>
                </span>
                </div>
                </div>

                
                </div>
        </form>
</AppCard>

<AppCard class="col-span-6" padding="lg">
        <div id="pdfPreview"></div>
</AppCard>

</div>
</PageContainer>

</template>

<script>
import api from '../../api/client';
import html2pdf from 'html2pdf.js';
import QRCode from 'qrcode-generator';
import TinyEditor from '../../components/shared/TinyEditor.vue';
import PageContainer from '../../components/ui/PageContainer.vue';
import AppCard from '../../components/ui/AppCard.vue';

export default {
components:{
    TinyEditor, PageContainer, AppCard
},
data() {
        return {
            depId: localStorage.getItem('dep_id'),
            info:{},
            
           editorConfig: {
                        menubar: false,
                        plugins: 'image lists media searchreplace table wordcount',
                        toolbar: 'fontfamily fontsize  backcolor | bold italic underline | image table | alignleft aligncenter alignright lineheight | numlist bullist | removeformat | tags',
                        toolbar_sticky: true, 
                        toolbar_mode: 'wrap', 
                        images_upload_url: '/api/upload-img-from-editor', 
                        images_upload_base_path: '', 
                        relative_urls: false,
                        convert_urls: false,
                        setup : function(editor) {
                        editor.ui.registry.addMenuButton('tags', {
                        text: 'Tags',
                        fetch: function (callback) {
                            var items = [
                            {
                                type: 'menuitem',
                                text: 'Qrcode',
                                onAction: function () {
                                editor.insertContent('{{qrcode}}');
                                }
                            },
                            {
                                type: 'menuitem',
                                text: 'Circle Photo',
                                onAction: function () {
                                editor.insertContent('{{guest_photo_circle}}');
                                }
                            },
                            {
                                type: 'menuitem',
                                text: 'Square Photo',
                                onAction: function () {
                                editor.insertContent('{{guest_photo_square}}');
                                }
                            },
                            {
                                type: 'menuitem',
                                text: 'Military Number',
                                onAction: function () {
                                editor.insertContent('{{military_number}}');
                                }
                            },
                            {
                                type: 'menuitem',
                                text: 'Full Name English',
                                onAction: function () {
                                editor.insertContent('{{fullname_en}}');
                                }
                            },
                            {
                                type: 'menuitem',
                                text: 'Full Name Arabic',
                                onAction: function () {
                                editor.insertContent('{{fullname_ar}}');
                                }
                            },
                            {
                                type: 'menuitem',
                                text: 'Department',
                                onAction: function () {
                                editor.insertContent('{{department}}');
                                }
                            },
                            {
                                type: 'menuitem',
                                text: 'Rank',
                                onAction: function () {
                                editor.insertContent('{{rank}}');
                                }
                            },
                            {
                                type: 'menuitem',
                                text: 'Default Base',
                                onAction: function () {
                                editor.insertContent('{{default_base}}');
                                }
                            },
                            {
                                type: 'menuitem',
                                text: 'Zones',
                                onAction: function () {
                                editor.insertContent('{{zones}}');
                                }
                            },
                            {
                                type: 'menuitem',
                                text: 'expiry_date',
                                onAction: function () {
                                editor.insertContent('{{expiry_date}}');
                                }
                            },
                            {
                                type: 'menuitem',
                                text: 'plate_number',
                                onAction: function () {
                                editor.insertContent('{{plate_number}}');
                                }
                            }
                            ];
                            callback(items);
                        }
                        });
                            },
            }
                    }
            },
            mounted() {
                    this.fetchData();
            },
            methods: {
                    onReady(editor) {
                        console.log( Array.from( editor.ui.componentFactory.names() ) );
                    },
                   fetchData(){
                            api.get('/api/badges/'+this.depId) 
                            .then(response => {
                                this.info = response.data;
                                this.generateAndPreviewPDF();
                            });
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
                    generateAndPreviewPDF() {

                            function generateQRCode(text) {
                            const qr = QRCode(0, 'L'); 
                            qr.addData(text);
                            qr.make();
                            const qrCodeHTML = `<img src="${qr.createDataURL(3)}" alt="QR Code" />`; 
                            return qrCodeHTML;
                            }

                            function generatePhoto(pic, shape = 'circle'){
                            const photo='/uploads/'+pic;
                            const shapeClass = shape === 'circle' ? 'rounded-circle' : 'rounded-square';
                            const picHTML=`<img src="${photo}" alt="Photo" class="${shapeClass}" />`;
                            return picHTML;
                            }

                            function generateZone(pic){
                            const zoning='<span style="width:40px; height:10px; border-radius:20px; background-color:#ff0000; position:absolute; "></span> <span style="width:20px; height:10px; border-radius:4px; background-color:#E7DF04; position:absolute;"></span>';
                            return zoning;
                            }

                                    const replacedHTML = this.replaceTemplateValues(this.info.content, {
                                    qrcode: generateQRCode('123456789'),
                                    guest_photo_circle: generatePhoto('nopic.png','circle'),
                                    guest_photo_square: generatePhoto('nopic.png','square'),
                                    fullname_en: 'Full Name',
                                    fullname_ar: 'Ø§Ù„Ø§Ø³Ù… Ø§Ù„ÙƒØ§Ù…Ù„',
                                    department: 'Department',
                                    rank: 'Rank',
                                    military_number: '0000',
                                    default_base: 'Default Base',
                        zones: generateZone('Zones'),
                                    });

                                    

                                    const pdfConfig = {
                                            margin: 0,
                                            filename: 'badge.pdf',
                                            image: { type: 'jpeg', quality: 0.98 },
                                            html2canvas: { scale: 2 },
                                            jsPDF: { unit: 'mm', format: [54,85.6], orientation: 'portrait' },
                                    };

                                    const containerDiv = document.createElement('div');
                                    
                                    containerDiv.style.height = '85.6mm';
                                    containerDiv.style.padding = '0mm';
                                    containerDiv.style.backgroundColor = 'white';
                                    containerDiv.innerHTML = replacedHTML;
                                    
                                    
                                    const pdfElement = document.getElementById('pdfPreview');
                                    html2pdf().from(containerDiv).set(pdfConfig).output('datauristring').then(function(pdf) {
                                            pdfElement.innerHTML = `<embed src="${pdf}" width="100%" height="600px" />`;
                                    });

                    },
                    editBadge(){
                            
                            const formData = new FormData();

                            // Append other form data
                            formData.append('width', this.info.width);
                            formData.append('heigth', this.info.heigth);
                            formData.append('content', this.info.content);
                            formData.append('id', this.info.id);

                            api.post('/api/badges/update', formData, { headers: {'Content-Type': 'multipart/form-data'}})
                            .then(response => {
                            this.fetchData();
                            });

                    }
            }
            }
</script>