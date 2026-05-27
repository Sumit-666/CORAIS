const pool = require("../db");
const bcrypt = require("bcrypt");
const crypto = require("crypto");

const {
  generateAccessToken,
  generateRefreshToken,
} = require("../services/token.service");

const sendOtpEmail = require("../services/email.service");
const generateOTP = require("../utils/generate_otp");

exports.sendOtp = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    const otp = generateOTP();

    await pool.query(
      `INSERT INTO otp_codes(email, otp, verified, expires_at)
       VALUES($1, $2, false, NOW() + interval '10 minutes')`,
      [email, otp],
    );

    await sendOtpEmail(email, otp);

    return res.json({ message: "OTP sent successfully" });
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Server Error" });
  }
};

exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: "Email is required" });

    const userResult = await pool.query(`SELECT 1 FROM users WHERE email = $1`, [email]);
    if (!userResult.rows.length) {
      return res.json({ message: "If this email exists, a reset code has been sent." });
    }

    const otp = generateOTP();
    await pool.query(
      `INSERT INTO otp_codes(email, otp, verified, expires_at) VALUES($1, $2, false, NOW() + interval '10 minutes')`,
      [email, otp]
    );
    await sendOtpEmail(email, otp);

    return res.json({ message: "Reset code sent successfully" });
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Server Error" });
  }
};

exports.resetPassword = async (req, res) => {
  try {
    const { email, newPassword } = req.body;
    if (!email || !newPassword)
      return res.status(400).json({ message: "All fields are required" });

    // OTP must have been verified (via /verify-email) within the last 15 minutes
    const otpResult = await pool.query(
      `SELECT 1 FROM otp_codes
       WHERE email = $1 AND verified = true AND created_at > NOW() - interval '15 minutes'
       ORDER BY created_at DESC LIMIT 1`,
      [email]
    );
    if (!otpResult.rows.length)
      return res.status(400).json({ message: "Email not verified or session expired. Please restart the flow." });

    const hashed_password = await bcrypt.hash(newPassword, 10);
    const result = await pool.query(
      `UPDATE users SET hashed_password = $1 WHERE email = $2 RETURNING id`,
      [hashed_password, email]
    );
    if (!result.rows.length)
      return res.status(404).json({ message: "User not found" });

    return res.json({ message: "Password reset successfully" });
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Server Error" });
  }
};

exports.verifyEmail = async (req, res) => {
  try {
    const { email, otp } = req.body;

    const otpResult = await pool.query(
      `SELECT * FROM otp_codes
       WHERE email = $1 AND otp = $2 AND verified = false AND expires_at > NOW()
       ORDER BY created_at DESC LIMIT 1`,
      [email, otp]
    );

    if (!otpResult.rows.length) {
      return res.status(400).json({ message: "Invalid or expired OTP" });
    }

    await pool.query(
      `UPDATE otp_codes SET verified = true WHERE id = $1`,
      [otpResult.rows[0].id]
    );

    return res.json({ verified: true });
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Server Error" });
  }
};

