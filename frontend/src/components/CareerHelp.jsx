import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { api, setToken } from "../api";
import { requestId } from "../careerRequest.mjs";
import {
  experienceSettings,
  saveExperience,
  playSound,
} from "../gameExperience.mjs";
import { ChoiceCards } from "./GameUI";
import SiteLinks from "./SiteLinks";
import "./alpha-experience.css";
const faq = [
  [
    "Plan, then play",
    "Choose training, recovery, tactics and bookings at your pace. These save plans. End week advances every fighter together by one week and pauses for fights or camp decisions.",
  ],
  [
    "Prepare for the opponent",
    "Training grows permanent skills. Camps and mentoring may add a one-bout bonus. Fatigue reduces readiness, so leave room to recover. Compare the actual opponent and choose your own strategy.",
  ],
  [
    "Training or mentoring?",
    "Training builds permanent stats for one fighter. Mentoring reserves two fighters for a chance at a permanent trait; no training growth occurs, but readiness recovers. Iron Chin and Killer Instinct have shorter lessons. Every completed lesson gives +2 preparation for the learner's next career bout within eight weeks, even without a trait transfer. That temporary bonus does not apply to Gym Wars. Publish learned traits from the Gym Wars Team tab to update your defense.",
  ],
  [
    "Build your corner",
    "Gym Wars needs four active fighters: one featherweight, lightweight, middleweight and heavyweight. Rarity is optional; extra fighters are reserves. Save team tactics on the Team tab.",
  ],
  [
    "Know your competitions",
    "Regional rankings qualify fighters for belts. Club reputation unlocks new opponents and purses. The Invitational is a three-fighter career event; Gym Wars is a separate ranked 4v4 league.",
  ],
  [
    "Return on your schedule",
    "Unused career weeks and Gym Wars cards bank while you are away. No upkeep is charged for real-world time offline. There are no login streak penalties.",
  ],
  [
    "Cosmetics and purchases",
    "Cosmetics are earned through Achievements, including Career Path quests. Supply packs start at $4.99 USD. Across all packs, you can buy up to 4 extra weeks and 2 extra Gym Wars tokens per 24-hour supply interval. The Club Pack shares both limits. Test checkout costs $0.00; real payments are disconnected.",
  ],
];
export default function CareerHelp({ onProfileChange = () => {} }) {
  const [account, setAccount] = useState(null),
    [settings, setSettings] = useState(experienceSettings),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [working, setWorking] = useState(false),
    [category, setCategory] = useState("gameplay"),
    [message, setMessage] = useState(""),
    [reports, setReports] = useState([]);
  const lock = useRef(false),
    pending = useRef(null);
  async function load() {
    try {
      const [a, r] = await Promise.all([
        api("/account"),
        api("/account/reports"),
      ]);
      setAccount(a);
      setReports(r.reports);
      setError("");
    } catch (e) {
      setError(e.message);
    }
  }
  useEffect(() => {
    load();
  }, []);
  async function task(fn) {
    if (lock.current) return;
    lock.current = true;
    setWorking(true);
    setError("");
    setNotice("");
    try {
      await fn();
    } catch (e) {
      setError(e.message);
    } finally {
      lock.current = false;
      setWorking(false);
    }
  }
  function preference(patch) {
    return task(async () => {
      const value = await api("/account/preferences", {
        method: "PATCH",
        body: patch,
      });
      setAccount(value);
      onProfileChange(value);
      setNotice("Preference saved.");
    });
  }
  function sound(value) {
    setSettings(saveExperience({ sound: value }));
    if (value) playSound("confirm");
  }
  async function password(event) {
    event.preventDefault();
    const form = event.currentTarget,
      values = new FormData(form);
    if (values.get("newPassword") !== values.get("confirmPassword")) {
      setError("New passwords must match.");
      return;
    }
    await task(async () => {
      const result = await api("/account/password", {
        method: "POST",
        body: {
          currentPassword: values.get("currentPassword"),
          newPassword: values.get("newPassword"),
        },
      });
      setToken(result.token);
      form.reset();
      setNotice("Password changed. Other sessions have been signed out.");
    });
  }
  async function exportData() {
    await task(async () => {
      const data = await api("/account/export"),
        url = URL.createObjectURL(
          new Blob([JSON.stringify(data, null, 2)], {
            type: "application/json",
          }),
        ),
        a = document.createElement("a");
      a.href = url;
      a.download = "gymwars-player-data.json";
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setNotice(
        "Player-visible data downloaded. Passwords, security tokens and hidden fighter values are excluded.",
      );
    });
  }
  async function report(event) {
    event.preventDefault();
    await task(async () => {
      pending.current ||= {
        requestId: requestId(),
        category,
        message,
        context: { screen: "help" },
      };
      let result;
      try {
        result = await api("/account/reports", {
          method: "POST",
          body: pending.current,
        });
      } catch (e) {
        if (e.status >= 400 && e.status < 500) pending.current = null;
        throw e;
      }
      pending.current = null;
      setMessage("");
      setNotice(`${result.message} Reference ${result.reference}.`);
      const r = await api("/account/reports");
      setReports(r.reports);
    });
  }
  return (
    <div className="career-help">
      <section className="help-hero">
        <span className="career-eyebrow">YOUR CORNER’S HANDBOOK</span>
        <h2>
          Play your way.
          <br />
          Keep the next move clear.
        </h2>
        <p>Plan the team. End the week. Make your call in the cage.</p>
        <Link className="career-action" to="/career">
          Back to your gym
        </Link>
      </section>
      {error && (
        <div className="career-error" role="alert">
          {error}
          <button type="button" onClick={load}>
            Refresh
          </button>
        </div>
      )}
      {notice && (
        <p className="alpha-notice" role="status">
          {notice}
        </p>
      )}
      <section className="help-section">
        <h3>Sound & motion</h3>
        <p>
          These settings apply on this device. There is no background music.
        </p>
        <ChoiceCards
          label="Sound effects"
          value={settings.sound}
          onChange={sound}
          options={[
            { value: true, label: "Sound on" },
            { value: false, label: "Muted" },
          ]}
        />
        <ChoiceCards
          label="Animation effects"
          value={settings.reduceMotion}
          onChange={(value) =>
            setSettings(saveExperience({ reduceMotion: value }))
          }
          options={[
            { value: false, label: "Follow device" },
            { value: true, label: "Reduce effects" },
          ]}
        />
        <p className="help-fine-print">
          Your device’s reduced-motion preference always applies. Sounds start
          only after interaction.
        </p>
      </section>
      <section className="help-section">
        <h3>How the game works</h3>
        <div className="help-faq">
          {faq.map(([title, text]) => (
            <article key={title}>
              <h4>{title}</h4>
              <p>{text}</p>
            </article>
          ))}
        </div>
      </section>
      <section className="help-section">
        <h3>Your account</h3>
        {account ? (
          <>
            <p>
              {account.email} ·{" "}
              {account.emailConfirmed ? "Email verified" : "Email not verified"}
            </p>
            <form onSubmit={password} className="help-password">
              <label>
                Current password
                <input
                  name="currentPassword"
                  type="password"
                  autoComplete="current-password"
                  required
                  maxLength={128}
                />
              </label>
              <label>
                New password
                <input
                  name="newPassword"
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={8}
                  maxLength={128}
                />
              </label>
              <label>
                Confirm new password
                <input
                  name="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={8}
                  maxLength={128}
                />
              </label>
              <button
                type="submit"
                className="career-action"
                disabled={working}
              >
                Change password
              </button>
            </form>
            <Link to="/forgot-password">Forgot your password?</Link>
            {!account.emailConfirmed && (
              <button
                type="button"
                className="help-text-button"
                disabled={working || !account.securityEmailAvailable}
                onClick={() =>
                  task(async () => {
                    await api("/account/verify-email", { method: "POST" });
                    setNotice("Verification email requested.");
                  })
                }
              >
                Send verification email
              </button>
            )}
            {!account.securityEmailAvailable && (
              <p className="help-fine-print">
                Security email delivery is not configured in this local
                environment. No email is sent.
              </p>
            )}
          </>
        ) : (
          <p>Loading account…</p>
        )}
      </section>
      <section className="help-section">
        <h3>Privacy & gameplay analytics</h3>
        <p>
          Optional first-party analytics record progression milestones, return
          days and blocked-action categories for 90 days. They contain no email,
          message text, passwords or hidden fighter values. Switching off
          removes this gym’s recorded analytics.
        </p>
        {account && (
          <ChoiceCards
            label="Gameplay analytics"
            value={account.analyticsEnabled}
            disabled={working}
            onChange={(value) => preference({ analyticsEnabled: value })}
            options={[
              { value: false, label: "Analytics off" },
              { value: true, label: "Help improve the game" },
            ]}
          />
        )}
        {account && (
          <ChoiceCards
            label="Optional account emails"
            value={account.emailEnabled}
            disabled={working}
            onChange={(value) => preference({ emailEnabled: value })}
            options={[
              { value: false, label: "Optional emails off" },
              { value: true, label: "Optional emails on" },
            ]}
          />
        )}
        <button
          type="button"
          className="help-text-button"
          disabled={working || !account}
          onClick={exportData}
        >
          Download my player-visible data
        </button>
      </section>
      <section className="help-section" id="support">
        <h3>Tell us what needs work</h3>
        <p>
          Reports are saved for Digital Olive to review. Keep the reference for
          follow-up. Don’t include passwords or card details.
        </p>
        <form onSubmit={report}>
          <ChoiceCards
            label="Report type"
            value={category}
            onChange={(value) => {
              setCategory(value);
              pending.current = null;
            }}
            disabled={working || !!pending.current}
            options={[
              { value: "gameplay", label: "Game feels confusing" },
              { value: "bug", label: "Something broke" },
              { value: "purchase", label: "Shop question" },
            ]}
          />
          <label>
            Your message
            <textarea
              value={message}
              minLength={4}
              maxLength={2000}
              required
              rows={4}
              disabled={working || !!pending.current}
              onChange={(event) => setMessage(event.target.value)}
            />
          </label>
          <button
            type="submit"
            className="career-action"
            disabled={working || message.trim().length < 4}
          >
            {pending.current ? "Retry saved report" : "Save report"}
          </button>
        </form>
        {account?.supportEmail && (
          <p>
            <a href={`mailto:${account.supportEmail}`}>Email support</a>
          </p>
        )}
        <ul className="help-reports">
          {reports.map((r) => (
            <li key={r.reference}>
              <strong>{r.reference}</strong>
              <span>
                {r.category} · {r.status}
              </span>
              <p>{r.message}</p>
            </li>
          ))}
        </ul>
      </section>
      <section className="help-section help-information">
        <h3>About Gym Wars</h3>
        <p>
          Gym Wars is operated by Digital Olive. For a personal-data request,
          start your report with “Privacy request”. Keep your GW reference
          number for follow-up.
        </p>
        <SiteLinks />
      </section>
    </div>
  );
}
