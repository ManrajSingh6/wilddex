import { JSX } from "react";

interface CustomImageProps {
  readonly src: string;
  readonly alt: string;
  readonly className?: string;
  readonly onClick?: () => void;
}

export function CustomImage({
  src,
  alt,
  className,
  onClick,
}: CustomImageProps): JSX.Element {
  return (
    <img
      src={src}
      alt={alt}
      className={`${className} ${onClick && "cursor-pointer"}`}
      onClick={onClick}
    />
  );
}
