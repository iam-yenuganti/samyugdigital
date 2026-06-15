/* ----------------------------------------------------------------------------
 * Samyug Digital — Chess Portal configuration
 *
 * 1) googleClientId: your OAuth 2.0 Client ID from Google Cloud Console.
 *    (This value is NOT a secret — it is safe to commit and ship to the browser.)
 *    Setup steps are in README.md.
 *
 * 2) allowedEmails: only these Google accounts may enter the portal.
 *    Add more addresses as needed.
 * -------------------------------------------------------------------------- */
window.CHESS_PORTAL_CONFIG = {
  googleClientId: "YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com",
  allowedEmails: [
    "srimathi.yenuganti@gmail.com",
  ],
};
