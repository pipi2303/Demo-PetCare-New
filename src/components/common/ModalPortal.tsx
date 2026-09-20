import React from 'react';
import { createPortal } from 'react-dom';

/**
 * Id of the portal target rendered inside `<main className="content-area">`
 * (see App.tsx). Every modal in the app is meant to be confined visually to
 * the cream-colored main content area — never covering the persistent
 * Sidebar or Header — so its coordinate system must be `.content-area`,
 * not the browser viewport.
 *
 * Most modals in this app already get this for free: `.content-area` is a
 * CSS containing block for any `position: fixed` descendant (see the
 * `.content-area` rule in index.css), so a plain `fixed inset-0 ...` modal
 * rendered anywhere inside a module screen is automatically sized/centered
 * to the content area instead of the viewport, with no code changes needed.
 *
 * That trick only works for modals that are actual DOM descendants of
 * `.content-area`. A few modals are triggered from the persistent Sidebar
 * or Header, which live OUTSIDE `.content-area` in the DOM — for those,
 * this component portals them into `#modal-root` (a container that lives
 * inside `.content-area`) so they follow the exact same containment rule.
 */
export const MODAL_ROOT_ID = 'modal-root';

interface ModalPortalProps {
  children: React.ReactNode;
}

export const ModalPortal: React.FC<ModalPortalProps> = ({ children }) => {
  const root = typeof document !== 'undefined' ? document.getElementById(MODAL_ROOT_ID) : null;

  // Defensive fallback: if #modal-root somehow isn't mounted yet, render the
  // modal in place rather than silently dropping it. In practice #modal-root
  // is a static child of <main> rendered unconditionally on first mount, so
  // this only ever matters if that markup changes in the future.
  if (!root) return <>{children}</>;

  return createPortal(children, root);
};
