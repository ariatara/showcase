import { useEffect, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import MemberCommerceRoutes from "../RouteManagement/MemberCommerceRoutes";
import { commerceRequest, paypalRedirect, useCommerceContext } from "../../Utilities/CommerceApi";
import OrderConfirmation, { OrderTotals } from "./OrderConfirmation";
import styles from "../../../css/Commerce.module.css";

function Checkout() {
  const context = useCommerceContext(), navigate = useNavigate();
  const [coupon, setCoupon] = useState(""), [quote, setQuote] = useState(), [busy, setBusy] = useState(false), [error, setError] = useState("");
  useEffect(() => {
    if (context.pendingOrderId) return;
    const controller = new AbortController();
    commerceRequest("/account/commerce/checkout/quote", { method: "POST", csrf: context.csrf, body: { coupon: "" }, signal: controller.signal })
      .then(setQuote).catch((failure) => { if (!controller.signal.aborted) setError(failure.message); });
    return () => controller.abort();
  }, [context.csrf, context.pendingOrderId]);
  const review = async (event) => {
    event.preventDefault(); setBusy(true); setQuote(undefined); setError("");
    try { setQuote(await commerceRequest("/account/commerce/checkout/quote", { method: "POST", csrf: context.csrf, body: { coupon } })); }
    catch (failure) { setError(failure.message); } finally { setBusy(false); }
  };
  const pay = async () => {
    setBusy(true); setError("");
    try {
      const keyName = `checkout:${context.accountId}:${quote.hash}`;
      const key = sessionStorage.getItem(keyName) || crypto.randomUUID();
      sessionStorage.setItem(keyName, key);
      const order = await commerceRequest("/account/commerce/checkout", { method: "POST", csrf: context.csrf,
        body: { hash: quote.hash, coupon: quote.coupon?.code || "", key } });
      if (order.status === "awaiting_approval") window.location.assign(paypalRedirect(order.approvalUrl));
      else navigate(`/shoppingCheckout?order=${encodeURIComponent(order.id)}`);
    } catch (failure) {
      setError(failure.message);
      if (failure.orderId) navigate(`/shoppingCheckout?order=${encodeURIComponent(failure.orderId)}`);
      if (failure.status === 409) setQuote(undefined);
      setBusy(false);
    }
  };
  if (context.pendingOrderId) return <p>An earlier checkout is unresolved. <Link
    to={`/shoppingCheckout?order=${context.pendingOrderId}`}>Open pending order</Link>.</p>;
  return <section className={styles.panel}><h1>Review checkout</h1>
    <p>Review your members, products and final USD total before continuing to PayPal.</p>
    {error && <p role="alert" className={styles.error}>{error}</p>}
    <form onSubmit={review}><label>Coupon code<input value={coupon} maxLength={32} onChange={(event) => {
      setCoupon(event.target.value.toUpperCase()); setQuote(undefined);
    }} disabled={busy} /></label><button disabled={busy}>Review total</button></form>
    {quote && <>{quote.cart.lines.map((line) => <p key={line.id}>{line.event_title}: {line.name} / {line.first_name} {line.last_name} / Quantity {line.quantity}</p>)}
      <OrderTotals amounts={quote.amounts} />
      {quote.coupon && <p>Applied coupon: {quote.coupon.code}</p>}
      <button onClick={pay} disabled={busy || !context.paymentsEnabled}>{busy ? "Preparing payment..." : "Pay with PayPal"}</button></>}
    {!context.paymentsEnabled && <p>Purchasing is not enabled. No payment can be created.</p>}
    <p><Link to="/shoppingArea">Back to cart</Link></p>
  </section>;
}
export default function ShoppingCheckout() {
  const [query] = useSearchParams(), params = useParams(), id = params.id || query.get("order");
  return <main className={styles.page}><MemberCommerceRoutes>{id ?
    <OrderConfirmation id={id} action={query.get("action") || ""} /> : <Checkout />}</MemberCommerceRoutes></main>;
}
