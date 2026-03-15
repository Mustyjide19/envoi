import { NextResponse } from "next/server";
import { auth } from "../../../../auth";
import { getAdminDb } from "../../../../firebaseAdmin";
import { FILE_ACTIONS, logFileAction } from "../../../../utils/fileAccessLog";

export const runtime = "nodejs";

async function getOwnedFile(session, fileId) {
  const adminDb = getAdminDb();
  const fileSnap = await adminDb.collection("uploadedFiles").doc(fileId).get();

  if (!fileSnap.exists) {
    return { error: "File not found.", status: 404 };
  }

  const file = fileSnap.data();
  if (file.userEmail !== session.user.email) {
    return { error: "Forbidden.", status: 403 };
  }

  return { fileSnap, file };
}

export async function GET(request, context) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: "Authentication required." },
        { status: 401 }
      );
    }

    const { fileId } = await context.params;
    const result = await getOwnedFile(session, fileId);

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    await logFileAction({
      fileId,
      actorUserId: session.user.id,
      actorEmail: session.user.email,
      action: FILE_ACTIONS.VIEW,
    });

    return NextResponse.json(result.file);
  } catch (error) {
    console.error("GET /api/files/[fileId] failed:", error);
    return NextResponse.json(
      { error: "Failed to load file." },
      { status: 500 }
    );
  }
}

export async function PATCH(request, context) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: "Authentication required." },
        { status: 401 }
      );
    }

    const { fileId } = await context.params;
    const result = await getOwnedFile(session, fileId);

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    const body = await request.json();
    const password = typeof body?.password === "string" ? body.password : "";
    const hadPassword = !!result.file.password;

    await result.fileSnap.ref.update({ password });

    if (hadPassword && !password) {
      await logFileAction({
        fileId,
        actorUserId: session.user.id,
        actorEmail: session.user.email,
        action: FILE_ACTIONS.REVOKE_ACCESS,
      });
    }

    return NextResponse.json({
      ok: true,
      file: {
        ...result.file,
        password,
      },
    });
  } catch (error) {
    console.error("PATCH /api/files/[fileId] failed:", error);
    return NextResponse.json(
      { error: "Failed to update file." },
      { status: 500 }
    );
  }
}

export async function DELETE(request, context) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: "Authentication required." },
        { status: 401 }
      );
    }

    const { fileId } = await context.params;
    const result = await getOwnedFile(session, fileId);

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    await result.fileSnap.ref.delete();

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("DELETE /api/files/[fileId] failed:", error);
    return NextResponse.json(
      { error: "Failed to delete file." },
      { status: 500 }
    );
  }
}
