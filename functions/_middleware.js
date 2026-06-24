export async function onRequest(context) {
  // 1. Basic visitor info
  const ip = context.request.headers.get("CF-Connecting-IP") || "Unknown IP";
  const date = new Date().toISOString();
  const url = context.request.url;

  // 2. Extra Device & Location Info from Cloudflare
  const country = context.request.cf?.country || "Unknown Country";
  const city = context.request.cf?.city || "Unknown City";
  
  // This gets the raw text stating the device name, browser, and OS (User-Agent)
  const userAgent = context.request.headers.get("User-Agent") || "Unknown Device";

  // 3. Format the log entry text beautifully
  const logValue = `IP: ${ip} | Location: ${city}, ${country} | Device/Browser: ${userAgent} | URL: ${url}`;

  // 4. Save everything to your free Cloudflare KV storage
  if (context.env.IP_LOGS) {
    context.waitUntil(
      context.env.IP_LOGS.put(date, logValue).catch(err => console.error("Failed to save log:", err))
    );
  }

  // 5. Serve the website instantly
  return await context.next();
}
