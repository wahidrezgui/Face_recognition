<script setup lang="ts">
import { Head } from '@inertiajs/vue3';
import { trans } from 'laravel-vue-i18n';
import InputText from 'primevue/inputtext';
import Message from 'primevue/message';
import Select from 'primevue/select';
import Tag from 'primevue/tag';
import { computed } from 'vue';
import AppButton from '@/components/AppButton.vue';
import AppCard from '@/components/AppCard.vue';
import FormField from '@/components/FormField.vue';
import PageContainer from '@/components/PageContainer.vue';
import PermissionEditorGrid from '@/components/roleAccess/PermissionEditorGrid.vue';
import SegmentedTabs from '@/components/SegmentedTabs.vue';
import { useRoleAccessPage } from '@/composables/useRoleAccessPage';
import AppLayout from '@/layouts/AppLayout.vue';

defineOptions({ layout: AppLayout });

const {
    catalog,
    roles,
    activeTab,
    selectedRoleId,
    roleDetail,
    roleLoading,
    roleSaving,
    roleRouteAccess,
    roleResourceAccess,
    roleResourceScopeAccess,
    saveRolePermissions,
    userSearch,
    userSearchResults,
    userSearchLoading,
    userDetail,
    userLoading,
    userSaving,
    userRouteAccess,
    userResourceAccess,
    userResourceScopeAccess,
    selectUser,
    saveUserPermissions,
    clearUserOverrides,
} = useRoleAccessPage();

const roleOptions = computed(() =>
    roles.value.map((role) => ({
        value: role.id,
        label: `${role.name} (${role.permissions_count})`,
    })),
);

const tabItems = computed(() => [
    { value: 'roles', label: trans('rolePermissions.tabs.roles') },
    { value: 'users', label: trans('rolePermissions.tabs.users') },
]);
</script>

<template>
    <Head :title="trans('nav.role_permissions')" />

    <PageContainer
        :title="trans('nav.role_permissions')"
        :description="trans('rolePermissions.page.description')"
    >
        <div class="mb-4">
            <SegmentedTabs v-model="activeTab" :items="tabItems" />
        </div>

        <template v-if="activeTab === 'roles'">
            <AppCard padding="lg" class="mb-6">
                <div
                    class="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"
                >
                    <div class="min-w-[240px]">
                        <FormField
                            :label="trans('rolePermissions.roles.pickerLabel')"
                            v-slot="{ id }"
                        >
                            <Select
                                :input-id="id"
                                v-model="selectedRoleId"
                                :options="roleOptions"
                                option-label="label"
                                option-value="value"
                                fluid
                            />
                        </FormField>
                    </div>
                    <AppButton
                        v-if="roleDetail && !roleDetail.locked"
                        :disabled="roleSaving"
                        :loading="roleSaving"
                        @click="saveRolePermissions"
                    >
                        {{
                            roleSaving
                                ? trans('rolePermissions.roles.saving')
                                : trans('rolePermissions.roles.save')
                        }}
                    </AppButton>
                </div>
                <Message
                    v-if="roleDetail?.locked"
                    severity="warn"
                    variant="simple"
                    :closable="false"
                    class="mt-3"
                    >{{ trans('rolePermissions.roles.lockedNotice') }}</Message
                >
            </AppCard>

            <div
                v-if="roleLoading"
                class="py-16 text-center text-surface-500 dark:text-surface-400"
            >
                {{ trans('common.loading') }}
            </div>

            <PermissionEditorGrid
                v-else-if="roleDetail"
                v-model:route-access="roleRouteAccess"
                v-model:resource-access="roleResourceAccess"
                v-model:resource-scope-access="roleResourceScopeAccess"
                :catalog="catalog"
                :locked="roleDetail.locked"
            />
        </template>

        <template v-else>
            <AppCard padding="lg" class="mb-6">
                <FormField
                    :label="trans('rolePermissions.users.searchLabel')"
                    v-slot="{ id }"
                >
                    <InputText
                        :id="id"
                        v-model="userSearch"
                        fluid
                        :placeholder="
                            trans('rolePermissions.users.searchPlaceholder')
                        "
                    />
                </FormField>

                <div
                    v-if="
                        userSearch &&
                        (userSearchLoading || userSearchResults.length > 0)
                    "
                    class="mt-2 max-h-56 space-y-1 overflow-y-auto"
                >
                    <div
                        v-if="userSearchLoading"
                        class="px-2 py-1 text-xs text-surface-500 dark:text-surface-400"
                    >
                        {{ trans('common.loading') }}
                    </div>
                    <button
                        v-for="result in userSearchResults"
                        :key="result.id"
                        type="button"
                        class="block w-full rounded-md px-3 py-2 text-start text-sm hover:bg-surface-100 dark:hover:bg-surface-800"
                        @click="selectUser(result.id)"
                    >
                        {{ result.firstname }} {{ result.lastname }}
                        <span class="text-surface-500 dark:text-surface-400"
                            >({{ result.username }})</span
                        >
                    </button>
                </div>
            </AppCard>

            <div
                v-if="userLoading"
                class="py-16 text-center text-surface-500 dark:text-surface-400"
            >
                {{ trans('common.loading') }}
            </div>

            <template v-else-if="userDetail">
                <AppCard padding="md" class="mb-6">
                    <div
                        class="flex flex-wrap items-center justify-between gap-3"
                    >
                        <div>
                            <p
                                class="text-sm font-semibold text-surface-800 dark:text-surface-100"
                            >
                                {{ userDetail.user.firstname }}
                                {{ userDetail.user.lastname }} ({{
                                    userDetail.user.username
                                }})
                            </p>
                            <p
                                class="mt-1 text-xs text-surface-500 dark:text-surface-400"
                            >
                                {{ trans('rolePermissions.users.roleLabel') }}:
                                {{ userDetail.user.role ?? '—' }} ·
                                {{
                                    trans(
                                        'rolePermissions.users.viaRoleCount',
                                        {
                                            count: String(
                                                userDetail.role_permissions
                                                    .length,
                                            ),
                                        },
                                    )
                                }}
                            </p>
                        </div>
                        <div class="flex gap-2">
                            <AppButton
                                severity="secondary"
                                outlined
                                @click="clearUserOverrides"
                                >{{
                                    trans('rolePermissions.users.clear')
                                }}</AppButton
                            >
                            <AppButton
                                :disabled="userSaving"
                                :loading="userSaving"
                                @click="saveUserPermissions"
                            >
                                {{
                                    userSaving
                                        ? trans('rolePermissions.roles.saving')
                                        : trans('rolePermissions.roles.save')
                                }}
                            </AppButton>
                        </div>
                    </div>
                    <div class="mt-3 flex flex-wrap gap-1">
                        <Tag
                            v-for="name in userDetail.role_permissions"
                            :key="name"
                            severity="secondary"
                            :value="name"
                        />
                    </div>
                </AppCard>

                <PermissionEditorGrid
                    v-model:route-access="userRouteAccess"
                    v-model:resource-access="userResourceAccess"
                    v-model:resource-scope-access="userResourceScopeAccess"
                    :catalog="catalog"
                    :locked="false"
                />
            </template>

            <div
                v-else
                class="py-16 text-center text-sm text-surface-500 dark:text-surface-400"
            >
                {{ trans('rolePermissions.users.empty') }}
            </div>
        </template>
    </PageContainer>
</template>
