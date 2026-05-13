import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { useServerFn } from "@/lib/use-server-fn";
import { login } from "@/lib/auth.functions";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

export const Route = createFileRoute("/login")({ component: LoginPage });

function LoginPage() {
  const loginFn = useServerFn(login);
  const { refresh } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await loginFn({ data: { username, password } });
      await refresh();
      toast.success(`Bem-vindo, ${res.user.nome}`);
      if (res.user.must_change_password) {
        navigate({ to: "/alterar-senha" });
      } else {
        navigate({ to: "/" });
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao entrar");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 px-4">
      <Card className="w-full max-w-sm shadow-lg">
        <CardHeader>
          <div className="text-center">
            <div className="text-2xl font-semibold tracking-tight">Planeja</div>
            <div className="text-xs text-muted-foreground mt-1">Planejamento de aulas</div>
          </div>
          <CardTitle className="text-center text-base font-medium pt-4">Entrar</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="u">Usuário</Label>
              <Input id="u" autoFocus value={username} onChange={(e) => setUsername(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="p">Senha</Label>
              <Input id="p" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Entrando..." : "Entrar"}
            </Button>
            <p className="text-xs text-muted-foreground text-center">
              Acesso interno. Solicite credenciais ao administrador.
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
