import { JSX } from "react";
import { CustomImage } from "./customImage";
import { NavLink } from "react-router-dom";
import {
  COMMUNITY_POSTS_ROUTE,
  HOME_ROUTE,
  PROFILE_ROUTE,
} from "@/utils/routes";
import { IoHome, IoLogOut } from "react-icons/io5";
import { RiUserCommunityLine } from "react-icons/ri";
import { FaUser } from "react-icons/fa";
import { useAuth } from "@/hooks/useAuth";

interface NavbarItemProps {
  readonly text: string;
  readonly path?: string;
  readonly onClick?: () => void;
  readonly icon?: JSX.Element;
}

const NAVBAR_ITEMS: readonly NavbarItemProps[] = [
  {
    text: "Home",
    path: HOME_ROUTE,
    icon: <IoHome />,
  },
  {
    text: "Community",
    path: COMMUNITY_POSTS_ROUTE,
    icon: <RiUserCommunityLine />,
  },
  {
    text: "Profile",
    path: PROFILE_ROUTE,
    icon: <FaUser />,
  },
];

export function Navbar(): JSX.Element {
  const { logout } = useAuth();

  const NAV_ITEMS = [
    ...NAVBAR_ITEMS,
    {
      text: "Logout",
      icon: <IoLogOut />,
      onClick: logout,
    },
  ];

  return (
    <nav className="flex items-center justify-between bg-slate-50 py-4">
      <div className="flex items-center space-x-2">
        <CustomImage
          src="/croppedLogo.png"
          alt="WildDex-Logo"
          className="w-12 h-12"
        />
        <h1 className="text-xl font-semibold text-header">WildDex</h1>
      </div>
      <ul className="flex items-center space-x-5">
        {NAV_ITEMS.map((item, idx) => {
          return <NavbarItem key={`navbar-item-${idx}`} {...item} />;
        })}
        <CustomImage
          src="https://avatar.iran.liara.run/public/12" // TODO: change this to user's avatar once supported by backend and DB
          alt="user-avatar"
          className="w-10 h-10 rounded-full shadow-md border-2 border-slate-300"
        />
      </ul>
    </nav>
  );
}

function NavbarItem({
  text,
  path = "",
  onClick,
  icon,
}: NavbarItemProps): JSX.Element {
  return (
    <NavLink to={path} className="transition-all">
      <div
        onClick={onClick}
        className="flex items-center space-x-1 hover:text-green-700"
      >
        <span>{icon}</span>
        <p className="text-sm text-paragraph">{text}</p>
      </div>
    </NavLink>
  );
}
