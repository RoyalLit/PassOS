export async function parseWithSizeLimit(request: Request, maxSize = 100_000) {
  const text = await request.text();
  if (text.length > maxSize) {
    throw new Error(`Request body exceeds ${maxSize} byte limit`);
  }
  return JSON.parse(text);
}
