import { JSX } from "react";
import { Header, HeaderProps } from "./header";

interface FormProps {
  readonly header?: HeaderProps;
  readonly children: React.ReactNode;
  readonly onSubmit: (event: React.FormEvent) => void;
  readonly customClass?: string;
}

export function Form({
  header,
  children,
  onSubmit,
  customClass,
}: FormProps): JSX.Element {
  return (
    <form className={`flex flex-col gap-2 ${customClass}`} onSubmit={onSubmit}>
      {header && <Header header={header.header} subtext={header.subtext} />}
      {children}
    </form>
  );
}
