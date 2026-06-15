/* ----------------------------------------------------------------------------
 * Samyug Digital — Chess Portal configuration
 *
 * accessCode: the code users must enter to open the portal.
 *   You can also open directly via the URL hash, e.g.  /chess/#chess1728
 *
 * NOTE: This is a CLIENT-SIDE gate on a static site. It keeps casual visitors
 * out, but the code ships in the browser, so treat it as a soft lock — not a
 * hard security boundary. For real enforcement, use Cloudflare Access (README).
 * -------------------------------------------------------------------------- */
window.CHESS_PORTAL_CONFIG = {
  accessCode: "chess1728",
};
