/**
 * Application Constants
 * Central location for all business logic constants, pricing, and configuration
 */

// Currency & Conversion
export const BUSINESS_CONSTANTS = {
  EXCHANGE_RATE_USD_TO_JOD: 0.71,
  SHIPPING_RATE_PER_KG: 4.5, // JOD per kg
  VAT_RATE: 0.16, // 16% VAT
};

// Service Pricing (based on business report)
export const SERVICE_PRICING = {
  COMMISSIONING: 0.06, // 6% of equipment dealer price
  NOISE_CONTROL: 5000, // Fixed 5000 JOD
  SOUND_DESIGN: 0.03, // 3% of equipment dealer price
  PROJECT_MANAGEMENT: 0.10, // 10% of equipment MSRP
};

// Role-based Fees (from business report)
export const ROLE_FEES = {
  PRODUCER: 0.05, // 5% of void sales profit
  PROJECT_MANAGER: 0.225, // 22.5% of total project value
  NOGAHUB_FEE: 0.375, // 37.5% of void sales profit
};

// Shipping & Customs Fees
export const SHIPPING_CUSTOMS = {
  CLEARANCE_COST: 35,
  TRANSPORT_COST: 70,
  DELIVERY_ORDER_COST: 45,
};

// Tax Codes
export const TAX_RATES = {
  TAX_001: 0.05,
  TAX_020: 0.16,
  TAX_215: 0.01,
  TAX_301: 50,
  TAX_111: 0.003,
  TAX_016: 23.2,
  TAX_019: 25,
  TAX_070: 0.05,
};

// Profit Distribution (Void Company)
export const VOID_PROFIT_DISTRIBUTION = {
  RETAINED_EARNINGS: 0.05, // 5%
  SHAREHOLDER_DISTRIBUTION: 0.525, // 52.5%
  // Individual shareholders
  NADEEM_SHARE: 0.50, // 50% of shareholder distribution
  ISSA_SHARE: 0.225, // 22.5% of shareholder distribution
  BAKRI_SHARE: 0.225, // 22.5% of shareholder distribution
};

// Profit Distribution (Nogahub Company)
export const NOGAHUB_PROFIT_DISTRIBUTION = {
  RETAINED_EARNINGS: 0.27, // 27% of Nogahub fee
  SHAREHOLDER_DISTRIBUTION: 0.20, // 20% of Nogahub fee
  // Individual shareholders (of shareholder distribution)
  NADEEM_SHARE: 0.40, // 40% of shareholder distribution
  ISSA_SHARE: 0.40, // 40% of shareholder distribution
  WEWEALTH_SHARE: 0.20, // 20% of shareholder distribution
};

// Initial Project State
export const INITIAL_PROJECT_STATE = {
  projectName: '',
  clientName: '',
  equipment: [],
  customEquipment: [],
  services: {
    commissioning: false,
    noiseControl: false,
    soundDesign: false,
    projectManagement: false,
  },
  includeTax: true,
  globalDiscount: 0,
};

// Initial Noise Control Quotation State
export const INITIAL_NOISE_CONTROL_STATE = {
  projectName: '',
  clientName: '',
  items: [],
  services: {
    noiseControl: {
      enabled: false,
      useCustomValue: false,
      customValue: 0,
    },
  },
};

// Tab IDs
export const TAB_IDS = {
  QUOTATION: 'quotation',
  NOISE_CONTROL: 'noise-control',
  DOCUMENTS: 'documents',
  SAVED_PROJECTS: 'saved-projects',
  RESULTS: 'results',
  ENTITIES: 'entities',
};

// Section IDs
export const SECTION_IDS = {
  INSTALLATION: 'installation',
  PURCHASE_ORDER: 'purchase-order',
};

// User Roles
export const USER_ROLES = {
  ADMIN: 'admin',
  USER: 'user',
};

// Equipment Categories
export const EQUIPMENT_CATEGORIES = {
  VOID: 'void',
  ACCESSORY: 'accessory',
};

// Default Values
export const DEFAULTS = {
  EQUIPMENT_LIMIT: 1000,
  LOGO_SIZE_MOBILE: 60,
  LOGO_SIZE_DESKTOP: 80,
  LOGO_SIZE_LOGIN_MOBILE: 80,
  LOGO_SIZE_LOGIN_DESKTOP: 120,
};
