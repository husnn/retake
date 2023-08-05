const config = {
  app: {
    protocol: process.env.HTTP_PROTOCOL || 'http',
    host: process.env.HOST || '0.0.0.0',
    port: parseInt(process.env.PORT || '5000'),
    clientUrl: process.env.CLIENT_URL || 'http://localhost:3000',
    isSecure: process.env.HTTP_PROTOCOL === 'https',
    publicUrl: process.env.PUBLIC_URL
  },
  auth: {
    secret: process.env.AUTH_SECRET || 's3creTi5siM0',
    expiry: 60 * 60 * 24 * 7 * 1000, // 7 days
    redis:
      process.env.AUTH_REDIS_URL ||
      process.env.REDIS_URL ||
      'redis://localhost:6379'
  },
  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379'
  },
  s3: {
    videoBucket: {
      name: process.env.VIDEO_S3_NAME,
      region: process.env.VIDEO_S3_REGION
    }
  },
  sage: {
    apiUrl: process.env.SAGE_API_URL || 'http://localhost:9000'
  }
};

export const webhookEndpoint = () => `${config.app.publicUrl}/v1/webhook`;

export default config;
