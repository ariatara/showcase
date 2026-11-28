import ActionLabel from "../ActionLabel";
import { useEffect, useState } from "react";
import { commerceRequest } from "../../Utilities/CommerceApi";
import styles from "../../../css/Commerce.module.css";

const emptyCoupon = { code: "", kind: "percent", amount: 1000, active: true, starts_at: "", ends_at: "", max_uses: "", per_account: "" };
export default function CommerceSettings() {
  const [settings, setSettings] = useState(), [csrf, setCsrf] = useState(""), [coupons, setCoupons] = useState([]);
  const [next, setNext] = useState(), [coupon, setCoupon] = useState(emptyCoupon), [error, setError] = useState(""), [message, setMessage] = useState(""), [busy, setBusy] = useState(false);
  const load = async () => {
    setError("");
    try {
      const [fee, list] = await Promise.all([commerceRequest("/auth/commerce/settings"), commerceRequest("/auth/commerce/coupons")]);
      setSettings({ ...fee, fee_enabled: Boolean(fee.fee_enabled) }); setCsrf(fee.csrf); setCoupons(list.coupons); setNext(list.next);
    } catch (failure) { setError(failure.message); }
  };
  useEffect(() => { load(); }, []);
  const saveFee = async (event) => {
    event.preventDefault(); setBusy(true); setError(""); setMessage("");
    try {
      setSettings(await commerceRequest("/auth/commerce/settings", { method: "PUT", csrf, body: {
        version: settings.version, fee_enabled: Boolean(settings.fee_enabled), fee_basis_points: Number(settings.fee_basis_points),
        fee_fixed_cents: Number(settings.fee_fixed_cents),
      } }));
      setMessage("Payment fee saved.");
    } catch (failure) { setError(failure.message); } finally { setBusy(false); }
  };
  const saveCoupon = async (event) => {
    event.preventDefault(); setBusy(true); setError(""); setMessage("");
    const timestamp = (value) => value ? new Date(value).toISOString() : null;
    try {
      const saved = await commerceRequest(`/auth/commerce/coupons${coupon.id ? "/" + coupon.id : ""}`, {
        method: coupon.id ? "PUT" : "POST", csrf, body: { ...coupon, amount: Number(coupon.amount), active: Boolean(coupon.active),
          starts_at: timestamp(coupon.starts_at), ends_at: timestamp(coupon.ends_at),
          max_uses: coupon.max_uses === "" ? null : Number(coupon.max_uses),
          per_account: coupon.per_account === "" ? null : Number(coupon.per_account),
        },
      });
      setCoupons((current) => [...current.filter((item) => item.id !== saved.id), saved].sort((a, b) => a.id - b.id));
      setCoupon(emptyCoupon); setMessage("Coupon saved.");
    } catch (failure) { setError(failure.message); } finally { setBusy(false); }
  };
  const edit = (item) => {
    const localDate = (value) => {
      if (!value) return "";
      const date = new Date(value);
      return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
    };
    setCoupon({ ...item, active: Boolean(item.active), starts_at: localDate(item.starts_at), ends_at: localDate(item.ends_at),
      max_uses: item.max_uses ?? "", per_account: item.per_account ?? "" });
  };
  const more = async () => {
    try {
      const result = await commerceRequest(`/auth/commerce/coupons?after=${next}`);
      setCoupons((current) => [...new Map([...current, ...result.coupons].map((item) => [item.id, item])).values()]);
      setNext(result.next);
    } catch (failure) { setError(failure.message); }
  };
  return <div className={styles.panel}><h1>Commerce settings</h1>
    {error && <p role="alert">{error} <button onClick={load} disabled={busy}><ActionLabel action="refresh">Reload settings</ActionLabel></button></p>}
    {message && <p role="status">{message}</p>}
    {!settings && !error && <p>Loading settings...</p>}
    {settings && <form onSubmit={saveFee}><fieldset disabled={busy}><legend>Payment fee</legend>
      <p>The buyer sees this charge separately. It is not a statement of PayPal&apos;s processing cost. 100 basis points = 1%; 100 cents = $1.</p>
      <label><input type="checkbox" checked={Boolean(settings.fee_enabled)} onChange={(event) => setSettings({ ...settings, fee_enabled: event.target.checked })} /> Enable payment fee</label>
      <label>Percentage (basis points)<input type="number" min="0" max="10000" step="1" required value={settings.fee_basis_points}
        onChange={(event) => setSettings({ ...settings, fee_basis_points: event.target.value })} /></label>
      <label>Fixed fee (USD cents)<input type="number" min="0" max="100000000" step="1" required value={settings.fee_fixed_cents}
        onChange={(event) => setSettings({ ...settings, fee_fixed_cents: event.target.value })} /></label><button><ActionLabel action="save">Save payment fee</ActionLabel></button>
    </fieldset></form>}
    <form onSubmit={saveCoupon}><fieldset disabled={busy || !settings}><legend>{coupon.id ? "Edit coupon" : "New coupon"}</legend>
      <label>Code<input maxLength={32} pattern="[A-Za-z0-9_-]+" required value={coupon.code} onChange={(event) => setCoupon({ ...coupon, code: event.target.value.toUpperCase() })} /></label>
      <label>Discount type<select value={coupon.kind} onChange={(event) => setCoupon({ ...coupon, kind: event.target.value })}>
        <option value="percent">Percentage (basis points)</option><option value="fixed">Fixed USD (cents)</option></select></label>
      <label>Discount amount<input type="number" min="1" max={coupon.kind === "percent" ? 10000 : 100000000} required value={coupon.amount}
        onChange={(event) => setCoupon({ ...coupon, amount: event.target.value })} /></label>
      <label><input type="checkbox" checked={coupon.active} onChange={(event) => setCoupon({ ...coupon, active: event.target.checked })} /> Active coupon</label>
      <label>Starts (local time)<input type="datetime-local" value={coupon.starts_at} onChange={(event) => setCoupon({ ...coupon, starts_at: event.target.value })} /></label>
      <label>Expires (local time)<input type="datetime-local" value={coupon.ends_at} onChange={(event) => setCoupon({ ...coupon, ends_at: event.target.value })} /></label>
      <label>Global usage limit (blank for unlimited)<input type="number" min="1" value={coupon.max_uses} onChange={(event) => setCoupon({ ...coupon, max_uses: event.target.value })} /></label>
      <label>Per-account limit (blank for unlimited)<input type="number" min="1" value={coupon.per_account} onChange={(event) => setCoupon({ ...coupon, per_account: event.target.value })} /></label>
      <button><ActionLabel action="save">Save coupon</ActionLabel></button>{coupon.id && <button type="button" onClick={() => setCoupon(emptyCoupon)}><ActionLabel action="add">New coupon</ActionLabel></button>}
    </fieldset></form>
    <h2>Coupons</h2>{coupons.map((item) => <p key={item.id}><strong>{item.code}</strong> / {item.kind} / {item.amount} {item.kind === "percent" ? "basis points" : "cents"} / {item.active ? "Active" : "Inactive"} <button className="btn btn-success" onClick={() => edit(item)} disabled={busy}><ActionLabel action="edit">Edit {item.code}</ActionLabel></button></p>)}
    {next && <button onClick={more}><ActionLabel action="next">More coupons</ActionLabel></button>}
  </div>;
}
