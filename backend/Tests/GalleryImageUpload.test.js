import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import FileSystem from "node:fs";
import Express from "express";
import CookieParser from "cookie-parser";
import JWT from "jsonwebtoken";
import { SECRETS } from "../Configurations/Secrets.js";
import { ROLES } from "../Configurations/Roles.js";
import AuthenticateToken from "../Middlewares/TokenValidation.js";
import AuthorizeRoles from "../Middlewares/RoleAuthorization.js";
import { createGalleryImageUploadHandler } from "../Controllers/GalleryImageUpload.js";
import FileUpload from "../Utilities/FileUpload.js";

const png = Buffer.from("89504e470d0a1a0a0000000d49484452", "hex");
const maxBytes = 10 * 1024 * 1024;

async function setup(t, missingDirectory = false) {
  const directory = await mkdtemp(join(tmpdir(), "showcase-gallery-"));
  const app = Express();
  app.use(CookieParser());
  app.post("/upload/:fieldName", AuthenticateToken, AuthorizeRoles(ROLES.ADMINISTRATOR),
    createGalleryImageUploadHandler(missingDirectory ? join(directory, "missing") : directory));
  app.use("/Uploads", Express.static(directory));
  const server = await new Promise((resolve) => {
    const listening = app.listen(0, "127.0.0.1", () => resolve(listening));
  });
  t.after(async () => {
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    await rm(directory, { recursive: true, force: true });
  });
  const url = `http://127.0.0.1:${server.address().port}`;
  async function upload({ bytes = png, name = "a,b.png", type = "image/png", field = "upperHubEventImages",
    formField = field, role = ROLES.ADMINISTRATOR, includeFile = true, twice = false } = {}) {
    const form = new FormData();
    if (includeFile) form.append(formField, new Blob([bytes], { type }), name);
    if (twice) form.append(formField, new Blob([bytes], { type }), name);
    const token = role ? JWT.sign({ account_roles: [role] }, SECRETS.SITEKEY, { expiresIn: "5m" }) : null;
    const response = await fetch(`${url}/upload/${field}`, {
      method: "POST", headers: token ? { Cookie: `loginToken=${token}` } : {}, body: form,
    });
    return { code: response.status, data: await response.json() };
  }
  return { directory, url, upload };
}

test("gallery uploads use unique comma-free names and serve the original bytes for all supported formats", async (t) => {
  const { directory, url, upload } = await setup(t);
  const cases = [
    [png, "a,b.png", "image/png"],
    [Buffer.from([255, 216, 255, 224]), "photo.jpeg", "image/jpeg"],
    [Buffer.from("GIF89a123456"), "photo.gif", "image/gif"],
    [Buffer.from("RIFF1234WEBPVP8 "), "photo.webp", "image/webp"],
  ];
  const names = [];
  for (const [bytes, name, type] of cases) {
    const result = await upload({ bytes, name, type });
    assert.equal(result.code, 200);
    assert.match(result.data, /^upperHubEventImages_[a-f0-9-]+\.(png|jpg|gif|webp)$/);
    assert.deepEqual(await readFile(join(directory, result.data)), bytes);
    const response = await fetch(`${url}/Uploads/${result.data}`);
    assert.equal(response.status, 200);
    names.push(result.data);
  }
  const second = await upload();
  assert.ok(!names.includes(second.data));
  assert.equal((await upload({ field: "lowerHubEventImages" })).code, 200);
});

test("gallery uploads reject invalid files, fields and content without leaving files behind", async (t) => {
  const { directory, upload } = await setup(t);
  await writeFile(join(directory, "existing.png"), png);
  for (const [options, code] of [
    [{ includeFile: false }, 400], [{ field: "unexpected" }, 400],
    [{ formField: "wrongField" }, 400], [{ twice: true }, 400],
    [{ type: "text/plain", name: "file.txt" }, 415],
    [{ bytes: Buffer.from("not a png") }, 415],
    [{ name: "file.jpg", type: "image/jpeg" }, 415],
    [{ bytes: Buffer.alloc(0) }, 415],
  ]) {
    const result = await upload(options);
    assert.equal(result.code, code, JSON.stringify(options));
    assert.equal(result.data.Status, false);
    assert.ok(result.data.Error);
    assert.deepEqual(await readdir(directory), ["existing.png"]);
  }
});

test("gallery uploads accept exactly 10 MiB and reject one byte over the limit", async (t) => {
  const { directory, upload } = await setup(t);
  const bytes = Buffer.alloc(maxBytes);
  png.copy(bytes);
  assert.equal((await upload({ bytes })).code, 200);
  const tooLarge = Buffer.concat([bytes, Buffer.from([0])]);
  assert.equal((await upload({ bytes: tooLarge })).code, 413);
  assert.equal((await readdir(directory)).length, 1);
});

test("gallery uploads preserve authentication and administrator authorization", async (t) => {
  const { directory, upload } = await setup(t);
  assert.equal((await upload({ role: null })).data.Status, false);
  assert.equal((await upload({ role: ROLES.MEMBER })).code, 403);
  assert.deepEqual(await readdir(directory), []);
});

test("gallery storage failures are explicit and leave existing files intact", async (t) => {
  const { directory, upload } = await setup(t, true);
  assert.equal((await upload()).code, 500);
  assert.deepEqual(await readdir(directory), []);
});

test("partial files from a storage stream failure are removed without deleting existing images", async (t) => {
  const { directory, upload } = await setup(t);
  await writeFile(join(directory, "existing.png"), png);
  const createWriteStream = FileSystem.createWriteStream;
  t.mock.method(FileSystem, "createWriteStream", (...args) => {
    const stream = createWriteStream(...args);
    stream.once("open", () => stream.destroy(Object.assign(new Error("Disk full"), { code: "ENOSPC" })));
    return stream;
  });
  assert.equal((await upload()).code, 500);
  assert.deepEqual(await readdir(directory), ["existing.png"]);
});

test("the default uploader retains its naming, file filter and limits for non-gallery consumers", async () => {
  assert.equal(FileUpload.limits, undefined);
  const filename = await new Promise((resolve, reject) => FileUpload.storage.getFilename({}, {
    fieldname: "bannerBackground", originalname: "original,name.svg",
  }, (error, value) => error ? reject(error) : resolve(value)));
  assert.match(filename, /^bannerBackground_\d+_original,name\.svg$/);
  const accepted = await new Promise((resolve, reject) => FileUpload.fileFilter({}, {
    mimetype: "image/svg+xml",
  }, (error, value) => error ? reject(error) : resolve(value)));
  assert.equal(accepted, true);
});
