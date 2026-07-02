<template>
  <Editor
    api-key="no-api-key"
    :init="mergedConfig"
    :model-value="modelValue"
    @update:model-value="$emit('update:modelValue', $event)"
  />
</template>

<script>
import Editor from '@tinymce/tinymce-vue';
import 'tinymce/tinymce';
import 'tinymce/themes/silver';
import 'tinymce/icons/default';
import 'tinymce/models/dom';
import 'tinymce/plugins/image';
import 'tinymce/plugins/lists';
import 'tinymce/plugins/media';
import 'tinymce/plugins/searchreplace';
import 'tinymce/plugins/table';
import 'tinymce/plugins/wordcount';

export default {
  name: 'TinyEditor',
  components: { Editor },
  props: {
    modelValue: { type: String, default: '' },
    init: { type: Object, default: () => ({}) },
  },
  emits: ['update:modelValue'],
  computed: {
    mergedConfig() {
      return {
        license_key: 'gpl',
        menubar: false,
        plugins: 'image lists media searchreplace table wordcount',
        toolbar: 'fontfamily fontsize backcolor | bold italic underline | image table | alignleft aligncenter alignright lineheight | numlist bullist | removeformat',
        toolbar_sticky: true,
        toolbar_mode: 'wrap',
        relative_urls: false,
        convert_urls: false,
        ...this.init,
      };
    },
  },
};
</script>

<style>
.tox-promotion { display: none; }
</style>
