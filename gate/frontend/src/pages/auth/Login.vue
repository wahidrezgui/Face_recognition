<template>
  <div class="min-h-screen bg-gradient-to-b from-slate-100 to-slate-50 px-4 py-6">
    <div class="text-center">
      <img src="/armedforces.png" alt="وزارة الدفاع" class="mx-auto mt-2 w-28 sm:w-36">
    </div>

    <div class="mx-auto mt-8 max-w-md rounded-2xl border border-slate-200/80 bg-white p-8 shadow-sm sm:max-w-lg sm:p-10">
      <div class="mb-8 text-center">
        <h1 class="text-2xl font-semibold text-slate-900 sm:text-3xl">{{ loginCopy.title }}</h1>
        <p class="mt-3 text-sm leading-6 text-slate-500 sm:text-base">{{ loginCopy.welcome }}</p>
      </div>

      <div
        v-if="toastMessage"
        class="mb-6 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        role="alert"
      >
        <i class="pi pi-exclamation-circle mt-0.5 shrink-0" />
        <span>{{ toastMessage }}</span>
      </div>

      <form novalidate class="space-y-5" @submit.prevent="loginSubmit">
        <label for="email" class="block">
          <span class="mb-2 block text-sm font-medium text-slate-700">{{ loginCopy.username_label }}</span>
          <input
            id="email"
            v-model="formData.email"
            type="text"
            name="email"
            autocomplete="username"
            :class="inputClass(!fieldValidity.email)"
            placeholder="اسم المستخدم هنا"
            @input="fieldValidity.email = true"
          >
        </label>

        <label for="password" class="block">
          <span class="mb-2 block text-sm font-medium text-slate-700">{{ loginCopy.password_label }}</span>
          <div class="relative">
            <input
              id="password"
              v-model="formData.password"
              :type="showPassword ? 'text' : 'password'"
              name="password"
              autocomplete="current-password"
              :class="inputClass(!fieldValidity.password, true)"
              placeholder="كلمة المرور هنا"
              @input="fieldValidity.password = true"
            >
            <button
              type="button"
              class="absolute inset-y-0 left-0 flex items-center px-4 text-slate-400 hover:text-slate-600"
              :aria-label="showPassword ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'"
              @click="showPassword = !showPassword"
            >
              <i :class="showPassword ? 'pi pi-eye-slash' : 'pi pi-eye'" />
            </button>
          </div>
        </label>

        <AppButton type="submit" size="lg" class="w-full" :disabled="isSubmitting">
          <i class="pi pi-sign-in" />
          <span>{{ isSubmitting ? 'جاري الدخول...' : loginCopy.submit_label }}</span>
        </AppButton>
      </form>

      <template v-if="keycloakEnabled && keycloakLoginUrl">
        <div class="relative my-8 text-center">
          <span class="relative z-10 bg-white px-3 text-xs font-medium uppercase tracking-wide text-slate-400">
            {{ loginCopy.divider_label }}
          </span>
          <div class="absolute inset-x-0 top-1/2 border-t border-slate-200" />
        </div>

        <div class="rounded-xl border border-slate-200 bg-slate-50/80 p-4">
          <p class="mb-3 text-center text-xs text-slate-500">{{ loginCopy.sso_help_text }}</p>
          <AppButton
            variant="secondary"
            size="lg"
            class="w-full"
            :disabled="ssoLoading"
            @click="startKeycloakLogin"
          >
            <i class="pi pi-key" />
            <span>{{ ssoLoading ? 'جاري التحويل إلى مرسال...' : loginCopy.sso_button_label }}</span>
          </AppButton>
        </div>
      </template>
    </div>
  </div>
</template>

<script>
import AppButton from '../../components/ui/AppButton.vue';
import { useAuth } from '../../composables/useAuth';
import {
  dismissKeycloakPending,
  fetchAuthProviders,
  getRedirectPathForUser,
} from '../../api/auth';
import { loginDefaults, mergeLoginCopy } from '../../config/login';

export default {
  components: { AppButton },
  setup() {
    const { login } = useAuth();
    return { login };
  },
  data() {
    return {
      formData: {
        email: '',
        password: '',
      },
      fieldValidity: {
        email: true,
        password: true,
      },
      toastMessage: '',
      showPassword: false,
      isSubmitting: false,
      ssoLoading: false,
      keycloakEnabled: false,
      keycloakLoginUrl: null,
      loginCopy: { ...loginDefaults },
    };
  },
  async mounted() {
    const ssoError = this.$route.query.sso_error;
    if (typeof ssoError === 'string' && ssoError.trim() !== '') {
      this.toastMessage = ssoError;
      this.$router.replace({ path: '/' });
    }

    try {
      await dismissKeycloakPending();
    } catch {
      // Ignore — login page should still work if dismiss fails.
    }

    try {
      const providers = await fetchAuthProviders();
      this.keycloakEnabled = Boolean(providers?.keycloak?.enabled);
      this.keycloakLoginUrl = providers?.keycloak?.login_url ?? null;
      this.loginCopy = mergeLoginCopy(providers?.login);
    } catch {
      this.keycloakEnabled = false;
      this.keycloakLoginUrl = null;
      this.loginCopy = { ...loginDefaults };
    }
  },
  methods: {
    inputClass(isInvalid, withToggle = false) {
      return [
        'w-full rounded-xl border px-4 py-3.5 text-slate-900 transition focus:outline-none focus:ring-2 focus:ring-brand/20',
        withToggle ? 'pl-12' : '',
        isInvalid ? 'border-red-500 focus:border-red-500' : 'border-slate-200 hover:border-slate-300 focus:border-brand',
      ];
    },
    async startKeycloakLogin() {
      if (!this.keycloakLoginUrl || this.ssoLoading) {
        return;
      }

      this.ssoLoading = true;
      this.toastMessage = '';

      try {
        await dismissKeycloakPending();
      } catch {
        // Redirect still clears stale pending on the server.
      }

      window.location.href = this.keycloakLoginUrl;
    },
    async loginSubmit() {
      this.toastMessage = '';

      if (this.formData.email.trim() === '') {
        this.fieldValidity.email = false;
        this.toastMessage = 'اسم المستخدم مطلوب.';
        return;
      }
      if (this.formData.password.trim() === '') {
        this.fieldValidity.password = false;
        this.toastMessage = 'كلمة المرور مطلوبة.';
        return;
      }

      this.isSubmitting = true;

      try {
        const response = await this.login(this.formData);

        if (response.status === 'success') {
          this.$router.push(getRedirectPathForUser(response.user));
        }
      } catch (error) {
        const apiMessage = error.response?.data?.message;
        const validationEmail = error.response?.data?.errors?.email?.[0];
        this.toastMessage = validationEmail || apiMessage || 'خطأ في اسم المستخدم أو كلمة المرور.';
      } finally {
        this.isSubmitting = false;
      }
    },
  },
};
</script>
