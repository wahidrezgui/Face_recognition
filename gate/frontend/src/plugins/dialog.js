import { dialogService } from '../services/dialogService';

export function installDialog(app) {
    app.config.globalProperties.$dialog = dialogService;

    app.config.globalProperties.$confirm = {
        require: (options = {}) => dialogService.confirm(options),
    };
}
