import { Buffer } from "node:buffer";
import { deflateSync } from "node:zlib";

export function imageBytes(width = 800, height = 600, color = [34, 125, 160]) {
  function chunk(type, data) {
    const content = Buffer.concat([Buffer.from(type), data]);
    let crc = 0xffffffff;
    for (const byte of content) {
      crc ^= byte;
      for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0);
    }
    const size = Buffer.alloc(4);
    size.writeUInt32BE(data.length);
    const checksum = Buffer.alloc(4);
    checksum.writeUInt32BE((crc ^ 0xffffffff) >>> 0);
    return Buffer.concat([size, content, checksum]);
  }
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width);
  header.writeUInt32BE(height, 4);
  header[8] = 8;
  header[9] = 2;
  const pixels = Buffer.alloc(height * (width * 3 + 1));
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const offset = y * (width * 3 + 1) + 1 + x * 3;
      color.forEach((value, index) => { pixels[offset + index] = (value + Math.floor(x / width * 35)) % 256; });
    }
  }
  return Buffer.concat([Buffer.from("89504e470d0a1a0a", "hex"), chunk("IHDR", header),
    chunk("IDAT", deflateSync(pixels)), chunk("IEND", Buffer.alloc(0))]);
}

export function selectedImage(name = "selected.png") {
  return { name, mimeType: "image/png", buffer: imageBytes(40, 30) };
}

export async function galleryFixture(page, { upper = 3, lower = 3 } = {}) {
  await page.route(/^https:\/\/(?:fonts\.(?:googleapis|gstatic)\.com|use\.fontawesome\.com)\//,
    (route) => route.abort());
  const paths = (hub, count) => Array.from({ length: count }, (_, index) => `${hub}_${index + 1}.png`);
  const state = {
    row: {
      id: 7, page_title: "Gallery Event", url: "gallery_event", event_title: "Gallery Event",
      start_date: "2026-04-01", start_time: "10:00:00", end_date: "2026-04-02", end_time: "17:00:00",
      venue_address: "Event Hall", map_link: "#", banner_background_image_name: "banner.png",
      upper_hub_background_image_name: "", lower_hub_background_image_name: "",
      upper_hub_content: "Upper hub text", lower_hub_content: "Lower hub text",
      upper_hub_event_image_names: paths("upper", upper).join(",") || null,
      lower_hub_event_image_names: paths("lower", lower).join(",") || null,
      published: 1,
    },
    writes: [], uploadAttempts: [], uploadNames: [], failUploads: new Set(), failSave: false, uploadGate: null,
  };
  await page.addInitScript(() => {
    sessionStorage.setItem("loginSession", JSON.stringify({
      expiry: Math.floor(Date.now() / 1000) + 3600, roles: ["Administrator"],
    }));
  });
  const images = {
    default: imageBytes(), lower: imageBytes(800, 600, [173, 75, 40]),
    portrait: imageBytes(240, 480), small: imageBytes(8, 8),
  };
  await page.route("http://localhost:3000/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    const method = route.request().method();
    if (method === "OPTIONS") return route.fulfill({
      status: 204, headers: { "Access-Control-Allow-Origin": "http://127.0.0.1:5174",
        "Access-Control-Allow-Credentials": "true", "Access-Control-Allow-Headers": "content-type",
        "Access-Control-Allow-Methods": "GET,POST,PUT,OPTIONS" },
    });
    if (path.startsWith("/Uploads/")) {
      if (path === "/Uploads/" || path.includes("broken")) return route.fulfill({ status: 404, body: "Image not found" });
      const kind = ["portrait", "small", "lower"].find((key) => path.includes(key)) || "default";
      return route.fulfill({ contentType: "image/png", body: images[kind] });
    }
    if (path.startsWith("/auth/upload/")) {
      const field = path.split("/").at(-1);
      state.uploadAttempts.push(field);
      state.uploadNames.push(/filename="([^"]+)"/.exec(route.request().postDataBuffer().toString())[1]);
      const attempt = state.uploadAttempts.length;
      if (state.uploadGate) await state.uploadGate;
      if (state.failUploads.has(attempt)) {
        return route.fulfill({ status: 503, json: { Status: false, Error: "Upload temporarily unavailable." } });
      }
      return route.fulfill({ json: `${field}_${attempt}.png` });
    }
    if (/^\/auth\/events(?:\/\d+)?$/.test(path) && ["POST", "PUT"].includes(method)) {
      const payload = route.request().postDataJSON();
      state.writes.push({ method, payload });
      if (state.failSave) return route.fulfill({ status: 500, json: { Status: false, Error: "Event save unavailable." } });
      const columns = {
        pageTitle: "page_title", eventTitle: "event_title", eventURL: "url",
        upperHubEventImages: "upper_hub_event_image_names", lowerHubEventImages: "lower_hub_event_image_names",
        upperHubBackground: "upper_hub_background_image_name", lowerHubBackground: "lower_hub_background_image_name",
        upperHubContent: "upper_hub_content", lowerHubContent: "lower_hub_content",
      };
      for (const [field, column] of Object.entries(columns)) {
        if (Object.hasOwn(payload, field)) state.row[column] = payload[field];
      }
      state.row.published = Number(payload.isPublished);
      return route.fulfill({ json: { Status: true, Result: { id: 7, url: state.row.url } } });
    }
    if (path.startsWith("/user/events/") && !state.row.published) {
      return route.fulfill({ status: 404, json: { Status: false, Error: "Event not found." } });
    }
    if (path.startsWith("/user/events/") || path.startsWith("/auth/events/url/")) {
      return route.fulfill({ json: { Status: true, Result: [state.row] } });
    }
    if (path === "/auth/events") return route.fulfill({ json: { Status: true, Result: [state.row] } });
    if (["/auth/productTypes", "/auth/membershipCategories"].includes(path) || path.startsWith("/auth/memberProducts")) {
      return route.fulfill({ json: { Status: true, Result: [] } });
    }
    throw new Error(`Unexpected gallery fixture API request: ${method} ${path}`);
  });
  return state;
}
