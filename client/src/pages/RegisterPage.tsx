import { JSX, useState } from "react";
import { Container } from "@/components/container";
import { Form } from "@/components/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { CustomImage } from "@/components/customImage";
import { Header } from "@/components/header";
import { HOME_ROUTE, LOGIN_ROUTE } from "@/utils/routes";
import { useAuth } from "@/hooks/useAuth";
import { Navigate } from "react-router-dom";

export interface RegisterFormData {
  readonly name: string;
  readonly email: string;
  readonly password: string;
}

export function RegisterPage(): JSX.Element {
  const { register, user } = useAuth();

  const [formData, setFormData] = useState<RegisterFormData>({
    name: "",
    email: "",
    password: "",
  });

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    await register(formData);
  }

  // Prevent logged in users from accessing the register page
  if (user) {
    return <Navigate to={HOME_ROUTE} />;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <Container>
        <Form customClass="min-w-96" onSubmit={handleRegister}>
          <div className="space-y-5 text-center">
            <div className="flex flex-col items-center justify-between text-center">
              <CustomImage
                src="/croppedLogo.png"
                alt="WildDex-Logo"
                className="w-16 h-16"
              />
              <Header
                header="Create an Account"
                subtext="Enter your details to get started"
              />
            </div>
            <Input
              placeholder="Name"
              type="text"
              label="Name"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              required
            />
            <Input
              placeholder="Enter your email address"
              type="email"
              label="Email"
              value={formData.email}
              onChange={(e) =>
                setFormData({ ...formData, email: e.target.value })
              }
              required
            />
            <Input
              placeholder="Enter your password"
              type="password"
              label="Password"
              value={formData.password}
              onChange={(e) =>
                setFormData({ ...formData, password: e.target.value })
              }
              required
            />
            <Button className="w-full bg-foreground">Sign Up</Button>
            <p className="text-sm text-paragraph">
              Already have an account?{" "}
              <a className="font-semibold" href={LOGIN_ROUTE}>
                Sign In
              </a>
            </p>
          </div>
        </Form>
      </Container>
    </div>
  );
}
