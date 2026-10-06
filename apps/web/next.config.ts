import type { NextConfig } from 'next';
import {
  loadEnvironment,
  parseEnvironment,
  webEnvSchema,
} from '@kompri/shared/env';
loadEnvironment();
parseEnvironment(webEnvSchema, process.env);
const config: NextConfig = {
  transpilePackages: ['@kompri/shared'],
  poweredByHeader: false,
};
export default config;
