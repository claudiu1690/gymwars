export default function Placeholder({ title, note }) {
    return (
        <>
            <h1 className="page-title display">{title}</h1>
            <div className="card">
                <div className="empty-state">
                    <div className="display">Coming soon</div>
                    <p>{note}</p>
                </div>
            </div>
        </>
    );
}
