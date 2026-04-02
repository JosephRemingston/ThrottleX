import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";
import dotenv from "dotenv";

dotenv.config();

const SES_REGION = process.env.AWS_SES_REGION;
const SES_SOURCE_EMAIL = process.env.AWS_SES_SOURCE_EMAIL;

const ses = new SESClient({
  region: SES_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

export const sendOTPEmail = async (email, otp) => {
  const params = {
    Source: SES_SOURCE_EMAIL,
    Destination: {
      ToAddresses: [email],
    },
    Message: {
      Subject: {
        Data: "Your OTP Code",
      },
      Body: {
        Html: {
          Data: `
            <h2>OTP Verification</h2>
            <p>Your OTP is:</p>
            <h1>${otp}</h1>
            <p>This OTP expires in 5 minutes.</p>
          `,
        },
      },
    },
  };

  await ses.send(new SendEmailCommand(params));
};


export const sendAlertEmail = async (email, subject, message) => {
  const params = {
    Source: SES_SOURCE_EMAIL,
    Destination: {
      ToAddresses: [email],
    },
    Message: {
      Subject: {
        Data: subject,
      },
      Body: {
        Html: {
          Data: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #333;">Config Rollout Alert</h2>
              <div style="background: #f5f5f5; padding: 20px; border-radius: 8px;">
                <p style="font-size: 16px; color: #555;">${message}</p>
              </div>
              <p style="color: #999; font-size: 12px; margin-top: 20px;">
                This is an automated message from your config rollout engine.
              </p>
            </div>
          `,
        },
      },
    },
  };

  await ses.send(new SendEmailCommand(params));
};