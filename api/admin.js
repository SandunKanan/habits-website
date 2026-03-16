import { handleAdminGet } from "../server/adminEndpoint.js";

export async function GET(request) {
  return handleAdminGet(request);
}
