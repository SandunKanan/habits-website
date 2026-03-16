import { handleAdminGet, handleAdminPost } from "../server/adminEndpoint.js";

export async function GET(request) {
  return handleAdminGet(request);
}

export async function POST(request) {
  return handleAdminPost(request);
}
