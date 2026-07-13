import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { GraduationCap } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/login")({ component: LoginPage });

function LoginPage() {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const [usuario, setUsuario] = useState("");
  const [senha, setSenha] = useState("");
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const u = await signIn(usuario.trim(), senha);
      toast.success(`Bem-vindo, ${u.nome}`);
      navigate({ to: u.primeiro_login ? "/alterar-senha" : "/" });
    } catch (err) {
      toast.error(err instanceof Error && err.message !== "Usuário ou senha inválidos."
        ? "Usuário ou senha inválidos."
        : "Usuário ou senha inválidos.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-primary/10 via-background to-primary/5 px-4">
      <Card className="w-full max-w-sm shadow-xl border-border/60">
        <CardHeader className="text-center space-y-3 pb-2">
          <div className="mx-auto h-14 w-14 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center shadow-md">
            <GraduationCap className="h-7 w-7" />
          </div>
          <div>
            <div className="text-2xl font-semibold tracking-tight">ClassHub</div>
            <div className="text-xs text-muted-foreground mt-1">Planejamento de aulas</div>
          </div>
        </CardHeader>
        <CardContent className="pt-4">
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="u">Usuário</Label>
              <Input id="u" autoFocus autoComplete="username" value={usuario} onChange={(e) => setUsuario(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="p">Senha</Label>
              <Input id="p" type="password" autoComplete="current-password" value={senha} onChange={(e) => setSenha(e.target.value)} required />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Entrando..." : "Entrar"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
