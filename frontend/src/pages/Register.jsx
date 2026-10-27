import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../auth";
import SiteLinks from "../components/SiteLinks";

export default function Register() {
  const { register } = useAuth();
  const [gymName, setGymName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await register(email, password, gymName);
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
          <div className="tag">Every legacy starts in a garage.</div>
        </div>
        <form className="card" onSubmit={onSubmit}>
          {error && <div className="form-error">{error}</div>}
          <div className="field">
            <label htmlFor="gymName">Gym name</label>
            <input
              id="gymName"
              value={gymName}
              onChange={(e) => setGymName(e.target.value)}
              minLength={3}
              maxLength={30}
              placeholder="Iron Temple MMA"
              required
            />
          </div>
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
              autoComplete="new-password"
              minLength={8}
              maxLength={128}
              aria-describedby="registration-password-hint"
              required
            />
            <small id="registration-password-hint">Use 8–128 characters.</small>
          </div>
          <button
            className="btn btn-primary"
            style={{ width: "100%" }}
            disabled={busy}
          >
            {busy ? "Opening the doors…" : "Open your gym"}
          </button>
        </form>
        <p className="auth-policy">
          By opening your gym, you agree to the{" "}
          <Link to="/terms" target="_blank" rel="noreferrer">
            Terms of play
          </Link>
          . Read how Digital Olive handles your data in the{" "}
          <Link to="/privacy" target="_blank" rel="noreferrer">
            Privacy notice
          </Link>
          .
        </p>
        <p className="auth-switch">
          Already a manager? <Link to="/login">Log in</Link>
        </p>
        <SiteLinks newTab />
      </div>
    </div>
  );
}
