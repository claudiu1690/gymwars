import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api";
import { requestId } from "../careerRequest.mjs";
import { GameDialog } from "./GameUI";
import "./club-shop.css";
import "./achievements.css";
import "./supply-packs.css";
const price = (minor) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
    minor / 100,
  );
export function SupplyIcon({ resource }) {
  return (
    <svg
      viewBox="0 0 100 100"
      className="supply-icon"
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeWidth="5"
      strokeLinejoin="round"
    >
      {resource === "careerWeeks" ? (
        <>
          <path d="M20 25h60v57H20zM20 40h60M34 17v17M66 17v17" />
          <path d="M34 53h8M54 53h8M34 68h8M54 68h8" />
        </>
      ) : (
        <>
          <path d="m50 12 33 18v40L50 88 17 70V30z" />
          <path d="M32 57V41c0-7 9-7 9 0v8-14c0-7 9-7 9 0v14-11c0-7 9-7 9 0v11-6c0-7 9-7 9 0v15L58 70H40z" />
        </>
      )}
    </svg>
  );
}
const grantsOf = (item) =>
  item.grants ||
  (item.resource ? [{ resource: item.resource, quantity: item.quantity }] : []);
const suppliesText = (item) =>
  grantsOf(item)
    .map(
      (g) =>
        g.quantity +
        (g.resource === "careerWeeks"
          ? " extra career weeks"
          : " Gym Wars tokens"),
    )
    .join(" + ");
