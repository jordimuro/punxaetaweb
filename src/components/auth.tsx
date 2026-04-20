"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

const AUTH_STORAGE_KEY = "punxaeta-auth-state";
const FIXED_USERNAME = "Admin";
const FIXED_PASSWORD = "Punxaeta2000";

type AuthState = {
  isAuthenticated: boolean;
  username: string | null;
  ready: boolean;
  login: (username: string, password: string) => boolean;
  logout: () => void;
};

const AuthContext = createContext<AuthState | null>(null);

type StoredAuth = {
  isAuthenticated: boolean;
  username: string | null;
};

function readStoredAuth(): StoredAuth {
  if (typeof window === "undefined") {
    return { isAuthenticated: false, username: null };
  }

  try {
    const raw = window.localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) {
      return { isAuthenticated: false, username: null };
    }

    const parsed = JSON.parse(raw) as Partial<StoredAuth>;
    return {
      isAuthenticated: parsed.isAuthenticated === true,
      username: typeof parsed.username === "string" ? parsed.username : null,
    };
  } catch {
    return { isAuthenticated: false, username: null };
  }
}

function persistAuth(state: StoredAuth) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(state));
}

function clearAuth() {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(AUTH_STORAGE_KEY);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [username, setUsername] = useState<string | null>(null);

  useEffect(() => {
    const stored = readStoredAuth();
    const timeoutId = window.setTimeout(() => {
      setIsAuthenticated(stored.isAuthenticated);
      setUsername(stored.username);
      setReady(true);
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, []);

  const value = useMemo<AuthState>(
    () => ({
      isAuthenticated,
      username,
      ready,
      login(nextUsername, password) {
        const valid =
          nextUsername.trim() === FIXED_USERNAME && password.trim() === FIXED_PASSWORD;

        if (!valid) {
          setIsAuthenticated(false);
          setUsername(null);
          clearAuth();
          return false;
        }

        const nextState = { isAuthenticated: true, username: FIXED_USERNAME };
        setIsAuthenticated(true);
        setUsername(FIXED_USERNAME);
        persistAuth(nextState);
        return true;
      },
      logout() {
        setIsAuthenticated(false);
        setUsername(null);
        clearAuth();
      },
    }),
    [isAuthenticated, ready, username],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }

  return context;
}

export function AuthOnly({
  children,
  fallback = null,
}: {
  children: ReactNode;
  fallback?: ReactNode;
}) {
  const { ready, isAuthenticated } = useAuth();

  if (!ready) {
    return fallback;
  }

  return isAuthenticated ? <>{children}</> : fallback;
}

export function InstagramLink({
  className,
  label = "Instagram",
}: {
  className?: string;
  label?: string;
}) {
  return (
    <a
      className={className}
      href="https://www.instagram.com/lapunxaeta/"
      target="_blank"
      rel="noreferrer"
      aria-label="Instagram del Club Ciclista La Punxaeta"
    >
      <span className="instagram-link__icon" aria-hidden="true">
        <svg viewBox="0 0 24 24" role="img" aria-hidden="true">
          <rect x="3" y="3" width="18" height="18" rx="5" fill="none" stroke="currentColor" strokeWidth="1.8" />
          <circle cx="12" cy="12" r="4.1" fill="none" stroke="currentColor" strokeWidth="1.8" />
          <circle cx="17.2" cy="6.8" r="1.1" fill="currentColor" />
        </svg>
      </span>
      {label}
    </a>
  );
}

export function LoginStatusCard() {
  const router = useRouter();
  const { ready, isAuthenticated, username, logout } = useAuth();

  if (!ready) {
    return null;
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="panel login-status">
      <span className="panel__label">Sessió activa</span>
      <h2>Has entrat com a {username ?? FIXED_USERNAME}.</h2>
      <p>Ja pots crear, editar i pujar el GPX de les rutes.</p>
      <div className="form-actions">
        <button
          type="button"
          className="button button--secondary"
          onClick={() => {
            logout();
            router.replace("/");
            router.refresh();
          }}
        >
          Tancar sessió
        </button>
      </div>
    </div>
  );
}

export function HeaderAuthControl({
  className,
  guestClassName,
  onNavigate,
}: {
  className?: string;
  guestClassName?: string;
  onNavigate?: () => void;
}) {
  const router = useRouter();
  const { ready, isAuthenticated, username, logout } = useAuth();

  if (!ready) {
    return null;
  }

  if (!isAuthenticated) {
    return (
      <Link className={guestClassName ?? className} href="/login" onClick={onNavigate}>
        Accés
      </Link>
    );
  }

  return (
    <div className={className}>
      <span className="auth-control__status">
        Sessió activa · {username ?? FIXED_USERNAME}
      </span>
      <div className="auth-control__actions">
        <Link
          className="auth-control__link"
          href="/estadistiques"
          onClick={onNavigate}
          aria-label="Obrir estadístiques"
          title="Estadístiques"
        >
          <svg viewBox="0 0 24 24" role="img" aria-hidden="true">
            <rect x="4" y="12" width="3.2" height="8" rx="1.1" fill="currentColor" />
            <rect x="10.4" y="8" width="3.2" height="12" rx="1.1" fill="currentColor" />
            <rect x="16.8" y="4" width="3.2" height="16" rx="1.1" fill="currentColor" />
          </svg>
        </Link>
        <button
          type="button"
          className="auth-control__button"
          aria-label="Tancar sessió"
          title="Tancar sessió"
          onClick={() => {
            logout();
            onNavigate?.();
            router.replace("/");
            router.refresh();
          }}
        >
          <svg viewBox="0 0 24 24" role="img" aria-hidden="true">
            <path
              d="M10.5 4.75A7.25 7.25 0 1 0 10.5 19.25"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
            <path
              d="M14 8.25L18 12L14 15.75"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M8.5 12H17.5"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
          </svg>
        </button>
      </div>
    </div>
  );
}
