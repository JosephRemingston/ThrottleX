import dotenv from "dotenv";

dotenv.config();

const requiredEnvVars = [
  "MONGO_URI",
  "ACCESS_TOKEN_SECRET",
  "REFRESH_TOKEN_SECRET",
  "AWS_ACCESS_KEY_ID",
  "AWS_SECRET_ACCESS_KEY",
  "AWS_SES_REGION",
  "AWS_SES_SOURCE_EMAIL"
];

export const validateEnv = () => {
  const missing = requiredEnvVars.filter((key) => {
    const value = process.env[key];
    return !value || !String(value).trim();
  });

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(", ")}`
    );
  }

  if (process.env.PORT && Number.isNaN(Number(process.env.PORT))) {
    throw new Error("PORT must be a valid number");
  }
};
