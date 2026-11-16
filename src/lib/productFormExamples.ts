/** Visible examples only. Never write these suggestions into product values. */
type Language = "ar" | "en";
type ExamplePair = readonly [ar: string, en: string];

const PRODUCT_EXAMPLES: Readonly<Record<string, ExamplePair>> = {
  title: ["Samsung Galaxy S25 – 256GB – أسود", "Samsung Galaxy S25 – 256GB – Black"],
  titleAr: ["سامسونج جالاكسي S25، مساحة 256 جيجابايت، أسود", "سامسونج جالاكسي S25، مساحة 256 جيجابايت، أسود"],
  description: ["هاتف بشاشة AMOLED وذاكرة 256GB؛ اذكر المواصفات المؤكدة فقط", "Smartphone with AMOLED display and 256GB storage; include verified facts only"],
  descriptionAr: ["هاتف ذكي بشاشة AMOLED وذاكرة 256 جيجابايت؛ اكتب المعلومات المؤكدة", "هاتف ذكي بشاشة AMOLED وذاكرة 256 جيجابايت؛ اكتب المعلومات المؤكدة"],
  productType: ["هاتف ذكي", "Smartphone"],
  tags: ["Samsung, Android, 256GB", "Samsung, Android, 256GB"],
  price: ["899.00", "899.00"],
  compareAt: ["949.00", "949.00"],
  sku: ["GALAXY-S25-256-BLK", "GALAXY-S25-256-BLK"],
  barcode: ["1234567890123 (شكل توضيحي فقط؛ أدخل الرمز الحقيقي)", "1234567890123 (format only; enter the real barcode)"],
  stock: ["12", "12"],
  seoTitle: ["Samsung Galaxy S25 256GB | Space Call", "Samsung Galaxy S25 256GB | Space Call"],
  seoDescription: ["اكتشف مواصفات Samsung Galaxy S25 وتوافره وسعره لدى Space Call", "Explore Samsung Galaxy S25 specifications, price and availability at Space Call"],
  variantStorage: ["256 GB", "256 GB"],
  brandId: ["Apple أو Samsung (اختر علامة موجودة)", "Apple or Samsung (select an existing brand)"],
  categoryId: ["الهواتف أو السماعات (اختر التصنيف الصحيح)", "Smartphones or Earbuds (choose the matching category)"],
  status: ["مسودة: مخفي، نشط: ظاهر، مؤرشف: غير معروض", "Draft: hidden, Active: public, Archived: removed from listing"],
  collection: ["منتجات جديدة أو عروض الأسبوع", "New arrivals or Weekly deals"],
  image: ["صورة أمامية واضحة للمنتج بخلفية نظيفة", "Clear front-facing product photo on a clean background"],
};

