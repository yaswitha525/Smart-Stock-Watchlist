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

  // Phase 7 & Phase 8 Cache, Job & Market Data Configuration
  REDIS_URL: z.string().optional(),
  MARKET_DATA_PROVIDER: z.enum(['mock', 'real']).default('mock'),
  MARKET_API_KEY: z.string().optional(),
  MARKET_DATA_API_KEY: z.string().optional(),
  MARKET_API_BASE_URL: z.string().default('https://api.marketdata.app/v1'),
  MARKET_REFRESH_INTERVAL_MS: z
    .string()
    .default('60000')
    .transform((val) => parseInt(val, 10)),
  STALE_DATA_THRESHOLD_MS: z
    .string()
    .default('300000')
    .transform((val) => parseInt(val, 10)),
  CACHE_TTL_DEFAULT: z
    .string()
    .default('60')
    .transform((val) => parseInt(val, 10)),
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

  // Redis & Caching configuration
  redis: {
    get url() {
      return process.env.REDIS_URL || env.REDIS_URL || null;
    },
    get isConfigured() {
      return Boolean(process.env.REDIS_URL || env.REDIS_URL);
    },
  },

  // Market Data & Scheduling configuration
  marketData: {
    get provider() {
      return process.env.MARKET_DATA_PROVIDER || env.MARKET_DATA_PROVIDER || 'mock';
    },
    get apiKey() {
      return (
        process.env.MARKET_API_KEY ||
        process.env.MARKET_DATA_API_KEY ||
        env.MARKET_API_KEY ||
        env.MARKET_DATA_API_KEY ||
        null
      );
    },
    get baseUrl() {
      return process.env.MARKET_API_BASE_URL || env.MARKET_API_BASE_URL || 'https://api.marketdata.app/v1';
    },
    get isConfigured() {
      return Boolean(
        process.env.MARKET_API_KEY ||
          process.env.MARKET_DATA_API_KEY ||
          env.MARKET_API_KEY ||
          env.MARKET_DATA_API_KEY
      );
    },
    get refreshIntervalMs() {
      const val = process.env.MARKET_REFRESH_INTERVAL_MS;
      return val ? parseInt(val, 10) : env.MARKET_REFRESH_INTERVAL_MS;
    },
    get staleThresholdMs() {
      const val = process.env.STALE_DATA_THRESHOLD_MS;
      return val ? parseInt(val, 10) : env.STALE_DATA_THRESHOLD_MS;
    },
  },

  // Cache settings
  cache: {
    get defaultTtlSeconds() {
      const val = process.env.CACHE_TTL_DEFAULT;
      return val ? parseInt(val, 10) : env.CACHE_TTL_DEFAULT;
    },
  },
} as const;

export type AppConfig = typeof config;
