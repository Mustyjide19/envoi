import { NextResponse } from "next/server";
import { auth } from "../../../../../auth";
import { adminDb } from "../../../../../firebaseAdmin";
import fileSecurityCenter from "../../../../../utils/fileSecurityCenter";

export const runtime = "nodejs";

async function getOwnedFile(session, fileId) {
  const fileSnap = await adminDb.collection("uploadedFiles").doc(fileId).get();

  if (!fileSnap.exists) {
    return { error: "File not found.", status: 404 };
  }

  const file = fileSnap.data();

  if (file.userEmail !== session.user.email) {
    return { error: "Forbidden.", status: 403 };
  }

  return { file };
}

export async function GET(request, context) {
  try {
    const session = await auth();

    if (!session?.user?.email || !session?.user?.id) {
      return NextResponse.json(
        { error: "Authentication required." },
        { status: 401 }
      );
    }

    const { fileId } = await context.params;
    const fileResult = await getOwnedFile(session, fileId);

    if (fileResult.error) {
      return NextResponse.json(
        { error: fileResult.error },
        { status: fileResult.status }
      );
    }

    const [accessLogsSnapshot, securityEventsSnapshot, sharesSnapshot] =
      await Promise.all([
        adminDb.collection("fileAccessLogs").where("fileId", "==", fileId).get(),
        adminDb.collection("securityEventLogs").where("fileId", "==", fileId).get(),
        adminDb.collection("sharedFiles").where("fileId", "==", fileId).get(),
      ]);

    const accessLogs = accessLogsSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
    const securityEvents = securityEventsSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
    const shares = sharesSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    const summary = fileSecurityCenter.evaluateFileSecurityCenter({
      file: fileResult.file,
      accessLogs,
      securityEvents,
      shares,
    });

    return NextResponse.json({
      file: {
        id: fileResult.file.id,
        fileName: fileResult.file.fileName || "",
        fileType: fileResult.file.fileType || "",
        fileSize: Number(fileResult.file.fileSize) || 0,
        userEmail: fileResult.file.userEmail || "",
        userName: fileResult.file.userName || "",
        sensitivityLabel: fileResult.file.sensitivityLabel || "",
        passwordProtected: !!fileResult.file.password,
        linkExpiresAt: fileResult.file.linkExpiresAt || null,
        linkExpiryOption: fileResult.file.linkExpiryOption || "",
      },
      summary,
    });
  } catch (error) {
    console.error("GET /api/files/[fileId]/security failed:", error);
    return NextResponse.json(
      { error: "Failed to load Security Center." },
      { status: 500 }
    );
  }
}
