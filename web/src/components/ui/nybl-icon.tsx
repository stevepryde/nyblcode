export function NyblIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 32 32"
      className={className}
    >
      <rect width="32" height="32" rx="6" fill="#6366f1" />
      <text
        x="16"
        y="23"
        fontSize="16"
        fontFamily="monospace"
        fontWeight="bold"
        fill="white"
        textAnchor="middle"
      >
        {"{b}"}
      </text>
    </svg>
  );
}
