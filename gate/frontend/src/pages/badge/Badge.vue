<template>
    <div dir="rtl">
        <PageContainer
            title="تصميم بطاقة الدخول"
            description="اختر الوحدة ثم صمّم الوجه الأمامي والخلفي للبطاقة"
        >
            <BadgeBuilderShell />
        </PageContainer>
    </div>
</template>

<script>
import { defineAsyncComponent } from 'vue';
import PageContainer from '../../components/ui/PageContainer.vue';

const BadgeBuilderShell = defineAsyncComponent(() => import('../../components/badges/BadgeBuilderShell.vue'));

export default {
    name: 'BadgeDesignerPage',
    components: {
        PageContainer,
        BadgeBuilderShell,
    },
};
</script>
