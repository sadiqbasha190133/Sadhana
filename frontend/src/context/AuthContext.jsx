
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import api from "../services/api";
import {
  signIn as signInRequest,
  signUp as signUpRequest,
  getCurrentUser,
} from "../services/authService";

const AuthContext = createContext(null);

function unwrapData(response) {
  return response?.data?.data ?? response?.data ?? response ?? {};
}

function extractUser(response) {
  const data = unwrapData(response);
  return data.user ?? data;
}

function extractToken(response) {
  const data = unwrapData(response);
  return data.token ?? data.accessToken ?? data.access_token ?? null;
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const logout = useCallback(() => {
    localStorage.removeItem("sadhana_token");
    localStorage.removeItem("sadhana_user");
    setUser(null);
  }, []);

  const establishSession = useCallback((response) => {
    const token = extractToken(response);
    const nextUser = extractUser(response);

    if (!token) {
      throw new Error(
        "The authentication response did not include a token. Check the backend response format."
      );
    }

    localStorage.setItem("sadhana_token", token);

    if (nextUser && nextUser.email) {
      localStorage.setItem("sadhana_user", JSON.stringify(nextUser));
      setUser(nextUser);
    }

    return nextUser;
  }, []);

  const login = useCallback(
    async (credentials) => {
      const response = await signInRequest(credentials);
      const nextUser = establishSession(response);

      if (!nextUser?.email) {
        const profileResponse = await getCurrentUser();
        const profile = extractUser(profileResponse);

        setUser(profile);
        localStorage.setItem("sadhana_user", JSON.stringify(profile));
        return profile;
      }

      return nextUser;
    },
    [establishSession]
  );

  const signup = useCallback(
    async (details) => {
      const response = await signUpRequest(details);
      const token = extractToken(response);

      if (token) {
        establishSession(response);
        return;
      }

      // Some APIs create an account without signing the user in.
      // In that case, the user can sign in with their new credentials.
    },
    [establishSession]
  );

  const refreshUser = useCallback(async () => {
    const response = await getCurrentUser();
    const profile = extractUser(response);

    setUser(profile);
    localStorage.setItem("sadhana_user", JSON.stringify(profile));

    return profile;
  }, []);

  useEffect(() => {
    let active = true;

    async function restoreSession() {
      const token = localStorage.getItem("sadhana_token");

      if (!token) {
        if (active) setLoading(false);
        return;
      }

      try {
        const response = await getCurrentUser();
        const profile = extractUser(response);

        if (active) {
          setUser(profile);
          localStorage.setItem("sadhana_user", JSON.stringify(profile));
        }
      } catch {
        localStorage.removeItem("sadhana_token");
        localStorage.removeItem("sadhana_user");

        if (active) setUser(null);
      } finally {
        if (active) setLoading(false);
      }
    }

    restoreSession();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const interceptorId = api.interceptors.response.use(
      (response) => response,
      (error) => {
        if (
          error.response?.status === 401 &&
          localStorage.getItem("sadhana_token")
        ) {
          logout();
        }

        return Promise.reject(error);
      }
    );

    return () => {
      api.interceptors.response.eject(interceptorId);
    };
  }, [logout]);

  const value = {
    user,
    loading,
    isAuthenticated: Boolean(user),
    login,
    signup,
    logout,
    refreshUser,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider.");
  }

  return context;
}
