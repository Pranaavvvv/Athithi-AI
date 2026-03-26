const express = require("express");
const router = express.Router();
const passport = require("passport");
const jwt = require("jsonwebtoken");

const generateToken = (user) => {
    return jwt.sign(
        {
            id: user.id,
            email: user.email,
            auth_provider: user.auth_provider,
            role: user.role
        },
        process.env.JWT_SECRET || "secret",
        { expiresIn: "1h" }
    );
};

// @route   GET /auth/google
// @desc    Initiate Google OAuth login
// @access  Public
router.get(
    "/google",
    passport.authenticate("google", {
        scope: ["profile", "email"],
        session: false
    })
);

// @route   GET /auth/google/callback
// @desc    Google OAuth callback
// @access  Public
router.get(
    "/google/callback",
    passport.authenticate("google", {
        failureRedirect: process.env.FRONTEND_URL + "/login?error=google_auth_failed",
        session: false
    }),
    (req, res) => {
        try {
            const token = generateToken(req.user);

            res.cookie("token", token, {
                httpOnly: true,
                secure: process.env.NODE_ENV === "production",
                sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
                maxAge: 3600000
            });

            const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
            res.redirect(`${frontendUrl}/dashboard?auth=success`);
        } catch (err) {
            console.error("Error in Google callback:", err);
            const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
            res.redirect(`${frontendUrl}/login?error=token_generation_failed`);
        }
    }
);

// @route   GET /auth/status
// @desc    Check authentication status
// @access  Public
router.get("/status", async (req, res) => {
    const token = req.cookies.token;

    if (!token) {
        return res.json({ authenticated: false });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || "secret");
        
        res.json({
            authenticated: true,
            user: {
                id: decoded.id,
                email: decoded.email,
                auth_provider: decoded.auth_provider,
                role: decoded.role
            }
        });
    } catch (err) {
        res.json({ authenticated: false });
    }
});

module.exports = router;
