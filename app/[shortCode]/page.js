import { notFound, redirect } from "next/navigation";
import { adminDb } from "../../firebaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function ShortLinkPage({ params }) {
  const { shortCode } = await params;
  const normalizedShortCode =
    typeof shortCode === "string" ? shortCode.trim() : "";

  if (!normalizedShortCode) {
    notFound();
  }

  const fileSnap = await adminDb
    .collection("uploadedFiles")
    .doc(normalizedShortCode)
    .get();

  if (!fileSnap.exists) {
    notFound();
  }

  redirect(`/file-view/${normalizedShortCode}`);
}
