import type {
  ProductSpecificationField,
  ProductSpecificationSection,
  ProductSpecificationTemplate,
} from "@/lib/productSpecifications";

/**
 * Merchant-editable starter templates. Never populate product values from these
 * definitions: a model's actual specifications must be supplied or verified.
 * Keep keys stable so an applied template remains compatible with existing data.
 */
type Field = [key: string, label: string, labelAr: string, unit?: string];
type Preset = {
  id: string;
  label: string;
  labelAr: string;
  aliases: string[];
  template: ProductSpecificationTemplate;
};

function section(title: string, titleAr: string, definitions: Field[]): ProductSpecificationSection {
  return {
    title,
    titleAr,
    fields: definitions.map(([key, label, labelAr, unit]): ProductSpecificationField => ({
      key,
      label,
      labelAr,
      ...(unit ? { unit } : {}),
    })),
  };
}

export const SPECIFICATION_PRESETS: Preset[] = [
  {
    id: "smartphones", label: "Smartphones", labelAr: "الهواتف",
    aliases: ["smartphone", "smartphones", "mobile-phones", "mobile-phone", "phones", "phone", "iphone", "used-phones", "foldable-smartphone", "هواتف", "هاتف"],
    template: { sections: [
      section("Display", "الشاشة", [["display_size", "Screen size", "حجم الشاشة", "inches"], ["display_type", "Panel technology", "تقنية الشاشة"], ["refresh_rate", "Refresh rate", "معدل التحديث", "Hz"], ["display_resolution", "Resolution", "الدقة"]]),
      section("Performance", "الأداء", [["chipset", "Chipset", "المعالج"], ["ram", "RAM", "الذاكرة العشوائية", "GB"], ["storage", "Built-in storage", "التخزين", "GB"], ["operating_system", "Operating system", "نظام التشغيل"]]),
      section("Cameras", "الكاميرات", [["rear_camera", "Rear cameras", "الكاميرات الخلفية"], ["front_camera", "Front camera", "الكاميرا الأمامية"], ["video_recording", "Video recording", "تصوير الفيديو"]]),
      section("Battery & connectivity", "البطارية والاتصال", [["battery_capacity", "Battery capacity", "سعة البطارية", "mAh"], ["charging_power", "Wired charging", "قدرة الشحن السلكي", "W"], ["network", "Mobile network", "شبكة الاتصال"], ["sim_type", "SIM type", "نوع الشريحة"], ["water_resistance", "Water resistance", "مقاومة الماء"]]),
    ] },
  },
  {
    id: "tablets", label: "Tablets", labelAr: "الأجهزة اللوحية",
    aliases: ["tablets", "tablet", "gaming-tablet", "ipad", "أجهزة-لوحية", "تابلت"],
    template: { sections: [
      section("Display", "الشاشة", [["display_size", "Screen size", "حجم الشاشة", "inches"], ["display_type", "Display technology", "تقنية الشاشة"], ["display_resolution", "Resolution", "الدقة"], ["refresh_rate", "Refresh rate", "معدل التحديث", "Hz"]]),
      section("Hardware", "العتاد", [["chipset", "Processor", "المعالج"], ["ram", "RAM", "الذاكرة العشوائية", "GB"], ["storage", "Storage", "التخزين", "GB"], ["operating_system", "Operating system", "نظام التشغيل"]]),
      section("Power & features", "الطاقة والمزايا", [["battery_capacity", "Battery", "البطارية", "mAh"], ["charging_power", "Charging", "قدرة الشحن", "W"], ["stylus_support", "Stylus support", "دعم القلم"], ["connectivity", "Connectivity", "الاتصال"], ["rear_camera", "Rear camera", "الكاميرا الخلفية"]]),
    ] },
  },
  {
    id: "laptops", label: "Laptops", labelAr: "اللابتوبات",
    aliases: ["laptops", "laptop", "notebook", "notebooks", "macbook", "computers", "لابتوب"],
    template: { sections: [
      section("Processor & memory", "المعالج والذاكرة", [["processor", "Processor", "المعالج"], ["ram", "RAM", "الذاكرة العشوائية", "GB"], ["storage", "SSD / storage", "سعة التخزين", "GB"], ["graphics", "Graphics", "بطاقة الرسوميات"]]),
      section("Screen", "الشاشة", [["display_size", "Screen size", "حجم الشاشة", "inches"], ["display_resolution", "Resolution", "الدقة"], ["display_type", "Panel technology", "تقنية الشاشة"], ["refresh_rate", "Refresh rate", "معدل التحديث", "Hz"]]),
      section("Other details", "تفاصيل أخرى", [["operating_system", "Operating system", "نظام التشغيل"], ["battery_capacity", "Battery capacity", "سعة البطارية", "Wh"], ["ports", "Ports", "المنافذ"], ["weight", "Weight", "الوزن", "kg"], ["keyboard_layout", "Keyboard layout", "توزيع لوحة المفاتيح"]]),
    ] },
  },
  {
    id: "headphones", label: "Headphones & earbuds", labelAr: "السماعات",
    aliases: ["headphones", "headphone", "earbuds", "earbud", "earphones", "headset", "tws", "airpods", "سماعات", "سماعة"],
    template: { sections: [
      section("Sound", "الصوت", [["form_factor", "Headphone type", "نوع السماعة"], ["driver_size", "Driver size", "قطر المشغّل", "mm"], ["noise_cancellation", "Noise cancellation", "إلغاء الضوضاء"], ["audio_codecs", "Audio codecs", "ترميزات الصوت"]]),
      section("Connection", "الاتصال", [["connectivity", "Connection type", "نوع الاتصال"], ["bluetooth_version", "Bluetooth version", "إصدار بلوتوث", "Bluetooth"], ["multipoint", "Multipoint support", "اتصال متعدد الأجهزة"]]),
      section("Battery & durability", "البطارية والمتانة", [["playback_time", "Earbud playback", "مدة تشغيل السماعة", "hours"], ["battery_with_case", "Total with case", "الإجمالي مع العلبة", "hours"], ["charging_port", "Charging port", "منفذ الشحن"], ["water_resistance", "Water resistance", "مقاومة الماء"]]),
      section("Calls", "المكالمات", [["microphones", "Microphones", "الميكروفونات"], ["call_features", "Call features", "ميزات المكالمات"]]),
    ] },
  },
  {
    id: "smartwatches", label: "Smartwatches", labelAr: "الساعات الذكية",
    aliases: ["smartwatches", "smartwatch", "smart-watch", "watches", "fitness-bands", "smart-band", "ساعات-ذكية"],
    template: { sections: [
      section("Display & design", "الشاشة والتصميم", [["display_size", "Display size", "حجم الشاشة", "inches"], ["display_type", "Display type", "نوع الشاشة"], ["case_size", "Case size", "حجم الهيكل", "mm"], ["water_resistance", "Water rating", "مقاومة الماء"]]),
      section("Health & activity", "الصحة والنشاط", [["health_sensors", "Health sensors", "حساسات الصحة"], ["gps", "GPS", "تحديد الموقع"], ["sports_modes", "Sports modes", "أنماط الرياضة"]]),
      section("Connectivity & power", "الاتصال والبطارية", [["compatibility", "Phone compatibility", "التوافق"], ["connectivity", "Connectivity", "الاتصال"], ["battery_life", "Battery life", "عمر البطارية", "days"], ["charging_type", "Charging type", "نوع الشحن"]]),
    ] },
  },
  {
    id: "chargers", label: "Chargers", labelAr: "الشواحن",
    aliases: ["chargers", "charger", "wall-charger", "car-charger", "wireless-charger", "adapter", "power-adapter", "شواحن", "شاحن"],
    template: { sections: [
      section("Charging", "الشحن", [["max_output", "Maximum output", "القدرة القصوى", "W"], ["port_count", "Port count", "عدد المنافذ"], ["ports", "Port types", "أنواع المنافذ"], ["protocols", "Charging protocols", "بروتوكولات الشحن"], ["gan", "GaN technology", "تقنية GaN"]]),
      section("Compatibility & safety", "التوافق والأمان", [["input_voltage", "Input voltage", "جهد الإدخال"], ["compatibility", "Device compatibility", "الأجهزة المتوافقة"], ["cable_included", "Cable included", "كابل مرفق"], ["safety_certification", "Safety certification", "شهادات الأمان"]]),
    ] },
  },
  {
    id: "speakers", label: "Speakers", labelAr: "مكبرات الصوت",
    aliases: ["speakers", "speaker", "audio", "bluetooth-speaker", "soundbar", "سبيكر", "مكبرات-صوت"],
    template: { sections: [
      section("Audio", "الصوت", [["output_power", "Output power", "قدرة الصوت", "W"], ["speaker_configuration", "Driver configuration", "تكوين السماعات"], ["frequency_response", "Frequency response", "نطاق التردد"], ["audio_features", "Sound features", "ميزات الصوت"]]),
      section("Connectivity & power", "الاتصال والطاقة", [["connectivity", "Connectivity", "الاتصال"], ["bluetooth_version", "Bluetooth version", "إصدار بلوتوث", "Bluetooth"], ["battery_life", "Playtime", "مدة التشغيل", "hours"], ["charging_port", "Charging port", "منفذ الشحن"], ["water_resistance", "Water resistance", "مقاومة الماء"]]),
    ] },
  },
  {
    id: "consoles", label: "Game consoles", labelAr: "أجهزة الألعاب",
    aliases: ["consoles", "console", "gaming-console", "playstation", "xbox", "gaming-systems", "أجهزة-الألعاب"],
    template: { sections: [
      section("System", "النظام", [["platform", "Platform", "المنصة"], ["processor", "Processor", "المعالج"], ["graphics", "Graphics", "معالج الرسوميات"], ["storage", "Storage", "التخزين", "GB"]]),
      section("Video & audio", "الصورة والصوت", [["max_resolution", "Maximum output resolution", "أقصى دقة عرض"], ["refresh_rate", "Maximum refresh rate", "معدل التحديث", "Hz"], ["hdr", "HDR support", "دعم HDR"]]),
      section("Connectivity", "الاتصال", [["connectivity", "Network connectivity", "اتصال الشبكة"], ["ports", "Ports", "المنافذ"], ["included_accessories", "In the box", "محتويات العلبة"]]),
    ] },
  },
  {
    id: "power-banks", label: "Power banks", labelAr: "الباور بانك",
    aliases: ["power-banks", "power-bank", "powerbank", "portable-charger", "بطارية-متنقلة"],
    template: { sections: [
      section("Power", "الطاقة", [["battery_capacity", "Capacity", "السعة", "mAh"], ["max_output", "Maximum output", "أقصى قدرة إخراج", "W"], ["input_power", "Input power", "قدرة الإدخال", "W"], ["protocols", "Fast-charge standards", "معايير الشحن السريع"]]),
      section("Design", "التصميم", [["ports", "Ports", "المنافذ"], ["display", "Charge indicator", "مؤشر الشحن"], ["weight", "Weight", "الوزن", "g"]]),
    ] },
  },
  {
    id: "cables", label: "Cables", labelAr: "الكابلات",
    aliases: ["cables", "cable", "charging-cable", "usb-cable", "كابلات", "كيبل"],
    template: { sections: [
      section("Cable details", "تفاصيل الكابل", [["connector_a", "First connector", "الطرف الأول"], ["connector_b", "Second connector", "الطرف الثاني"], ["length", "Length", "الطول", "m"], ["max_power", "Maximum charging power", "أقصى قدرة شحن", "W"]]),
      section("Features", "المزايا", [["data_speed", "Data transfer speed", "سرعة نقل البيانات"], ["protocols", "Supported standards", "المعايير المدعومة"], ["material", "Cable material", "مادة التصنيع"], ["compatibility", "Compatibility", "التوافق"]]),
    ] },
  },
];

