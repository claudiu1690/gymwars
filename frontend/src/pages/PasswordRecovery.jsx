import { useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { api, setToken } from "../api";
import SiteLinks from "../components/SiteLinks";
export default function PasswordRecovery({ reset = false }) {
  const [query] = useSearchParams(),
    token = query.get("token"),
    [status, setStatus] = useState(""),
    [error, setError] = useState(""),
    [working, setWorking] = useState(false),
    [valid, setValid] = useState(!reset);
  useEffect(() => {
    if (reset)
      api("/auth/check-reset-token?token=" + encodeURIComponent(token || ""))
        .then((r) => {
          setValid(r.valid);
          if (!r.valid)
            setError(
              r.expired
                ? "This reset link expired. Request a fresh one."
                : "This reset link is invalid. Request a new one.",
            );
        })
        .catch(() =>
          setError("Could not check this link. Reload to try again."),
        );
  }, [reset, token]);
  async function submit(e) {
    e.preventDefault();
    if (working) return;
    setWorking(true);
    setError("");
    const values = new FormData(e.currentTarget);
    try {
      if (reset) {
        if (values.get("password") !== values.get("confirm"))
          throw new Error("New passwords must match.");
        await api("/auth/reset-password", {
          method: "POST",
          body: { token, new_password: values.get("password") },
        });
        setToken(null);
        window.dispatchEvent(new Event("gw:logout"));
        setStatus("Password changed. Sign in with your new password.");
      } else {
        await api("/auth/forgot-password", {
          method: "POST",
          body: { email: values.get("email") },
        });
        setStatus(
          "If this email belongs to an account and email delivery is configured, a reset link will arrive. Check your inbox and spam folder.",
        );
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setWorking(false);
    }
  }
  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <Link className="auth-home-link" to="/">
          Gym Wars home
        </Link>
        <h1 className="auth-title">
          {reset ? "Choose a new password" : "Reset your password"}
        </h1>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        {status ? (
          <p className="auth-status" role="status">
            {status}
          </p>
        ) : (
          <form className="card" onSubmit={submit}>
            {reset ? (
              <>
                <label className="field">
                  New password
                  <input
                    type="password"
                    name="password"
                    minLength={8}
                    maxLength={128}
                    autoComplete="new-password"
                    required
                  />
                </label>
                <label className="field">
                  Confirm password
                  <input
                    type="password"
                    name="confirm"
                    minLength={8}
                    maxLength={128}
                    autoComplete="new-password"
                    required
                  />
                </label>
              </>
            ) : (
              <label className="field">
                Email
                <input
                  type="email"
                  name="email"
                  autoComplete="email"
                  required
                />
              </label>
            )}
            <button className="btn btn-primary" disabled={working || !valid}>
              {working
                ? "Saving…"
                : reset
                  ? "Save new password"
                  : "Request reset link"}
            </button>
          </form>
        )}
        <p className="auth-recovery-links">
          <Link to="/login">Back to sign in</Link>
          {reset && (
            <>
              <Link to="/forgot-password">Request a new link</Link>
            </>
          )}
        </p>
        <SiteLinks />
      </div>
    </div>
  );
}
