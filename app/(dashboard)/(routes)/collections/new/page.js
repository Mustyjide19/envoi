"use client";

import CollectionForm from "../_components/CollectionForm";

export default function NewCollectionPage() {
  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-8">
        <h1 className="app-text text-3xl font-bold">Create Collection</h1>
        <p className="app-text-muted mt-2 text-sm">
          Group multiple owned files into one structured bundle for secure sharing.
        </p>
      </div>

      <CollectionForm
        endpoint="/api/collections"
        method="POST"
        submitLabel="Create Collection"
        successPathBuilder={(collectionId) => `/collections/${collectionId}`}
      />
    </div>
  );
}
