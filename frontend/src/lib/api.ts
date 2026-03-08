function computeDefaultApiBase(): string {
    // Derive backend host from the current page host so cookie SameSite=Lax works
    // even when accessing the dev server via 127.0.0.1 or a LAN IP.
    if (typeof window !== 'undefined' && window.location?.hostname) {
        return `http://${window.location.hostname}:8000`;
    }
    return 'http://localhost:8000';
}

export const API_BASE = String(import.meta.env.VITE_API_BASE || computeDefaultApiBase()).replace(/\/+$/, '');

export async function apiRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
    const headers = new Headers(init.headers);

    // Only set JSON content-type when we're not sending FormData.
    const isFormData = typeof FormData !== 'undefined' && init.body instanceof FormData;
    if (!isFormData && !headers.has('Content-Type')) {
        headers.set('Content-Type', 'application/json');
    }

    const res = await fetch(`${API_BASE}${path}`,
        {
            credentials: 'include',
            ...init,
            headers,
        }
    );

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
