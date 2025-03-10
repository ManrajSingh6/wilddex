import { JSX } from "react";

export function Footer(): JSX.Element {
  return (
    <footer className="flex items-center justify-center h-20 bg-slate-50">
      <p className="text-paragraph">
        © WildDex {new Date().getFullYear()} - All rights reserved
      </p>
    </footer>
  );
}
