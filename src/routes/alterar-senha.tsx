import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

export const Route = createFileRoute("/alterar-senha")({ component: ChangePasswordPage });

function strength(pw: string) {
  let s = 0;
  if (pw.length >= 6) s++;
  if (pw.length >= 10) s++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) s++;
  if (/[0-9]/.test(pw)) s++;
  if (/[^A-Za-z0-9]/.test(pw)) s++;
  return s;
}

function StrengthBar({ pw }: { pw: string }) {
  const s = strength(pw);
  const labels = ["Muito fraca", "Fraca", "Razoável", "Boa", "Forte", "Excelente"];
  const colors = ["bg-destructive", "bg-destructive", "bg-amber-500", "bg-amber-400", "bg-emerald-500", "bg-emerald-600"];
  return (
    <div className="space-y-1">
      <div className="h-1.5 w-full rounded bg-muted overflow-hidden">
        <div className={`h-full transition-all ${colors[s]}`} style={{ width: `${(s / 5) * 100}%` }} />
      </div>
      <div className="text-xs text-muted-foreground">{pw ? labels[s] : "Mín. 4 caracteres"}</div>
    </div>
  );
}

function ChangePasswordPage() {
  const { user, setUser, signOut } = useAuth();
  const navigate = useNavigate();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);

  const isFirst = !!user?.primeiro_login;

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!user) {
      navigate({ to: "/login" });
      return;
    }
    if (next !== confirm) {
      toast.error("As senhas não conferem.");
      return;
    }
    if (next.length < 4) {
      toast.error("A nova senha deve ter pelo menos 4 caracteres.");
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.rpc("alterar_senha_usuario", {
        p_usuario_id: user.id,
        p_senha_atual: current,
        p_nova_senha: next,
      });
      if (error) throw new Error(error.message);
      toast.success("Senha alterada com sucesso.");
      setUser({ ...user, primeiro_login: false });
      navigate({ to: "/" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao alterar senha.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 px-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader>
          <CardTitle>Alterar senha</CardTitle>
          {isFirst && (
            <p className="text-sm text-amber-600 mt-1">
              Este é o seu primeiro acesso. Por segurança, escolha uma nova senha antes de continuar.
            </p>
          )}
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="c">Senha atual</Label>
              <Input id="c" type="password" value={current} onChange={(e) => setCurrent(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="n">Nova senha</Label>
              <Input id="n" type="password" value={next} onChange={(e) => setNext(e.target.value)} required />
              <StrengthBar pw={next} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cf">Confirmar nova senha</Label>
              <Input id="cf" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
              {confirm && next !== confirm && (
                <p className="text-xs text-destructive">As senhas não conferem.</p>
              )}
            </div>
            <div className="flex gap-2">
              <Button type="submit" className="flex-1" disabled={loading}>
                {loading ? "Salvando..." : "Salvar"}
              </Button>
              {isFirst && (
                <Button type="button" variant="ghost" onClick={() => signOut().then(() => navigate({ to: "/login" }))}>
                  Sair
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
