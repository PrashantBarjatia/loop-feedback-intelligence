// Runs before every request to a matched path. Redirects logged-out users away
// from the app (brief C1, acceptance criterion 3).
export { default } from "next-auth/middleware";

export const config = {
  matcher: ["/dashboard/:path*", "/inbox/:path*", "/trends/:path*", "/ask/:path*", "/reports/:path*", "/settings/:path*"],
};
