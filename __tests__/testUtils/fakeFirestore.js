/**
 * Minimal in-memory stand-in for the Firebase Admin Firestore client used
 * across ARIA unit tests. Covers only the surface the ARIA code actually
 * calls: collection().doc(id).get()/.set()/.update()/.delete(), and
 * collection().where(...).get() with simple equality filters.
 */
function createFakeAdminDb(seedCollections = {}) {
  const collections = new Map(
    Object.entries(seedCollections).map(([name, docs]) => [
      name,
      new Map(Object.entries(docs)),
    ])
  );
  let autoId = 0;

  function getCollectionStore(name) {
    if (!collections.has(name)) {
      collections.set(name, new Map());
    }
    return collections.get(name);
  }

  function toSnap(id, data, store) {
    return {
      id,
      exists: data !== undefined,
      data: () => (data ? { ...data } : undefined),
      ref: {
        async delete() {
          store.delete(id);
        },
      },
    };
  }

  function buildQuery(store, filters) {
    return {
      where(field, _operator, value) {
        return buildQuery(store, [...filters, { field, value }]);
      },
      async get() {
        const docs = Array.from(store.entries())
          .filter(([, data]) => filters.every((filter) => data[filter.field] === filter.value))
          .map(([id, data]) => toSnap(id, data, store));

        return { empty: docs.length === 0, docs, size: docs.length };
      },
    };
  }

  return {
    collection(name) {
      const store = getCollectionStore(name);
      const query = buildQuery(store, []);

      return {
        ...query,
        doc(id) {
          const docId = id || `auto-${(autoId += 1)}`;
          return {
            id: docId,
            async get() {
              return toSnap(docId, store.get(docId), store);
            },
            async set(data, options = {}) {
              const existing = store.get(docId) || {};
              store.set(docId, options.merge ? { ...existing, ...data } : { ...data });
            },
            async update(data) {
              const existing = store.get(docId) || {};
              store.set(docId, { ...existing, ...data });
            },
            async delete() {
              store.delete(docId);
            },
          };
        },
      };
    },
    _dump(name) {
      return Array.from(getCollectionStore(name).entries());
    },
  };
}

function createFakePrisma(users = []) {
  const byEmail = new Map(users.map((user) => [user.email.toLowerCase(), user]));

  return {
    user: {
      async findUnique({ where }) {
        if (where?.email) {
          return byEmail.get(where.email.toLowerCase()) || null;
        }
        return null;
      },
    },
  };
}

module.exports = { createFakeAdminDb, createFakePrisma };
