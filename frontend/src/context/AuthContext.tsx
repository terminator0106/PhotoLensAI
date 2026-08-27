import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { apiRequest, saveToken, clearToken } from '../lib/api';

export interface AuthUser {
    id: number;
    name: string;
    email: string;
    created_at: string;
}

interface AuthContextType {
    user: AuthUser | null;
    loading: boolean;
    setUser: (user: AuthUser | null) => void;
    saveAuthToken: (token: string) => void;
    logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    loading: true,
    setUser: () => { },
    saveAuthToken: () => { },
    logout: async () => { },
});

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<AuthUser | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Try to restore session from stored token
        apiRequest<AuthUser>('/auth/me')
            .then((data) => setUser(data ?? null))
            .catch(() => setUser(null))
            .finally(() => setLoading(false));
    }, []);

    const saveAuthToken = (token: string) => {
        saveToken(token);
    };

    const logout = async () => {
        try {
            await apiRequest('/auth/logout', { method: 'POST' });
        } catch { /* ignore */ }
        clearToken();
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, loading, setUser, saveAuthToken, logout }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => useContext(AuthContext);
