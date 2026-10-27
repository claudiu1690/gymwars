import { useState } from "react";
import { Link } from "react-router-dom";
import SiteLinks from "../components/SiteLinks";
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
        <Link className="auth-home-link" to="/">
          Gym Wars home
        </Link>
        <div className="auth-brand">
          <div className="display">Gym Wars</div>
          <div className="tag">Run the gym. Build the legacy.</div>
        </div>
        {import.meta.env.DEV &&
          import.meta.env.VITE_CAREER_PREVIEW === "true" && (
            <div className="preview-entry">
              <strong>Local playtest</strong>
              <p>
                Use the new-career account to try booking your first fight. The
                populated demo already has fighters and a booked bout. Both
                continue saved progress if you have played before.
              </p>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => {
                  setEmail("new@gymwars.local");
                  setPassword("gymwars-preview");
                }}
              >
                New career account
              </button>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => {
                  setEmail("preview@gymwars.local");
                  setPassword("gymwars-preview");
                }}
              >
                Populated demo account
              </button>
              <p>
                Local playtest accounts use the preview save. A fresh onboarding
                test needs a separate account or an explicit reset.
              </p>
            </div>
          )}
        <form className="card" onSubmit={onSubmit}>
          {error && <div className="form-error">{error}</div>}
          <div className="field">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
            />
          </div>
          <div className="field">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
          </div>
          <button
            className="btn btn-primary"
            style={{ width: "100%" }}
            disabled={busy}
          >
            {busy ? "Logging in…" : "Log in"}
          </button>
        </form>
        <p className="auth-switch">
          <Link to="/forgot-password">Forgot your password?</Link>
        </p>
        <p className="auth-switch">
          New here? <Link to="/register">Open your gym</Link>
        </p>
        <SiteLinks newTab />
      </div>
    </div>
  );
}
