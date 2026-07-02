import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { api, getToken, setToken } from "./api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [authed, setAuthed] = useState(Boolean(getToken()));
    const [gym, setGym] = useState(null);
    const [loading, setLoading] = useState(Boolean(getToken()));

    const loadGym = useCallback(async () => {
        try {
            const data = await api("/gyms/me");
            setGym(data.gym);
        } catch {
            setGym(null);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (authed) loadGym();
        const onLogout = () => { setAuthed(false); setGym(null); };
        window.addEventListener("gw:logout", onLogout);
        return () => window.removeEventListener("gw:logout", onLogout);
    }, [authed, loadGym]);

    async function login(email, password) {
        const data = await api("/auth/login", { method: "POST", body: { email, password } });
        setToken(data.token);
        setAuthed(true);
    }

    async function register(email, password, gymName) {
        const data = await api("/auth/register", { method: "POST", body: { email, password, gymName } });
        setToken(data.token);
        setAuthed(true);
    }

    function logout() {
        setToken(null);
        setAuthed(false);
        setGym(null);
    }

    return (
        <AuthContext.Provider value={{ authed, gym, loading, login, register, logout, reloadGym: loadGym }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    return useContext(AuthContext);
}
