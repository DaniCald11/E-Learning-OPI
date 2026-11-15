import type { CSSProperties } from "react";
const paths = {
  arrow: "M4 12h16m-6-6 6 6-6 6",
  diagonal: "M5 19 19 5M5 5h14v14",
  check: "m5 12 4 4L19 6",
  mail: "M3 6h18v12H3zM3 6l9 7 9-7",
  shield: "M12 3 4 6v6c0 5 8 9 8 9s8-4 8-9V6zM8 12l3 3 5-6",
  eye: "M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12ZM15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z",
  user: "M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0ZM4 21v-2a8 8 0 0 1 16 0v2",
  book: "M3 4h7l2 2 2-2h7v15h-7l-2 2-2-2H3zM12 6v15",
  spark: "m12 2 3 7 7 3-7 3-3 7-3-7-7-3 7-3z",
  lock: "M5 10h14v11H5zM8 10V6a4 4 0 0 1 8 0v4",
};
export function Icon({
  name = "arrow",
  size = 20,
  style,
}: {
  name?: keyof typeof paths;
  size?: number;
  style?: CSSProperties;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      style={style}
    >
      <path d={paths[name]} />
    </svg>
  );
}
