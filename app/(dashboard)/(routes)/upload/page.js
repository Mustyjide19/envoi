"use client";
import React, { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import UploadForm from "./_components/UploadForm";
import { app } from "../../../../firebaseConfig";
import { useRouter } from "next/navigation";
import {
  getStorage,
  ref,
  uploadBytesResumable,
  getDownloadURL,
} from "firebase/storage";
import { generateRandomString } from "../../../_utils/GenerateRandomString";
import fileValidation from "../../../../utils/fileValidation";

function Upload() {
  const { status } = useSession();
  const storage = getStorage(app);
  const router = useRouter();

  const [fileId, setFileDocId] = useState();
  const [progress, setProgress] = useState(0);
  const [uploadCompleted, setUploadCompleted] = useState(false);

  const uploadFile = async (file, description = "") => {
    if (!file || status !== "authenticated") return;

    const validationResult = fileValidation.validateUploadFile(file);
    if (!validationResult.ok) {
      alert(validationResult.message);
      return;
    }

    const metadata = {
      contentType: file.type,
    };

    const timestamp = Date.now();
    const fileName = `${timestamp}-${file.name}`;
    const storageRef = ref(storage, `file-upload/${fileName}`);
    const uploadTask = uploadBytesResumable(storageRef, file, metadata);

    uploadTask.on(
      "state_changed",
      (snapshot) => {
        const uploadProgress =
          (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        setProgress(uploadProgress);
      },
      (error) => {
        console.error("Upload failed:", error);
      },
      async () => {
        const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
        await saveInfo(fileName, file, downloadURL, description);
      }
    );
  };

  const saveInfo = async (fileName, file, downloadURL, description = "") => {
    const docId = generateRandomString().toString();

    try {
      const response = await fetch("/api/files", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: docId,
          fileName,
          fileType: file.type,
          fileSize: file.size,
          fileURL: downloadURL,
          description,
          shortUrl: `${process.env.NEXT_PUBLIC_BASE_URL || ""}${docId}`,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || "Failed to save file metadata.");
      }

      setFileDocId(data.id || docId);
      setUploadCompleted(true);
    } catch (error) {
      console.error("Error saving file metadata:", error);
    }
  };

  useEffect(() => {
    if (uploadCompleted && fileId) {
      setTimeout(() => {
        setUploadCompleted(false);
        router.push("/file-preview/" + fileId);
      }, 2000);
    }
  }, [uploadCompleted, fileId, router]);

  return (
    <div className="p-5 px-8 md:px-28">
      <h2 className="text-[20px] text-center m-5">
        Start <strong className="text-blue-900">Uploading</strong> Files and{" "}
        <strong className="text-blue-900">Share</strong> it
      </h2>

      {progress > 0 && progress < 100 && (
        <div className="mb-4">
          <div className="w-full bg-gray-200 rounded-full h-2.5">
            <div
              className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
          <p className="text-center mt-2 text-sm text-gray-600">
            Uploading: {Math.round(progress)}%
          </p>
        </div>
      )}

      {uploadCompleted && (
        <div className="mb-4 p-4 bg-green-100 border border-green-400 text-green-700 rounded">
          Upload successful! Redirecting to file preview...
        </div>
      )}

      <UploadForm uploadFile={uploadFile} />
    </div>
  );
}

export default Upload;
