import { NextResponse } from "next/server";
import { auth } from "../../../auth";
import { adminDb } from "../../../firebaseAdmin";
import ariaCore from "../../../utils/ariaCore";
import ariaService from "../../../utils/ariaService";
import { createFirestoreConversationStore } from "../../../utils/ariaConversationStore";

export const runtime = "nodejs";

function getStore() {
  return createFirestoreConversationStore(adminDb);
}

/* Feature: ARIA — load conversation history, greeting and quick actions */
export async function GET(request) {
  try {
    const session = await auth();
    const { searchParams } = new URL(request.url);
    const conversationId = searchParams.get("conversationId") || undefined;

    const result = await ariaService.loadConversationForUser({
      session,
      store: getStore(),
      conversationId,
    });

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    const userName = session?.user?.name || session?.user?.email?.split("@")[0];

    return NextResponse.json({
      conversation: result.conversation,
      greeting: ariaCore.getTimeAwareGreeting(userName),
      quickActions: ariaCore.buildAriaQuickActions(),
    });
  } catch (error) {
    console.error("GET /api/aria failed:", error);
    return NextResponse.json(
      { error: "Unable to load ARIA right now. Please try again shortly." },
      { status: 500 }
    );
  }
}

/* Feature: ARIA — send a message, server-side only call into the provider */
export async function POST(request) {
  try {
    const session = await auth();

    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
    }

    const result = await ariaService.handleAriaRequest({
      session,
      body,
      store: getStore(),
    });

    if (!result.ok) {
      return NextResponse.json(
        { error: result.error, conversation: result.conversation || null },
        { status: result.status }
      );
    }

    return NextResponse.json(
      { reply: result.reply, conversation: result.conversation },
      { status: 200 }
    );
  } catch (error) {
    console.error("POST /api/aria failed:", error);
    return NextResponse.json(
      { error: "ARIA is unavailable right now. Please try again shortly." },
      { status: 500 }
    );
  }
}

/* Feature: ARIA — clear a conversation */
export async function DELETE(request) {
  try {
    const session = await auth();
    const { searchParams } = new URL(request.url);
    const conversationId = searchParams.get("conversationId") || undefined;

    const result = await ariaService.deleteConversationForUser({
      session,
      store: getStore(),
      conversationId,
    });

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    console.error("DELETE /api/aria failed:", error);
    return NextResponse.json(
      { error: "Unable to clear ARIA right now. Please try again shortly." },
      { status: 500 }
    );
  }
}
