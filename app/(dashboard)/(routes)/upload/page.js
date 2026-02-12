"use client";
import React from "react";
import { useUser } from "@clerk/nextjs"; // ✅ Add this import
import UploadForm from "./_components/UploadForm";
import { app } from "@/firebaseConfig";
import { getFirestore, doc, setDoc } from "firebase/firestore";
import {
  getStorage,
  ref,
  uploadBytesResumable,
  getDownloadURL,
} from "firebase/storage";
import { generateRandomString } from "@/app/_utils/GenerateRandomString";

function Upload() {
  const { user } = useUser();
  const storage = getStorage(app);
  const db = getFirestore(app);
  
  const allowedTypes = [
    // Documents
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-powerpoint",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    "text/plain",
    // Excel & CSV
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "text/csv",
    // Images
    "image/jpeg",
    "image/png",
    "image/jpg",
    "image/webp",
  ];
  
  const uploadFile = (file) => {
    if (!file) return;
    
    if (!allowedTypes.includes(file.type)) {
      alert(
        "Only academic files are allowed (PDF, DOC, PPT, TXT, Excel, CSV, Images)."
      );
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
        const progress =
          (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        console.log("Upload is " + progress + "% done");
      },
      (error) => {
        console.error("Upload failed:", error);
      },
      async () => {
        const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
        console.log("File available at:", downloadURL);
        
        // Save file info to Firestore
        await saveInfo(fileName, file, downloadURL);
      }
    );
  };
  
  const saveInfo = async (fileName, file, downloadURL) => {
    const docId = generateRandomString().toString();
    
    try {
      await setDoc(doc(db, "uploadedFiles", docId), {
        fileName: fileName,
        fileType: file.type,
        fileSize: file.size,
        fileURL: downloadURL,
        userEmail: user?.primaryEmailAddress?.emailAddress,
        userName: user?.fullName,
        password: '',
        id: docId,
        shortUrl: process.env.NEXT_PUBLIC_BASE_URL + docId,
      });
      
      console.log("File info saved to Firestore with ID:", docId);
    } catch (error) {
      console.error("Error saving to Firestore:", error);
    }
  };
  
  return (
    <div className="p-5 px-8 md:px-28">
      <h2 className="text-[20px] text-center m-5">
        Start <strong className="text-blue-900">Uploading</strong> Files and{" "}
        <strong className="text-blue-900">Share</strong> it
      </h2>
      <UploadForm uploadFile={uploadFile} />
    </div>
  );
}

export default Upload;