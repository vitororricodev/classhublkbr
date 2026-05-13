import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { useServerFn } from "@tanstack/react-start";
import { changeMyPassword } from "@/lib/auth.functions";
import { useAuth } from "@/lib/auth-context";
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
  return s; // 0..5
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
      <div className="text-xs text-muted-foreground">{pw ? labels[s] : "Mín. 6 caracteres, com letras e números"}</div>
    </div>
  );
}

function ChangePasswordPage() {
  const fn = useServerFn(changeMyPassword);
  const { user, refresh } = useAuth();
  const navigate = useNavigate();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await fn({ data: { currentPassword: current, newPassword: next, confirmPassword: confirm } });
      toast.success("Senha alterada com sucesso.");
      await refresh();
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
          {user?.must_change_password && (
            <p className="text-sm text-amber-600 mt-1">
              É necessário alterar a senha padrão antes de continuar.
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
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Salvando..." : "Salvar nova senha"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
