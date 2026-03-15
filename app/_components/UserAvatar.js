"use client";

function getInitials(name, email) {
  const source = (name || email || "").trim();

  if (!source) {
    return "?";
  }

  const words = source.split(/\s+/).filter(Boolean);
  if (words.length >= 2) {
    return `${words[0][0] || ""}${words[1][0] || ""}`.toUpperCase();
  }

  return source.slice(0, 2).toUpperCase();
}

function UserAvatar({ name, email, image, size = "md" }) {
  const initials = getInitials(name, email);
  const sizeClass =
    size === "sm"
      ? "h-8 w-8 text-xs"
      : size === "lg"
        ? "h-12 w-12 text-base"
        : "h-10 w-10 text-sm";

  if (image) {
    return (
      <img
        src={image}
        alt={name || email || "User avatar"}
        className={`${sizeClass} rounded-full object-cover border border-blue-100 bg-white`}
      />
    );
  }

  return (
    <div
      className={`${sizeClass} flex items-center justify-center rounded-full border border-blue-100 bg-blue-100 font-semibold text-blue-700`}
      aria-label={name || email || "User avatar"}
      title={name || email || "User"}
    >
      {initials}
    </div>
  );
}

export default UserAvatar;
