export async function onRequest(context) {
  // 1. Grab the visitor's IP, current time, and requested URL
  const ip = context.request.headers.get("CF-Connecting-IP") || "Unknown IP";
  const date = new Date().toISOString();
  const url = context.request.url;

  // 2. Format the log entry text
  const logValue = `IP: ${ip} | URL: ${url}`;

  // 3. Save it directly to your free Cloudflare KV storage using the Date as the unique key
  if (context.env.IP_LOGS) {
    context.waitUntil(
      context.env.IP_LOGS.put(date, logValue).catch(err => console.error("Failed to save log:", err))
    );
  }

  // 4. Let the visitor load the website normally and instantly
  return await context.next();
}
