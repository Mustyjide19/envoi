import { NextResponse } from "next/server";
import { auth } from "../../../../auth";
import { FILE_ACTIONS, logFileAction } from "../../../../utils/fileAccessLog";

export const runtime = "nodejs";

export async function POST(request) {
  try {
    const session = await auth();

    if (!session?.user?.email) {
      return NextResponse.json(
        { error: "Authentication required." },
        { status: 401 }
      );
    }

    const body = await request.json();
    const fileId = typeof body?.fileId === "string" ? body.fileId : "";

    if (!fileId) {
      return NextResponse.json(
        { error: "File ID is required." },
        { status: 400 }
      );
    }

    await logFileAction({
      fileId,
      actorUserId: session.user.id,
      actorEmail: session.user.email,
      action: FILE_ACTIONS.DOWNLOAD,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("POST /api/files/access-log failed:", error);
    return NextResponse.json(
      { error: "Failed to log file access." },
      { status: 500 }
    );
  }
}
