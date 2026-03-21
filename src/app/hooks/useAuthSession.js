import { useEffect, useState } from "react";
import {
  getDemoCredentials,
  initializeAuth,
  signInWithPassword,
  signOutCurrentSession,
  signUpWithPassword
} from "../../lib/authClient.js";

export function useAuthSession({ authEnabled }) {
  const [session, setSession] = useState(null);
  const [authUser, setAuthUser] = useState(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [isAuthWorking, setIsAuthWorking] = useState(false);

  useEffect(() => {
    let ignore = false;

    async function bootstrapAuth() {
      if (!authEnabled) {
        if (!ignore) {
          setIsAuthReady(true);
        }
        return;
      }

      const { session: nextSession, user } = await initializeAuth();
      if (!ignore) {
        setSession(nextSession);
        setAuthUser(user);
        setIsAuthReady(true);
      }
    }

    void bootstrapAuth();

    return () => {
      ignore = true;
    };
  }, [authEnabled]);

  async function handleSignIn({ email, password }) {
    setIsAuthWorking(true);

    try {
      const { session: nextSession, user } = await signInWithPassword({ email, password });
      setSession(nextSession);
      setAuthUser(user);
      return { ok: true };
    } catch (error) {
      return { ok: false, error: error.message };
    } finally {
      setIsAuthWorking(false);
    }
  }

  async function handleSignUp({ email, password }) {
    setIsAuthWorking(true);

    try {
      const result = await signUpWithPassword({ email, password });
      if (result.requiresEmailConfirmation) {
        return {
          ok: true,
          message: "Account created. Check your email to confirm, then sign in."
        };
      }

      setSession(result.session);
      setAuthUser(result.user);
      return { ok: true };
    } catch (error) {
      return { ok: false, error: error.message };
    } finally {
      setIsAuthWorking(false);
    }
  }

  async function handleDemoSignIn() {
    const credentials = getDemoCredentials();
    if (!credentials) {
      return { ok: false, error: "Demo account is not configured." };
    }

    return handleSignIn(credentials);
  }

  async function handleSignOut() {
    await signOutCurrentSession(session);
    setSession(null);
    setAuthUser(null);
  }

  return {
    session,
    authUser,
    isAuthReady,
    isAuthWorking,
    handleSignIn,
    handleDemoSignIn,
    handleSignUp,
    handleSignOut
  };
}
