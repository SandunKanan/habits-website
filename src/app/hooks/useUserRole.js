import { useEffect, useState } from "react";
import { loadUserRole } from "../../lib/userRoleClient.js";

export function useUserRole({ authEnabled, isAuthReady, session, authUser }) {
  const [isAdmin, setIsAdmin] = useState(false);
  const [isRoleReady, setIsRoleReady] = useState(false);

  useEffect(() => {
    let ignore = false;

    async function loadRole() {
      if (!isAuthReady) return;

      if (!authEnabled || !session?.access_token || !authUser?.id) {
        if (!ignore) {
          setIsAdmin(false);
          setIsRoleReady(true);
        }
        return;
      }

      try {
        if (!ignore) {
          setIsRoleReady(false);
        }

        const role = await loadUserRole(session.access_token, authUser.id);
        if (!ignore) {
          setIsAdmin(Boolean(role.isAdmin));
        }
      } catch (error) {
        if (!ignore) {
          console.error("Failed to load user role", error);
          setIsAdmin(false);
        }
      } finally {
        if (!ignore) {
          setIsRoleReady(true);
        }
      }
    }

    void loadRole();

    return () => {
      ignore = true;
    };
  }, [authEnabled, authUser?.id, isAuthReady, session?.access_token]);

  function resetRoleState() {
    setIsAdmin(false);
    setIsRoleReady(false);
  }

  return {
    isAdmin,
    isRoleReady,
    resetRoleState
  };
}
