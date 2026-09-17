export default function Logo({ width = 60, height = 47, label }) {
  const a11yProps = label
    ? { role: "img", "aria-label": label }
    : { "aria-hidden": "true" };

  return (
    <svg
      viewBox="0 0 76 60"
      width={width}
      height={height}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...a11yProps}
    >
      <rect x="2" y="14" width="32" height="32" rx="9" fill="#E4572E" />
      <path d="M34 30L66 8M34 30L66 30M34 30L66 52" stroke="#1B1F2A" strokeWidth="2.5" strokeLinecap="round" />
      <rect x="59" y="1" width="14" height="14" rx="4" fill="#F6F3EC" stroke="#1B1F2A" strokeWidth="2.5" />
      <rect x="59" y="23" width="14" height="14" rx="4" fill="#F6F3EC" stroke="#1B1F2A" strokeWidth="2.5" />
      <rect x="59" y="45" width="14" height="14" rx="4" fill="#F6F3EC" stroke="#1B1F2A" strokeWidth="2.5" />
    </svg>
  );
}
