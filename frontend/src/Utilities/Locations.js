export function ServerLocation(relativePath) {
  if (relativePath.startsWith("/")) {
    return "http://localhost:3000" + relativePath;
  }

  return "http://localhost:3000/" + relativePath;
}
