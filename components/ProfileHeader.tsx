function VerifiedTick() {
  return (
    <svg className="verified" viewBox="0 0 24 24" width="20" height="20" aria-label="Verified" role="img">
      <path
        fill="#1d9bf0"
        d="M12 1l2.6 1.9 3.2-.2 1 3.1 2.7 1.8-1 3.1 1 3.1-2.7 1.8-1 3.1-3.2-.2L12 23l-2.6-1.9-3.2.2-1-3.1L2.5 16.6l1-3.1-1-3.1 2.7-1.8 1-3.1 3.2.2z"
      />
      <path fill="#fff" d="M10.6 14.6l-2.2-2.2-1.2 1.2 3.4 3.4 6-6-1.2-1.2z" />
    </svg>
  );
}

export default function ProfileHeader({
  fullName,
  username,
  isVerified,
}: {
  fullName: string;
  username: string;
  isVerified: boolean;
}) {
  return (
    <div className="profile">
      {/* eslint-disable-next-line @next/next/no-img-element -- same-origin proxy, no optimization needed */}
      <img className="avatar" src="/api/avatar" alt={`${fullName} profile photo`} width={96} height={96} />
      <div className="who">
        <div className="name">
          <span>{fullName}</span>
          {isVerified && <VerifiedTick />}
        </div>
        <a
          className="handle"
          href={`https://www.instagram.com/${username}/`}
          target="_blank"
          rel="noopener noreferrer"
        >
          @{username}
        </a>
      </div>
    </div>
  );
}
