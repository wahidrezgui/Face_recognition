import { z } from 'zod';

// Zod owns validity only — no message here. The UI resolves the displayed
// error text via i18n (t('departments.validation.nameEnRequired')) so it
// stays reactive to locale changes instead of being frozen at schema-definition time.
export const nameEnValidator = z.string().trim().min(1);

export function emptyDepartmentFormValues(depId) {
  return {
    id: null,
    name_en: '',
    name_ar: '',
    parent_id: Number(depId || 0),
    parent_id_tree: null,
    selectedBases: [],
  };
}
