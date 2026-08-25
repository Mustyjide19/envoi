import { NextResponse } from "next/server";
import { auth } from "../../../../auth";
import { adminDb } from "../../../../firebaseAdmin";
import ariaService from "../../../../utils/ariaService";
import { createFirestoreConversationStore } from "../../../../utils/ariaConversationStore";

export const runtime = "nodejs";

/**
 * Feature: ARIA proactive context events.
 *
 * Lets Envoi tell ARIA "the user just did X" (e.g. finished an upload) so
 * she can react proactively. The event body carries only descriptive data
 * about what already happened server-side (fileId/fileName/etc.) — the
 * acting user is still always the authenticated session, never anything
 * supplied by the client.
 */
export async function POST(request) {
  try {
    const session = await auth();

    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
    }

    const result = await ariaService.handleAriaContextEvent({
      session,
      store: createFirestoreConversationStore(adminDb),
      type: body?.type,
      payload: body?.payload || {},
    });

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    return NextResponse.json({ conversation: result.conversation }, { status: 200 });
  } catch (error) {
    console.error("POST /api/aria/events failed:", error);
    return NextResponse.json(
      { error: "Unable to notify ARIA right now." },
      { status: 500 }
    );
  }
}
