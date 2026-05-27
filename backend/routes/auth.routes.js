const express        = require("express");
const router         = express.Router();
const authController = require("../controllers/auth.controller");

router.post("/send-otp",        authController.sendOtp);
router.post("/verify-email",    authController.verifyEmail);
router.post("/register",        authController.register);
router.post("/forgot-password", authController.forgotPassword);
router.post("/reset-password",  authController.resetPassword);
router.post("/google",          authController.googleLogin);
router.post("/verify-otp",      authController.verifyOtp);

module.exports = router;
