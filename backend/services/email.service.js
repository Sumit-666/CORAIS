const nodemailer = require("nodemailer");

const sendOtpEmail = async (email, otp) => {
  const transport = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  await transport.sendMail({
    from: process.env.EMAIL_USER,
    to: email,
    subject: "OTP for CORAIS Login",
    text: `Your OTP for CORAIS login is: ${otp}`,
  });
};

module.exports = sendOtpEmail;
