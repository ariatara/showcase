import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import PropTypes from "prop-types";
import { commerceRequest, paypalRedirect, usd, useCommerceContext } from "../../Utilities/CommerceApi";
import styles from "../../../css/Commerce.module.css";

export function OrderTotals({ amounts }) {
  return <dl className={styles.totals}>
    <dt>Merchandise subtotal</dt><dd>{usd(amounts.subtotal)}</dd>
    <dt>Coupon discount</dt><dd>-{usd(amounts.discount)}</dd>
    <dt>Payment fee</dt><dd>{usd(amounts.fee)}</dd>
    <dt className={styles.total}>Total (USD)</dt><dd className={styles.total}>{usd(amounts.total)}</dd>
  </dl>;
}
OrderTotals.propTypes = { amounts: PropTypes.object.isRequired };
const finalStates = ["paid", "cancelled", "expired", "failed", "refunded", "reversed"];

export default function OrderConfirmation({ id, action }) {
  const context = useCommerceContext(), [order, setOrder] = useState(), [error, setError] = useState(""), [busy, setBusy] = useState(true);
  useEffect(() => {
    const controller = new AbortController();
    const load = async () => {
      setBusy(true); setOrder(undefined); setError("");
      try {
        let current = await commerceRequest(`/account/commerce/orders/${encodeURIComponent(id)}`, { signal: controller.signal });
        if (!finalStates.includes(current.status) && ["return", "cancel"].includes(action)) {
          current = await commerceRequest(`/account/commerce/orders/${encodeURIComponent(id)}/${action === "cancel" ? "cancel" : "capture"}`,
            { method: "POST", csrf: context.csrf, signal: controller.signal });
        }
        if (!controller.signal.aborted) setOrder(current);
      } catch (failure) { if (!controller.signal.aborted) setError(failure.message); }
      finally { if (!controller.signal.aborted) setBusy(false); }
    };
    load();
    return () => controller.abort();
  }, [id, action, context.csrf]);
  const update = async (operation) => {
    setBusy(true); setError("");
    try {
      setOrder(await commerceRequest(`/account/commerce/orders/${encodeURIComponent(id)}${operation ? "/" + operation : ""}`,
        operation ? { method: "POST", csrf: context.csrf } : {}));
    } catch (failure) {
      setError(failure.message);
      if ([401, 403].includes(failure.status)) setOrder(undefined);
    } finally { setBusy(false); }
  };
  const resume = () => {
    try { window.location.assign(paypalRedirect(order.approvalUrl)); } catch (failure) { setError(failure.message); }
  };
  return <section className={styles.panel}>
    <h1>{order?.status === "paid" ? "Payment confirmed" : "Order status"}</h1>
    <p>Order: {id}</p>
    {busy && <p role="status">Checking payment...</p>}
    {error && <p className={styles.error} role="alert">{error}</p>}
    {order && <><p>Status: <strong>{order.status.replaceAll("_", " ")}</strong></p>
      {!finalStates.includes(order.status) && <p>Payment is not yet confirmed. Do not start another payment while this order is being checked.</p>}
      {order.items.map((item, index) => <p key={index}>{item.eventTitle}: {item.name} / {item.memberName} / {item.quantity} at {usd(item.unit_cents)}</p>)}
      <OrderTotals amounts={order.amounts} />
      {order.coupon && <p>Coupon: {order.coupon}</p>}
      {order.status === "awaiting_approval" && order.approvalUrl && <button disabled={busy} onClick={resume}>Continue to PayPal</button>}
      {order.status === "awaiting_approval" && <button disabled={busy} onClick={() => update("cancel")}>Cancel checkout</button>}
    </>}
    <button disabled={busy} onClick={() => update(order && !finalStates.includes(order.status) ? "capture" : "")}>Refresh order status</button>
    <Link to="/shoppingArea">Back to cart</Link>
  </section>;
}
OrderConfirmation.propTypes = { id: PropTypes.string.isRequired, action: PropTypes.string };
