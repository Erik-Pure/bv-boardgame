/** Enkel användar-silhuett för spelarlist-knappen (ikon endast). */
export function UserMenuIcon(props: { size?: number; className?: string }) {
  const s = props.size ?? 24;
  return (
    <svg
      className={props.className}
      width={s}
      height={s}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <path
        fill="currentColor"
        d="M12 11.25a3.25 3.25 0 1 0 0-6.5 3.25 3.25 0 0 0 0 6.5Zm-6.5 8v-.5c0-2.1 2.46-4.25 6.5-4.25s6.5 2.15 6.5 4.25v.5a.75.75 0 0 1-.75.75H6.25a.75.75 0 0 1-.75-.75Z"
      />
    </svg>
  );
}
