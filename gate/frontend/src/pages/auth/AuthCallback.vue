<template>
  <div class="flex min-h-[40vh] items-center justify-center">
    <div class="text-center">
      <p class="text-lg text-slate-600">جاري إكمال تسجيل الدخول...</p>
      <p class="mt-2 text-sm text-slate-400">Completing sign-in</p>
    </div>
  </div>
</template>

<script>
import { useAuth } from '../../composables/useAuth';
import { getRedirectPathForUser } from '../../api/auth';
import { isAuthenticated } from '../../lib/auth-session';

export default {
  setup() {
    const { loadUser } = useAuth();
    return { loadUser };
  },
  async mounted() {
    try {
      const result = await this.loadUser();
      const user = result.data;

      if (isAuthenticated(user)) {
        const roleName = user?.roles?.[0]?.name;

        if (roleName) {
          this.$router.replace(getRedirectPathForUser(user));
          return;
        }

        this.$router.replace({ path: '/permission-denied', query: { reason: 'no_role' } });
        return;
      }
    } catch {
      // Fall through to login when session could not be established.
    }

    this.$router.replace('/?sso_error=' + encodeURIComponent('تعذر إكمال تسجيل الدخول. حاول مرة أخرى.'));
  },
};
</script>
