'use client';

import { useEffect, useState, useCallback } from 'react';

/**
 * Sign in with Apple (web) — loads Apple's JS SDK once and exposes a signIn()
 * that opens Apple's popup and returns the identityToken the backend needs.
 *
 * Requires in Apple Developer Portal:
 *   - A Services ID (not App ID) with "Sign in with Apple" enabled
 *   - Domains & Return URLs configured
 *   - Domain verification file uploaded to /.well-known/apple-developer-domain-association.txt
 *
 * Requires env var:
 *   NEXT_PUBLIC_APPLE_SERVICES_ID — e.g. "com.rubyplus.business.signin"
 */

interface AppleSignInResult {
  identityToken: string;
  firstName?: string;
  lastName?: string;
  email?: string;
}

type AppleAuthStatus = 'loading' | 'ready' | 'unavailable';

declare global {
  interface Window {
    AppleID?: {
      auth: {
        init: (config: {
          clientId: string;
          scope: string;
          redirectURI: string;
          state?: string;
          nonce?: string;
          usePopup?: boolean;
        }) => void;
        signIn: () => Promise<{
          authorization: {
            code: string;
            id_token: string;
            state?: string;
          };
          user?: {
            email?: string;
            name?: {
              firstName?: string;
              lastName?: string;
            };
          };
        }>;
      };
    };
  }
}

const APPLE_JS_URL =
  'https://appleid.cdn-apple.com/appleauth/static/jsapi/appleid/1/en_US/appleid.auth.js';

export function useAppleSignIn() {
  const [status, setStatus] = useState<AppleAuthStatus>('loading');
  const servicesId = process.env.NEXT_PUBLIC_APPLE_SERVICES_ID;

  useEffect(() => {
    if (typeof window === 'undefined') return;

    if (!servicesId) {
      // Config missing — feature is unavailable
      setStatus('unavailable');
      return;
    }

    // If SDK is already loaded, just init
    if (window.AppleID) {
      try {
        window.AppleID.auth.init({
          clientId: servicesId,
          scope: 'name email',
          redirectURI: `${window.location.origin}/business/register`,
          state: 'business_register',
          usePopup: true,
        });
        setStatus('ready');
      } catch {
        setStatus('unavailable');
      }
      return;
    }

    // Check if the script tag is already in the DOM (prevents duplicate loads)
    const existing = document.querySelector(`script[src="${APPLE_JS_URL}"]`);
    if (existing) {
      existing.addEventListener('load', () => {
        if (window.AppleID) {
          window.AppleID.auth.init({
            clientId: servicesId,
            scope: 'name email',
            redirectURI: `${window.location.origin}/business/register`,
            state: 'business_register',
            usePopup: true,
          });
          setStatus('ready');
        } else {
          setStatus('unavailable');
        }
      });
      return;
    }

    // Inject the script
    const script = document.createElement('script');
    script.src = APPLE_JS_URL;
    script.async = true;
    script.defer = true;
    script.onload = () => {
      if (!window.AppleID) {
        setStatus('unavailable');
        return;
      }
      try {
        window.AppleID.auth.init({
          clientId: servicesId,
          scope: 'name email',
          redirectURI: `${window.location.origin}/business/register`,
          state: 'business_register',
          usePopup: true,
        });
        setStatus('ready');
      } catch {
        setStatus('unavailable');
      }
    };
    script.onerror = () => setStatus('unavailable');
    document.body.appendChild(script);
  }, [servicesId]);

  const signIn = useCallback(async (): Promise<AppleSignInResult | null> => {
    if (typeof window === 'undefined' || !window.AppleID) {
      throw new Error('Apple Sign-In is not available right now. Please try again.');
    }
    const result = await window.AppleID.auth.signIn();
    const identityToken = result.authorization?.id_token;
    if (!identityToken) return null;
    return {
      identityToken,
      firstName: result.user?.name?.firstName,
      lastName: result.user?.name?.lastName,
      email: result.user?.email,
    };
  }, []);

  return { status, signIn };
}
