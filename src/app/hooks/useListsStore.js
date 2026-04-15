import { useEffect, useState } from "react";
import { loadListsForSession, saveListsForSession } from "../../lib/listsClient.js";

export function useListsStore({ authEnabled, isAuthReady, session, authUser }) {
  const [lists, setLists] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isPersisting, setIsPersisting] = useState(false);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    let ignore = false;

    async function loadLists() {
      if (!isAuthReady) return;
      if (authEnabled && !session?.access_token) {
        if (!ignore) {
          setLists([]);
          setIsLoading(false);
          setLoadError("");
        }
        return;
      }

      try {
        if (!ignore) {
          setIsLoading(true);
        }
        setLoadError("");
        const data = await loadListsForSession(session?.access_token, authUser?.id);
        if (!ignore) {
          setLists(Array.isArray(data) ? data : []);
        }
      } catch (error) {
        if (!ignore) {
          console.error("Failed to load lists", error);
          setLoadError("Could not load lists.");
        }
      } finally {
        if (!ignore) {
          setIsLoading(false);
        }
      }
    }

    void loadLists();

    return () => {
      ignore = true;
    };
  }, [authEnabled, authUser?.id, isAuthReady, session?.access_token]);

  async function persistLists(nextLists) {
    try {
      setIsPersisting(true);
      const data = await saveListsForSession(session?.access_token, authUser?.id, nextLists);
      if (Array.isArray(data)) {
        setLists(data);
      }
      return { ok: true, lists: Array.isArray(data) ? data : nextLists };
    } catch (error) {
      console.error("Failed to persist lists", error);
      return { ok: false, error: "Could not save lists." };
    } finally {
      setIsPersisting(false);
    }
  }

  async function addList({ title, description }) {
    const trimmedTitle = String(title ?? "").trim();
    if (!trimmedTitle) return { ok: false, error: "List title is required." };

    const now = new Date().toISOString();
    const newList = {
      id: crypto.randomUUID(),
      title: trimmedTitle,
      description: String(description ?? "").trim(),
      items: [],
      createdAt: now,
      updatedAt: now
    };

    return persistLists([newList, ...lists]);
  }

  async function updateList(listId, updates) {
    const existingList = lists.find((list) => list.id === listId);
    if (!existingList) return { ok: false, error: "List not found." };

    const trimmedTitle = String(updates.title ?? existingList.title ?? "").trim();
    if (!trimmedTitle) return { ok: false, error: "List title is required." };

    const nextLists = lists.map((list) =>
      list.id !== listId
        ? list
        : {
            ...list,
            title: trimmedTitle,
            description: String(updates.description ?? list.description ?? "").trim(),
            updatedAt: new Date().toISOString()
          }
    );

    return persistLists(nextLists);
  }

  async function deleteList(listId) {
    const existingList = lists.find((list) => list.id === listId);
    if (!existingList) return { ok: false, error: "List not found." };
    return persistLists(lists.filter((list) => list.id !== listId));
  }

  async function addListItem(listId, text) {
    const trimmedText = String(text ?? "").trim();
    if (!trimmedText) return { ok: false, error: "Item text is required." };
    const existingList = lists.find((list) => list.id === listId);
    if (!existingList) return { ok: false, error: "List not found." };

    const now = new Date().toISOString();
    const nextLists = lists.map((list) =>
      list.id !== listId
        ? list
        : {
            ...list,
            items: [
              {
                id: crypto.randomUUID(),
                text: trimmedText,
                completedAt: null,
                createdAt: now
              },
              ...(Array.isArray(list.items) ? list.items : [])
            ],
            updatedAt: now
          }
    );

    return persistLists(nextLists);
  }

  async function toggleListItem(listId, itemId) {
    const existingList = lists.find((list) => list.id === listId);
    if (!existingList) return { ok: false, error: "List not found." };

    const now = new Date().toISOString();
    const nextLists = lists.map((list) =>
      list.id !== listId
        ? list
        : {
            ...list,
            items: (Array.isArray(list.items) ? list.items : []).map((item) =>
              item.id !== itemId
                ? item
                : {
                    ...item,
                    completedAt: item.completedAt ? null : now
                  }
            ),
            updatedAt: now
          }
    );

    return persistLists(nextLists);
  }

  async function deleteListItem(listId, itemId) {
    const existingList = lists.find((list) => list.id === listId);
    if (!existingList) return { ok: false, error: "List not found." };

    const now = new Date().toISOString();
    const nextLists = lists.map((list) =>
      list.id !== listId
        ? list
        : {
            ...list,
            items: (Array.isArray(list.items) ? list.items : []).filter((item) => item.id !== itemId),
            updatedAt: now
          }
    );

    return persistLists(nextLists);
  }

  function beginLoadingLists() {
    setIsLoading(true);
  }

  function resetListsState() {
    setLists([]);
    setIsLoading(false);
    setLoadError("");
    setIsPersisting(false);
  }

  return {
    lists,
    isLoading,
    isPersisting,
    loadError,
    addList,
    updateList,
    deleteList,
    addListItem,
    toggleListItem,
    deleteListItem,
    beginLoadingLists,
    resetListsState
  };
}
