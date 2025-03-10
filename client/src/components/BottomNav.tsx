import React from "react";
import { NavLink } from "react-router-dom";
import { Home, Plus, User , Newspaper} from "lucide-react";
import { Nav, Button } from "react-bootstrap";

const BottomNav: React.FC = () => {
  return (
    <Nav
      className="fixed-bottom w-100 bg-white border-top d-flex justify-content-around align-items-center py-2 shadow-lg z-10"
    >
      <Nav.Item>
        <Nav.Link as={NavLink} to="/" className="text-center">
          <Home size={24} className="text-gray-500" />
          <span className="sr-only"></span>
        </Nav.Link>
      </Nav.Item>

      <Nav.Item>
        <Nav.Link as={NavLink} to="/post" className="p-0">
          <Button
            variant="primary"
            size="lg"
            className="rounded-circle d-flex align-items-center justify-content-center"
          >
            <Plus size={24} className="text-white" />
          </Button>
          <span className="sr-only"></span>
        </Nav.Link>
      </Nav.Item>

      <Nav.Item>
        <Nav.Link as={NavLink} to="/profile" className="text-center">
          <User size={24} className="text-gray-500" />
          <span className="sr-only"></span>
        </Nav.Link>
      </Nav.Item>
        <Nav.Link as={NavLink} to="/communityposts" className="text-center">
            <Newspaper size={24} className="text-gray-500" />
            <span className="sr-only"></span>
        </Nav.Link>
      <Nav.Item>

      </Nav.Item>
    </Nav>
  );
};

export default BottomNav;
