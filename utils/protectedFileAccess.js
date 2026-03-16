function getPublicUnlockCookieName(fileId) {
  return `public_file_unlock_${fileId}`;
}

function getSharedUnlockCookieName(shareId) {
  return `shared_file_unlock_${shareId}`;
}

function buildPublicFileResponse(file, unlocked) {
  return {
    ...file,
    passwordProtected: !!file.password,
    unlocked,
    password: undefined,
    fileURL: unlocked ? file.fileURL : undefined,
  };
}

function buildSharedFileResponse({ share, file, unlocked }) {
  return {
    share: {
      ...share,
      sharePassword: undefined,
      passwordProtected: !!share.sharePassword,
      unlocked,
    },
    file: {
      ...file,
      fileURL: unlocked ? file.fileURL : undefined,
    },
    passwordProtected: !!share.sharePassword,
    unlocked,
  };
}

module.exports = {
  getPublicUnlockCookieName,
  getSharedUnlockCookieName,
  buildPublicFileResponse,
  buildSharedFileResponse,
};
