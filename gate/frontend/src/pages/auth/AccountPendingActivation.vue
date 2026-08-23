<template>
  <div class="min-h-screen bg-gradient-to-b from-amber-50/60 to-slate-50 px-4 py-6">
    <div class="text-center">
      <img src="/armedforces.png" alt="وزارة الدفاع" class="mx-auto mt-2 w-28 sm:w-36">
    </div>

    <div class="mx-auto mt-8 max-w-2xl rounded-2xl border border-amber-200/80 bg-white p-8 shadow-sm sm:p-10">
      <div class="mb-6 text-center">
        <div class="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-amber-100 text-3xl text-amber-600">
          <i class="pi pi-clock" />
        </div>
        <h1 class="text-2xl font-semibold text-slate-900">في انتظار تفعيل الحساب</h1>
        <p class="mt-3 text-sm leading-7 text-slate-600 sm:text-base">
          تم التحقق من هويتك عبر مرسال وتم حفظ بياناتك في النظام.
          يرجى إرسال المعلومات أدناه للمسؤول لإكمال التفعيل.
        </p>
      </div>

      <ol class="mb-8 grid gap-3 sm:grid-cols-3">
        <li class="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-center text-sm text-emerald-800">
          <span class="mb-1 block text-xs font-semibold uppercase">١</span>
          تم التحقق من الهوية
        </li>
        <li class="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-center text-sm font-medium text-amber-900">
          <span class="mb-1 block text-xs font-semibold uppercase">٢</span>
          بانتظار تفعيل المسؤول
        </li>
        <li class="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-center text-sm text-slate-600">
          <span class="mb-1 block text-xs font-semibold uppercase">٣</span>
          تسجيل الدخول مرة أخرى
        </li>
      </ol>

      <div v-if="loading" class="py-10 text-center text-slate-500">جاري تحميل بيانات الطلب...</div>

      <div v-else-if="profile" class="space-y-5">
        <div class="flex flex-col gap-3 rounded-xl border border-slate-200 bg-slate-50 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p class="text-sm font-medium text-slate-800">انسخ بيانات الطلب وأرسلها للمسؤول</p>
            <p v-if="profile.recorded_at" class="mt-1 text-xs text-slate-500">
              آخر تحديث: {{ formatDate(profile.recorded_at) }}
            </p>
            <p v-if="copyError" class="mt-1 text-xs text-red-600">{{ copyError }}</p>
          </div>
          <AppButton size="sm" @click="copyProfileJson">
            <i class="pi pi-copy" />
            <span>{{ copiedField === 'profile' ? 'تم النسخ' : 'نسخ جميع البيانات' }}</span>
          </AppButton>
        </div>

        <div class="grid gap-3 sm:grid-cols-2">
          <div v-if="profile.user_id" class="rounded-xl border border-slate-200 bg-white p-4">
            <p class="text-xs text-slate-500">رقم المستخدم</p>
            <p class="mt-1 font-semibold text-slate-900">{{ profile.user_id }}</p>
          </div>
          <div v-if="profile.name" class="rounded-xl border border-slate-200 bg-white p-4">
            <p class="text-xs text-slate-500">الاسم</p>
            <p class="mt-1 font-semibold text-slate-900">{{ profile.name }}</p>
          </div>
          <div v-if="profile.preferred_username" class="rounded-xl border border-slate-200 bg-white p-4">
            <p class="text-xs text-slate-500">اسم المستخدم</p>
            <p class="mt-1 font-semibold text-slate-900">{{ profile.preferred_username }}</p>
          </div>
          <div v-if="profile.email" class="rounded-xl border border-slate-200 bg-white p-4">
            <p class="text-xs text-slate-500">البريد الإلكتروني</p>
            <p class="mt-1 break-all font-semibold text-slate-900">{{ profile.email }}</p>
          </div>
          
          
        </div>
      </div>

      <div v-else class="rounded-xl border border-red-200 bg-red-50 p-5 text-center text-sm text-red-700">
        لا توجد بيانات تفعيل حالية. أعد تسجيل الدخول عبر مرسال لإنشاء طلب جديد.
      </div>

      <div class="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
        <AppButton variant="secondary" @click="returnToLogin">
          العودة لتسجيل الدخول
        </AppButton>
        <AppButton v-if="keycloakLoginUrl" @click="retryKeycloakLogin">
          إعادة المحاولة عبر مرسال
        </AppButton>
      </div>
    </div>
  </div>
</template>

<script>
import AppButton from '../../components/ui/AppButton.vue';
import {
  dismissKeycloakPending,
  fetchAuthProviders,
  fetchKeycloakPending,
} from '../../api/auth';

export default {
  components: { AppButton },
  data() {
    return {
      loading: true,
      profile: null,
      copiedField: null,
      keycloakLoginUrl: null,
      copyError: '',
    };
  },
  async mounted() {
    await this.loadPendingProfile();
    await this.loadProviders();
  },
  methods: {
    async loadProviders() {
      try {
        const providers = await fetchAuthProviders();
        this.keycloakLoginUrl = providers?.keycloak?.login_url ?? null;
      } catch {
        this.keycloakLoginUrl = null;
      }
    },
    async loadPendingProfile() {
      this.loading = true;

      try {
        const response = await fetchKeycloakPending();
        this.profile = response.profile ?? null;
      } catch {
        this.profile = null;
      } finally {
        this.loading = false;
      }
    },
    buildProfilePayload() {
      const payload = {
        name: this.profile?.name ?? null,
        id: this.profile?.user_id ?? null,
        sub: this.profile?.sub ?? null,
        email: this.profile?.email ?? null,
        username: this.profile?.preferred_username ?? null,
        login_username: this.profile?.login_username ?? null,
      };

      return Object.fromEntries(
        Object.entries(payload).filter(([, value]) => value !== null && value !== '')
      );
    },
    buildProfileCopyText() {
      return JSON.stringify(this.buildProfilePayload(), null, 2);
    },
    async copyTextToClipboard(text) {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        return;
      }

      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.setAttribute('readonly', '');
      textarea.style.position = 'fixed';
      textarea.style.left = '-9999px';
      document.body.appendChild(textarea);
      textarea.select();
      const copied = document.execCommand('copy');
      document.body.removeChild(textarea);

      if (!copied) {
        throw new Error('Copy failed');
      }
    },
    formatDate(value) {
      try {
        return new Intl.DateTimeFormat('ar-QA', {
          dateStyle: 'medium',
          timeStyle: 'short',
        }).format(new Date(value));
      } catch {
        return value;
      }
    },
    async copyProfileJson() {
      if (!this.profile) {
        return;
      }

      this.copyError = '';

      try {
        await this.copyTextToClipboard(this.buildProfileCopyText());
        this.copiedField = 'profile';
        window.setTimeout(() => {
          this.copiedField = null;
        }, 2000);
      } catch {
        this.copiedField = null;
        this.copyError = 'تعذر النسخ تلقائياً. انسخ الحقول يدوياً.';
      }
    },
    async returnToLogin() {
      try {
        await dismissKeycloakPending();
      } catch {
        // Continue to login.
      }

      this.$router.replace('/');
    },
    async retryKeycloakLogin() {
      if (!this.keycloakLoginUrl) {
        return;
      }

      try {
        await dismissKeycloakPending();
      } catch {
        // Server redirect also clears stale pending data.
      }

      window.location.href = this.keycloakLoginUrl;
    },
  },
};
</script>
