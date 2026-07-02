<template>
  <div class="bg-white p-8 rounded-xl shadow shadow-slate-300">
    <div class="text-center">
      <img src="/armedforces.png" alt="QAF">
    </div>
    <div class="mt-8">
      <form novalidate @submit.prevent="$emit('scan')">
        <div class="flex flex-col space-y-5">
          <label class="flex rounded-md overflow-hidden w-full">
            <input
              :value="qrcode"
              ref="qrcodeInput"
              type="text"
              :class="{ 'border-red-500': !qrcodeValid }"
              class="w-full py-3 border border-slate-200 rounded-md rounded-r-none"
              placeholder="..."
              @input="$emit('update:qrcode', $event.target.value); $emit('update:qrcodeValid', true)"
              @keyup="$emit('precheck', $event)"
            >
          </label>
          <div class="col-span-6">
            <div class="mb-3">
              <label class="block font-semibold inline-flex items-center">
                <span>لوحة السيارة العسكرية</span>
              </label>
              <input
                :value="platenumber"
                type="text"
                class="flex h-12 w-full items-center justify-center rounded-md border"
                @input="$emit('update:platenumber', $event.target.value)"
              >
            </div>
          </div>
        </div>
      </form>
    </div>

    <div v-if="error" class="mt-8 bg-red-100 border-t border-b border-red-500 text-red-700 px-4 py-3 text-2xl" role="alert">
      <p class="font-bold">خطأ</p>
      <p class="text-xl">لم يتم العثور على بيانات.</p>
    </div>

    <slot />
  </div>
</template>

<script>
export default {
  name: 'GateScanner',
  props: {
    qrcode: { type: String, default: '' },
    platenumber: { type: String, default: '' },
    qrcodeValid: { type: Boolean, default: true },
    error: { type: Boolean, default: false },
  },
  emits: ['update:qrcode', 'update:platenumber', 'update:qrcodeValid', 'scan', 'precheck'],
  methods: {
    focus() {
      this.$refs.qrcodeInput?.focus();
    },
  },
};
</script>
