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
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { Pencil, KeyRound, Power, Trash2, Plus } from "lucide-react";

export const Route = createFileRoute("/usuarios")({ component: UsersPage });

type Tipo = "admin" | "usuario";
type Usuario = {
  id: string;
  usuario: string;
  nome: string;
  tipo: Tipo;
  ativo: boolean;
  primeiro_login: boolean;
  docente_id: string | null;
};
type DocenteOpt = { id: string; nome: string };
type LaboratorioOpt = { id: string; nome: string };
type VinculoLaboratorio = { usuario_id: string; laboratorio_id: string };
// Schema gerado é atualizado após a migration ser aplicada no Supabase.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const sb = supabase as any;

const tipoLabel: Record<Tipo, string> = {
  admin: "Administrador",
  usuario: "Usuário",
};

function UsersPage() {
  const { user, isAdmin } = useAuth();
  const qc = useQueryClient();

  const [search, setSearch] = useState("");
  const [openCreate, setOpenCreate] = useState(false);
  const [editing, setEditing] = useState<Usuario | null>(null);
  const [resetting, setResetting] = useState<Usuario | null>(null);

  const { data = [], isLoading } = useQuery({
    queryKey: ["usuarios"],
    enabled: isAdmin,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("usuarios")
        .select("id, usuario, nome, tipo, ativo, primeiro_login, docente_id")
        .order("usuario");
      if (error) throw error;
      return (data ?? []) as unknown as Usuario[];
    },
  });

  const { data: docentes = [] } = useQuery({
    queryKey: ["docentes", "select-usuarios"],
    enabled: isAdmin,
    queryFn: async () => {
      const { data, error } = await supabase.from("docentes").select("id, nome").order("nome");
      if (error) throw error;
      return (data ?? []) as DocenteOpt[];
    },
  });
  const { data: laboratorios = [] } = useQuery({
    queryKey: ["laboratorios", "select-usuarios"],
    enabled: isAdmin,
    queryFn: async () => {
      const { data, error } = await sb.from("laboratorios").select("id, nome").eq("ativo", true).order("nome");
      if (error) throw error;
      return (data ?? []) as LaboratorioOpt[];
    },
  });
  const { data: vinculos = [] } = useQuery({
    queryKey: ["usuarios_laboratorios"],
    enabled: isAdmin,
    queryFn: async () => {
      const { data, error } = await sb.from("usuarios_laboratorios").select("usuario_id, laboratorio_id");
      if (error) throw error;
      return (data ?? []) as VinculoLaboratorio[];
    },
  });
  const docenteNome = (id: string | null) => (id ? docentes.find((d) => d.id === id)?.nome ?? "—" : "—");
  const laboratoriosDoUsuario = (id: string) => vinculos.filter((v) => v.usuario_id === id).map((v) => v.laboratorio_id);
  const nomesLaboratorios = (id: string) => laboratoriosDoUsuario(id).map((labId) => laboratorios.find((l) => l.id === labId)?.nome).filter(Boolean).join(", ") || "—";

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return data;
    return data.filter(
      (u) => u.usuario.toLowerCase().includes(q) || u.nome.toLowerCase().includes(q),
    );
  }, [data, search]);

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["usuarios"] });
    qc.invalidateQueries({ queryKey: ["usuarios_laboratorios"] });
  };

  const toggleM = useMutation({
    mutationFn: async (u: Usuario) => {
      const { error } = await supabase.rpc("atualizar_usuario", {
        p_id: u.id,
        p_nome: u.nome,
        p_tipo: u.tipo,
        p_ativo: !u.ativo,
        p_docente_id: u.docente_id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Status atualizado.");
      invalidate();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro"),
  });

  const removeM = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.rpc("excluir_usuario", { p_id: id });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Usuário excluído.");
      invalidate();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro"),
  });

  if (!isAdmin) {
    return (
      <div className="p-4 sm:p-6 lg:p-8">
        <Card>
          <CardHeader>
            <CardTitle>Acesso restrito</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Somente administradores podem gerenciar usuários.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      <header className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Usuários</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Cadastre acessos e defina o tipo de cada usuário. Usuários comuns veem apenas as aulas do docente vinculado a eles; administradores veem tudo.
          </p>
        </div>
        <Dialog open={openCreate} onOpenChange={setOpenCreate}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-1" /> Novo usuário
            </Button>
          </DialogTrigger>
          <CreateUserDialog
            docentes={docentes}
            laboratorios={laboratorios}
            onClose={() => setOpenCreate(false)}
            onCreated={() => {
              invalidate();
              setOpenCreate(false);
            }}
          />
        </Dialog>
      </header>

      <Card>
        <CardHeader className="pb-3">
          <Input
            placeholder="Buscar por usuário ou nome..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-sm"
          />
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Usuário</TableHead>
                <TableHead>Nome</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Docente vinculado</TableHead>
                <TableHead>Responsável por</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                    Carregando...
                  </TableCell>
                </TableRow>
              )}
              {!isLoading && filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                    Nenhum usuário encontrado.
                  </TableCell>
                </TableRow>
              )}
              {filtered.map((u) => {
                const isSelf = u.id === user?.id;
                return (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium">{u.usuario}</TableCell>
                    <TableCell>{u.nome}</TableCell>
                    <TableCell>
                      <Badge variant={u.tipo === "admin" ? "default" : "secondary"}>
                        {tipoLabel[u.tipo]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {u.tipo === "usuario" ? docenteNome(u.docente_id) : "—"}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {u.tipo === "usuario" ? nomesLaboratorios(u.id) : "—"}
                    </TableCell>
                    <TableCell>
                      {u.ativo ? (
                        <Badge variant="outline" className="border-emerald-500/40 text-emerald-700">
                          Ativo
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="border-muted-foreground/30 text-muted-foreground">
                          Inativo
                        </Badge>
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
                        <Button
                          variant="ghost"
                          size="icon"
                          title={u.ativo ? "Desativar" : "Ativar"}
                          onClick={() => toggleM.mutate(u)}
                          disabled={isSelf}
                        >
                          <Power className="h-4 w-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" title="Excluir" disabled={isSelf}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Excluir usuário?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Esta ação não pode ser desfeita. O usuário <b>{u.usuario}</b> será removido permanentemente. As aulas cadastradas por ele permanecerão, mas ficarão sem dono.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction onClick={() => removeM.mutate(u.id)}>
                                Excluir
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {editing && (
        <EditUserDialog
          user={editing}
          docentes={docentes}
          laboratorios={laboratorios}
          laboratorioIds={laboratoriosDoUsuario(editing.id)}
          onClose={() => setEditing(null)}
          onSaved={() => {
            invalidate();
            setEditing(null);
          }}
        />
      )}

      {resetting && (
        <ResetPasswordDialog
          user={resetting}
          onClose={() => setResetting(null)}
          onSaved={() => setResetting(null)}
        />
      )}
    </div>
  );
}

function CreateUserDialog({
  docentes,
  laboratorios,
  onClose,
  onCreated,
}: {
  docentes: DocenteOpt[];
  laboratorios: LaboratorioOpt[];
  onClose: () => void;
  onCreated: () => void;
}) {
  const [usuario, setUsuario] = useState("");
  const [nome, setNome] = useState("");
  const [tipo, setTipo] = useState<Tipo>("usuario");
  const [docenteId, setDocenteId] = useState<string>("none");
  const [senha, setSenha] = useState("");
  const [laboratorioIds, setLaboratorioIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Novo usuário</DialogTitle>
      </DialogHeader>
      <form
        className="space-y-4"
        onSubmit={async (e) => {
          e.preventDefault();
          if (!usuario.trim() || !nome.trim() || !senha) {
            toast.error("Preencha todos os campos.");
            return;
          }
          setLoading(true);
          try {
            const { data: novoUsuarioId, error } = await supabase.rpc("criar_usuario", {
              p_usuario: usuario.trim().toLowerCase(),
              p_nome: nome.trim(),
              p_senha: senha,
              p_tipo: tipo,
              p_ativo: true,
              p_docente_id: tipo === "usuario" && docenteId !== "none" ? docenteId : null,
            });
            if (error) {
              throw new Error(error.message);
            }
            if (tipo === "usuario" && laboratorioIds.length > 0) {
              const { error: vinculoError } = await sb.from("usuarios_laboratorios").insert(
                laboratorioIds.map((laboratorio_id) => ({ usuario_id: novoUsuarioId, laboratorio_id })),
              );
              if (vinculoError) throw new Error(vinculoError.message);
            }
            toast.success("Usuário criado. Ele deverá trocar a senha no primeiro acesso.");
            onCreated();
          } catch (err) {
            toast.error(err instanceof Error ? err.message : "Erro");
          } finally {
            setLoading(false);
          }
        }}
      >
        <div className="space-y-2">
          <Label>Login</Label>
          <Input value={usuario} onChange={(e) => setUsuario(e.target.value)} required autoComplete="off" />
        </div>
        <div className="space-y-2">
          <Label>Nome completo</Label>
          <Input value={nome} onChange={(e) => setNome(e.target.value)} required />
        </div>
        <div className="space-y-2">
          <Label>Tipo</Label>
          <Select value={tipo} onValueChange={(v) => setTipo(v as Tipo)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="usuario">Usuário (vê apenas as aulas do docente vinculado)</SelectItem>
              <SelectItem value="admin">Administrador (vê tudo)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {tipo === "usuario" && (
          <>
            <div className="space-y-2">
              <Label>Docente vinculado</Label>
              <Select value={docenteId} onValueChange={setDocenteId}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhum (definir depois)</SelectItem>
                  {docentes.map((d) => <SelectItem key={d.id} value={d.id}>{d.nome}</SelectItem>)}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">Este usuário só verá as aulas em que este docente estiver lançado.</p>
            </div>
            <LaboratoriosResponsaveis laboratorios={laboratorios} value={laboratorioIds} onChange={setLaboratorioIds} />
          </>
        )}
        <div className="space-y-2">
          <Label>Senha inicial</Label>
          <Input type="text" value={senha} onChange={(e) => setSenha(e.target.value)} required />
          <p className="text-xs text-muted-foreground">Será exigida a troca no primeiro acesso.</p>
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
  user,
  docentes,
  laboratorios,
  laboratorioIds: initialLaboratorioIds,
  onClose,
  onSaved,
}: {
  user: Usuario;
  docentes: DocenteOpt[];
  laboratorios: LaboratorioOpt[];
  laboratorioIds: string[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [nome, setNome] = useState(user.nome);
  const [tipo, setTipo] = useState<Tipo>(user.tipo);
  const [docenteId, setDocenteId] = useState<string>(user.docente_id ?? "none");
  const [loading, setLoading] = useState(false);
  const [laboratorioIds, setLaboratorioIds] = useState(initialLaboratorioIds);

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar usuário</DialogTitle>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={async (e) => {
            e.preventDefault();
            setLoading(true);
            try {
              const { error } = await supabase.rpc("atualizar_usuario", {
                p_id: user.id,
                p_nome: nome.trim(),
                p_tipo: tipo,
                p_ativo: user.ativo,
                p_docente_id: tipo === "usuario" && docenteId !== "none" ? docenteId : null,
              });
              if (error) throw error;
              const { error: removerVinculosError } = await sb.from("usuarios_laboratorios").delete().eq("usuario_id", user.id);
              if (removerVinculosError) throw new Error(removerVinculosError.message);
              if (tipo === "usuario" && laboratorioIds.length > 0) {
                const { error: vinculoError } = await sb.from("usuarios_laboratorios").insert(
                  laboratorioIds.map((laboratorio_id) => ({ usuario_id: user.id, laboratorio_id })),
                );
                if (vinculoError) throw new Error(vinculoError.message);
              }
              toast.success("Usuário atualizado.");
              onSaved();
            } catch (err) {
              toast.error(err instanceof Error ? err.message : "Erro");
            } finally {
              setLoading(false);
            }
          }}
        >
          <div className="space-y-2">
            <Label>Login</Label>
            <Input value={user.usuario} disabled />
          </div>
          <div className="space-y-2">
            <Label>Nome</Label>
            <Input value={nome} onChange={(e) => setNome(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label>Tipo</Label>
            <Select value={tipo} onValueChange={(v) => setTipo(v as Tipo)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="usuario">Usuário</SelectItem>
                <SelectItem value="admin">Administrador</SelectItem>
              </SelectContent>
            </Select>
          </div>
        {tipo === "usuario" && (
          <>
            <div className="space-y-2">
              <Label>Docente vinculado</Label>
              <Select value={docenteId} onValueChange={setDocenteId}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhum (definir depois)</SelectItem>
                  {docentes.map((d) => <SelectItem key={d.id} value={d.id}>{d.nome}</SelectItem>)}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Este usuário só verá as aulas em que este docente estiver lançado.
              </p>
            </div>
            <LaboratoriosResponsaveis laboratorios={laboratorios} value={laboratorioIds} onChange={setLaboratorioIds} />
          </>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={loading}>{loading ? "Salvando..." : "Salvar"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function LaboratoriosResponsaveis({ laboratorios, value, onChange }: { laboratorios: LaboratorioOpt[]; value: string[]; onChange: (ids: string[]) => void }) {
  const toggle = (id: string) => onChange(value.includes(id) ? value.filter((item) => item !== id) : [...value, id]);
  return (
    <div className="space-y-2">
      <Label>Responsável por laboratório</Label>
      <div className="space-y-2 rounded-md border p-3">
        {laboratorios.map((laboratorio) => (
          <label key={laboratorio.id} className="flex cursor-pointer items-center gap-2 text-sm">
            <input type="checkbox" checked={value.includes(laboratorio.id)} onChange={() => toggle(laboratorio.id)} />
            {laboratorio.nome}
          </label>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">O responsável pode gerenciar a agenda e aprovar pedidos apenas dos ambientes marcados.</p>
    </div>
  );
}

function ResetPasswordDialog({
  user,
  onClose,
  onSaved,
}: {
  user: Usuario;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [senha, setSenha] = useState("");
  const [loading, setLoading] = useState(false);
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Redefinir senha — {user.usuario}</DialogTitle>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={async (e) => {
            e.preventDefault();
            if (!senha) return;
            setLoading(true);
            try {
              const { error } = await supabase.rpc("resetar_senha_usuario", {
                p_id: user.id,
                p_nova: senha,
              });
              if (error) throw error;
              toast.success("Senha redefinida. O usuário deverá trocá-la no próximo acesso.");
              onSaved();
            } catch (err) {
              toast.error(err instanceof Error ? err.message : "Erro");
            } finally {
              setLoading(false);
            }
          }}
        >
          <div className="space-y-2">
            <Label>Nova senha</Label>
            <Input type="text" value={senha} onChange={(e) => setSenha(e.target.value)} required />
            <p className="text-xs text-muted-foreground">
              Ao entrar, o usuário será obrigado a definir uma nova senha.
            </p>
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
