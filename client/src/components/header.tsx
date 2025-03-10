import { JSX } from "react";

export interface HeaderProps {
  readonly header: string;
  readonly subtext?: string;
}

export function Header({ header, subtext }: HeaderProps): JSX.Element {
  return (
    <div>
      <h1 className="font-medium text-header text-lg">{header}</h1>
      {subtext && <p className="text-sm text-accentText">{subtext}</p>}
    </div>
  );
}
