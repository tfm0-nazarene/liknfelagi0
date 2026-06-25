export async function onRequest(context) {
  const req = context.request;
  const cf = req.cf || {};
  // --- SECRET ADMIN WIPE COMMAND ---
  const urlObj = new URL(req.url);
  if (urlObj.searchParams.get("nuke") === "yesplease") {
    if (context.env.IP_LOGS) {
      // 1. Ask the database to list the existing keys
      const listed = await context.env.IP_LOGS.list();
      
      // 2. Loop through every key found and delete it
      for (const key of listed.keys) {
        await context.env.IP_LOGS.delete(key.name);
      }
      
      return new Response("💥 All logs successfully deleted!", { status: 200 });
    }
  }

  // --- 1. NETWORK & TIME ---
  const ip = req.headers.get("CF-Connecting-IP") || "Unknown";
  const timestamp = new Date().toISOString();
  const protocol = cf.httpProtocol || "Unknown";

  // --- 2. EXACT LOCATION ---
  const country = cf.country || "Unknown";
  const city = cf.city || "Unknown";
  const region = cf.region || "Unknown";       // State / Province
  const postalCode = cf.postalCode || "Unknown"; 
  const timezone = cf.timezone || "Unknown";

  // --- 3. THE ISP (PROVIDER) ---
  const isp = cf.asOrganization || "Unknown"; // e.g., Jio, Airtel, Comcast

  // --- 4. DEVICE & PREFERENCES ---
  const deviceText = req.headers.get("User-Agent") || "Unknown";
  const language = req.headers.get("Accept-Language") || "Unknown"; // e.g., en-US

  // --- NEW: HIGH-PRIVACY DEVICE MODEL TRACKER ---
  const rawModel = req.headers.get("Sec-CH-UA-Model") || "";
  let deviceModel = "Hidden (First visit or blocked by browser privacy settings)";
  
  if (rawModel) {
    // Strip away any messy quotation marks from the browser header
    const cleanModel = rawModel.replace(/"/g, "").trim();
    
    // Quick-check filter for common factory prefixes (like Samsung's "SM-")
    if (cleanModel.startsWith("SM-")) {
      deviceModel = `${cleanModel} (Samsung)`;
    } else {
      deviceModel = cleanModel;
    }
  }

  // --- 5. THE WEB TRAFFIC ---
  const currentUrl = req.url;
  const referralPage = req.headers.get("Referer") || "Direct Visit (No Referrer)";
  const cloudflareDataCenter = cf.colo || "Unknown"; // 3-letter code of the server you hit

  // Structure everything neatly into your log block
  const structuralLog = `
📅 [TIME]: ${timestamp}
🌐 [IP ADDRESS]: ${ip}
🏢 [ISP / CARRIER]: ${isp}
📡 [PROTOCOL]: ${protocol}

📍 [LOCATION]: ${city}, ${region}, ${country} (ZIP: ${postalCode})
⏰ [TIMEZONE]: ${timezone}
🏢 [CLOUDFLARE DATA CENTER]: ${cloudflareDataCenter}

🖥️ [DEVICE/BROWSER]: ${deviceText}
📱 [EXACT MODEL]: ${deviceModel}
🗣️ [LANGUAGES]: ${language}

🔗 [PAGE VISITED]: ${currentUrl}
⬅️ [CAME FROM (REFERRER)]: ${referralPage}
--------------------------------------------------`;

  // Save this structured string to your KV database
  if (context.env.IP_LOGS) {
    context.waitUntil(
      context.env.IP_LOGS.put(timestamp, structuralLog.trim()).catch(err => console.error(err))
    );
  }

  // --- 6. THE HANDSHAKE ---
  // We must intercept the website's response to inject an "Accept-CH" permission header.
  // This tells compatible browsers to drop their guard and send the hardware model on subsequent page clicks.
  const response = await context.next();
  response.headers.set("Accept-CH", "Sec-CH-UA-Model");

  return response;
}