function normalizeCategoryName(value: string): string {
  return value.normalize("NFKC").trim().toLocaleLowerCase().replace(/[\\s_&/]+/g, "-").replace(/-+/g, "-");
}

/** Suggest a starter only for an explicit category match; never assume a product spec value. */
export function recommendSpecificationPreset(category: string): Preset | null {
  const normalized = normalizeCategoryName(category);
  return SPECIFICATION_PRESETS.find((preset) =>
    preset.id === normalized || preset.aliases.some((alias) => normalizeCategoryName(alias) === normalized),
  ) ?? null;
}

export function specificationPresetById(id: string): Preset | null {
  return SPECIFICATION_PRESETS.find((preset) => preset.id === id) ?? null;
}

export function copySpecificationPreset(preset: Preset): ProductSpecificationTemplate {
  return { sections: preset.template.sections.map((entry) => ({
    ...entry, fields: entry.fields.map((field) => ({ ...field })),
  })) };
}

/** Suggestions are choices, not verified facts. The merchant must select a value. */
const FIELD_CHOICES: Record<string, string[]> = {
  display_type: ["AMOLED", "OLED", "IPS LCD", "LCD", "Mini-LED"],
  refresh_rate: ["60", "90", "120", "144", "165", "240"],
  network: ["4G LTE", "5G"],
  sim_type: ["Nano-SIM", "eSIM", "Nano-SIM + eSIM", "Dual SIM"],
  form_factor: ["In-ear", "Over-ear", "On-ear", "Open-ear"],
  noise_cancellation: ["ANC", "Passive isolation", "No ANC"],
  connectivity: ["Bluetooth", "Wi-Fi", "USB-C", "3.5 mm wired"],
  charging_port: ["USB-C", "Lightning", "Micro-USB"],
  multipoint: ["Yes", "No"],
  stylus_support: ["Yes", "No"],
  cable_included: ["Yes", "No"],
  gan: ["Yes", "No"],
  gps: ["Built-in GPS", "Connected GPS", "No GPS"],
  hdr: ["Yes", "No"],
  ports: ["USB-C", "USB-A", "USB-C + USB-A", "HDMI + USB-C"],
  protocols: ["USB PD", "USB PD + PPS", "Quick Charge", "USB PD + Quick Charge"],
  connector_a: ["USB-C", "USB-A", "Lightning", "Micro-USB"],
  connector_b: ["USB-C", "USB-A", "Lightning", "Micro-USB"],
};
export function specificationFieldSuggestions(key: string): readonly string[] {
  return FIELD_CHOICES[key] ?? [];
}
