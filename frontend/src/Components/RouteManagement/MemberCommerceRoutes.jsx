import ActionLabel from "../ActionLabel";
import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import PropTypes from "prop-types";
import { CommerceContext, commerceRequest } from "../../Utilities/CommerceApi";

export default function MemberCommerceRoutes({ children }) {
  const [state, setState] = useState({}), [refresh, setRefresh] = useState(0);
  const location = useLocation();
  useEffect(() => {
    const controller = new AbortController();
    setState({});
    commerceRequest("/account/commerce/context", { signal: controller.signal })
      .then((data) => { if (!controller.signal.aborted) setState({ data }); })
      .catch((error) => { if (!controller.signal.aborted) setState({ error }); });
    return () => controller.abort();
  }, [refresh, location.pathname]);
  useEffect(() => {
    const reload = () => setRefresh((value) => value + 1);
    window.addEventListener("focus", reload);
    return () => window.removeEventListener("focus", reload);
  }, []);
  if (state.error?.status === 401) return <p>Member products are available after you <Link
    to={`/login?returnTo=${encodeURIComponent(location.pathname + location.search)}`}>sign in</Link>.</p>;
  if (state.error?.status === 403) return <p>Membership is required to view products and purchase.</p>;
  if (state.error) return <div role="alert">{state.error.message} <button type="button" onClick={() => setRefresh((value) => value + 1)}><ActionLabel action="refresh">Retry</ActionLabel></button></div>;
  if (!state.data) return <p role="status">Checking member access...</p>;
  const setCart = (cart) => setState((current) => ({ data: { ...current.data, cartVersion: cart.version,
    cartCount: cart.lines.reduce((count, line) => count + line.quantity, 0) } }));
  return <CommerceContext.Provider value={{ ...state.data, setCart }}>{children}</CommerceContext.Provider>;
}
MemberCommerceRoutes.propTypes = { children: PropTypes.node.isRequired };