function PackArt({ product, className = "" }) {
  return (
    <img
      className={"pack-illustration " + className}
      src={"/art/shop/" + product.art + ".webp"}
      alt=""
      width="1024"
      height="768"
    />
  );
}
function PackGrants({ item }) {
  return (
    <div className="pack-grants">
      {grantsOf(item).map((g) => (
        <span key={g.resource}>
          <SupplyIcon resource={g.resource} />
          <b>{g.quantity}</b>
          {g.resource === "careerWeeks" ? "career weeks" : "4v4 tokens"}
        </span>
      ))}
    </div>
  );
}
export default function CareerShop({ gymId, onChange }) {
  const [data, setData] = useState(null),
    [error, setError] = useState(""),
    [productId, setProductId] = useState(null),
    [receipt, setReceipt] = useState(null),
    [working, setWorking] = useState(false),
    [notice, setNotice] = useState("");
  const lock = useRef(false),
    pending = useRef(null),
    mounted = useRef(true),
    change = useRef(onChange);
  change.current = onChange;
  const key = "gw-shop-checkout-" + gymId;
  const accept = useCallback(
    (value) => {
      if (!mounted.current) return;
      setData(value);
      if (pending.current) {
        const found = value.orders.find(
          (o) => o.requestId === pending.current.requestId,
        );
        if (found) {
          setReceipt(found);
          pending.current = null;
          sessionStorage.removeItem(key);
          setError("");
          setNotice("Your supplies were saved. No money was charged.");
          change.current?.();
        } else if (
          !value.products.some((p) => p.id === pending.current.productId) ||
          pending.current.catalogVersion !== value.catalogVersion
        ) {
          pending.current = null;
          sessionStorage.removeItem(key);
          setProductId(null);
          setNotice(
            "The packs have changed. Review the current contents and price before checking out.",
          );
        }
      }
    },
    [key],
  );
  const load = useCallback(async () => {
    try {
      accept(await api("/career/shop"));
    } catch (e) {
      if (mounted.current) setError(e.message);
    }
  }, [accept]);
  useEffect(() => {
    mounted.current = true;
    try {
      const old = JSON.parse(sessionStorage.getItem(key) || "null");
      if (old?.requestId && old?.productId) {
        pending.current = old;
        setProductId(old.productId);
      }
    } catch {}
    load();
    return () => {
      mounted.current = false;
    };
  }, [key, load]);
  const product = data?.products.find((p) => p.id === productId);
  async function purchase() {
    if (
      lock.current ||
      !product ||
      data.mode !== "preview" ||
      (!product.canBuy && !pending.current)
    )
      return;
    lock.current = true;
    setWorking(true);
    setError("");
    const request = pending.current || {
      requestId: requestId(),
      productId: product.id,
      catalogVersion: data.catalogVersion,
    };
    pending.current = request;
    sessionStorage.setItem(key, JSON.stringify(request));
    try {
      const value = await api("/career/shop/preview-purchases", {
        method: "POST",
        body: request,
      });
      accept(value);
      pending.current = null;
      sessionStorage.removeItem(key);
      if (mounted.current) {
        setReceipt(value.receipt);
        setNotice("Supplies added. Nothing advances until you choose to play.");
      }
    } catch (e) {
      if (e.status >= 400 && e.status < 500) {
        pending.current = null;
        sessionStorage.removeItem(key);
      }
      if (mounted.current) setError(e.message);
    } finally {
      lock.current = false;
      if (mounted.current) setWorking(false);
    }
  }
  function open(id) {
    if (working) return;
    if (pending.current && pending.current.productId !== id) {
      setProductId(pending.current.productId);
      setError("Recover your pending checkout before starting another.");
      return;
    }
    setReceipt(null);
    setError("");
    setProductId(id);
  }
  return (
    <div className="club-shop supply-shop pack-shop">
      <section className="shop-hero pack-shop-hero">
        <div>
          <span className="shop-kicker">THE CORNER STORE</span>
          <h2>
            Gear up.
            <br />
            Go another round.
          </h2>
          <p>
            More time in the gym. More nights in the arena. Pick your pack and
            keep your corner moving.
          </p>
          <Link to="/career/achievements" className="shop-fair-play">
            Cosmetics are earned in Achievements
          </Link>
        </div>
        <img
          className="pack-hero-art"
          src="/art/shop/club-pack.webp"
          alt="Cartoon gym kit with boxing gloves, hand wraps and arena tokens"
          width="1024"
          height="768"
        />
      </section>
      <div className="shop-payment-mode" role="note">
        <strong>
          {data?.mode === "preview"
            ? "TEST SHOP · NO MONEY CHARGED"
            : "PAYMENTS NOT AVAILABLE YET"}
        </strong>
        <p>
          {data?.mode === "preview"
            ? "Sample USD prices. Test checkout adds preview supplies and charges $0.00. Stripe is disconnected."
            : "Real-money checkout is disconnected. Browse the supply packs without being charged."}
        </p>
      </div>
      {data?.allowances && (
        <div className="supply-balances">
          <div>
            <b>{data.allowances.careerWeeks.available}</b>
            <span>Career weeks ready</span>
            <small>
              {data.allowances.careerWeeks.freeAvailable} free ·{" "}
              {data.allowances.careerWeeks.extraAvailable} extra saved
            </small>
          </div>
          <div>
            <b>{data.allowances.leagueCards.available}</b>
            <span>Gym Wars tokens ready</span>
            <small>
              {data.allowances.leagueCards.freeAvailable} free ·{" "}
              {data.allowances.leagueCards.extraAvailable} extra saved
            </small>
          </div>
        </div>
      )}
      {notice && (
        <p className="shop-notice" role="status">
          {notice}
        </p>
      )}
      {error && !product && (
        <p className="career-error" role="alert">
          {error}
        </p>
      )}
      {!data ? (
        <p role="status">Opening the supply shop…</p>
      ) : (
        <section
          aria-label="Supply packs"
          className="shop-product-grid supply-products"
        >
          {data.products.map((p) => (
            <article
              key={p.id}
              className={"shop-product pack-card pack-" + p.art}
            >
              <button
                type="button"
                className="shop-product-art pack-product-art"
                aria-label={"View " + p.name}
                onClick={() => open(p.id)}
              >
                <PackArt product={p} />
                <span>{p.tag}</span>
                {p.id === "club-pack" && (
                  <b className="pack-saving">SAVE $0.99</b>
                )}
              </button>
              <div className="shop-product-copy">
                <h3>{p.name}</h3>
                <span className="pack-subtitle">{p.subtitle}</span>
                <PackGrants item={p} />
                <p>{p.description}</p>
                <small>
                  {p.id === "club-pack"
                    ? "Uses both daily purchase limits"
                    : "Shares its daily limit with the Club Pack"}{" "}
                  · no expiry
                </small>
                <div>
                  <strong>{price(p.priceMinor)}</strong>
                  <button
                    type="button"
                    className="career-action"
                    onClick={() => open(p.id)}
                  >
                    {p.storageFull
                      ? "Extra bank full"
                      : p.remaining
                        ? "View pack"
                        : "Daily limit used"}
                  </button>
                </div>
              </div>
            </article>
          ))}
        </section>
      )}
      <p className="shop-footer-note">
        Extra weeks accelerate development; extra tokens add ranked attempts.
        Power bands, opponent rules and season scoring still apply. Buy up to 4
        extra weeks and 2 extra tokens per 24-hour supply interval, across all
        packs. Free refills continue normally. Save up to 8 extra weeks and 4
        extra tokens.
      </p>
      <section className="shop-purchases">
        <header>
          <h3>Your supply receipts</h3>
          <button
            type="button"
            className="shop-text-button"
            disabled={working}
            onClick={load}
          >
            Refresh purchases
          </button>
        </header>
        {data?.orders.length ? (
          <ul>
            {data.orders.map((o) => (
              <li key={o.orderId}>
                <div>
                  <strong>
                    {o.productName} · {suppliesText(o)}
                  </strong>
                  <span>
                    Test purchase ·{" "}
                    {new Date(o.createdAt).toLocaleDateString("en-GB")}
                  </span>
                  <small>Receipt {o.orderId}</small>
                </div>
                <strong>{price(o.chargedMinor)} charged</strong>
              </li>
            ))}
          </ul>
        ) : (
          <p>
            No supply purchases yet. Existing club looks live in Achievements.
          </p>
        )}
      </section>
      <GameDialog
        open={!!product}
        title={receipt ? "Supplies added" : "Review supply pack"}
        onClose={() => {
          if (!working) setProductId(null);
        }}
      >
        {product && (
          <div className="shop-checkout">
            <PackArt product={product} className="pack-checkout-art" />
            <h3>{receipt?.productName || product.name}</h3>
            <PackGrants item={receipt || product} />
            <p>
              {receipt
                ? "Your accepted order is saved. These supplies are ready whenever you choose to play."
                : product.description}
            </p>
            {!receipt && (
              <ul className="shop-contents">
                {product.contents.map((c) => (
                  <li key={c}>{c}</li>
                ))}
              </ul>
            )}
            <div className="shop-checkout-total">
              <span>Supply pack · USD display price</span>
              <strong>
                {price(receipt?.priceMinor ?? product.priceMinor)}
              </strong>
            </div>
            <div className="shop-checkout-mode">
              <strong>
                {data.mode === "preview"
                  ? "Test checkout"
                  : "Checkout disconnected"}
              </strong>
              <p>
                {data.mode === "preview"
                  ? "$0.00 charged. Supplies are added to a separate preview balance. Buying does not advance a week or start a fight."
                  : "No payment provider is connected. No purchase or charge can be made."}
              </p>
            </div>
            {receipt ? (
              <>
                <p className="shop-notice" role="status">
                  {suppliesText(receipt)} saved · {receipt.orderId}. No money
                  charged.
                </p>
                <Link
                  className="career-action"
                  to={
                    grantsOf(receipt).some((g) => g.resource === "careerWeeks")
                      ? "/career/gym"
                      : "/career/gym-wars"
                  }
                >
                  {grantsOf(receipt).some((g) => g.resource === "careerWeeks")
                    ? "Plan your next week"
                    : "Go to Gym Wars"}
                </Link>
              </>
            ) : (
              <>
                {error && (
                  <p className="career-error" role="alert">
                    {error}
                  </p>
                )}
                {product.storageFull ? (
                  <p role="status">
                    Your extra supply bank is full. Use some saved supplies
                    before buying another pack.
                  </p>
                ) : (
                  !product.remaining && (
                    <p role="status">
                      This pack shares a daily supply limit you have already
                      used. Available again{" "}
                      {new Date(data.resetAt).toLocaleString("en-GB")}. Free
                      refills continue.
                    </p>
                  )
                )}
                <button
                  type="button"
                  className="career-action"
                  disabled={
                    working ||
                    data.mode !== "preview" ||
                    (!product.canBuy && !pending.current)
                  }
                  onClick={purchase}
                >
                  {working
                    ? "Saving supplies…"
                    : pending.current
                      ? "Retry test checkout"
                      : data.mode !== "preview"
                        ? "Payments coming later"
                        : product.canBuy
                          ? "Complete test purchase · $0.00"
                          : product.storageFull
                            ? "Extra bank full"
                            : "Interval limit reached"}
                </button>
              </>
            )}
            <button
              type="button"
              className="shop-text-button"
              disabled={working}
              onClick={() => setProductId(null)}
            >
              Keep browsing
            </button>
          </div>
        )}
      </GameDialog>
    </div>
  );
}
