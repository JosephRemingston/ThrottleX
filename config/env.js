import dotenv from "dotenv";
import Joi from "joi";

dotenv.config();

const envVarsSchema = Joi.object({
  MONGO_URI: Joi.string().uri().required(),
  ACCESS_TOKEN_SECRET: Joi.string().min(32).required(),
  REFRESH_TOKEN_SECRET: Joi.string().min(32).required(),
  AWS_ACCESS_KEY_ID: Joi.string().required(),
  AWS_SECRET_ACCESS_KEY: Joi.string().required(),
  AWS_SES_REGION: Joi.string().required(),
  AWS_SES_SOURCE_EMAIL: Joi.string().email().required(),
  PORT: Joi.number().port(),
  CORS_ORIGIN: Joi.string(),
  REDIS_HOST: Joi.string(),
  REDIS_PORT: Joi.number(),
  REDIS_PASSWORD: Joi.string().allow(""),
}).unknown(true);

export const validateEnv = () => {
  const { error } = envVarsSchema.validate(process.env);
  if (error) {
    throw new Error(`Config validation error: ${error.message}`);
  }
};
