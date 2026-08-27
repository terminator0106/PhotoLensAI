const TOKEN_KEY = 'pl_token';

export function getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
}

export function saveToken(token: string): void {
    localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
    localStorage.removeItem(TOKEN_KEY);
}

export const API_BASE = 'https://photolensai.onrender.com';

export async function apiRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
    const headers = new Headers(init.headers);

    // Only set JSON content-type when we're not sending FormData.
    const isFormData = typeof FormData !== 'undefined' && init.body instanceof FormData;
    if (!isFormData && !headers.has('Content-Type')) {
        headers.set('Content-Type', 'application/json');
    }

    // Attach Bearer token from localStorage (works cross-domain, no cookie issues).
    const token = getToken();
    if (token) {
        headers.set('Authorization', `Bearer ${token}`);
    }

    const res = await fetch(`${API_BASE}${path}`, { ...init, headers });

    if (!res.ok) {
        let detail = '';
        try {
            const ct = res.headers.get('content-type') || '';
            if (ct.includes('application/json')) {
                const data = await res.json();
                detail = data?.detail ? String(data.detail) : JSON.stringify(data);
            } else {
                detail = await res.text();
            }
        } catch {
            detail = '';
        }
        throw new Error(detail || `Request failed (${res.status})`);
    }

    const contentType = res.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
        return (await res.json()) as T;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (await res.text()) as any as T;
}
