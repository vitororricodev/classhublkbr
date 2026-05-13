import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  CalendarDays,
  Users,
  BookOpen,
  GraduationCap,
  Clock,
  FileBarChart,
  Shield,
  LogOut,
  KeyRound,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";

const baseItems = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/agendamento", label: "Agendamento", icon: CalendarDays },
  { to: "/docentes", label: "Docentes", icon: Users },
  { to: "/componentes", label: "Componentes", icon: BookOpen },
  { to: "/turmas", label: "Turmas", icon: GraduationCap },
  { to: "/horarios", label: "Horários", icon: Clock },
  { to: "/relatorios", label: "Relatórios", icon: FileBarChart },
] as const;

const roleLabel: Record<string, string> = {
  admin: "Administrador",
  operador: "Operador",
  visualizador: "Visualizador",
};

export function AppSidebar() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const { user, signOut } = useAuth();

  const items = [
    ...baseItems,
    ...(user?.role === "admin"
      ? [{ to: "/usuarios" as const, label: "Usuários", icon: Shield }]
      : []),
  ];

  return (
    <aside className="no-print w-60 shrink-0 bg-sidebar text-sidebar-foreground flex flex-col min-h-screen">
      <div className="px-6 py-6 border-b border-sidebar-border">
        <div className="text-lg font-semibold tracking-tight">Planeja</div>
        <div className="text-xs opacity-70 mt-0.5">Planejamento de aulas</div>
      </div>
      <nav className="flex-1 px-3 py-4 space-y-1">
        {items.map((it) => {
          const active = path === it.to;
          const Icon = it.icon;
          return (
            <Link
              key={it.to}
              to={it.to}
              className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${
                active
                  ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                  : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
              }`}
            >
              <Icon className="h-4 w-4" />
              {it.label}
            </Link>
          );
        })}
      </nav>
      {user && (
        <div className="p-3 border-t border-sidebar-border space-y-2">
          <div className="px-2 py-1">
            <div className="text-sm font-medium truncate">{user.nome}</div>
            <div className="text-xs opacity-70">
              {user.username} · {roleLabel[user.role]}
            </div>
          </div>
          <Link
            to="/alterar-senha"
            className="flex items-center gap-2 px-3 py-2 rounded-md text-sm text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground transition-colors"
          >
            <KeyRound className="h-4 w-4" /> Alterar senha
          </Link>
          <Button
            variant="ghost"
            className="w-full justify-start gap-2 text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
            onClick={() => signOut()}
          >
            <LogOut className="h-4 w-4" /> Sair
          </Button>
        </div>
      )}
    </aside>
  );
}
