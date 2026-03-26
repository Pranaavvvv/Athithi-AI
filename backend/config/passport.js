const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const pool = require("./dbConfig");

passport.use(
    new GoogleStrategy(
        {
            clientID: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
            callbackURL: process.env.GOOGLE_CALLBACK_URL || "/auth/google/callback",
        },
        async (accessToken, refreshToken, profile, done) => {
            try {
                const existingUser = await pool.query(
                    "SELECT * FROM users WHERE google_id = $1",
                    [profile.id]
                );

                if (existingUser.rows.length > 0) {
                    return done(null, existingUser.rows[0]);
                }

                const email = profile.emails?.[0]?.value;
                if (email) {
                    const emailUser = await pool.query(
                        "SELECT * FROM users WHERE email = $1",
                        [email]
                    );

                    if (emailUser.rows.length > 0) {
                        const updatedUser = await pool.query(
                            "UPDATE users SET google_id = $1 WHERE email = $2 RETURNING *",
                            [profile.id, email]
                        );
                        return done(null, updatedUser.rows[0]);
                    }
                }

                const newUser = await pool.query(
                    `INSERT INTO users (email, google_id, auth_provider) 
           VALUES ($1, $2, $3) 
           RETURNING *`,
                    [
                        email,
                        profile.id,
                        "google",
                    ]
                );

                return done(null, newUser.rows[0]);
            } catch (err) {
                console.error("Error in Google Strategy:", err);
                return done(err, null);
            }
        }
    )
);

passport.serializeUser((user, done) => {
    done(null, user.id);
});
passport.deserializeUser(async (id, done) => {
    try {
        const result = await pool.query("SELECT * FROM users WHERE id = $1", [id]);
        done(null, result.rows[0]);
    } catch (err) {
        done(err, null);
    }
});

module.exports = passport;
