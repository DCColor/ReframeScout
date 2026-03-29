import { DurableObject } from "cloudflare:workers";

// ---------------------------------------------------------------------------
// ChatRoom Durable Object
// ---------------------------------------------------------------------------
export class ChatRoom extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    this.sessions = new Map(); // sessionId -> { ws, name }
  }

  async fetch(request) {
    const url = new URL(request.url);

    if (url.pathname === "/websocket") {
      if (request.headers.get("Upgrade") !== "websocket") {
        return new Response("Expected WebSocket", { status: 426 });
      }

      const pair = new WebSocketPair();
      const [client, server] = Object.values(pair);

      this.ctx.acceptWebSocket(server);

      const sessionId = crypto.randomUUID();
      const name = url.searchParams.get("name") || "Guest";
      this.sessions.set(server, { sessionId, name });

      // Announce join
      this.#broadcast({ type: "presence", event: "join", name, sessionId }, server);

      // Send current member list to new joiner
      const members = [...this.sessions.values()].map((s) => ({
        sessionId: s.sessionId,
        name: s.name,
      }));
      server.send(JSON.stringify({ type: "members", members }));

      return new Response(null, { status: 101, webSocket: client });
    }

    return new Response("Not found", { status: 404 });
  }

  webSocketMessage(ws, message) {
    let data;
    try {
      data = JSON.parse(message);
    } catch {
      return;
    }

    const session = this.sessions.get(ws);
    if (!session) return;

    if (data.type === "chat") {
      this.#broadcast({
        type: "chat",
        name: session.name,
        text: data.text,
        ts: Date.now(),
      });
    }
  }

  webSocketClose(ws) {
    const session = this.sessions.get(ws);
    if (session) {
      this.#broadcast({
        type: "presence",
        event: "leave",
        name: session.name,
        sessionId: session.sessionId,
      });
      this.sessions.delete(ws);
    }
  }

  webSocketError(ws) {
    this.webSocketClose(ws);
  }

  broadcastTimecode(timecode) {
    this.#broadcast({ type: "timecode", timecode });
  }

  #broadcast(msg, exclude = null) {
    const text = JSON.stringify(msg);
    for (const [ws] of this.sessions) {
      if (ws !== exclude) {
        try {
          ws.send(text);
        } catch {
          // ignore closed sockets
        }
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Module-level stores (per-isolate)
// ---------------------------------------------------------------------------
let latestTimecode = "00:00:00:00";

// roomId → Dyte meetingId. Passing meetingId back to the client (who stores
// it in sessionStorage) ensures all participants share the same Dyte meeting
// even if requests hit different isolates on subsequent calls.
const dyteMeetingIds = new Map();

// ---------------------------------------------------------------------------
// CORS helpers
// ---------------------------------------------------------------------------
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...CORS_HEADERS },
  });
}

