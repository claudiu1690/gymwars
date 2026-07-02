import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../auth";

export default function Login() {
    const { login } = useAuth();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState(null);
    const [busy, setBusy] = useState(false);

    async function onSubmit(e) {
        e.preventDefault();
        setError(null);
        setBusy(true);
        try {
            await login(email, password);
        } catch (err) {
            setError(err.message);
        } finally {
            setBusy(false);
        }
    }

    return (
        <div className="auth-wrap">
            <div className="auth-card">
                <div className="auth-brand">
                    <div className="display">Gym Wars</div>
                    <div className="tag">Run the gym. Build the legacy.</div>
                </div>
                <form className="card" onSubmit={onSubmit}>
                    {error && <div className="form-error">{error}</div>}
                    <div className="field">
                        <label htmlFor="email">Email</label>
                        <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required />
                    </div>
                    <div className="field">
                        <label htmlFor="password">Password</label>
                        <input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required />
                    </div>
                    <button className="btn btn-primary" style={{ width: "100%" }} disabled={busy}>
                        {busy ? "Logging in…" : "Log in"}
                    </button>
                </form>
                <p className="auth-switch">
                    New here? <Link to="/register">Open your gym</Link>
                </p>
            </div>
        </div>
    );
}
