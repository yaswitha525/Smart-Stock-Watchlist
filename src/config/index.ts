import dotenv from 'dotenv';
import { z } from 'zod';

// Load environment variables from .env file if available
dotenv.config();

/**
 * Environment configuration schema.
 */
const envSchema = z.object({
  // Base Backend Runtime Config
  PORT: z
    .string()
    .default('3000')
    .transform((val) => parseInt(val, 10))
    .refine((val) => !isNaN(val) && val > 0 && val < 65536, {
      message: 'PORT must be a valid port number (1-65535)',
    }),

  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),

  LOG_LEVEL: z
    .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace'])
    .default('info'),

  // Phase 2 Database Config
  DATABASE_URL: z.string().optional(),

  // Phase 3 Authentication Config
  JWT_SECRET: z.string().optional(),
  JWT_EXPIRES_IN: z.string().default('24h'),

  // Future Module Configurations
  REDIS_URL: z.string().optional(),
  MARKET_DATA_API_KEY: z.string().optional(),
});

type ConfigSchema = z.infer<typeof envSchema>;

const parseResult = envSchema.safeParse(process.env);

if (!parseResult.success) {
  console.error('❌ Invalid environment variable configuration:');
  console.error(parseResult.error.format());
  process.exit(1);
}

const env: ConfigSchema = parseResult.data;

export const config = {
  // Base configuration
  port: env.PORT,
  env: env.NODE_ENV,
  isProduction: env.NODE_ENV === 'production',
  isDevelopment: env.NODE_ENV === 'development',
  isTest: env.NODE_ENV === 'test',
  logLevel: env.LOG_LEVEL,

  // Database configuration
  database: {
    url: env.DATABASE_URL || null,
    isConfigured: Boolean(env.DATABASE_URL),
  },

  // JWT Authentication configuration (evaluates env dynamically for tests)
  jwt: {
    get secret() {
      return process.env.JWT_SECRET || env.JWT_SECRET || null;
    },
    get expiresIn() {
      return process.env.JWT_EXPIRES_IN || env.JWT_EXPIRES_IN || '24h';
    },
    get isConfigured() {
      return Boolean(process.env.JWT_SECRET || env.JWT_SECRET);
    },
  },

  // Future module configuration placeholders
  redis: {
    url: env.REDIS_URL || null,
    isConfigured: Boolean(env.REDIS_URL),
  },
  marketData: {
    apiKey: env.MARKET_DATA_API_KEY || null,
    isConfigured: Boolean(env.MARKET_DATA_API_KEY),
  },
} as const;

export type AppConfig = typeof config;
