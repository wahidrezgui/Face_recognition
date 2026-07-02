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

app.mount('#app');
