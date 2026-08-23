<script setup lang="ts">
import { Head, useForm, usePage } from '@inertiajs/vue3';
import { trans } from 'laravel-vue-i18n';
import InputText from 'primevue/inputtext';
import Password from 'primevue/password';
import { computed } from 'vue';
import {
    update,
    updatePassword,
} from '@/actions/App/Http/Controllers/Inertia/ProfileController';
import AppButton from '@/components/AppButton.vue';
import AppCard from '@/components/AppCard.vue';
import FormField from '@/components/FormField.vue';
import PageContainer from '@/components/PageContainer.vue';
import { useLocale } from '@/composables/useLocale';
import { useToast } from '@/composables/useToast';
import AppLayout from '@/layouts/AppLayout.vue';
import { localizedLabel } from '@/lib/employees/employeeFormUi';
defineOptions({ layout: AppLayout });

interface NamedRef {
    id: number;
    name_ar: string | null;
    name_en: string | null;
}

interface ProfilePageProps {
    department: NamedRef | null;
    defaultBase: NamedRef | null;
    [key: string]: unknown;
}

const props = defineProps<ProfilePageProps>();

const page = usePage();
const toast = useToast();
const { locale } = useLocale();

const currentUser = computed(() => page.props.auth.user);

const departmentLabel = computed(() =>
    props.department
        ? localizedLabel(props.department, locale.value)
        : trans('profile.info.unassigned'),
);

const baseLabel = computed(() =>
    props.defaultBase
        ? localizedLabel(props.defaultBase, locale.value)
        : trans('profile.info.unassigned'),
);

const profileForm = useForm({
    firstname: currentUser.value?.firstname ?? '',
    lastname: currentUser.value?.lastname ?? '',
});

function submitProfile() {
    profileForm.put(update.url(), {
        preserveScroll: true,
        onSuccess: () =>
            toast.success(
                trans('profile.toast.updateSuccess'),
                trans('profile.toast.successTitle'),
            ),
        onError: () =>
            toast.error(
                trans('profile.toast.updateFailed'),
                trans('profile.toast.errorTitle'),
            ),
    });
}

const passwordForm = useForm({
    current_password: '',
    password: '',
    password_confirmation: '',
});

function submitPassword() {
    passwordForm.put(updatePassword.url(), {
        preserveScroll: true,
        onSuccess: () => {
            passwordForm.reset();
            toast.success(
                trans('profile.toast.passwordSuccess'),
                trans('profile.toast.successTitle'),
            );
        },
        onError: () => {
            passwordForm.reset(
                'current_password',
                'password',
                'password_confirmation',
            );
            toast.error(
                trans('profile.toast.passwordFailed'),
                trans('profile.toast.errorTitle'),
            );
        },
    });
}
</script>

<template>
    <Head :title="trans('profile.page.title')" />

    <PageContainer
        :title="trans('profile.page.title')"
        :description="trans('profile.page.description')"
    >
        <div class="mx-auto grid max-w-2xl grid-cols-1 gap-6">
            <AppCard
                padding="sm"
                :title="trans('profile.info.title')"
                :subtitle="trans('profile.info.subtitle')"
            >
                <form
                    novalidate
                    class="space-y-1"
                    @submit.prevent="submitProfile"
                >
                    <FormField
                        :label="trans('profile.info.username')"
                        v-slot="{ id }"
                    >
                        <InputText
                            :id="id"
                            :model-value="currentUser?.username"
                            fluid
                            dir="ltr"
                            disabled
                        />
                    </FormField>

                    <div class="grid grid-cols-2 gap-3">
                        <FormField
                            :label="trans('profile.info.department')"
                            v-slot="{ id }"
                        >
                            <InputText
                                :id="id"
                                :model-value="departmentLabel"
                                fluid
                                disabled
                            />
                        </FormField>
                        <FormField
                            :label="trans('profile.info.base')"
                            v-slot="{ id }"
                        >
                            <InputText
                                :id="id"
                                :model-value="baseLabel"
                                fluid
                                disabled
                            />
                        </FormField>
                    </div>
                    <p
                        class="-mt-1 text-xs text-surface-500 dark:text-surface-400"
                    >
                        {{ trans('profile.info.assignmentHint') }}
                    </p>

                    <div class="grid grid-cols-2 gap-3">
                        <FormField
                            :label="trans('profile.info.firstname')"
                            required
                            :error="profileForm.errors.firstname"
                            v-slot="{ id }"
                        >
                            <InputText
                                :id="id"
                                v-model="profileForm.firstname"
                                fluid
                                :invalid="!!profileForm.errors.firstname"
                            />
                        </FormField>
                        <FormField
                            :label="trans('profile.info.lastname')"
                            required
                            :error="profileForm.errors.lastname"
                            v-slot="{ id }"
                        >
                            <InputText
                                :id="id"
                                v-model="profileForm.lastname"
                                fluid
                                :invalid="!!profileForm.errors.lastname"
                            />
                        </FormField>
                    </div>

                    <div class="flex justify-end">
                        <AppButton
                            type="submit"
                            :loading="profileForm.processing"
                            :label="trans('profile.info.save')"
                        />
                    </div>
                </form>
            </AppCard>

            <AppCard
                padding="sm"
                :title="trans('profile.password.title')"
                :subtitle="trans('profile.password.subtitle')"
            >
                <form
                    novalidate
                    class="space-y-1"
                    @submit.prevent="submitPassword"
                >
                    <FormField
                        :label="trans('profile.password.current')"
                        required
                        :error="passwordForm.errors.current_password"
                        v-slot="{ id }"
                    >
                        <Password
                            :input-id="id"
                            v-model="passwordForm.current_password"
                            fluid
                            toggle-mask
                            :feedback="false"
                            :invalid="!!passwordForm.errors.current_password"
                        />
                    </FormField>

                    <div class="grid grid-cols-2 gap-2">
                        <FormField
                            :label="trans('profile.password.new')"
                            required
                            :error="passwordForm.errors.password"
                            v-slot="{ id }"
                        >
                            <Password
                                :input-id="id"
                                v-model="passwordForm.password"
                                fluid
                                toggle-mask
                                :feedback="false"
                                :invalid="!!passwordForm.errors.password"
                            />
                        </FormField>
                        <FormField
                            :label="trans('profile.password.confirm')"
                            required
                            :error="passwordForm.errors.password_confirmation"
                            v-slot="{ id }"
                        >
                            <Password
                                :input-id="id"
                                v-model="passwordForm.password_confirmation"
                                fluid
                                toggle-mask
                                :feedback="false"
                                :invalid="
                                    !!passwordForm.errors.password_confirmation
                                "
                            />
                        </FormField>
                    </div>

                    <div class="flex justify-end">
                        <AppButton
                            type="submit"
                            :loading="passwordForm.processing"
                            :label="trans('profile.password.save')"
                        />
                    </div>
                </form>
            </AppCard>
        </div>
    </PageContainer>
</template>
