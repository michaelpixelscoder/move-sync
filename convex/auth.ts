import Google from '@auth/core/providers/google';
import { Password } from '@convex-dev/auth/providers/Password';
import { convexAuth } from '@convex-dev/auth/server';

function isAllowedRedirect(redirectTo: string) {
  const url = new URL(redirectTo);
  if (url.protocol === 'move-sync:') return true;

  const siteUrl = process.env.SITE_URL;
  const allowedOrigins = new Set([
    'http://localhost:8081',
    'http://127.0.0.1:8081',
  ]);
  if (siteUrl) allowedOrigins.add(new URL(siteUrl).origin);

  return allowedOrigins.has(url.origin);
}

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [Password, Google],
  callbacks: {
    async redirect({ redirectTo }) {
      if (!isAllowedRedirect(redirectTo)) {
        throw new Error('Invalid authentication redirect');
      }
      return redirectTo;
    },
  },
});
