import { JSX } from "react";

interface ContainerProps {
  readonly children: React.ReactNode;
  readonly className?: string;
  readonly onClick?: () => void;
}

export function Container({
  children,
  className,
  onClick,
}: ContainerProps): JSX.Element {
  return (
    <div
      className={`bg-white p-4 rounded-lg border ${className}`}
      onClick={onClick}
    >
      {children}
    </div>
  );
}
