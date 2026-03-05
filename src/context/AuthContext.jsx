import { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

const USERS = [
    { username: 'admin', password: 'adminamazing', role: 'admin', name: 'Administrador' },
    { username: 'vendedor', password: 'vendedoramazing', role: 'seller', name: 'Vendedor' },
];

const AUTH_KEY = 'amazing_auth';

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    // Load session from localStorage on mount
    useEffect(() => {
        try {
            const saved = localStorage.getItem(AUTH_KEY);
            if (saved) {
                const parsed = JSON.parse(saved);
                // Validate the saved session
                const validUser = USERS.find(u => u.username === parsed.username);
                if (validUser) {
                    setUser({ username: validUser.username, role: validUser.role, name: validUser.name });
                }
            }
        } catch {
            localStorage.removeItem(AUTH_KEY);
        }
        setIsLoading(false);
    }, []);

    const login = (username, password) => {
        const found = USERS.find(
            u => u.username === username.toLowerCase().trim() && u.password === password
        );

        if (found) {
            const session = { username: found.username, role: found.role, name: found.name };
            setUser(session);
            localStorage.setItem(AUTH_KEY, JSON.stringify(session));
            return { success: true, user: session };
        }

        return { success: false, error: 'Usuário ou senha inválidos' };
    };

    const logout = () => {
        setUser(null);
        localStorage.removeItem(AUTH_KEY);
    };

    return (
        <AuthContext.Provider value={{ user, isLoading, login, logout, isAuthenticated: !!user }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) throw new Error('useAuth must be used within AuthProvider');
    return context;
}
