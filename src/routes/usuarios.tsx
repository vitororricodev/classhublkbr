import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { Pencil, KeyRound, Power, Trash2, Plus } from "lucide-react";

export const Route = createFileRoute("/usuarios")({ component: UsersPage });

type Tipo = "admin" | "usuario";
type Row = {
  id: string;
  usuario: string;
  nome: string;
  tipo: Tipo;
  ativo: boolean;
  primeiro_login: boolean;
  created_at: string;
};

const tipoLabel: Record<Tipo, string> = { admin: "Administrador", usuario: "Usuário" };

function UsersPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [openCreate, setOpenCreate] = useState(false);
  const [editing, setEditing] = useState<Row | null>(null);
  const [resetting, setResetting] = useState<Row | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["usuarios"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("listar_usuarios");
      if (error) throw new Error(error.message);
      return (data ?? []) as Row[];
    },
    enabled: user?.tipo === "admin",
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return data ?? [];
    return (data ?? []).filter((u) => u.usuario.toLowerCase().includes(q) || u.nome.toLowerCase().includes(q));
  }, [data, search]);

  const invalidate = () => qc.invalidateQueries({ queryKey: ["usuarios"] });

  const toggleM = useMutation({
    mutationFn: async (u: Row) => {
      const { error } = await supabase.rpc("atualizar_usuario", {
        p_id: u.id, p_nome: u.nome, p_tipo: u.tipo, p_ativo: !u.ativo,
      });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => { toast.success("Status atualizado."); invalidate(); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro"),
  });

  const removeM = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.rpc("excluir_usuario", { p_id: id });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => { toast.success("Usuário excluído."); invalidate(); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro"),
  });

  if (user && user.tipo !== "admin") {
    return (
      <div className="p-8">
        <Card>
          <CardHeader><CardTitle>Acesso restrito</CardTitle></CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Somente administradores podem gerenciar usuários.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6">
      <header className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Usuários</h1>
          <p className="text-sm text-muted-foreground mt-1">Gerencie acessos, perfis e senhas dos usuários internos.</p>
        </div>
        <Dialog open={openCreate} onOpenChange={setOpenCreate}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4" /> Novo usuário</Button>
          </DialogTrigger>
          <CreateUserDialog
            onClose={() => setOpenCreate(false)}
            onSubmit={async (payload) => {
              const { error } = await supabase.rpc("criar_usuario", {
                p_usuario: payload.usuario,
                p_nome: payload.nome,
                p_senha: payload.senha,
                p_tipo: payload.tipo,
                p_ativo: payload.ativo,
              });
              if (error) throw new Error(error.message);
              toast.success("Usuário criado.");
              invalidate();
              setOpenCreate(false);
            }}
          />
        </Dialog>
      </header>

      <Card>
        <CardHeader className="pb-3">
          <Input placeholder="Buscar por usuário ou nome..." value={search}
            onChange={(e) => setSearch(e.target.value)} className="max-w-sm" />
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Usuário</TableHead>
                <TableHead>Nome</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">Carregando...</TableCell></TableRow>
              )}
              {!isLoading && filtered.length === 0 && (
                <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">Nenhum usuário encontrado.</TableCell></TableRow>
              )}
              {filtered.map((u) => (
                <TableRow key={u.id}>
                  <TableCell className="font-medium">{u.usuario}</TableCell>
                  <TableCell>{u.nome}</TableCell>
                  <TableCell>
                    <Badge variant={u.tipo === "admin" ? "default" : "secondary"}>{tipoLabel[u.tipo]}</Badge>
                  </TableCell>
                  <TableCell>
                    {u.ativo ? (
                      <Badge variant="outline" className="border-emerald-500/40 text-emerald-700">Ativo</Badge>
                    ) : (
                      <Badge variant="outline" className="border-muted-foreground/30 text-muted-foreground">Inativo</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="inline-flex gap-1">
                      <Button variant="ghost" size="icon" title="Editar" onClick={() => setEditing(u)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" title="Redefinir senha" onClick={() => setResetting(u)}>
                        <KeyRound className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" title={u.ativo ? "Desativar" : "Ativar"} onClick={() => toggleM.mutate(u)}>
                        <Power className="h-4 w-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" title="Excluir">
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Excluir usuário?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Esta ação não pode ser desfeita. O usuário <b>{u.usuario}</b> será removido permanentemente.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={() => removeM.mutate(u.id)}>Excluir</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {editing && (
        <EditUserDialog
          user={editing}
          onClose={() => setEditing(null)}
          onSubmit={async (payload) => {
            const { error } = await supabase.rpc("atualizar_usuario", {
              p_id: payload.id, p_nome: payload.nome, p_tipo: payload.tipo, p_ativo: payload.ativo,
            });
            if (error) throw new Error(error.message);
            toast.success("Usuário atualizado.");
            invalidate();
            setEditing(null);
          }}
        />
      )}

      {resetting && (
        <ResetPasswordDialog
          user={resetting}
          onClose={() => setResetting(null)}
          onSubmit={async (nova) => {
            const { error } = await supabase.rpc("resetar_senha_usuario", {
              p_id: resetting.id, p_nova: nova,
            });
            if (error) throw new Error(error.message);
            toast.success("Senha redefinida. O usuário deverá trocá-la no próximo acesso.");
            setResetting(null);
          }}
        />
      )}
    </div>
  );
}

function CreateUserDialog({
  onClose, onSubmit,
}: {
  onClose: () => void;
  onSubmit: (data: { usuario: string; nome: string; tipo: Tipo; senha: string; ativo: boolean }) => Promise<void>;
}) {
  const [usuario, setUsuario] = useState("");
  const [nome, setNome] = useState("");
  const [tipo, setTipo] = useState<Tipo>("usuario");
  const [senha, setSenha] = useState("");
  const [ativo, setAtivo] = useState(true);
  const [loading, setLoading] = useState(false);

  return (
    <DialogContent>
      <DialogHeader><DialogTitle>Novo usuário</DialogTitle></DialogHeader>
      <form className="space-y-4" onSubmit={async (e) => {
        e.preventDefault();
        setLoading(true);
        try { await onSubmit({ usuario, nome, tipo, senha, ativo }); }
        catch (err) { toast.error(err instanceof Error ? err.message : "Erro"); }
        finally { setLoading(false); }
      }}>
        <div className="space-y-2"><Label>Usuário</Label>
          <Input value={usuario} onChange={(e) => setUsuario(e.target.value)} required autoComplete="off" /></div>
        <div className="space-y-2"><Label>Nome</Label>
          <Input value={nome} onChange={(e) => setNome(e.target.value)} required /></div>
        <div className="space-y-2"><Label>Tipo</Label>
          <Select value={tipo} onValueChange={(v) => setTipo(v as Tipo)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="admin">Administrador</SelectItem>
              <SelectItem value="usuario">Usuário</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2"><Label>Senha inicial</Label>
          <Input type="password" value={senha} onChange={(e) => setSenha(e.target.value)} required minLength={4} />
          <p className="text-xs text-muted-foreground">Mínimo 4 caracteres. O usuário deverá trocá-la no primeiro acesso.</p>
        </div>
        <div className="space-y-2"><Label>Status</Label>
          <Select value={ativo ? "1" : "0"} onValueChange={(v) => setAtivo(v === "1")}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="1">Ativo</SelectItem>
              <SelectItem value="0">Inativo</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
          <Button type="submit" disabled={loading}>{loading ? "Salvando..." : "Criar"}</Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}

function EditUserDialog({
  user, onClose, onSubmit,
}: {
  user: Row;
  onClose: () => void;
  onSubmit: (data: { id: string; nome: string; tipo: Tipo; ativo: boolean }) => Promise<void>;
}) {
  const [nome, setNome] = useState(user.nome);
  const [tipo, setTipo] = useState<Tipo>(user.tipo);
  const [ativo, setAtivo] = useState<boolean>(user.ativo);
  const [loading, setLoading] = useState(false);

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>Editar usuário</DialogTitle></DialogHeader>
        <form className="space-y-4" onSubmit={async (e) => {
          e.preventDefault();
          setLoading(true);
          try { await onSubmit({ id: user.id, nome, tipo, ativo }); }
          catch (err) { toast.error(err instanceof Error ? err.message : "Erro"); }
          finally { setLoading(false); }
        }}>
          <div className="space-y-2"><Label>Usuário</Label><Input value={user.usuario} disabled /></div>
          <div className="space-y-2"><Label>Nome</Label>
            <Input value={nome} onChange={(e) => setNome(e.target.value)} required /></div>
          <div className="space-y-2"><Label>Tipo</Label>
            <Select value={tipo} onValueChange={(v) => setTipo(v as Tipo)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">Administrador</SelectItem>
                <SelectItem value="usuario">Usuário</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2"><Label>Status</Label>
            <Select value={ativo ? "1" : "0"} onValueChange={(v) => setAtivo(v === "1")}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="1">Ativo</SelectItem>
                <SelectItem value="0">Inativo</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={loading}>{loading ? "Salvando..." : "Salvar"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ResetPasswordDialog({
  user, onClose, onSubmit,
}: {
  user: Row;
  onClose: () => void;
  onSubmit: (nova: string) => Promise<void>;
}) {
  const [pw, setPw] = useState("");
  const [loading, setLoading] = useState(false);
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>Redefinir senha — {user.usuario}</DialogTitle></DialogHeader>
        <form className="space-y-4" onSubmit={async (e) => {
          e.preventDefault();
          setLoading(true);
          try { await onSubmit(pw); }
          catch (err) { toast.error(err instanceof Error ? err.message : "Erro"); }
          finally { setLoading(false); }
        }}>
          <div className="space-y-2">
            <Label>Nova senha</Label>
            <Input type="password" value={pw} onChange={(e) => setPw(e.target.value)} required minLength={4} />
            <p className="text-xs text-muted-foreground">O usuário será obrigado a definir uma nova senha no próximo acesso.</p>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={loading}>{loading ? "Salvando..." : "Redefinir"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
