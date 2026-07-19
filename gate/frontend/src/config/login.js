export const loginDefaults = {
    title: 'نظام الدخول والخروج — Gate Control System',
    welcome: 'السلام عليكم ورحمة الله وبركاته 👋 Welcome',
    username_label: 'اسم المستخدم',
    password_label: 'كلمة المرور',
    submit_label: 'تسجيل الدخول',
    sso_button_label: 'تسجيل الدخول عبر حساب مرسال',
    sso_help_text: 'للموظفين المسجلين في نظام مرسال',
    divider_label: 'أو',
};

export function mergeLoginCopy(apiLogin = {}) {
    return {
        ...loginDefaults,
        ...Object.fromEntries(
            Object.entries(apiLogin).filter(([, value]) => typeof value === 'string' && value.trim() !== '')
        ),
    };
}
