"use client"
import { app } from "../../../../../firebaseConfig";
import { getFirestore, getDoc, doc } from "firebase/firestore";
import React, { useEffect, useState } from 'react';
import FileInfo from "./_components/FileInfo";
import FileShareForm from "./_components/FileShareForm";

function FilePreview({params}) {
    const [fileId, setFileId] = useState(null);
    const [file, setFile] = useState(null);
    const db = getFirestore(app);

    useEffect(() => {
        params.then((resolvedParams) => {
            setFileId(resolvedParams.fileId);
            console.log(resolvedParams.fileId);
        });
    }, [params]);

    useEffect(() => {
        if (fileId) {
            getFileInfo();
        }
    }, [fileId]);

    const getFileInfo = async () => {
        const docRef = doc(db, "uploadedFiles", fileId);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
            console.log("Document data:", docSnap.data());
            setFile(docSnap.data());
        } else {
            console.log("No such document!");
        }
    }  

    return (
        <div className="min-h-screen bg-gray-50 py-10 px-5">
            <div className="max-w-5xl mx-auto">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <button
                        onClick={() => window.history.back()}
                        className="flex items-center gap-2 text-gray-600 hover:text-gray-900 font-medium"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                        </svg>
                        Go to Upload
                    </button>
                </div>

                {/* Main Content */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* File Info */}
                    <FileInfo file={file} />
                    
                    {/* Share Form */}
                    <FileShareForm file={file} onPasswordSave={getFileInfo} />
                </div>
            </div>
        </div>
    )
}

export default FilePreview;