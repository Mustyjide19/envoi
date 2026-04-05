"use client";

import { useEffect, useState } from "react";
import CollectionForm from "../../_components/CollectionForm";

export default function EditCollectionPage({ params }) {
  const [collectionId, setCollectionId] = useState(null);
  const [collection, setCollection] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    params.then((resolvedParams) => {
      setCollectionId(resolvedParams.collectionId);
    });
  }, [params]);

  useEffect(() => {
    if (!collectionId) {
      return;
    }

    void loadCollection();
  }, [collectionId]);

  const loadCollection = async () => {
    setIsLoading(true);

    try {
      const response = await fetch(`/api/collections/${collectionId}`, {
        cache: "no-store",
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || "Failed to load collection.");
      }

      setCollection({
        ...data.collection,
        files: data.files || [],
      });
      setError("");
    } catch (loadError) {
      console.error("Failed to load collection:", loadError);
      setError(loadError.message || "Failed to load collection.");
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="app-surface rounded-xl border p-10 text-center">
        <p className="app-text-muted">Loading collection...</p>
      </div>
    );
  }

  if (error || !collection) {
    return (
      <div className="app-surface rounded-xl border p-10 text-center">
        <p className="text-sm text-red-600">{error || "Collection not found."}</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-8">
        <h1 className="app-text text-3xl font-bold">Edit Collection</h1>
        <p className="app-text-muted mt-2 text-sm">
          Update the collection details and ordered file list.
        </p>
      </div>

      <CollectionForm
        endpoint={`/api/collections/${collection.id}`}
        method="PATCH"
        submitLabel="Save Changes"
        successPathBuilder={() => `/collections/${collection.id}`}
        initialCollection={collection}
      />
    </div>
  );
}
