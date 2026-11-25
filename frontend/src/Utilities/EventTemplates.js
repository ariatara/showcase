export const EVENT_TEMPLATES = [
  { id: "signature", name: "Signature", description: "Image-led hero, elegant dark panels and warm accents." },
  { id: "classic", name: "Classic", description: "The familiar orange and charcoal event layout." },
];
export const DEFAULT_EVENT_TEMPLATE = "signature";
export function resolveEventTemplate(id) {
  return EVENT_TEMPLATES.some((template) => template.id === id) ? id : DEFAULT_EVENT_TEMPLATE;
}
