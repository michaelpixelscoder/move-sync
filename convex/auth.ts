import Google from '@auth/core/providers/google';
import { Password } from '@convex-dev/auth/providers/Password';
import { Email } from '@convex-dev/auth/providers/Email';
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
  providers: [
    Password({
      reset: Email({
        maxAge: 15 * 60,
        async sendVerificationRequest({ identifier, token }) {
          const apiKey = process.env.AUTH_RESEND_KEY;
          if (!apiKey) throw new Error('Password recovery is not configured');
          const response = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${apiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              from:
                process.env.AUTH_EMAIL_FROM ??
                'Move Sync <onboarding@resend.dev>',
              to: [identifier],
              subject: 'Reset your Move Sync password',
              text: `Your Move Sync password reset code is:\n\n${token}\n\nThis code expires in 15 minutes. If you did not request it, you can ignore this email.`,
            }),
          });
          if (!response.ok) throw new Error('Unable to send recovery email');
        },
      }),
    }),
    Google,
  ],
  callbacks: {
    async redirect({ redirectTo }) {
      if (!isAllowedRedirect(redirectTo)) {
        throw new Error('Invalid authentication redirect');
      }
      return redirectTo;
    },
  },
});
