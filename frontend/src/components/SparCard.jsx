import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api";
import { useAuth } from "../auth";
import { Button } from "./ds/Button.jsx";

/** Sparring — the always-available instant lane. Resolves on the spot and
 *  drops straight into the Fight Night screen. */
export default function SparCard({ fighter }) {
    const navigate = useNavigate();
    const { gym, reloadGym } = useAuth();
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState(null);
    const left = gym?.sparsLeft ?? 0;

    async function spar() {
        setBusy(true);
        setError(null);
        try {
            const d = await api("/fights/exhibition", { method: "POST", body: { fighterId: fighter.id } });
            reloadGym();
            navigate(`/fights/${d.fight.id}`);
        } catch (err) {
            setError(err.message);
            setBusy(false);
        }
    }

    return (
        <div className="card">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                <div style={{ flex: 1, minWidth: 200 }}>
                    <div className="section-label" style={{ margin: 0 }}>Sparring · always open</div>
                    <div style={{ fontSize: 11, color: "var(--ink-muted)", marginTop: 2 }}>
                        Instant exhibition against a local gym — available even mid-camp. No record stakes, small purse, a little fatigue; sometimes reveals a hidden trait.
                    </div>
                </div>
                <Button variant="secondary" size="sm" disabled={busy || left <= 0 || fighter.retired} onClick={spar}>
                    {busy ? "In the cage…" : left > 0 ? `Spar now (${left} left today)` : "Back tomorrow"}
                </Button>
            </div>
            {error && <div className="form-error" style={{ marginTop: 8, marginBottom: 0 }}>{error}</div>}
        </div>
    );
}