const SPECIFICATION_EXAMPLES: Readonly<Record<string, ExamplePair>> = {
  display_size: ["6.7", "6.7"],
  display_type: ["AMOLED", "AMOLED"],
  display_resolution: ["2400 × 1080", "2400 × 1080"],
  refresh_rate: ["120", "120"],
  chipset: ["Snapdragon 8 Gen 3", "Snapdragon 8 Gen 3"],
  processor: ["Intel Core i7-13620H", "Intel Core i7-13620H"],
  ram: ["12", "12"],
  storage: ["256", "256"],
  operating_system: ["Android 15", "Android 15"],
  rear_camera: ["50 MP + 12 MP", "50 MP + 12 MP"],
  front_camera: ["12 MP", "12 MP"],
  video_recording: ["4K بمعدل 60fps", "4K at 60fps"],
  battery_capacity: ["5000", "5000"],
  charging_power: ["45", "45"],
  network: ["5G", "5G"],
  sim_type: ["Nano-SIM + eSIM", "Nano-SIM + eSIM"],
  water_resistance: ["IP68", "IP68"],
  stylus_support: ["نعم، قلم متوافق", "Yes, compatible stylus"],
  connectivity: ["Bluetooth 5.3، Wi-Fi 6", "Bluetooth 5.3, Wi-Fi 6"],
  graphics: ["NVIDIA RTX 4060", "NVIDIA RTX 4060"],
  ports: ["USB-C × 2، USB-A × 1", "2 × USB-C, 1 × USB-A"],
  weight: ["1.5", "1.5"],
  keyboard_layout: ["US English", "US English"],
  form_factor: ["داخل الأذن", "In-ear"],
  driver_size: ["10", "10"],
  noise_cancellation: ["ANC", "ANC"],
  audio_codecs: ["AAC, SBC, LDAC", "AAC, SBC, LDAC"],
  bluetooth_version: ["5.3", "5.3"],
  multipoint: ["نعم", "Yes"],
  playback_time: ["8", "8"],
  battery_with_case: ["30", "30"],
  charging_port: ["USB-C", "USB-C"],
  microphones: ["3 ميكروفونات", "3 microphones"],
  call_features: ["تقليل ضوضاء المكالمات", "Call noise reduction"],
  case_size: ["44", "44"],
  health_sensors: ["نبض القلب، SpO₂", "Heart rate, SpO₂"],
  gps: ["GPS مدمج", "Built-in GPS"],
  sports_modes: ["جري، مشي، سباحة", "Running, walking, swimming"],
  compatibility: ["Android 10+ و iOS 16+", "Android 10+ and iOS 16+"],
  battery_life: ["7", "7"],
  charging_type: ["شحن مغناطيسي", "Magnetic charging"],
  max_output: ["65", "65"],
  port_count: ["2", "2"],
  protocols: ["USB PD 3.0، PPS", "USB PD 3.0, PPS"],
  gan: ["نعم", "Yes"],
  input_voltage: ["100–240V AC", "100–240V AC"],
  cable_included: ["نعم، USB-C", "Yes, USB-C"],
  safety_certification: ["CE, FCC", "CE, FCC"],
  output_power: ["20", "20"],
  speaker_configuration: ["2 × 10W", "2 × 10W"],
  frequency_response: ["20 Hz – 20 kHz", "20 Hz – 20 kHz"],
  audio_features: ["ستيريو، معادل صوت", "Stereo, equalizer"],
  platform: ["PlayStation 5", "PlayStation 5"],
  max_resolution: ["4K (3840 × 2160)", "4K (3840 × 2160)"],
  hdr: ["HDR10", "HDR10"],
  included_accessories: ["وحدة تحكم وكابل HDMI", "Controller and HDMI cable"],
  input_power: ["30", "30"],
  display: ["شاشة نسبة البطارية", "Battery percentage display"],
  connector_a: ["USB-C", "USB-C"],
  connector_b: ["USB-C", "USB-C"],
  length: ["1.5", "1.5"],
  max_power: ["100", "100"],
  data_speed: ["480 Mbps", "480 Mbps"],
  material: ["نايلون مضفّر", "Braided nylon"],
};

const UNIT_EXAMPLES: Readonly<Record<string, ExamplePair>> = {
  gb: ["12", "12"],
  tb: ["1", "1"],
  mb: ["512", "512"],
  mah: ["5000", "5000"],
  wh: ["60", "60"],
  w: ["65", "65"],
  hz: ["120", "120"],
  inches: ["6.7", "6.7"],
  inch: ["6.7", "6.7"],
  mm: ["10", "10"],
  cm: ["15", "15"],
  g: ["250", "250"],
  kg: ["1.5", "1.5"],
  m: ["1.5", "1.5"],
  hours: ["8", "8"],
  days: ["7", "7"],
  bluetooth: ["5.3", "5.3"],
};

export function productFormExample(key: string, lang: Language): string {
  const pair = PRODUCT_EXAMPLES[key];
  return pair ? pair[lang === "ar" ? 0 : 1] : "";
}

export function specificationFieldExample(field: { key: string; unit?: string }, lang: Language): string {
  const unit = field.unit?.trim().toLowerCase() ?? "";
  // Unit-sensitive examples avoid implying a laptop battery is 5000 Wh.
  const special = field.key === "battery_capacity" && unit === "wh"
    ? (["60", "60"] as const)
    : field.key === "weight" && unit === "g"
      ? (["250", "250"] as const)
      : null;
  const example = special ?? SPECIFICATION_EXAMPLES[field.key] ?? UNIT_EXAMPLES[unit];
  return example ? example[lang === "ar" ? 0 : 1] :
    lang === "ar" ? "القيمة المذكورة في مواصفات الشركة" : "Value from the manufacturer's specifications";
}

/** Examples stay separate from saved values, previews, and server mutations. */
