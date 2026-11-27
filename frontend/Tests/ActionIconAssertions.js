import { expect } from "@playwright/test";

export async function expectActionIcon(control, iconName) {
  const icon = control.locator("i.bi");
  await expect(icon).toHaveCount(1);
  await expect(icon).toHaveClass(`bi bi-${iconName}`);
  await expect(icon).toHaveAttribute("aria-hidden", "true");
  await expect(icon).toBeVisible();
  const appearance = await icon.evaluate((element) => {
    const label = element.nextElementSibling;
    const iconBounds = element.getBoundingClientRect(), labelBounds = label.getBoundingClientRect();
    return { gap: labelBounds.x - iconBounds.right, iconColor: getComputedStyle(element).color,
      labelColor: getComputedStyle(label).color, glyph: getComputedStyle(element, "::before").content };
  });
  expect(appearance.gap).toBeCloseTo(6, 1);
  expect(appearance.iconColor).toBe(appearance.labelColor);
  expect(appearance.glyph).not.toMatch(/^(none|normal|""|''|)$/);
}
