const passport = require('passport');
const { Strategy: GoogleStrategy } = require('passport-google-oauth20');
const User = require('../models/User');

if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
  console.warn('[Passport] GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET not set — Google OAuth disabled');
} else {
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_CALLBACK_URL,
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const googleId = profile.id;
        const email = profile.emails?.[0]?.value;
        const name = profile.name?.givenName || profile.displayName;

        // Existing Google user — log them in
        const existingByGoogleId = await User.findOne({ googleId });
        if (existingByGoogleId) {
          return done(null, { type: 'existing', user: existingByGoogleId });
        }

        // Email already registered with local account — reject
        const existingByEmail = await User.findOne({ email });
        if (existingByEmail) {
          return done(null, { type: 'email_conflict', email });
        }

        // New Google user — pass profile so the route can issue a temp token
        return done(null, { type: 'new', googleId, email, name });
      } catch (err) {
        return done(err);
      }
    }
  )
);
}

module.exports = passport;
