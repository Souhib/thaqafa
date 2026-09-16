// React context wrapping the auth state.
//
// The provider holds the current user + access token in memory and the
// refresh token in localStorage. On boot, it tries to hydrate the session
// from a stored refresh token (one round-trip to /auth/refresh); if that
// fails the user starts anonymous.
//
// Token rotation: on every fresh pair we schedule a refresh ~30 s before
// the access token's stated expiry. Combined with localStorage-persisted
// refresh tokens, the user stays signed in across reloads without ever
// hitting a 401. (If the scheduled refresh ever fails — network blip
// during the 30 s window — the next API call will surface the 401 and the
// user can re-login. We don't try to auto-retry consumed request bodies.)

import {
  type ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { unwrap } from "@/api/errors";
import { client } from "@/api/generated/client.gen";
import {
  loginApiV1AuthLoginPost,
  meApiV1AuthMeGet,
  refreshApiV1AuthRefreshPost,
  signupApiV1AuthSignupPost,
} from "@/api/generated/sdk.gen";
import type { TokenPair, UserPublic } from "@/api/generated/types.gen";
import { readStoredRefreshToken, writeStoredRefreshToken } from "@/auth/storage";

interface AuthContextValue {
  user: UserPublic | null;
  isAuthenticated: boolean;
  isInitialised: boolean;
  signup: (email: string, password: string, displayName: string) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  /** Re-fetch the current user from /auth/me and update the stored profile.
   *  Called after server-side state changes (email verify, profile edits)
   *  so the UI reflects the new value without a hard reload. */
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const REFRESH_LEAD_TIME_MS = 30_000;

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserPublic | null>(null);
  const [isInitialised, setIsInitialised] = useState(false);

  const accessTokenRef = useRef<string | null>(null);
  const refreshTokenRef = useRef<string | null>(null);
  const refreshTimerRef = useRef<number | null>(null);

  const clearRefreshTimer = useCallback(() => {
    if (refreshTimerRef.current !== null) {
      window.clearTimeout(refreshTimerRef.current);
      refreshTimerRef.current = null;
    }
  }, []);

  const clearSession = useCallback(() => {
    accessTokenRef.current = null;
    refreshTokenRef.current = null;
    writeStoredRefreshToken(null);
    setUser(null);
    clearRefreshTimer();
  }, [clearRefreshTimer]);

  // Forward declaration so `applyPair` can reference `forceRefresh`.
  const forceRefreshRef = useRef<() => Promise<string | null>>(async () => null);

  const applyPair = useCallback(
    (pair: TokenPair) => {
      accessTokenRef.current = pair.accessToken;
      refreshTokenRef.current = pair.refreshToken;
      writeStoredRefreshToken(pair.refreshToken);
      setUser(pair.user);

      clearRefreshTimer();
      const expiresAt = Date.parse(pair.accessExpiresAt);
      if (Number.isFinite(expiresAt)) {
        const delay = Math.max(1_000, expiresAt - Date.now() - REFRESH_LEAD_TIME_MS);
        refreshTimerRef.current = window.setTimeout(() => {
          void forceRefreshRef.current();
        }, delay);
      }
    },
    [clearRefreshTimer],
  );

  const forceRefresh = useCallback(async (): Promise<string | null> => {
    const refresh = refreshTokenRef.current ?? readStoredRefreshToken();
    if (!refresh) {
      clearSession();
      return null;
    }
    try {
      const pair = unwrap(await refreshApiV1AuthRefreshPost({ body: { refreshToken: refresh } }));
      applyPair(pair);
      return pair.accessToken;
    } catch {
      clearSession();
      return null;
    }
  }, [applyPair, clearSession]);

  // Keep the ref in lockstep so `applyPair` can schedule a future refresh
  // without forming a hard cycle through React state.
  useEffect(() => {
    forceRefreshRef.current = forceRefresh;
  }, [forceRefresh]);

  // One-shot session hydration on mount.
  useEffect(() => {
    let cancelled = false;
    const stored = readStoredRefreshToken();
    if (!stored) {
      setIsInitialised(true);
      return;
    }
    refreshTokenRef.current = stored;
    void forceRefresh().finally(() => {
      if (!cancelled) setIsInitialised(true);
    });
    return () => {
      cancelled = true;
    };
    // forceRefresh is stable per-render; mount-only is what we want.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Stamp Authorization on every outgoing call when we have a token. The
  // public reading endpoints ignore it; the protected ones require it.
  useEffect(() => {
    const id = client.interceptors.request.use((request) => {
      const token = accessTokenRef.current;
      if (token && !request.headers.has("Authorization")) {
        request.headers.set("Authorization", `Bearer ${token}`);
      }
      return request;
    });
    return () => client.interceptors.request.eject(id);
  }, []);

  // Cleanup the timer on unmount so we don't fire after teardown in tests.
  useEffect(() => clearRefreshTimer, [clearRefreshTimer]);

  const signup = useCallback(
    async (email: string, password: string, displayName: string) => {
      const pair = unwrap(
        await signupApiV1AuthSignupPost({
          body: { email, password, displayName },
        }),
      );
      applyPair(pair);
    },
    [applyPair],
  );

  const login = useCallback(
    async (email: string, password: string) => {
      const pair = unwrap(await loginApiV1AuthLoginPost({ body: { email, password } }));
      applyPair(pair);
    },
    [applyPair],
  );

  const logout = useCallback(() => {
    clearSession();
  }, [clearSession]);

  const refreshUser = useCallback(async () => {
    if (!accessTokenRef.current) return;
    try {
      const fresh = unwrap(await meApiV1AuthMeGet());
      setUser(fresh);
    } catch {
      // Stay silent — the next /me-gated route will surface the failure.
    }
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isAuthenticated: user !== null,
      isInitialised,
      signup,
      login,
      logout,
      refreshUser,
    }),
    [user, isInitialised, signup, login, logout, refreshUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
