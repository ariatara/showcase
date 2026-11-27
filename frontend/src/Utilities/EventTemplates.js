export const EVENT_TEMPLATES = [
  { id: "signature", name: "Signature", description: "Image-led hero, elegant dark panels and warm accents." },
  { id: "classic", name: "Classic", description: "The familiar orange and charcoal event layout." },
  { id: "festive", name: "Festive", description: "Burgundy, gold and glowing lights for a joyful celebration." },
];
export const DEFAULT_EVENT_TEMPLATE = "signature";
export function resolveEventTemplate(id) {
  return EVENT_TEMPLATES.some((template) => template.id === id) ? id : DEFAULT_EVENT_TEMPLATE;
}
