import { Link } from "react-router-dom";
import "../pages/public-info.css";

export default function SiteLinks({ newTab = false }) {
  const target = newTab ? { target: "_blank", rel: "noreferrer" } : {};
  return (
    <nav className="public-site-links" aria-label="Game information">
      <Link to="/support" {...target}>
        Support
      </Link>
      <Link to="/privacy" {...target}>
        Privacy
      </Link>
      <Link to="/terms" {...target}>
        Terms
      </Link>
      <span>By Digital Olive</span>
    </nav>
  );
}
