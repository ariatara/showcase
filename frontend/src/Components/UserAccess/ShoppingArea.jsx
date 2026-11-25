import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import PropTypes from "prop-types";
import MemberCommerceRoutes from "../RouteManagement/MemberCommerceRoutes";
import { commerceRequest, usd, useCommerceContext } from "../../Utilities/CommerceApi";
import styles from "../../../css/Commerce.module.css";

function CartLine({ line, busy, change }) {
  const [quantity, setQuantity] = useState(line.quantity);
  useEffect(() => setQuantity(line.quantity), [line.quantity]);
  return <article className={styles.card}>
    <h3>{line.name}</h3><p>For {line.first_name} {line.last_name} / {usd(line.unit_cents)} each</p>
    {line.issue && <p role="alert">{line.issue}</p>}
    {line.changed && <p>Product details have changed. Review the current price and availability.</p>}
    <form className={styles.inline} onSubmit={(event) => { event.preventDefault(); change(line.id, Number(quantity)); }}>
      <label>Quantity for {line.name}<input type="number" min="1" max="99" value={quantity}
        onChange={(event) => setQuantity(event.target.value)} disabled={busy} required /></label>
      <button disabled={busy}>Update</button><button type="button" disabled={busy} onClick={() => change(line.id)}>Remove</button>
    </form>
  </article>;
}
CartLine.propTypes = { line: PropTypes.object.isRequired, busy: PropTypes.bool, change: PropTypes.func.isRequired };

function Cart() {
  const context = useCommerceContext(), [cart, setCart] = useState(), [error, setError] = useState(""), [busy, setBusy] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    commerceRequest("/account/commerce/cart", { signal: controller.signal }).then(setCart)
      .catch((failure) => { if (!controller.signal.aborted) setError(failure.message); });
    return () => controller.abort();
  }, [context.accountId]);
  const reload = async () => {
    try { setCart(await commerceRequest("/account/commerce/cart")); } catch (failure) { setError(failure.message); }
  };
  const change = async (id, quantity) => {
    setBusy(true); setError("");
    try {
      const updated = await commerceRequest(`/account/commerce/cart/items/${id}`, { method: quantity == null ? "DELETE" : "PATCH",
        csrf: context.csrf, body: { version: cart.version, ...(quantity == null ? {} : { quantity }) } });
      setCart(updated); context.setCart(updated);
    } catch (failure) {
      setError(failure.message);
      if (failure.status === 409) await reload();
      if ([401, 403].includes(failure.status)) setCart(undefined);
    } finally { setBusy(false); }
  };
  return <>
    {error && <p role="alert">{error} <button onClick={reload}>Reload cart</button></p>}
    {!cart && !error && <p>Loading cart...</p>}
    {cart && !cart.lines.length && <p>Your cart is empty.</p>}
    {cart && [...new Set(cart.lines.map((line) => line.event_url))].map((url) => <section className={styles.panel} key={url}>
      <h2>{cart.lines.find((line) => line.event_url === url).event_title}</h2>
      <Link to={`/events/${encodeURIComponent(url)}`}>View event</Link>
      {cart.lines.filter((line) => line.event_url === url).map((line) => <CartLine key={line.id} line={line} busy={busy} change={change} />)}
    </section>)}
    {context.pendingOrderId ? <Link to={`/shoppingCheckout?order=${context.pendingOrderId}`}>Open pending order</Link> :
      Boolean(cart?.lines.length) && !cart.lines.some((line) => line.issue) && <Link to="/shoppingCheckout">Review checkout</Link>}
  </>;
}
export default function ShoppingArea() {
  return <main className={styles.page}><h1>Your member cart</h1><MemberCommerceRoutes><Cart /></MemberCommerceRoutes></main>;
}
