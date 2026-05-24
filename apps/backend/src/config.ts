import { registerAs } from '@nestjs/config';

export default registerAs('config', () => {
  return {
    postgres: {
      port: parseInt(process.env.POSTGRES_PORT || '', 10),
      host: process.env.POSTGRES_HOST,
      user: process.env.POSTGRES_USER,
      password: process.env.POSTGRES_PASSWORD,
      dbName: process.env.POSTGRES_DB,
    },
    apiKey: process.env.API_KEY,
    jwtSecret: process.env.JWT_SECRET,
    jwtAccessSecret: process.env.JWT_ACCESS_SECRET,
    jwtAccessTtl: process.env.JWT_ACCESS_TTL ?? '15m',
    jwtRefreshSecret: process.env.JWT_REFRESH_SECRET,
    jwtRefreshTtl: process.env.JWT_REFRESH_TTL ?? '7d',
    bcryptSaltRounds: parseInt(process.env.BCRYPT_SALT_ROUNDS ?? '12', 10),
    whatsapp: {
      verifyToken: process.env.WHATSAPP_VERIFY_TOKEN,
      accessToken: process.env.WHATSAPP_ACCESS_TOKEN,
      phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID,
      appSecret: process.env.META_APP_SECRET,
      apiVersion: process.env.META_API_VERSION,
      botUserId: process.env.WHATSAPP_BOT_USER_ID,
      organizationId: process.env.WHATSAPP_ORGANIZATION_ID,
    },
    ai: {
      provider: process.env.AI_PROVIDER,
      model: process.env.AI_MODEL,
      openAiApiKey: process.env.OPENAI_API_KEY,
      openAiBaseUrl: process.env.OPENAI_BASE_URL ?? 'https://api.openai.com/v1',
      geminiApiKey: process.env.GEMINI_API_KEY,
      geminiBaseUrl:
        process.env.GEMINI_BASE_URL ??
        'https://generativelanguage.googleapis.com/v1beta',
    },
    s3: {
      region: process.env.AWS_S3_REGION,
      endpoint: process.env.AWS_S3_ENDPOINT,
      accessKeyId: process.env.AWS_S3_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_S3_SECRET_ACCESS_KEY,
      bucketName: process.env.AWS_S3_BUCKET_NAME,
    },
  };
});
