"use client";
import React, { useState } from 'react';
import { getFirestore, doc, updateDoc } from 'firebase/firestore';
import { app } from '../../../../../../firebaseConfig';

function FileShareForm({ file, onPasswordSave }) {
  const [enablePassword, setEnablePassword] = useState(false);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false); // NEW: show/hide password
  const [email, setEmail] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const db = getFirestore(app);

  const handleSavePassword = async () => {
    if (!file?.id) return;
    
    setIsSaving(true);
    try {
      const docRef = doc(db, 'uploadedFiles', file.id);
      await updateDoc(docRef, {
        password: enablePassword ? password : ''
      });
      
      alert('Password settings saved successfully!');
      if (onPasswordSave) onPasswordSave();
    } catch (error) {
      console.error('Error saving password:', error);
      alert('Failed to save password settings');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSendEmail = async () => {
    if (!email) {
      alert('Please enter an email address');
      return;
    }

    setIsSendingEmail(true);
    try {
      console.log('Sending email to:', email);
      console.log('Short URL:', file?.shortUrl);
      
      alert(`Email would be sent to ${email} with link: ${file?.shortUrl}`);
    } catch (error) {
      console.error('Error sending email:', error);
      alert('Failed to send email');
    } finally {
      setIsSendingEmail(false);
    }
  };

  const copyToClipboard = () => {
    if (file?.shortUrl) {
      navigator.clipboard.writeText(file.shortUrl);
      alert('Link copied to clipboard!');
    }
  };

  return (
    <div className="flex flex-col gap-4 p-8 border-2 border-blue-200 rounded-xl bg-white">
      {/* Short URL */}
      <div>
        <label className="text-sm font-semibold text-gray-700 mb-2 block">
          Short URL
        </label>
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={file?.shortUrl || ''}
            readOnly
            className="flex-1 px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg text-gray-700 text-sm"
          />
          <button
            onClick={copyToClipboard}
            className="p-3 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition"
            title="Copy to clipboard"
          >
            <svg
              className="w-5 h-5 text-gray-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
              />
            </svg>
          </button>
        </div>
      </div>

      {/* Enable Password */}
      <div className="flex items-center gap-3">
        <input
          type="checkbox"
          id="enablePassword"
          checked={enablePassword}
          onChange={(e) => setEnablePassword(e.target.checked)}
          className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
        />
        <label htmlFor="enablePassword" className="font-semibold text-gray-700">
          Enable Password?
        </label>
      </div>

      {/* Password Input with Show/Hide Toggle */}
      {enablePassword && (
        <div className="relative">
          <input
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter password"
            className="w-full px-4 py-3 pr-12 bg-gray-50 border border-gray-200 rounded-lg text-gray-700"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
          >
            {showPassword ? (
              // Eye Slash Icon (Hide)
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
              </svg>
            ) : (
              // Eye Icon (Show)
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            )}
          </button>
        </div>
      )}

      {/* Save Button */}
      <button
        onClick={handleSavePassword}
        disabled={isSaving || (enablePassword && !password)}
        className="w-full px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isSaving ? 'Saving...' : 'Save'}
      </button>

      {/* Send File to Email */}
      <div className="mt-4">
        <label className="text-sm font-semibold text-gray-700 mb-2 block">
          Send File to Email
        </label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="example@gmail.com"
          className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg text-gray-700 mb-3"
        />
        <button
          onClick={handleSendEmail}
          disabled={isSendingEmail || !email}
          className="w-full px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSendingEmail ? 'Sending...' : 'Send Email'}
        </button>
      </div>
    </div>
  );
}

export default FileShareForm;