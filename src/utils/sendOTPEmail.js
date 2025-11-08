// utils/email.js
import nodemailer from "nodemailer";
import dotenv from "dotenv";
dotenv.config();

// Email Config
const emailConfig = {
  service: "gmail", // or "SendGrid", "Mailgun"
  from: `"Youtube-tweet" <${process.env.EMAIL_USER}>`,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
};

// Create Transporter
const transporter = nodemailer.createTransport({
  service: emailConfig.service,
  auth: emailConfig.auth,
});

// OTP Email Function
const sendOTPEmail = async (email, otp) => {
  const mailOptions = {
    from: emailConfig.from,
    to: email,
    subject: "Your Youtube-tweet OTP Code",
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Youtube-tweet OTP</title>
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #f4f4f9; margin: 0; padding: 0; }
          .container { max-width: 600px; margin: 30px auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.1); }
          .header { background: linear-gradient(135deg, #ff0050, #ff8a00); padding: 30px; text-align: center; }
          .logo { width: 80px; height: 80px; border-radius: 50%; border: 4px solid white; }
          .body { padding: 40px 30px; text-align: center; color: #333; }
          .otp-box { 
            background: linear-gradient(135deg, #667eea, #764ba2); 
            color: white; 
            font-size: 36px; 
            font-weight: bold; 
            letter-spacing: 10px; 
            padding: 20px; 
            border-radius: 12px; 
            margin: 25px 0; 
            display: inline-block;
            box-shadow: 0 8px 20px rgba(102, 126, 234, 0.3);
          }
          .footer { background: #1a1a2e; color: #aaa; padding: 20px; text-align: center; font-size: 12px; }
          .btn { 
            background: #ff0050; 
            color: white; 
            padding: 12px 30px; 
            text-decoration: none; 
            border-radius: 50px; 
            font-weight: bold; 
            display: inline-block; 
            margin-top: 20px;
          }
          @media (max-width: 480px) {
            .otp-box { font-size: 28px; letter-spacing: 5px; }
          }
        </style>
      </head>
      <body>
        <div class="container">
          
          <div class="body">
            <h2>Verify Your Email</h2>
            <p>Use this code to complete your action:</p>
            <div class="otp-box">${otp}</div>
            <p style="color: #666; margin: 20px 0;">
              This code expires in <strong>10 minutes</strong>.<br>
              If you didn’t request this, please ignore.
            </p>
            
          </div>
          <div class="footer">
            © ${new Date().getFullYear()} <strong>Youtube-tweet</strong>. All rights reserved.<br>
            Made with love for creators
          </div>
        </div>
      </body>
      </html>
    `,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log("OTP Email Sent →", info.messageId);
    if (process.env.NODE_ENV !== "production") {
      console.log("Preview URL:", nodemailer.getTestMessageUrl(info));
    }
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error("Failed to send OTP email:", error);
    throw new Error("Failed to send OTP. Please try again.");
  }
};

export default sendOTPEmail;
