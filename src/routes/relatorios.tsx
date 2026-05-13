import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Printer } from "lucide-react";
import { PLAN_SELECT } from "@/lib/db";
import type { Docente, Componente, Turma, PlanejamentoFull } from "@/lib/db";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/relatorios")({ component: RelatoriosPage });

function todayISO() { return new Date().toISOString().slice(0, 10); }
function firstOfMonth() { const d = new Date(); d.setDate(1); return d.toISOString().slice(0, 10); }
function fmtDate(iso: string) { return new Date(iso + "T00:00:00").toLocaleDateString("pt-BR"); }
function fmtDateTime(d: Date) {
  return d.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

function RelatoriosPage() {
  const { user } = useAuth();
  const [filtros, setFiltros] = useState({
    inicio: firstOfMonth(),
    fim: todayISO(),
    docente: "all",
    componente: "all",
    turma: "all",
    status: "all",
  });

  const { data: docentes = [] } = useQuery({ queryKey: ["docentes"], queryFn: async () => (await supabase.from("docentes").select("*").order("nome")).data as Docente[] });
  const { data: componentes = [] } = useQuery({ queryKey: ["componentes"], queryFn: async () => (await supabase.from("componentes_curriculares").select("*").order("nome")).data as Componente[] });
  const { data: turmas = [] } = useQuery({ queryKey: ["turmas"], queryFn: async () => (await supabase.from("turmas").select("*").order("nome")).data as Turma[] });

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["relatorio", filtros],
    queryFn: async () => {
      let q = supabase.from("planejamentos").select(PLAN_SELECT)
        .gte("data", filtros.inicio).lte("data", filtros.fim)
        .order("data").order("horario_id");
      if (filtros.docente !== "all") q = q.eq("docente_id", filtros.docente);
      if (filtros.componente !== "all") q = q.eq("componente_id", filtros.componente);
      if (filtros.turma !== "all") q = q.eq("turma_id", filtros.turma);
      if (filtros.status !== "all") q = q.eq("status", filtros.status);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as unknown as PlanejamentoFull[];
    },
  });

  const sorted = useMemo(() => [...rows].sort((a, b) => {
    if (a.data !== b.data) return a.data.localeCompare(b.data);
    return (a.horarios_padrao?.ordem ?? 0) - (b.horarios_padrao?.ordem ?? 0);
  }), [rows]);

  const docenteLabel = filtros.docente === "all" ? "Todos" : docentes.find((d) => d.id === filtros.docente)?.nome ?? "—";
  const componenteLabel = filtros.componente === "all" ? "Todos" : componentes.find((d) => d.id === filtros.componente)?.nome ?? "—";
  const turmaLabel = filtros.turma === "all" ? "Todas" : (() => { const t = turmas.find((d) => d.id === filtros.turma); return t ? `${t.serie} — ${t.nome}` : "—"; })();
  const statusLabel = filtros.status === "all" ? "Todos" : filtros.status;

  const geradoEm = fmtDateTime(new Date());

  return (
    <div className="p-8 space-y-6 print:p-0 print:space-y-0">
      <div className="flex items-center justify-between no-print">
        <div>
          <h1 className="text-2xl font-semibold">Relatórios</h1>
          <p className="text-sm text-muted-foreground">Filtre e imprima relatórios de aulas.</p>
        </div>
        <Button onClick={() => window.print()}><Printer className="h-4 w-4 mr-2" />Imprimir Relatório</Button>
      </div>

      <Card className="p-4 no-print">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="space-y-1"><Label>Data inicial</Label><Input type="date" value={filtros.inicio} onChange={(e) => setFiltros({ ...filtros, inicio: e.target.value })} /></div>
          <div className="space-y-1"><Label>Data final</Label><Input type="date" value={filtros.fim} onChange={(e) => setFiltros({ ...filtros, fim: e.target.value })} /></div>
          <FiltroSelect label="Docente" value={filtros.docente} onChange={(v) => setFiltros({ ...filtros, docente: v })} options={[{ value: "all", label: "Todos" }, ...docentes.map((d) => ({ value: d.id, label: d.nome }))]} />
          <FiltroSelect label="Componente" value={filtros.componente} onChange={(v) => setFiltros({ ...filtros, componente: v })} options={[{ value: "all", label: "Todos" }, ...componentes.map((d) => ({ value: d.id, label: d.nome }))]} />
          <FiltroSelect label="Turma" value={filtros.turma} onChange={(v) => setFiltros({ ...filtros, turma: v })} options={[{ value: "all", label: "Todas" }, ...turmas.map((d) => ({ value: d.id, label: `${d.serie} — ${d.nome}` }))]} />
          <FiltroSelect label="Status" value={filtros.status} onChange={(v) => setFiltros({ ...filtros, status: v })} options={[
            { value: "all", label: "Todos" }, { value: "planejado", label: "Planejado" }, { value: "realizado", label: "Realizado" }, { value: "cancelado", label: "Cancelado" }
          ]} />
        </div>
      </Card>

      {/* Screen preview + print area */}
      <Card className="p-6 print-area print:p-0 print:shadow-none print:border-0 print:bg-transparent">
        {/* Cabeçalho do relatório (visível em tela e na impressão) */}
        <header className="report-header">
          <div className="report-brand">
            <div className="report-brand-mark">P</div>
            <div className="report-brand-text">
              <div className="name">Planeja</div>
              <div className="sub">Sistema de Planejamento de Aulas</div>
            </div>
          </div>
          <div className="report-meta">
            <div><b>Emitido em:</b> {geradoEm}</div>
            <div><b>Responsável:</b> {user?.nome ?? "—"}</div>
            <div><b>Total de registros:</b> {sorted.length}</div>
          </div>
        </header>

        <h1 className="report-title">Relatório de Planejamento de Aulas</h1>
        <div className="report-period">
          Período: <b>{fmtDate(filtros.inicio)}</b> a <b>{fmtDate(filtros.fim)}</b>
          {" · "}Docente: <b>{docenteLabel}</b>
          {" · "}Componente: <b>{componenteLabel}</b>
          {" · "}Turma: <b>{turmaLabel}</b>
          {" · "}Status: <b className="capitalize">{statusLabel}</b>
        </div>

        {isLoading ? (
          <div className="text-sm text-muted-foreground py-8 text-center">Carregando...</div>
        ) : sorted.length === 0 ? (
          <div className="text-sm text-muted-foreground py-8 text-center">
            Nenhum registro encontrado para os filtros selecionados.
          </div>
        ) : (
          <table className="report-table">
            <colgroup>
              <col style={{ width: "9%" }} />
              <col style={{ width: "11%" }} />
              <col style={{ width: "16%" }} />
              <col style={{ width: "16%" }} />
              <col style={{ width: "12%" }} />
              <col style={{ width: "26%" }} />
              <col style={{ width: "10%" }} />
            </colgroup>
            <thead>
              <tr>
                <th>Data</th>
                <th>Horário</th>
                <th>Docente</th>
                <th>Componente</th>
                <th>Turma</th>
                <th>Conteúdo</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((r) => (
                <tr key={r.id}>
                  <td className="whitespace-nowrap">{fmtDate(r.data)}</td>
                  <td className="whitespace-nowrap">
                    {r.horarios_padrao?.label}
                    <div className="text-[8pt] text-neutral-500">
                      {r.horarios_padrao?.hora_inicio?.slice(0, 5)}
                      {r.horarios_padrao?.hora_fim ? `–${r.horarios_padrao.hora_fim.slice(0, 5)}` : ""}
                    </div>
                  </td>
                  <td>{r.docentes?.nome ?? "—"}</td>
                  <td>{r.componentes_curriculares?.nome ?? "—"}</td>
                  <td>{r.turmas ? `${r.turmas.serie} ${r.turmas.nome}` : "—"}</td>
                  <td>{r.conteudo || <span className="text-neutral-400">—</span>}</td>
                  <td>
                    <span className={`status-pill status-${r.status}`}>{r.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <footer className="report-footer">
          <span>Planeja — Planejamento de Aulas</span>
          <span>Emitido em {geradoEm}</span>
        </footer>
      </Card>
    </div>
  );
}

function FiltroSelect({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: { value: string; label: string }[] }) {
  return (
    <div className="space-y-1">
      <Label>{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger><SelectValue /></SelectTrigger>
        <SelectContent>{options.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
      </Select>
    </div>
  );
}
