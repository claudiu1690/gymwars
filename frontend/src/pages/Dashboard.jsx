import { useAuth } from "../auth";

const TIER_NAMES = { 1: "Garage Gym", 2: "Local Gym", 3: "Regional Camp", 4: "Fight Factory" };

export default function Dashboard() {
    const { gym, loading } = useAuth();

    if (loading) return <p style={{ color: "var(--ink-secondary)" }}>Loading your gym…</p>;
    if (!gym) return <p style={{ color: "var(--ink-secondary)" }}>Couldn't load your gym. Try refreshing.</p>;

    return (
        <>
            <h1 className="page-title display">{gym.name}</h1>
            <div className="block-grid">
                <section className="card">
                    <h2 style={{ fontSize: 15, marginBottom: 8 }}>Gym</h2>
                    <div className="stat-row">
                        <span className="stat-label">Facility</span>
                        <span className="stat-value">{TIER_NAMES[gym.facilityTier] || `Tier ${gym.facilityTier}`}</span>
                    </div>
                    <div className="stat-row">
                        <span className="stat-label">Purse</span>
                        <span className="stat-value">${(gym.purse ?? 0).toLocaleString()}</span>
                    </div>
                    <div className="stat-row">
                        <span className="stat-label">Roster slots</span>
                        <span className="stat-value">0 / {gym.rosterSlots}</span>
                    </div>
                </section>
                <section className="card">
                    <div className="empty-state">
                        <div className="display">No fighters yet</div>
                        <p>Scouting opens in Phase 1 — your first prospect is out there.</p>
                    </div>
                </section>
            </div>
        </>
    );
}
