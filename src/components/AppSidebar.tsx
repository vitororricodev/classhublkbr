import { useState } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  LayoutDashboard,
  CalendarDays,
  Users,
  BookOpen,
  GraduationCap,
  Clock,
  FileBarChart,
  LogOut,
  KeyRound,
  CalendarOff,
  Settings,
  UserCog,
  MonitorSmartphone,
  ClipboardList,
  Send,
  ClipboardCheck,
  ChevronDown,
  DatabaseBackup,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

type NavItem = { to: string; label: string; icon: React.ComponentType<{ className?: string }>; adminOnly?: boolean; badgeKey?: "labPendentes" };
type NavGroup = { label: string; icon: React.ComponentType<{ className?: string }>; items: NavItem[] };

const dashboardItem: NavItem = { to: "/", label: "Dashboard", icon: LayoutDashboard };

const agendaGroup: NavGroup = {
  label: "Agenda",
  icon: CalendarDays,
  items: [
    { to: "/agendamento", label: "Agendamento", icon: CalendarDays },
    { to: "/laboratorio", label: "Laboratório", icon: MonitorSmartphone },
    { to: "/solicitar-laboratorio", label: "Solicitar Laboratório", icon: Send },
    { to: "/aprovacoes-laboratorio", label: "Aprovações do Lab", icon: ClipboardCheck, adminOnly: true, badgeKey: "labPendentes" },
  ],
};

const relatoriosItem: NavItem = { to: "/relatorios", label: "Relatórios", icon: FileBarChart };

const configGroup: NavGroup = {
  label: "Configurações",
  icon: Settings,
  items: [
    { to: "/docentes", label: "Docentes", icon: Users },
    { to: "/componentes", label: "Componentes", icon: BookOpen },
    { to: "/turmas", label: "Turmas", icon: GraduationCap },
    { to: "/horarios", label: "Horários", icon: Clock },
    { to: "/feriados", label: "Feriados", icon: CalendarOff },
    { to: "/categorias-ac", label: "Categorias de AC", icon: ClipboardList, adminOnly: true },
    { to: "/usuarios", label: "Usuários", icon: UserCog, adminOnly: true },
    { to: "/configuracoes", label: "Backup e Restauração", icon: DatabaseBackup, adminOnly: true },
  ],
};

const tipoLabel: Record<string, string> = {
  admin: "Administrador",
  usuario: "Usuário",
};

function NavLink({ it, active, badgeCount }: { it: NavItem; active: boolean; badgeCount?: number }) {
  const Icon = it.icon;
  return (
    <Link
      to={it.to}
      className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${
        active
          ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
          : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
      }`}
    >
      <Icon className="h-4 w-4 shrink-0" />
      <span className="flex-1 truncate">{it.label}</span>
      {!!badgeCount && (
        <span className="min-w-[1.25rem] h-5 px-1 rounded-full bg-red-500 text-white text-[11px] font-semibold flex items-center justify-center shrink-0">
          {badgeCount}
        </span>
      )}
    </Link>
  );
}

function NavGroupSection({ group, path, isAdmin, badges }: { group: NavGroup; path: string; isAdmin: boolean; badges: Record<string, number> }) {
  const visibleItems = group.items.filter((it) => !it.adminOnly || isAdmin);
  const hasActiveChild = visibleItems.some((it) => it.to === path);
  const [open, setOpen] = useState(hasActiveChild);
  const GroupIcon = group.icon;

  if (visibleItems.length === 0) return null;

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger asChild>
        <button
          className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${
            hasActiveChild && !open
              ? "bg-sidebar-accent/50 text-sidebar-accent-foreground font-medium"
              : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
          }`}
        >
          <GroupIcon className="h-4 w-4 shrink-0" />
          <span className="flex-1 text-left">{group.label}</span>
          <ChevronDown className={`h-3.5 w-3.5 shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent className="pl-4 mt-1 space-y-1 border-l border-sidebar-border ml-4">
        {visibleItems.map((it) => (
          <NavLink key={it.to} it={it} active={path === it.to} badgeCount={it.badgeKey ? badges[it.badgeKey] : undefined} />
        ))}
      </CollapsibleContent>
    </Collapsible>
  );
}

export function AppSidebar() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const { user, isAdmin, signOut } = useAuth();
  const navigate = useNavigate();

  const { data: pendentesCount = 0 } = useQuery({
    queryKey: ["solicitacoes_laboratorio", "pendentes-count"],
    enabled: isAdmin,
    refetchInterval: 60000,
    queryFn: async () => {
      const { count, error } = await supabase.from("solicitacoes_laboratorio").select("id", { count: "exact", head: true }).eq("status", "pendente");
      if (error) throw error;
      return count ?? 0;
    },
  });
  const badges = { labPendentes: pendentesCount };

  const handleSignOut = async () => {
    await signOut();
    navigate({ to: "/login" });
  };

  return (
    <aside className="no-print w-64 shrink-0 bg-sidebar text-sidebar-foreground flex flex-col min-h-screen">
      <div className="px-6 py-6 border-b border-sidebar-border">
        <div className="text-lg font-semibold tracking-tight">ClassHub L.K</div>
        <div className="text-xs opacity-70 mt-0.5">Planejamento de aulas</div>
      </div>
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        <NavLink it={dashboardItem} active={path === dashboardItem.to} />
        <NavGroupSection group={agendaGroup} path={path} isAdmin={isAdmin} badges={badges} />
        <NavLink it={relatoriosItem} active={path === relatoriosItem.to} />
        <NavGroupSection group={configGroup} path={path} isAdmin={isAdmin} badges={badges} />
      </nav>
      {user && (
        <div className="p-3 border-t border-sidebar-border space-y-2">
          <div className="px-2 py-1">
            <div className="text-sm font-medium truncate">{user.nome}</div>
            <div className="text-xs opacity-70">
              {user.usuario} · {tipoLabel[user.tipo] ?? user.tipo}
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
            onClick={handleSignOut}
          >
            <LogOut className="h-4 w-4" /> Sair
          </Button>
        </div>
      )}
    </aside>
  );
}
