import dotenv from 'dotenv';
dotenv.config();
interface Config {
  email_verification: boolean;
  jwt_secret: string;
  http: string;
  scraper_url: string;
}
interface DB {
  DB_HOST: string;
  DB_USER: string;
  DB_PASS: string;
  DB_NAME: string;
}
interface Email {
  email_user: string;
  app_password: string;
}
const config: Config = {
  email_verification: getEnvVar('REQUIRE_EMAIL_VERIFICATION') === 'true',
  jwt_secret: getEnvVarOr('JWT_SECRET', 'not very secret'),
  http: getEnvVarOr('HTTP_TYPE', 'http'), //until or if we use a certificate
  scraper_url: getEnvVarOr('SCRAPER_URL', 'http://10.111.21.84:5000'),
};
export const email: Email = {
  email_user: getEnvVar('EMAIL_USER'),
  app_password: getEnvVar('APP_PASSWORD'),
};
export const db: DB = {
  DB_HOST: getEnvVar('DB_HOST'),
  DB_USER: getEnvVar('DB_USER'),
  DB_NAME: getEnvVar('DB_NAME'),
  DB_PASS: getEnvVar('DB_PASS'),
};
function getEnvVarOr(key: string, or: string): string {
  const value = process.env[key];
  if (!value) {
    return or;
  }
  return value;
}

function getEnvVar(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Environment variable ${key} is missing`);
  }
  return value;
}
export default config;

/* eslint no-process-env:0 */
