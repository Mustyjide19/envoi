import { NextResponse } from "next/server";
import { FieldPath } from "firebase-admin/firestore";
import { auth } from "../../../auth";
import { adminDb } from "../../../firebaseAdmin";
import { FILE_ACTIONS, logFileAction } from "../../../utils/fileAccessLog";
import protectedFileAccess from "../../../utils/protectedFileAccess";
import shareLinkExpiry from "../../../utils/shareLinkExpiry";
import sensitivityLabels from "../../../utils/sensitivityLabels";

export const runtime = "nodejs";

const baseUrl =
  process.env.APP_URL ||
  process.env.NEXT_PUBLIC_APP_URL ||
  "http://localhost:3000";

function sortNewestFirst(items, fieldName) {
  return [...items].sort((a, b) => {
    const left = new Date(a[fieldName] || 0).getTime();
    const right = new Date(b[fieldName] || 0).getTime();
    return right - left;
  });
}

export async function GET(request) {
  try {
    const session = await auth();

    if (!session?.user?.email || !session?.user?.id) {
      return NextResponse.json(
        { error: "Authentication required." },
        { status: 401 }
      );
    }

    const ownedSnapshot = await adminDb
      .collection("uploadedFiles")
      .where("userEmail", "==", session.user.email)
      .get();

    const ownedFiles = ownedSnapshot.docs
      .map((doc) => ({
        ...doc.data(),
        storagePath: undefined,
      }))
      .sort((a, b) => String(b.id || "").localeCompare(String(a.id || "")));

    const sharedSnapshots = await Promise.all([
      adminDb
        .collection("sharedFiles")
        .where("recipientUserId", "==", session.user.id)
        .get(),
      adminDb
        .collection("sharedFiles")
        .where("recipientEmail", "==", session.user.email)
        .get(),
    ]);

    const shareMap = new Map();
    sharedSnapshots.forEach((snapshot) => {
      snapshot.docs.forEach((doc) => {
        shareMap.set(doc.id, doc.data());
      });
    });

    const shareRecords = Array.from(shareMap.values());
    const fileIds = [...new Set(shareRecords.map((share) => share.fileId).filter(Boolean))];
    const fileMap = new Map();

    if (fileIds.length > 0) {
      for (let index = 0; index < fileIds.length; index += 10) {
        const chunk = fileIds.slice(index, index + 10);
        const snapshot = await adminDb
          .collection("uploadedFiles")
          .where(FieldPath.documentId(), "in", chunk)
          .get();

        snapshot.docs.forEach((doc) => {
          fileMap.set(doc.id, doc.data());
        });
      }
    }

    const sharedFiles = sortNewestFirst(
      (
        await Promise.all(
          shareRecords.map(async (share) => {
          const file = fileMap.get(share.fileId);
          if (!file) {
            return null;
          }

          const shareExpired = shareLinkExpiry.isShareLinkExpired(
            share.shareExpiresAt
          );
          const isUnlocked =
            !shareExpired &&
            ((!share.sharePasswordHash && !share.sharePassword) ||
              request.cookies.get(
                protectedFileAccess.getSharedUnlockCookieName(share.id)
              )?.value === "1");
          const shapedResponse = protectedFileAccess.buildSharedFileResponse({
            share,
            file,
            unlocked: isUnlocked,
          });

          return {
            shareId: share.id,
            ownerEmail: share.ownerEmail,
            ownerName: share.ownerName,
            sharedAt: share.sharedAt,
            shareExpiresAt: share.shareExpiresAt || null,
            shareExpired,
            passwordProtected: shapedResponse.passwordProtected,
            unlocked: shapedResponse.unlocked,
            ...shapedResponse.file,
          };
          })
        )
      ).filter(Boolean),
      "sharedAt"
    );

    return NextResponse.json({
      files: ownedFiles,
      sharedFiles,
    });
  } catch (error) {
    console.error("GET /api/files failed:", error);
    return NextResponse.json(
      { error: "Failed to load files." },
      { status: 500 }
    );
  }
}

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
    const {
      id,
      fileName,
      fileType,
      fileSize,
      fileURL,
      storagePath,
      shortUrl,
      description,
      tags,
      sensitivityLabel,
    } = body || {};

    if (!id || !fileName || !fileURL) {
      return NextResponse.json(
        { error: "Missing required file metadata." },
        { status: 400 }
      );
    }

    const normalizedSensitivityLabel =
      sensitivityLabels.normalizeSensitivityLabel(sensitivityLabel);

    if (!normalizedSensitivityLabel) {
      return NextResponse.json(
        { error: "Sensitivity label is required." },
        { status: 400 }
      );
    }

    await adminDb.collection("uploadedFiles").doc(id).set({
      id,
      fileName,
      fileType: fileType || "",
      fileSize: Number(fileSize) || 0,
      fileURL,
      storagePath:
        typeof storagePath === "string" && storagePath.trim()
          ? storagePath.trim()
          : `file-upload/${fileName}`,
      description: typeof description === "string" ? description.trim() : "",
      tags: Array.isArray(tags)
        ? [...new Set(tags.map((tag) => String(tag).trim()).filter(Boolean))].slice(0, 5)
        : [],
      sensitivityLabel: normalizedSensitivityLabel,
      userEmail: session.user.email,
      userName: session.user.name || "",
      userVerified: !!session.user.isVerified,
      password: "",
      shortUrl: shortUrl || `${baseUrl}/${id}`,
    });

    await logFileAction({
      fileId: id,
      actorUserId: session.user.id,
      actorEmail: session.user.email,
      action: FILE_ACTIONS.UPLOAD,
    });

    return NextResponse.json({ ok: true, id });
  } catch (error) {
    console.error("POST /api/files failed:", error);
    return NextResponse.json(
      { error: "Failed to save file metadata." },
      { status: 500 }
    );
  }
}
