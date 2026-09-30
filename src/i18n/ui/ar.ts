import type { UIDictionary } from './en';

/** Arabic has six plural categories; Moroccan usage keeps Western digits. */
const plural = new Intl.PluralRules('ar');
function arCount(n: number, forms: { one: string; two: string; few: string; many: string }): string {
  switch (plural.select(n)) {
    case 'one':
      return forms.one;
    case 'two':
      return forms.two;
    case 'few':
      return `${n} ${forms.few}`;
    default:
      return `${n} ${forms.many}`;
  }
}

const ar: UIDictionary = {
  meta: {
    // The brand name stays in Latin script, as in the logo.
    siteName: 'Atlaxys Consulting',
    defaultTitle: 'Atlaxys Consulting — هندسة البرمجيات والأتمتة بالذكاء الاصطناعي والسحابة',
    defaultDescription:
      'أتلاكسيس شركة استشارات تقنية واستوديو لهندسة البرمجيات مقرّها المغرب. نصمّم ونطوّر ونشغّل المنصات الرقمية وتطبيقات الهاتف وبرمجيات الأعمال وحلول الأتمتة بالذكاء الاصطناعي والبنى السحابية، لعملاء في المغرب وحول العالم.',
    orgDescription:
      'أتلاكسيس للاستشارات (Atlaxys Consulting) شركة مغربية متخصصة في الاستشارات التقنية وهندسة البرمجيات. تصمّم وتطوّر وتشغّل تطبيقات الويب والهاتف وبرمجيات الأعمال الداخلية وحلول الأتمتة المعتمدة على الذكاء الاصطناعي والبنى التحتية السحابية، لعملاء داخل المغرب وخارجه.',
    slogan: 'نبني البرمجيات التي تقوم عليها أعمالك.',
  },

  a11y: {
    skipToContent: 'انتقل إلى المحتوى',
    primaryNav: 'القائمة الرئيسية',
    footerNav: 'تذييل الصفحة',
    breadcrumb: 'مسار التنقل',
    openMenu: 'فتح القائمة',
    closeMenu: 'إغلاق القائمة',
    language: 'اللغة',
    changeLanguage: 'تغيير اللغة',
    newTab: '(يفتح في علامة تبويب جديدة)',
    close: 'إغلاق',
    servicesMenu: 'الخدمات',
    backToTop: 'العودة إلى الأعلى',
    scrollHint: 'مرّر للأسفل',
    loading: 'جارٍ التحميل',
    homeLink: 'Atlaxys Consulting — الصفحة الرئيسية',
  },

  nav: {
    home: 'الرئيسية',
    services: 'الخدمات',
    products: 'المنتجات',
    work: 'أعمالنا',
    insights: 'مقالات',
    about: 'من نحن',
    contact: 'تواصل معنا',
    letsTalk: 'لنتحدّث',
    search: 'بحث',
    menu: 'القائمة',
    allServices: 'جميع الخدمات',
    morocco: 'المغرب',
    privacy: 'سياسة الخصوصية',
    terms: 'شروط الاستخدام',
    cookies: 'سياسة ملفات الارتباط',
    cookieSettings: 'إعدادات ملفات الارتباط',
    megaTitle: 'أربعة مجالات خبرة، وفريق هندسي واحد.',
    megaProductsTitle: 'منتجاتنا',
    megaProductsText: 'برمجيات أعمال نطوّرها ونرخّصها ونتولّى صيانتها.',
    megaMoroccoTitle: 'في المغرب',
    megaMoroccoText: 'حضور محلي، وثلاث لغات، ومعايير دولية.',
  },

  cta: {
    startProject: 'ابدأ مشروعك',
    discussProject: 'ناقش مشروعك معنا',
    talkToUs: 'تحدّث مع أتلاكسيس',
    seeWork: 'اطّلع على أعمالنا',
    howWeWork: 'كيف نعمل',
    exploreService: 'اكتشف الخدمة',
    viewProduct: 'عرض المنتج',
    allProducts: 'جميع المنتجات',
    readCaseStudy: 'اقرأ دراسة الحالة',
    allWork: 'جميع الأعمال',
    readArticle: 'اقرأ المقال',
    allInsights: 'جميع المقالات',
    requestDemo: 'اطلب عرضًا تجريبيًا',
    openDemo: 'افتح النسخة التجريبية',
    download: 'تنزيل',
    whatsapp: 'راسلنا على واتساب',
    whatsappShort: 'واتساب',
    email: 'راسلنا بالبريد',
    backHome: 'العودة إلى الرئيسية',
    learnMore: 'اعرف المزيد',
  },

  labels: {
    service: 'خدمة',
    services: 'الخدمات',
    product: 'منتج',
    products: 'المنتجات',
    caseStudy: 'دراسة حالة',
    caseStudies: 'دراسات الحالة',
    article: 'مقال',
    articles: 'المقالات',
    industry: 'القطاع',
    industries: 'القطاعات',
    page: 'صفحة',
    client: 'العميل',
    year: 'السنة',
    duration: 'المدة',
    ourRole: 'دورنا',
    stack: 'التقنيات',
    technologies: 'التقنيات',
    platforms: 'المنصّات',
    status: 'الحالة',
    category: 'الفئة',
    audience: 'موجّه إلى',
    features: 'المزايا',
    pricing: 'الأسعار',
    deliverables: 'ما ستحصل عليه',
    capabilities: 'ما نتقنه',
    approach: 'منهجيتنا',
    contents: 'المحتويات',
    faq: 'أسئلة شائعة',
    relatedServices: 'خدمات ذات صلة',
    relatedProducts: 'منتجات ذات صلة',
    relatedWork: 'أعمال ذات صلة',
    relatedInsights: 'قراءات إضافية',
    published: 'نُشر في',
    updated: 'حُدّث في',
    author: 'بقلم',
    challenge: 'التحدّي',
    thinking: 'التفكير',
    architecture: 'البنية',
    execution: 'التنفيذ',
    technology: 'التقنية',
    outcome: 'النتيجة',
    testimonial: 'كلمة العميل',
    gallery: 'معرض الصور',
    statusAvailable: 'متاح',
    statusBeta: 'نسخة تجريبية',
    statusInDevelopment: 'قيد التطوير',
    statusComingSoon: 'قريبًا',
    priceOnRequest: 'السعر عند الطلب',
    priceFrom: 'ابتداءً من',
    perMonth: '/ شهريًا',
    perYear: '/ سنويًا',
    oneTime: 'دفعة واحدة',
    illustrative: 'مثال توضيحي',
    illustrativeNote:
      'دراسة الحالة هذه محتوى توضيحي لأغراض العرض، ولا تصف مشروعًا حقيقيًا لعميل. سيتم استبدالها بمشروع منشور.',
    demoProductNote: 'وصف أوّلي للمنتج — سيتم تأكيد الاسم والمزايا والتوفّر قبل النشر.',
    mediaPlaceholder: 'مكان مخصّص لصورة الشاشة',
    step: 'المرحلة',
    minRead: (minutes: number) =>
      `${arCount(minutes, { one: 'دقيقة واحدة', two: 'دقيقتان', few: 'دقائق', many: 'دقيقة' })} للقراءة`,
    lastUpdated: 'آخر تحديث',
  },

  stack: {
    groups: {
      interfaces: 'واجهات الويب',
      mobile: 'الهاتف وسطح المكتب',
      backend: 'الخوادم وواجهات API',
      data: 'البيانات',
      cloud: 'السحابة وDevOps',
      ai: 'الذكاء الاصطناعي والأتمتة',
    },
  },

  footer: {
    headline: 'لديك مشروع تريد بناءه؟',
    text: 'أخبرنا بما تعمل عليه. سيردّ عليك مهندس، لا رسائل تسويقية آلية.',
    company: 'الشركة',
    services: 'الخدمات',
    products: 'المنتجات',
    contact: 'التواصل',
    language: 'اللغة',
    based: 'مقرّنا المغرب، وعملنا حول العالم.',
    rights: 'جميع الحقوق محفوظة.',
  },

  form: {
    name: 'الاسم الكامل',
    company: 'الشركة',
    email: 'البريد الإلكتروني المهني',
    phone: 'الهاتف أو واتساب',
    country: 'البلد',
    projectType: 'ما الذي تحتاجه؟',
    budget: 'الميزانية التقديرية',
    timeline: 'الإطار الزمني',
    message: 'مشروعك',
    messageHint: 'ماذا تبني، ولمن، وكيف يبدو النجاح بالنسبة إليك؟',
    budgetHint: 'يكفي نطاق تقريبي — المبالغ باليورو.',
    optional: 'اختياري',
    select: 'اختر…',
    selectCountry: 'اختر البلد',
    otherCountries: 'جميع البلدان',
    errorRequired: 'هذا الحقل مطلوب.',
    errorEmail: 'أدخل بريدًا إلكترونيًا صالحًا، مثل name@company.com.',
    errorTooShort: (min: number) => `يُرجى كتابة ${min} حرفًا على الأقل.`,
    errorChoose: 'يُرجى اختيار أحد الخيارات.',
    errorSummary: 'يُرجى مراجعة الحقول المُشار إليها:',
    submit: 'إرسال الرسالة',
    submitting: 'جارٍ الإرسال…',
    successTitle: 'وصلتنا رسالتك.',
    successText:
      'شكرًا لك — رسالتك الآن لدى فريقنا وسنردّ عليك عبر البريد الإلكتروني. إن كان الأمر عاجلًا، فواتساب هو أسرع وسيلة للتواصل معنا.',
    errorTitle: 'تعذّر إرسال رسالتك.',
    errorText: 'حدث خلل من جهتنا. حاول مجددًا بعد لحظات، أو تواصل معنا مباشرة:',
    offlineText: 'يبدو أنك غير متصل بالإنترنت. لم يُرسَل شيء — تحقّق من الاتصال وحاول مجددًا.',
    rateLimitedText: 'محاولات كثيرة من هذا الاتصال. انتظر بضع دقائق أو تواصل معنا مباشرة.',
    privacyBefore: 'نستخدم هذه البيانات فقط للرد على طلبك. اطّلع على',
    privacyLink: 'سياسة الخصوصية',
    privacyAfter: '.',
    honeypot: 'اترك هذا الحقل فارغًا',
    options: {
      projectTypes: {
        'web-platform': 'منصة ويب',
        'mobile-app': 'تطبيق هاتف',
        'business-software': 'برمجيات أعمال',
        'ai-automation': 'الذكاء الاصطناعي والأتمتة',
        'devops-cloud': 'DevOps والسحابة',
        consulting: 'استشارة تقنية',
        other: 'شيء آخر',
      },
      budgets: {
        'lt-5k': 'أقل من 5 آلاف يورو',
        '5k-15k': 'من 5 إلى 15 ألف يورو',
        '15k-50k': 'من 15 إلى 50 ألف يورو',
        'gt-50k': 'أكثر من 50 ألف يورو',
        unsure: 'لم أحدّد بعد',
      },
      timelines: {
        asap: 'في أقرب وقت',
        '1-3-months': 'خلال شهر إلى ثلاثة أشهر',
        '3-6-months': 'خلال ثلاثة إلى ستة أشهر',
        exploring: 'مجرد استكشاف',
      },
    },
  },

  consent: {
    title: 'خصوصيتك',
    text: 'نستخدم ملفات ارتباط اختيارية لقياس الزيارات ونتائج حملاتنا الإعلانية. لا يُحمَّل أي منها دون موافقتك.',
    acceptAll: 'قبول الكل',
    rejectAll: 'رفض الاختيارية',
    customize: 'الإعدادات',
    save: 'حفظ اختياراتي',
    dialogTitle: 'إعدادات ملفات الارتباط',
    necessaryTitle: 'ضرورية',
    necessaryText: 'تحفظ اختيارك بشأن الموافقة. مفعّلة دائمًا.',
    analyticsTitle: 'التحليلات',
    analyticsText: 'قياس مجهول الهوية لحركة الزيارات (Google Analytics وGoogle Tag Manager).',
    marketingTitle: 'التسويق',
    marketingText: 'قياس نتائج الإعلانات (Meta Pixel وLinkedIn Insight Tag).',
    alwaysOn: 'مفعّلة دائمًا',
    policyLink: 'سياسة ملفات الارتباط',
  },

  search: {
    title: 'بحث',
    label: 'ابحث في الموقع',
    placeholder: 'خدمات، منتجات، مقالات…',
    submit: 'بحث',
    idle: 'ابحث في الخدمات والمنتجات ودراسات الحالة والمقالات.',
    loading: 'جارٍ التحميل…',
    results: (count: number, query: string) =>
      `${arCount(count, { one: 'نتيجة واحدة', two: 'نتيجتان', few: 'نتائج', many: 'نتيجة' })} لـ «${query}»`,
    noResults: (query: string) => `لا توجد نتائج لـ «${query}».`,
    noResultsHint: 'جرّب كلمة أعم، أو ابدأ من أحد الأقسام:',
    unavailable: 'البحث غير متاح حاليًا. تصفّح الأقسام أدناه بدلًا من ذلك.',
    noscript: 'يتطلب البحث تفعيل JavaScript. يمكنك تصفّح جميع الأقسام عبر الروابط أدناه.',
  },

  notFound: {
    title: 'هذا المسار غير موصول بأي شيء.',
    text: 'الصفحة المطلوبة غير موجودة أو نُقلت إلى مكان آخر. أمّا بقية النظام فيعمل بشكل سليم.',
    suggestions: 'جرّب إحدى هذه الصفحات:',
  },

  whatsapp: {
    floatingLabel: 'تحدّث مع أتلاكسيس عبر واتساب',
    message: 'مرحبًا أتلاكسيس، أودّ مناقشة مشروع معكم.',
  },

  empty: {
    products: 'لم تُنشر أي منتجات بعد. عُد قريبًا.',
    work: 'نعمل حاليًا على كتابة دراسات الحالة. وإلى ذلك الحين، اسألنا عن مشاريعنا الأخيرة.',
    insights: 'لا توجد مقالات منشورة بهذه اللغة بعد.',
    related: 'لا يوجد محتوى ذو صلة حاليًا.',
  },

  landing: {
    formTitle: 'حدّثنا عن مشروعك',
    formText: 'دقيقتان فقط. يردّ عليك مهندس — عادةً خلال يوم عمل واحد.',
    or: 'أو',
    menuContact: 'تواصل معنا',
  },

  langSwitch: {
    unavailable: 'لم تُترجم بعد — ينقلك إلى صفحة القسم',
  },
};

export default ar;
