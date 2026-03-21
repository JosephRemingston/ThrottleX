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