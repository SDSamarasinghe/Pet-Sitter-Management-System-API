import * as Joi from 'joi';

export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test', 'staging')
    .default('development'),
  PORT: Joi.number().port().default(3000),
  TZ: Joi.string().default('UTC'),

  MONGODB_URI: Joi.string().uri({ scheme: ['mongodb', 'mongodb+srv'] }).required(),

  JWT_SECRET: Joi.string().min(16).required(),
  JWT_EXPIRES_IN: Joi.string().default('24h'),

  CORS_ORIGINS: Joi.string().allow('').optional(),

  MAIL_HOST: Joi.string().default('smtp.gmail.com'),
  MAIL_PORT: Joi.number().port().default(587),
  MAIL_USER: Joi.string().optional(),
  MAIL_PASS: Joi.string().optional(),
  MAIL_FROM: Joi.string().email().optional(),

  CLOUDINARY_CLOUD_NAME: Joi.string().optional(),
  CLOUDINARY_API_KEY: Joi.string().optional(),
  CLOUDINARY_API_SECRET: Joi.string().optional(),

  AZURE_STORAGE_CONNECTION_STRING: Joi.string().optional(),
  AZURE_STORAGE_CONTAINER: Joi.string().optional(),
}).unknown(true);