exports.register = async (req, res) => {
  try {
    const { email, username, password } = req.body;

    if (!email || !username || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    // Confirm email ownership was proven via OTP
    const verified = await pool.query(
      `SELECT 1 FROM otp_codes
       WHERE email = $1 AND verified = true
       ORDER BY created_at DESC LIMIT 1`,
      [email]
    );

    if (!verified.rows.length) {
      return res.status(400).json({ message: "Email not verified. Please verify your email first." });
    }

    const existing = await pool.query(`SELECT 1 FROM users WHERE email = $1 OR username = $2`, [email, username]);
    if (existing.rows.length) {
      return res.status(400).json({ message: "Email or username already taken" });
    }

    const hashed_password = await bcrypt.hash(password, 10);

    const newUser = await pool.query(
      `INSERT INTO users(email, username, hashed_password, role, is_verified)
       VALUES($1, $2, $3, 'user', true) RETURNING *`,
      [email, username, hashed_password]
    );

    const user         = newUser.rows[0];
    const accessToken  = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    const refreshTokenHash = await bcrypt.hash(refreshToken, 10);

    await pool.query(
      `INSERT INTO user_sessions(user_id, refresh_token_hash, device_info, ip_address, expires_at)
       VALUES($1, $2, $3, $4, NOW() + interval '30 days')`,
      [user.id, refreshTokenHash, JSON.stringify(req.headers["user-agent"]), req.ip]
    );

    return res.json({ accessToken, refreshToken, user });
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Server Error" });
  }
};

exports.verifyOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;

    const otpResult = await pool.query(
      `
      SELECT * FROM otp_codes
      WHERE email = $1
      AND otp = $2
      AND verified = false
      AND expires_at > NOW()
      ORDER BY created_at DESC
      LIMIT 1
    `,
      [email, otp],
    );

    if (!otpResult.rows.length) {
      return res.status(400).json({
        message: "Invalid OTP",
      });
    }

    await pool.query(
      `
      UPDATE otp_codes
      SET verified = true
      WHERE id = $1
    `,
      [otpResult.rows[0].id],
    );

    let userResult = await pool.query(
      `
      SELECT * FROM users
      WHERE email = $1
    `,
      [email],
    );

    let user;

    if (!userResult.rows.length) {
      // Passwordless OTP flow — generate username from email prefix,
      // store a locked placeholder hash since no password is used.
      const username = email.split("@")[0] + "_" + Date.now();
      const placeholderHash = await bcrypt.hash(crypto.randomUUID(), 10);

      const newUser = await pool.query(
        `
  INSERT INTO users(
    email,
    username,
    hashed_password,
    role,
    is_verified
  )
  VALUES($1, $2, $3, $4, true)
  RETURNING *
`,
        [email, username, placeholderHash, "user"],
      );
      user = newUser.rows[0];
    } else {
      user = userResult.rows[0];
    }

    const accessToken = generateAccessToken(user);

    const refreshToken = generateRefreshToken(user);

    const refreshTokenHash = await bcrypt.hash(refreshToken, 10);

    await pool.query(
      `
      INSERT INTO user_sessions(
        user_id,
        refresh_token_hash,
        device_info,
        ip_address,
        expires_at
      )
      VALUES($1, $2, $3, $4, NOW() + interval '30 days')
    `,
      [
        user.id,
        refreshTokenHash,
        JSON.stringify(req.headers["user-agent"]),
        req.ip,
      ],
    );

    return res.json({
      accessToken,
      refreshToken,
      user,
    });
  } catch (err) {
    console.log(err);

    res.status(500).json({
      message: "Server Error",
    });
  }
};
const {OAuth2Client} = require('google-auth-library');
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
exports.googleLogin = async (req, res) => {
  try {

    const { id_token } = req.body;

    const ticket = await client.verifyIdToken({
      idToken: id_token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();

    const {
      email,
      name,
      picture,
      sub,
    } = payload;

    let userResult = await pool.query(
      `
      SELECT * FROM users
      WHERE email = $1
    `,
      [email]
    );

    let user;

    if (!userResult.rows.length) {

      const username =
        email.split("@")[0] +
        "_" +
        Date.now();

      const placeholderHash =
        await bcrypt.hash(
          crypto.randomUUID(),
          10
        );

      const newUser = await pool.query(
        `
        INSERT INTO users(
          email,
          username,
          hashed_password,
          role,
          is_verified
        )
        VALUES($1, $2, $3, $4, true)
        RETURNING *
      `,
        [
          email,
          username,
          placeholderHash,
          "user",
        ]
      );

      user = newUser.rows[0];

    } else {
      user = userResult.rows[0];
    }

    const accessToken =
      generateAccessToken(user);

    const refreshToken =
      generateRefreshToken(user);

    const refreshTokenHash =
      await bcrypt.hash(refreshToken, 10);

    await pool.query(
      `
      INSERT INTO user_sessions(
        user_id,
        refresh_token_hash,
        device_info,
        ip_address,
        expires_at
      )
      VALUES(
        $1,
        $2,
        $3,
        $4,
        NOW() + interval '30 days'
      )
    `,
      [
        user.id,
        refreshTokenHash,
        JSON.stringify(
          req.headers["user-agent"]
        ),
        req.ip,
      ]
    );

    return res.json({
      accessToken,
      refreshToken,
      user,
    });

  } catch (err) {

    console.log(err);

    res.status(500).json({
      message: "Google login failed",
    });

  }
};