/**
 * timecode-relay/index.js
 *
 * Runs on the encoding machine. Polls OBS for stream timecode every 100ms
 * and relays it to the DC Color Live worker.
 *
 * Required environment variables:
 *   OBS_WS_PASSWORD   – OBS WebSocket server password
 *   RELAY_SECRET      – shared secret for the /api/timecode endpoint
 *
 * Optional:
 *   OBS_WS_URL        – default: ws://localhost:4455
 *   WORKER_URL        – default: https://dccolor-live-worker.robbie-588.workers.dev
 */

import OBSWebSocket from "obs-websocket-js";
import fetch from "node-fetch";

const OBS_WS_URL = process.env.OBS_WS_URL || "ws://localhost:4455";
const OBS_WS_PASSWORD = process.env.OBS_WS_PASSWORD;
const RELAY_SECRET = process.env.RELAY_SECRET;
const WORKER_URL =
  process.env.WORKER_URL ||
  "https://dccolor-live-worker.robbie-588.workers.dev";
const TIMECODE_ENDPOINT = `${WORKER_URL}/api/timecode`;
const FPS = 29.97;
const POLL_INTERVAL_MS = 100;

if (!OBS_WS_PASSWORD) {
  console.error("ERROR: OBS_WS_PASSWORD environment variable is required");
  process.exit(1);
}
if (!RELAY_SECRET) {
  console.error("ERROR: RELAY_SECRET environment variable is required");
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Timecode conversion
// ---------------------------------------------------------------------------

/**
 * Converts an OBS timecode string (HH:MM:SS.mmm) to SMPTE HH:MM:SS:FF
 * at 29.97 fps (drop-frame rounding: floor(ms / (1000/fps))).
 */
function toSMPTE(obsTimecode) {
  // OBS format: "HH:MM:SS.mmm"  (milliseconds after the dot)
  const match = obsTimecode.match(/^(\d{2}):(\d{2}):(\d{2})\.(\d+)$/);
  if (!match) return "00:00:00:00";

  const [, hh, mm, ss, msRaw] = match;
  // Normalise to 3 digits of milliseconds
  const ms = parseInt(msRaw.padEnd(3, "0").slice(0, 3), 10);
  const frames = Math.floor(ms / (1000 / FPS));

  return `${hh}:${mm}:${ss}:${String(frames).padStart(2, "0")}`;
}

// ---------------------------------------------------------------------------
// Worker relay
// ---------------------------------------------------------------------------

async function postTimecode(timecode) {
  try {
    await fetch(TIMECODE_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RELAY_SECRET}`,
      },
      body: JSON.stringify({ timecode }),
    });
  } catch (err) {
    // Non-fatal – just log and continue
    console.warn("Failed to POST timecode:", err.message);
  }
}

// ---------------------------------------------------------------------------
// OBS connection + polling loop
// ---------------------------------------------------------------------------

const obs = new OBSWebSocket();
let pollTimer = null;
let lastTimecode = null;
let pollCount = 0;

async function startPolling() {
  pollTimer = setInterval(async () => {
    try {
      const streamStatus = await obs.call("GetStreamStatus");

      // Log the full raw response every 10 polls (~1 second) to avoid flooding
      pollCount++;
      if (pollCount % 10 === 1) {
        console.log(`[poll #${pollCount}] GetStreamStatus:`, JSON.stringify(streamStatus, null, 2));
      }

      if (!streamStatus.outputActive) {
        if (pollCount % 10 === 1) console.log("  → stream not active, skipping");
        return;
      }

      const raw = streamStatus.outputTimecode; // expected: "HH:MM:SS.mmm"
      if (!raw) {
        if (pollCount % 10 === 1) console.log("  → outputTimecode field missing or empty");
        return;
      }

      const smpte = toSMPTE(raw);

      // Only POST when the timecode actually changes (avoids redundant traffic)
      if (smpte !== lastTimecode) {
        lastTimecode = smpte;
        console.log(`  → timecode: ${raw} → ${smpte}`);
        postTimecode(smpte); // fire-and-forget
      }
    } catch (err) {
      // OBS call failed (e.g. disconnected mid-poll) – the close handler
      // will trigger reconnection, so just swallow here
      console.warn("Poll error:", err.message);
    }
  }, POLL_INTERVAL_MS);
}

function stopPolling() {
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
}

async function debugOnConnect() {
  console.log("\n=== OBS DEBUG SNAPSHOT ===");

  try {
    const streamStatus = await obs.call("GetStreamStatus");
    console.log("GetStreamStatus:", JSON.stringify(streamStatus, null, 2));
  } catch (err) {
    console.error("GetStreamStatus failed:", err.message);
  }

  try {
    const stats = await obs.call("GetStats");
    console.log("GetStats:", JSON.stringify(stats, null, 2));
  } catch (err) {
    console.error("GetStats failed:", err.message);
  }

  console.log("=== END DEBUG SNAPSHOT ===\n");
}

async function connect() {
  try {
    await obs.connect(OBS_WS_URL, OBS_WS_PASSWORD);
    console.log(`Connected to OBS WebSocket at ${OBS_WS_URL}`);
    await debugOnConnect();
    startPolling();
  } catch (err) {
    console.error("OBS connection failed:", err.message);
    scheduleReconnect();
  }
}

function scheduleReconnect() {
  console.log("Reconnecting in 5 seconds…");
  setTimeout(connect, 5000);
}

obs.on("ConnectionClosed", () => {
  console.warn("OBS WebSocket disconnected");
  stopPolling();
  scheduleReconnect();
});

obs.on("ConnectionError", (err) => {
  console.error("OBS WebSocket error:", err.message);
});

// Subscribe to scene changes – useful for future timecode-reset logic
obs.on("CurrentProgramSceneChanged", ({ sceneName }) => {
  console.log("Scene changed:", sceneName);
});

connect();
