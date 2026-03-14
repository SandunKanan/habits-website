import { loadHabitsFromStore, saveHabitsToStore } from "../server/habitsStore.js";

export async function GET() {
  try {
    const habits = await loadHabitsFromStore();
    return Response.json({ habits });
  } catch (error) {
    console.error("GET /api/habits failed", error);
    return Response.json({ error: "Failed to load habits." }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const payload = await request.json();
    if (!Array.isArray(payload)) {
      return Response.json({ error: "Payload must be an array." }, { status: 400 });
    }

    const habits = await saveHabitsToStore(payload);
    return Response.json({ habits });
  } catch (error) {
    console.error("POST /api/habits failed", error);
    return Response.json({ error: "Failed to save habits." }, { status: 500 });
  }
}
