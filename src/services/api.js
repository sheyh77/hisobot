const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

const request = async (path, options = {}) => {
  const token = localStorage.getItem("moliyam-api-token");
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(options.headers || {}) },
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    const error = new Error(body.error || `API request failed: ${response.status}`);
    error.status = response.status;
    throw error;
  }
  return response.status === 204 ? null : response.json();
};

export const api = { get: (path) => request(path), post: (path, body) => request(path, { method: "POST", body: JSON.stringify(body) }), patch: (path, body) => request(path, { method: "PATCH", body: JSON.stringify(body) }), delete: (path) => request(path, { method: "DELETE" }) };
export { API_URL };
