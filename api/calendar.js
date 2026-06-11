import { handleCalendarFeedGet } from "../server/calendarEndpoint.js";

export async function GET(request) {
  return handleCalendarFeedGet(request);
}
