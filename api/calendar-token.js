import { handleCalendarTokenGet } from "../server/calendarEndpoint.js";

export async function GET(request) {
  return handleCalendarTokenGet(request);
}
