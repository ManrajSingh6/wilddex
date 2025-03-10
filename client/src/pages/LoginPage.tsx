import { JSX, useState } from "react";
import { Container } from "@/components/container";
import { Form } from "@/components/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { CustomImage } from "@/components/customImage";
import { Header } from "@/components/header";
import { HOME_ROUTE, REGISTER_ROUTE } from "@/utils/routes";
import { useAuth } from "@/hooks/useAuth";
import { Navigate } from "react-router-dom";

export interface LoginFormData {
  readonly email: string;
  readonly password: string;
}

export function LoginPage(): JSX.Element {
  const { login, user } = useAuth();

  const [formData, setFormData] = useState<LoginFormData>({
    email: "",
    password: "",
  });

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    await login(formData.email, formData.password);
  }

  // Prevent logged in users from accessing the login page
  if (user) {
    return <Navigate to={HOME_ROUTE} />;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <Container>
        <Form customClass="min-w-96" onSubmit={handleLogin}>
          <div className="space-y-5 text-center">
            <div className="flex flex-col items-center justify-between text-center">
              <CustomImage
                src="/croppedLogo.png"
                alt="WildDex-Logo"
                className="w-16 h-16"
              />
              <Header
                header="Welcome Back to WildDex"
                subtext="Enter your details to continue"
              />
            </div>
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
            <Button className="w-full bg-foreground">Sign In</Button>
            <p className="text-sm text-paragraph">
              Don't have an account?{" "}
              <a className="font-semibold" href={REGISTER_ROUTE}>
                Register
              </a>
            </p>
          </div>
        </Form>
      </Container>
    </div>
  );
}
