export type HomistaUser = {
  id: number;
  phone_number: string | null;
  display_name: string | null;
};

export type HomeProject = {
  id: number;
  name: string;
  location: string | null;
  home_type: 'villa' | 'duplex' | 'apartment' | null;
  plot_area_sqft: number | null;
  built_up_area_sqft: number | null;
  floors: number | null;
  construction_quality: 'standard' | 'premium' | null;
  created_at: string;
};

export type ProjectDetails = {
  name: string;
  location?: string | null;
  home_type?: 'villa' | 'duplex' | 'apartment' | null;
  plot_area_sqft?: number | null;
  built_up_area_sqft?: number | null;
  floors?: number | null;
  construction_quality?: 'standard' | 'premium' | null;
};

type LoginResponse = {
  access_token: string;
  expires_in: number;
  user: HomistaUser;
};

const API_URL = (process.env.EXPO_PUBLIC_API_URL || 'http://127.0.0.1:8000').replace(/\/$/, '');

async function request<T>(path: string, token?: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init?.headers,
    },
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    throw new Error(payload?.detail || `Request failed (${response.status}).`);
  }
  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

export function createHomistaSession(firebaseIdToken: string): Promise<LoginResponse> {
  return request('/v1/auth/firebase', undefined, {
    method: 'POST',
    body: JSON.stringify({ id_token: firebaseIdToken }),
  });
}

export function getCurrentUser(token: string): Promise<HomistaUser> {
  return request('/v1/users/me', token);
}

export function revokeHomistaSession(token: string): Promise<void> {
  return request('/v1/auth/logout', token, { method: 'POST' });
}

export function getProjects(token: string): Promise<HomeProject[]> {
  return request('/v1/projects', token);
}

export function createProject(
  token: string,
  project: ProjectDetails,
): Promise<HomeProject> {
  return request('/v1/projects', token, {
    method: 'POST',
    body: JSON.stringify(project),
  });
}

export function updateProject(token: string, projectId: number, project: ProjectDetails): Promise<HomeProject> {
  return request(`/v1/projects/${projectId}`, token, {
    method: 'PATCH',
    body: JSON.stringify(project),
  });
}
