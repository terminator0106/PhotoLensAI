import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { apiRequest } from '../lib/api';

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
    logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    loading: true,
    setUser: () => { },
    logout: async () => { },
});

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<AuthUser | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        apiRequest<AuthUser>('/auth/me')
            .then((data) => setUser(data ?? null))
            .catch(() => setUser(null))
            .finally(() => setLoading(false));
    }, []);

    const logout = async () => {
        try {
            await apiRequest('/auth/logout', { method: 'POST' });
        } catch { /* ignore */ }
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, loading, setUser, logout }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => useContext(AuthContext);
