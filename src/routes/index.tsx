import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CalendarDays, Users, CheckCircle2, Clock } from "lucide-react";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/")({ component: Dashboard });

function Dashboard() {
  const { user, isAdmin } = useAuth();
  const scope = isAdmin ? null : user?.id ?? null;
  const { data, isLoading } = useQuery({
    queryKey: ["dashboard-stats", scope ?? "all"],
    queryFn: async () => {
      const today = new Date().toISOString().slice(0, 10);
      const first = today.slice(0, 8) + "01";
      const next = new Date();
      next.setMonth(next.getMonth() + 1);
      next.setDate(1);
      const lastNext = next.toISOString().slice(0, 10);

      const withScope = (q: any) => (scope ? q.eq("criado_por", scope) : q);

      const [mes, docs, hoje, planejados, realizados] = await Promise.all([
        withScope(supabase.from("planejamentos").select("id", { count: "exact", head: true }).gte("data", first).lt("data", lastNext)),
        supabase.from("docentes").select("id", { count: "exact", head: true }).eq("ativo", true),
        withScope(supabase.from("planejamentos").select("id", { count: "exact", head: true }).eq("data", today)),
        withScope(supabase.from("planejamentos").select("id", { count: "exact", head: true }).eq("status", "planejado")),
        withScope(supabase.from("planejamentos").select("id", { count: "exact", head: true }).eq("status", "realizado")),
      ]);
      return {
        mes: mes.count ?? 0,
        docentes: docs.count ?? 0,
        hoje: hoje.count ?? 0,
        planejados: planejados.count ?? 0,
        realizados: realizados.count ?? 0,
      };
    },
  });

  const cards = [
    { label: "Aulas no mês", value: data?.mes ?? 0, icon: CalendarDays },
    { label: "Docentes ativos", value: data?.docentes ?? 0, icon: Users },
    { label: "Aulas de hoje", value: data?.hoje ?? 0, icon: Clock },
    { label: "Planejadas / Realizadas", value: `${data?.planejados ?? 0} / ${data?.realizados ?? 0}`, icon: CheckCircle2 },
  ];

  return (
    <div className="p-8 space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">Visão geral dos planejamentos e cadastros.</p>
      </header>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((c) => (
          <Card key={c.label} className="shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{c.label}</CardTitle>
              <c.icon className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-semibold">{isLoading ? "—" : c.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="shadow-sm">
        <CardHeader><CardTitle>Bem-vindo ao Planeja</CardTitle></CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>Use o menu lateral para gerenciar docentes, componentes, turmas, horários e relatórios.</p>
          <p>Acesse <span className="font-medium text-foreground">Agendamento</span> para visualizar e lançar aulas no calendário.</p>
        </CardContent>
      </Card>
    </div>
  );
}
