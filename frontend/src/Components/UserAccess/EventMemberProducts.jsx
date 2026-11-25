import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import PropTypes from "prop-types";
import MemberCommerceRoutes from "../RouteManagement/MemberCommerceRoutes";
import { commerceRequest, usd, useCommerceContext } from "../../Utilities/CommerceApi";
import { eventImageUrl } from "../../Utilities/EventImages";
import { eventDate } from "../../Utilities/EventViewFormatting";
import styles from "../../../css/Commerce.module.css";

function Product({ product }) {
  const context = useCommerceContext();
  const members = context.members.filter((member) => member.membership_category === product.target);
  const [memberId, setMemberId] = useState(""), [quantity, setQuantity] = useState(1);
  const [busy, setBusy] = useState(false), [message, setMessage] = useState(""), [imageError, setImageError] = useState(false);
  const add = async (event) => {
    event.preventDefault(); setBusy(true); setMessage("");
    try {
      const cart = await commerceRequest("/account/commerce/cart/items", { method: "POST", csrf: context.csrf,
        body: { productId: product.id, memberId: Number(memberId), quantity: Number(quantity), version: context.cartVersion } });
      context.setCart(cart); setMessage("Added to cart.");
    } catch (error) { setMessage(error.message); }
    finally { setBusy(false); }
  };
  return <article className={styles.card}>
    {product.image_name && (imageError ? <p>Product image unavailable.</p> :
      <img src={eventImageUrl(product.image_name)} alt={product.name} loading="lazy" onError={() => setImageError(true)} />)}
    <h3>{product.name}</h3><p>{product.type} / {product.target}<br />{eventDate(product.event_date)}</p>
    <p><strong>{usd(product.unit_cents)}</strong> USD</p>
    {!product.available ? <p>Sold out</p> : <p>{product.available} available</p>}
    {!members.length ? <p>No registered member on your account matches this product.</p> :
      <form onSubmit={add}><label>Member for {product.name}<select value={memberId} onChange={(event) => setMemberId(event.target.value)} required disabled={busy}>
        <option value="">Select a member</option>{members.map((member) => <option key={member.id} value={member.id}>{member.first_name} {member.last_name}</option>)}
      </select></label>
      <label>Quantity for {product.name}<input type="number" min="1" max={Math.min(99, product.available)} value={quantity}
        onChange={(event) => setQuantity(event.target.value)} required disabled={busy || !product.available} /></label>
      <button disabled={busy || !product.available || !memberId}>{busy ? "Adding..." : "Add to cart"}</button></form>}
    {message && <p role="status">{message}</p>}
  </article>;
}
Product.propTypes = { product: PropTypes.object.isRequired };

function Catalog({ eventURL }) {
  const context = useCommerceContext(), [state, setState] = useState({}), [refresh, setRefresh] = useState(0);
  const requestRef = useRef();
  const [loadingMore, setLoadingMore] = useState(false);
  useEffect(() => {
    const controller = new AbortController(); setState({});
    requestRef.current = controller; setLoadingMore(false);
    commerceRequest(`/account/commerce/events/${encodeURIComponent(eventURL)}/products`, { signal: controller.signal })
      .then((data) => { if (!controller.signal.aborted) setState({ data }); })
      .catch((error) => { if (!controller.signal.aborted) setState({ error }); });
    return () => controller.abort();
  }, [eventURL, context.accountId, refresh]);
  const more = async () => {
    const controller = requestRef.current;
    setLoadingMore(true);
    try {
      const data = await commerceRequest(`/account/commerce/events/${encodeURIComponent(eventURL)}/products?after=${state.data.next}`, { signal: controller.signal });
      if (!controller.signal.aborted) setState((current) => ({ data: { ...data, products: [...current.data.products, ...data.products] } }));
    } catch (error) { if (!controller.signal.aborted) setState((current) => ({ ...current, error })); }
    finally { if (!controller.signal.aborted) setLoadingMore(false); }
  };
  return <><Link to="/shoppingArea">View cart ({context.cartCount})</Link>
    {state.error && <p role="alert">{state.error.message} <button onClick={() => setRefresh((value) => value + 1)}>Retry</button></p>}
    {!state.data && !state.error && <p>Loading member products...</p>}
    {state.data && (state.data.products.length ? <div className={styles.grid}>{state.data.products.map((product) =>
      <Product key={`${context.accountId}-${product.id}`} product={product} />)}</div> : <p>No member products are available for this event.</p>)}
    {state.data?.next && <button onClick={more} disabled={loadingMore}>More products</button>}
  </>;
}
Catalog.propTypes = { eventURL: PropTypes.string.isRequired };

export default function EventMemberProducts({ eventURL }) {
  return <section className={styles.panel} aria-label="Member Products"><h2>Member Products</h2>
    <MemberCommerceRoutes key={eventURL}><Catalog eventURL={eventURL} /></MemberCommerceRoutes></section>;
}
EventMemberProducts.propTypes = { eventURL: PropTypes.string.isRequired };
