// In development the Vite proxy forwards all backend routes from the same
// origin, so API_BASE should be '' (empty = same-origin).
// In production point VITE_API_BASE at your deployed FastAPI URL,
// e.g. VITE_API_BASE=https://api.ghosttwin.app
export const API_BASE = import.meta.env.VITE_API_BASE || '';