// ---------------------------------------------------------------------------
// Worker fetch handler
// ---------------------------------------------------------------------------
export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // Preflight
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    // Health check
    if (url.pathname === "/api/health" && request.method === "GET") {
      return json({ ok: true, ts: Date.now() });
    }

    // Create room (host only – PIN-protected)
    // Required secrets: HOST_PIN
    if (url.pathname === "/api/room/create" && request.method === "POST") {
      let body;
      try {
        body = await request.json();
      } catch {
        return json({ error: "Invalid JSON" }, 400);
      }

      if (!body.pin || body.pin !== env.HOST_PIN) {
        return json({ error: "Invalid host PIN" }, 401);
      }

      const roomId = crypto.randomUUID();
      return json({ roomId });
    }

    // Join room (password-gated)
    if (url.pathname === "/api/room/join" && request.method === "POST") {
      let body;
      try {
        body = await request.json();
      } catch {
        return json({ error: "Invalid JSON" }, 400);
      }

      const { password, roomId, name } = body;

      if (!password || password !== env.ROOM_PASSWORD) {
        return json({ error: "Invalid password" }, 401);
      }
      if (!roomId) {
        return json({ error: "roomId required" }, 400);
      }

      return json({ ok: true, roomId, name: name || "Guest" });
    }

    // WebSocket upgrade – proxied into the ChatRoom Durable Object
    if (url.pathname.startsWith("/api/room/") && url.pathname.endsWith("/websocket")) {
      const parts = url.pathname.split("/");
      const roomId = parts[3]; // /api/room/{roomId}/websocket

      const doId = env.CHAT_ROOM.idFromName(roomId);
      const stub = env.CHAT_ROOM.get(doId);

      // Forward the request to the DO with the original URL intact
      return stub.fetch(new Request(`https://do/websocket?${url.searchParams}`, request));
    }

    // Timecode relay – write (encoding machine → worker)
    // Required secrets: ROOM_PASSWORD, REALTIMEKIT_ORG_ID, REALTIMEKIT_API_KEY, RELAY_SECRET
    if (url.pathname === "/api/timecode" && request.method === "POST") {
      const auth = request.headers.get("Authorization") || "";
      const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";

      if (!token || token !== env.RELAY_SECRET) {
        return json({ error: "Unauthorized" }, 401);
      }

      let body;
      try {
        body = await request.json();
      } catch {
        return json({ error: "Invalid JSON" }, 400);
      }

      const { timecode } = body;
      if (!timecode || typeof timecode !== "string") {
        return json({ error: "timecode string required" }, 400);
      }

      latestTimecode = timecode;
      return json({ ok: true });
    }

    // Timecode relay – read (browser → worker, polled every 100ms)
    if (url.pathname === "/api/timecode" && request.method === "GET") {
      return json({ timecode: latestTimecode });
    }

    // RealtimeKit/Dyte meeting participant token
    // Required secrets: REALTIMEKIT_ORG_ID, REALTIMEKIT_API_KEY
    if (url.pathname === "/api/meeting/token" && request.method === "POST") {
      if (!env.REALTIMEKIT_ORG_ID || !env.REALTIMEKIT_API_KEY) {
        return json({ error: "RealtimeKit not configured" }, 500);
      }

      let body;
      try {
        body = await request.json();
      } catch {
        return json({ error: "Invalid JSON" }, 400);
      }

      const { participantName, role, roomId, meetingId: clientMeetingId } = body;
      if (!participantName) return json({ error: "participantName required" }, 400);
      if (!roomId) return json({ error: "roomId required" }, 400);
      if (role !== "host" && role !== "guest") return json({ error: "role must be host or guest" }, 400);

      const authHeader = `Bearer ${env.REALTIMEKIT_API_KEY}`;
      const dyteBase = `https://api.cloudflare.com/client/v4/accounts/588f4c4929a697b2d9e0237b4b7a18e8/realtime/kit/${env.REALTIMEKIT_ORG_ID}`;

      // Resolve Dyte meeting ID – prefer what the client already knows (avoids
      // isolate cold-start creating duplicate meetings), then fall back to the
      // in-memory cache, then create a new one.
      let meetingId = clientMeetingId || dyteMeetingIds.get(roomId);

      if (!meetingId) {
        const createRes = await fetch(`${dyteBase}/meetings`, {
          method: "POST",
          headers: { Authorization: authHeader, "Content-Type": "application/json" },
          body: JSON.stringify({ title: "DC Color Session" }),
        });
        if (!createRes.ok) {
          const err = await createRes.text();
          return json(
            { error: "Failed to create Dyte meeting", status: createRes.status, detail: err },
            502
          );
        }
        const createData = await createRes.json();
        meetingId = createData.data.id;
        dyteMeetingIds.set(roomId, meetingId);
      }

      const presetName = role === "host" ? "group_call_host" : "group_call_participant";
      const addRes = await fetch(`${dyteBase}/meetings/${meetingId}/participants`, {
        method: "POST",
        headers: { Authorization: authHeader, "Content-Type": "application/json" },
        body: JSON.stringify({
          name: participantName,
          preset_name: presetName,
          custom_participant_id: crypto.randomUUID(),
        }),
      });
      const addBody = await addRes.text();
      console.error("[meeting/token] addParticipant status:", addRes.status, "body:", addBody);

      if (!addRes.ok) {
        return json(
          { error: "Failed to add participant", status: addRes.status, detail: addBody },
          502
        );
      }

      let addData;
      try {
        addData = JSON.parse(addBody);
      } catch {
        return json({ error: "Non-JSON response from participant API", detail: addBody }, 502);
      }

      console.error("[meeting/token] addData full response:", JSON.stringify(addData));

      const participantToken = addData.data?.authToken ?? addData.data?.token ?? null;
      if (!participantToken) {
        return json({ error: "No token in participant response", detail: addData }, 502);
      }

      return json({ token: participantToken, meetingId });
    }

    // RealtimeKit token (legacy – kept for backwards compatibility)
    if (url.pathname === "/api/token" && request.method === "GET") {
      if (!env.REALTIMEKIT_ORG_ID || !env.REALTIMEKIT_API_KEY) {
        return json({ error: "RealtimeKit not configured" }, 500);
      }

      const roomId = url.searchParams.get("roomId");
      if (!roomId) {
        return json({ error: "roomId query param required" }, 400);
      }

      const rtResp = await fetch(
        `https://rtc.live.cloudflare.com/v1/apps/${env.REALTIMEKIT_ORG_ID}/sessions/new`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${env.REALTIMEKIT_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ roomId }),
        }
      );

      if (!rtResp.ok) {
        const err = await rtResp.text();
        return json({ error: "RealtimeKit error", detail: err }, 502);
      }

      const data = await rtResp.json();
      return json(data);
    }

    return json({ error: "Not found" }, 404);
  },
};
