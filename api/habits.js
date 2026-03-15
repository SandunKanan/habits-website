import { loadHabitsFromStore, saveHabitsToStore } from "../server/habitsStore.js";
import { getAuthenticatedUserFromAccessToken, isServerAuthEnabled } from "../server/authUser.js";

async function getAuthenticatedUser(request) {
  if (!isServerAuthEnabled()) {
    return null;
  }

  const authHeader = request.headers.get("authorization");
  const accessToken = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  return getAuthenticatedUserFromAccessToken(accessToken);
}

export async function GET(request) {
  try {
    const auth = await getAuthenticatedUser(request);
    if (auth?.error) {
      return Response.json({ error: auth.error }, { status: 401 });
    }

    const habits = await loadHabitsFromStore(auth?.user?.id);
    return Response.json({ habits });
  } catch (error) {
    console.error("GET /api/habits failed", error);
    return Response.json({ error: "Failed to load habits." }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const auth = await getAuthenticatedUser(request);
    if (auth?.error) {
      return Response.json({ error: auth.error }, { status: 401 });
    }

    const payload = await request.json();
    if (!Array.isArray(payload)) {
      return Response.json({ error: "Payload must be an array." }, { status: 400 });
    }

    const habits = await saveHabitsToStore(auth?.user?.id, payload);
    return Response.json({ habits });
  } catch (error) {
    console.error("POST /api/habits failed", error);
    return Response.json({ error: "Failed to save habits." }, { status: 500 });
  }
}
