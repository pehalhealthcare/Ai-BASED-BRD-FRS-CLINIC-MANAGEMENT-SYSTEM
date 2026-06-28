const dotenv = require('dotenv');
const { z } = require('zod');

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.preprocess((val) => process.env.BACKEND_PORT || val, z.coerce.number().int().positive().default(5000)),
  MONGO_MODE: z.string().trim().optional(),
  MONGO_URI: z.string().min(1).default('mongodb://localhost:27017/ai-cms'),
  MONGO_URI_LOCAL: z.string().min(1).default('mongodb://localhost:27017/ai-cms'),
  MONGO_URI_ATLAS: z.string().trim().optional(),
  CORS_ORIGIN: z.string().min(1).default('http://localhost:5173'),
  FRONTEND_URL: z.string().trim().optional(),
  CLIENT_URL: z.string().trim().optional(),
  API_PREFIX: z.string().default('/api/v1'),
  APP_NAME: z.string().min(1).default('AI-CMS Backend'),
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
  DB_CONNECT_TIMEOUT_MS: z.coerce.number().int().positive().default(2500),
  JWT_SECRET: z.string().min(1, 'JWT_SECRET is required'),
  JWT_EXPIRES_IN: z.string().min(1).default('1d'),
  SEED_ADMIN_NAME: z.string().min(1).optional(),
  SEED_ADMIN_EMAIL: z.string().email().optional(),
  SEED_ADMIN_PASSWORD: z.string().min(8).optional(),
  AI_SERVICE_URL: z.string().min(1).default('http://localhost:8000'),
  NOTIFICATION_PROVIDER: z.enum(['mock', 'console', 'email', 'twilio']).default('mock'),
  TWILIO_ACCOUNT_SID: z.string().optional(),
  TWILIO_AUTH_TOKEN: z.string().optional(),
  TWILIO_PHONE_NUMBER: z.string().optional(),
  TWILIO_WHATSAPP_NUMBER: z.string().optional(),
  EMAIL_HOST: z.string().optional(),
  EMAIL_PORT: z.coerce.number().int().positive().optional(),
  EMAIL_SECURE: z.preprocess((val) => {
    if (val === 'true') return true;
    if (val === 'false') return false;
    return val;
  }, z.boolean().optional()),
  EMAIL_USER: z.string().optional(),
  EMAIL_PASS: z.string().optional(),
  EMAIL_FROM: z.string().optional(),
  RAZORPAY_KEY_ID: z.string().optional(),
  RAZORPAY_KEY_SECRET: z.string().optional(),
  ENABLE_MOCK_NOTIFICATIONS: z.preprocess((value) => {
    if (value === 'true') {
      return true;
    }

    if (value === 'false') {
      return false;
    }

    return value;
  }, z.boolean().default(true)),
  UPLOAD_DIR: z.string().min(1).default('uploads'),
  PRESCRIPTION_PDF_DIR: z.string().min(1).default('uploads/prescriptions'),
  INVOICE_STORAGE_DIR: z.string().min(1).default('storage/invoices'),
  PUBLIC_API_BASE_URL: z.string().min(1).default('http://localhost:5000'),
  GST_DEFAULT_RATE: z.coerce.number().min(0).max(28).default(18)
});

const parsedEnv = envSchema.parse(process.env);

const parseOriginList = (...values) =>
  Array.from(
    new Set(
      values
        .filter(Boolean)
        .flatMap((value) => String(value).split(','))
        .map((value) => value.trim())
        .filter(Boolean)
    )
  );

const env = {
  nodeEnv: parsedEnv.NODE_ENV,
  port: parsedEnv.PORT,
  mongoMode: parsedEnv.MONGO_MODE,
  mongoUri: parsedEnv.MONGO_URI,
  mongoUriLocal: parsedEnv.MONGO_URI_LOCAL,
  mongoUriAtlas: parsedEnv.MONGO_URI_ATLAS,
  corsOrigin: parsedEnv.CORS_ORIGIN || parsedEnv.FRONTEND_URL || parsedEnv.CLIENT_URL || 'http://localhost:5173',
  corsOrigins: parseOriginList(parsedEnv.CORS_ORIGIN, parsedEnv.FRONTEND_URL, parsedEnv.CLIENT_URL),
  frontendUrl: parsedEnv.FRONTEND_URL,
  clientUrl: parsedEnv.CLIENT_URL,
  apiPrefix: parsedEnv.API_PREFIX,
  appName: parsedEnv.APP_NAME,
  logLevel: parsedEnv.LOG_LEVEL,
  dbConnectTimeoutMs: parsedEnv.DB_CONNECT_TIMEOUT_MS,
  jwtSecret: parsedEnv.JWT_SECRET,
  jwtExpiresIn: parsedEnv.JWT_EXPIRES_IN,
  seedAdminName: parsedEnv.SEED_ADMIN_NAME,
  seedAdminEmail: parsedEnv.SEED_ADMIN_EMAIL,
  seedAdminPassword: parsedEnv.SEED_ADMIN_PASSWORD,
  aiServiceUrl: parsedEnv.AI_SERVICE_URL,
  notificationProvider: parsedEnv.NOTIFICATION_PROVIDER,
  enableMockNotifications: parsedEnv.ENABLE_MOCK_NOTIFICATIONS,
  uploadDir: parsedEnv.UPLOAD_DIR,
  prescriptionPdfDir: parsedEnv.PRESCRIPTION_PDF_DIR,
  invoiceStorageDir: parsedEnv.INVOICE_STORAGE_DIR,
  publicApiBaseUrl: parsedEnv.PUBLIC_API_BASE_URL,
  gstDefaultRate: parsedEnv.GST_DEFAULT_RATE,
  twilioAccountSid: parsedEnv.TWILIO_ACCOUNT_SID,
  twilioAuthToken: parsedEnv.TWILIO_AUTH_TOKEN,
  twilioPhoneNumber: parsedEnv.TWILIO_PHONE_NUMBER,
  twilioWhatsappNumber: parsedEnv.TWILIO_WHATSAPP_NUMBER,
  emailHost: parsedEnv.EMAIL_HOST,
  emailPort: parsedEnv.EMAIL_PORT,
  emailSecure: parsedEnv.EMAIL_SECURE,
  emailUser: parsedEnv.EMAIL_USER,
  emailPass: parsedEnv.EMAIL_PASS,
  emailFrom: parsedEnv.EMAIL_FROM,
  razorpayKeyId: parsedEnv.RAZORPAY_KEY_ID,
  razorpayKeySecret: parsedEnv.RAZORPAY_KEY_SECRET,
  isDevelopment: parsedEnv.NODE_ENV === 'development',
  isProduction: parsedEnv.NODE_ENV === 'production',
  isTest: parsedEnv.NODE_ENV === 'test'
};

module.exports = { env };
