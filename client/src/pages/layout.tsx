import { Footer } from "@/components/footer";
import { Navbar } from "@/components/navbar";
import { JSX } from "react";
import { Outlet } from "react-router-dom";

export function Layout(): JSX.Element {
  return (
    <div className="h-full bg-slate-50 px-10">
      <Navbar />
      <Outlet />
      <Footer />
    </div>
  );
}
