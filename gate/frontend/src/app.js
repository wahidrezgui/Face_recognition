import './bootstrap';
import { createApp } from 'vue';
import App from './App.vue';
import router from './router/index.js';
import PrimeVue from 'primevue/config';
import 'primevue/resources/themes/lara-light-teal/theme.css';
import 'primeicons/primeicons.css';
import ToastService from 'primevue/toastservice';
import VueSidePanel from 'vue3-side-panel';
import 'vue3-side-panel/dist/vue3-side-panel.css';

import VueHtmlToPaper from './lib/VueHtmlToPaper.js';
import { installQuery } from './plugins/query.js';
import { installDialog } from './plugins/dialog.js';
import AppLoader from './components/shared/AppLoader.vue';
import AppLoading from './components/shared/AppLoading.vue';
import AppDataGrid from './components/ui/AppDataGrid.vue';
import AppTableActions from './components/ui/AppTableActions.vue';
import AppTableFilters from './components/ui/AppTableFilters.vue';
import AppDialog from './components/ui/AppDialog.vue';

const app = createApp(App);

app.component('AppLoader', AppLoader);
app.component('AppLoading', AppLoading);
app.component('AppDataGrid', AppDataGrid);
app.component('AppTableActions', AppTableActions);
app.component('AppTableFilters', AppTableFilters);
app.component('AppDialog', AppDialog);

app.use(router);
installQuery(app);
app.use(PrimeVue);
app.use(ToastService);
installDialog(app);
app.use(VueSidePanel);
app.use(VueHtmlToPaper);

if (import.meta.env.PROD) {
    import('workbox-window').then(({ Workbox }) => {
        const wb = new Workbox('/build/sw.js', { scope: '/', type: 'classic' });
        wb.addEventListener('installed', (event) => {
            if (!event.isUpdate) {
                return;
            }
            window.location.reload();
        });
        wb.register().catch(() => {
            // SW optional — gate still works without install
        });
    });
}

app.mount('#app');
