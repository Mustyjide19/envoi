"use client";
import React from "react";

function AlertMessage({ message }) {
  if (!message) return null;

  return (
    <div className="text-sm text-red-600 bg-red-50 border border-red-200 p-3 rounded">
      {message}
    </div>
  );
}

export default AlertMessage;
