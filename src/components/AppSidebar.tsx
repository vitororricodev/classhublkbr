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
  ChevronDown,
  DatabaseBackup,
  Menu,
  Megaphone,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";

type NavItem = { to: string; label: string; icon: React.ComponentType<{ className?: string }>; adminOnly?: boolean; badgeKey?: "labPendentes" };
type NavGroup = { label: string; icon: React.ComponentType<{ className?: string }>; items: NavItem[] };

const dashboardItem: NavItem = { to: "/", label: "Dashboard", icon: LayoutDashboard };

const agendaGroup: NavGroup = {
  label: "Agenda",
  icon: CalendarDays,
  items: [
    { to: "/agendamento", label: "Agendamento", icon: CalendarDays },
    { to: "/laboratorios", label: "Laboratórios", icon: MonitorSmartphone },
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
    { to: "/mural", label: "Gerenciar mural", icon: Megaphone, adminOnly: true },
    { to: "/usuarios", label: "Usuários", icon: UserCog, adminOnly: true },
    { to: "/configuracoes", label: "Backup e Restauração", icon: DatabaseBackup, adminOnly: true },
  ],
};

const tipoLabel: Record<string, string> = {
  admin: "Administrador",
  usuario: "Usuário",
};

function NavLink({ it, active, badgeCount, onNavigate }: { it: NavItem; active: boolean; badgeCount?: number; onNavigate?: () => void }) {
  const Icon = it.icon;
  return (
    <Link
      to={it.to}
      onClick={onNavigate}
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

function NavGroupSection({ group, path, isAdmin, badges, onNavigate }: { group: NavGroup; path: string; isAdmin: boolean; badges: Record<string, number>; onNavigate?: () => void }) {
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
          <NavLink key={it.to} it={it} active={path === it.to} badgeCount={it.badgeKey ? badges[it.badgeKey] : undefined} onNavigate={onNavigate} />
        ))}
      </CollapsibleContent>
    </Collapsible>
  );
}

export function AppSidebar() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const { user, isAdmin, signOut } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const badges = {};

  const handleSignOut = async () => {
    await signOut();
    setMobileOpen(false);
    navigate({ to: "/login" });
  };

  const navigation = (onNavigate?: () => void) => (
    <>
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        <NavLink it={dashboardItem} active={path === dashboardItem.to} onNavigate={onNavigate} />
        <NavGroupSection group={agendaGroup} path={path} isAdmin={isAdmin} badges={badges} onNavigate={onNavigate} />
        <NavLink it={relatoriosItem} active={path === relatoriosItem.to} onNavigate={onNavigate} />
        <NavGroupSection group={configGroup} path={path} isAdmin={isAdmin} badges={badges} onNavigate={onNavigate} />
      </nav>
      {user && (
        <div className="p-3 border-t border-sidebar-border space-y-2">
          <div className="px-2 py-1">
            <div className="text-sm font-medium truncate">{user.nome}</div>
            <div className="text-xs opacity-70">{user.usuario} · {tipoLabel[user.tipo] ?? user.tipo}</div>
          </div>
          <Link to="/alterar-senha" onClick={onNavigate} className="flex items-center gap-2 px-3 py-2 rounded-md text-sm text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground transition-colors">
            <KeyRound className="h-4 w-4" /> Alterar senha
          </Link>
          <Button variant="ghost" className="w-full justify-start gap-2 text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground" onClick={handleSignOut}>
            <LogOut className="h-4 w-4" /> Sair
          </Button>
        </div>
      )}
    </>
  );

  return (
    <>
      <header className="no-print sticky top-0 z-30 flex h-16 items-center justify-between border-b border-sidebar-border bg-sidebar px-4 text-sidebar-foreground md:hidden">
        <div>
          <div className="text-base font-semibold tracking-tight">SGE</div>
          <div className="text-[11px] opacity-70">Sistema de Gerenciamento Escolar</div>
        </div>
        <Button variant="ghost" size="icon" aria-label="Abrir menu" className="text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground" onClick={() => setMobileOpen(true)}>
          <Menu className="h-5 w-5" />
        </Button>
      </header>
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="flex w-[18rem] flex-col gap-0 border-sidebar-border bg-sidebar p-0 text-sidebar-foreground [&>button]:text-sidebar-foreground">
          <SheetHeader className="border-b border-sidebar-border px-6 py-5 text-left">
            <SheetTitle className="text-sidebar-foreground">Menu principal</SheetTitle>
          </SheetHeader>
          {navigation(() => setMobileOpen(false))}
        </SheetContent>
      </Sheet>
      <aside className="no-print hidden min-h-screen w-64 shrink-0 flex-col bg-sidebar text-sidebar-foreground md:flex">
        <div className="border-b border-sidebar-border px-6 py-6">
          <div className="text-lg font-semibold tracking-tight">SGE</div>
          <div className="mt-0.5 text-xs opacity-70">Sistema de Gerenciamento Escolar</div>
        </div>
        {navigation()}
      </aside>
    </>
  );
}
