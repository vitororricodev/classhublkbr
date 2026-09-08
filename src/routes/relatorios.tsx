import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { BarChart3, CalendarDays, FileDown, FlaskConical, GraduationCap, LayoutGrid, ListFilter, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { PLAN_SELECT, AC_SELECT } from "@/lib/db";
import type { Docente, Componente, Turma, Horario, PlanejamentoFull, CategoriaAC, AtividadeComplementarFull } from "@/lib/db";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/relatorios")({ component: RelatoriosPage });

function todayISO() { return new Date().toISOString().slice(0, 10); }
function firstOfMonth() { const d = new Date(); d.setDate(1); return d.toISOString().slice(0, 10); }
function startOfWeekISO() { const d = new Date(); d.setDate(d.getDate() - d.getDay()); return d.toISOString().slice(0, 10); }
function endOfWeekISO() { const d = new Date(); d.setDate(d.getDate() - d.getDay() + 6); return d.toISOString().slice(0, 10); }
function addDaysISO(iso: string, days: number) { const d = new Date(iso + "T00:00:00"); d.setDate(d.getDate() + days); return d.toISOString().slice(0, 10); }
function fmtDate(iso: string) { return new Date(iso + "T00:00:00").toLocaleDateString("pt-BR"); }
function fmtDateTime(d: Date) {
  return d.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

function ReportMetric({ label, value, tone = "sky" }: { label: string; value: number | string; tone?: "sky" | "emerald" | "amber" | "violet" }) {
  const tones = {
    sky: "border-sky-100 bg-sky-50 text-sky-800",
    emerald: "border-emerald-100 bg-emerald-50 text-emerald-800",
    amber: "border-amber-100 bg-amber-50 text-amber-800",
    violet: "border-violet-100 bg-violet-50 text-violet-800",
  };
  return <div className={`rounded-xl border px-3 py-2.5 ${tones[tone]}`}><p className="text-xs font-medium opacity-75">{label}</p><p className="mt-0.5 text-xl font-semibold tabular-nums">{value}</p></div>;
}

function ReportSectionIntro({ icon: Icon, eyebrow, title, description }: { icon: typeof BarChart3; eyebrow: string; title: string; description: string }) {
  return <div className="flex gap-3 rounded-xl border bg-card p-4 shadow-sm">
    <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-sky-100 text-sky-700"><Icon className="size-5" /></div>
    <div><p className="text-xs font-semibold uppercase tracking-wide text-sky-700">{eyebrow}</p><h2 className="mt-0.5 font-semibold">{title}</h2><p className="mt-1 text-sm text-muted-foreground">{description}</p></div>
  </div>;
}

function RelatoriosPage() {
  const { isAdmin } = useAuth();
  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      <div className="rounded-2xl border border-sky-100 bg-gradient-to-br from-sky-50 via-background to-cyan-50 p-5 sm:p-7">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-700">ClassHub · Gestão escolar</p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">Central de relatórios</h1>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">Consulte planejamentos, acompanhe as grades docentes e organize a utilização dos ambientes em um só lugar.</p>
          </div>
          <div className="flex size-12 items-center justify-center rounded-2xl bg-sky-600 text-white shadow-sm"><BarChart3 className="size-6" /></div>
        </div>
      </div>

      <Tabs defaultValue={isAdmin ? "geral" : "docente"}>
        <TabsList className="grid h-auto w-full grid-cols-1 gap-1 rounded-xl bg-muted/70 p-1 sm:grid-cols-3">
          <TabsTrigger value="geral" className="justify-start gap-2 rounded-lg px-3 py-2.5 sm:justify-center"><ListFilter className="size-4" />Planejamentos</TabsTrigger>
          <TabsTrigger value="docente" className="justify-start gap-2 rounded-lg px-3 py-2.5 sm:justify-center"><GraduationCap className="size-4" />Grade docente</TabsTrigger>
          <TabsTrigger value="laboratorio" className="justify-start gap-2 rounded-lg px-3 py-2.5 sm:justify-center"><FlaskConical className="size-4" />Ambientes</TabsTrigger>
        </TabsList>
        <TabsContent value="geral">
          <RelatorioGeral />
        </TabsContent>
        <TabsContent value="docente">
          <RelatorioDocente />
        </TabsContent>
        <TabsContent value="laboratorio">
          <RelatorioLaboratorio />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function RelatorioGeral() {
  const { user, isAdmin } = useAuth();
  const [filtros, setFiltros] = useState(() =>
    isAdmin
      ? { inicio: firstOfMonth(), fim: todayISO(), docente: "all", componente: "all", turma: "all", status: "all" }
      : { inicio: startOfWeekISO(), fim: endOfWeekISO(), docente: "all", componente: "all", turma: "all", status: "all" }
  );

  const { data: docentes = [] } = useQuery({ queryKey: ["docentes"], queryFn: async () => (await supabase.from("docentes").select("*").order("nome")).data as Docente[] });
  const { data: componentes = [] } = useQuery({ queryKey: ["componentes"], queryFn: async () => (await supabase.from("componentes_curriculares").select("*").order("nome")).data as Componente[] });
  const { data: turmas = [] } = useQuery({ queryKey: ["turmas"], queryFn: async () => (await supabase.from("turmas").select("*").order("nome")).data as Turma[] });

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["relatorio", filtros, isAdmin ? "all" : user?.docente_id],
    queryFn: async () => {
      if (!isAdmin && !user?.docente_id) return [] as PlanejamentoFull[];
      let q = supabase.from("planejamentos").select(PLAN_SELECT)
        .gte("data", filtros.inicio).lte("data", filtros.fim)
        .order("data").order("horario_id");
      if (!isAdmin) q = q.eq("docente_id", user!.docente_id!);
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
  const statusCounts = useMemo(() => ({
    planejado: sorted.filter((item) => item.status === "planejado").length,
    realizado: sorted.filter((item) => item.status === "realizado").length,
    cancelado: sorted.filter((item) => item.status === "cancelado").length,
  }), [sorted]);

  const docenteLabel = filtros.docente === "all" ? "Todos" : docentes.find((d) => d.id === filtros.docente)?.nome ?? "—";
  const componenteLabel = filtros.componente === "all" ? "Todos" : componentes.find((d) => d.id === filtros.componente)?.nome ?? "—";
  const turmaLabel = filtros.turma === "all" ? "Todas" : (() => { const t = turmas.find((d) => d.id === filtros.turma); return t ? `${t.serie} — ${t.nome}` : "—"; })();
  const statusLabel = filtros.status === "all" ? "Todos" : filtros.status;

  const geradoEm = fmtDateTime(new Date());

  const handleExportPDF = () => {
    const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const marginX = 32;

    // Cabeçalho institucional
    doc.setFillColor(0, 123, 184);
    doc.rect(marginX, 28, 28, 28, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text("C", marginX + 14, 48, { align: "center" });

    doc.setTextColor(0, 108, 159);
    doc.setFontSize(13);
    doc.text("ClassHub", marginX + 38, 44);
    doc.setTextColor(85, 85, 85);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.text("Gestão escolar", marginX + 38, 55);

    doc.setTextColor(60, 60, 60);
    doc.setFontSize(8.5);
    const metaX = pageWidth - marginX;
    doc.text(`Emitido em: ${geradoEm}`, metaX, 36, { align: "right" });
    doc.text(`Responsável: ${user?.nome ?? "—"}`, metaX, 47, { align: "right" });
    doc.text(`Total de registros: ${sorted.length}`, metaX, 58, { align: "right" });

    doc.setDrawColor(0, 123, 184);
    doc.setLineWidth(1.2);
    doc.line(marginX, 68, pageWidth - marginX, 68);

    doc.setTextColor(26, 26, 26);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.text("Relatório de Planejamento de Aulas", pageWidth / 2, 86, { align: "center" });

    // Filtros
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(85, 85, 85);
    const filtrosTxt = `Período: ${fmtDate(filtros.inicio)} a ${fmtDate(filtros.fim)}  ·  Docente: ${docenteLabel}  ·  Componente: ${componenteLabel}  ·  Turma: ${turmaLabel}  ·  Status: ${statusLabel}`;
    const filtrosLines = doc.splitTextToSize(filtrosTxt, pageWidth - marginX * 2);
    doc.text(filtrosLines, pageWidth / 2, 102, { align: "center" });

    const body = sorted.map((r) => [
      fmtDate(r.data),
      `${r.horarios_padrao?.label ?? ""}${r.horarios_padrao?.hora_inicio ? `\n${r.horarios_padrao.hora_inicio.slice(0, 5)}${r.horarios_padrao.hora_fim ? `–${r.horarios_padrao.hora_fim.slice(0, 5)}` : ""}` : ""}`,
      r.docentes?.nome ?? "—",
      r.componentes_curriculares?.nome ?? "—",
      r.turmas ? `${r.turmas.serie} ${r.turmas.nome}` : "—",
      r.conteudo || "—",
      r.status,
    ]);

    autoTable(doc, {
      startY: 118,
      head: [["Data", "Horário", "Docente", "Componente", "Turma", "Conteúdo", "Status"]],
      body,
      margin: { left: marginX, right: marginX, bottom: 36 },
      styles: { font: "helvetica", fontSize: 9, cellPadding: 5, overflow: "linebreak", valign: "top", textColor: [34, 34, 34] },
      headStyles: { fillColor: [0, 123, 184], textColor: 255, fontStyle: "bold", fontSize: 9 },
      alternateRowStyles: { fillColor: [240, 249, 252] },
      columnStyles: {
        0: { cellWidth: 60 },
        1: { cellWidth: 70 },
        2: { cellWidth: "auto" },
        3: { cellWidth: "auto" },
        4: { cellWidth: 70 },
        5: { cellWidth: "auto" },
        6: { cellWidth: 60 },
      },
      showHead: "everyPage",
      didDrawPage: () => {
        const pageCount = doc.getNumberOfPages();
        const currentPage = doc.getCurrentPageInfo().pageNumber;
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.setTextColor(119, 119, 119);
        doc.text("ClassHub — Gestão escolar", marginX, pageHeight - 16);
        doc.text(`Página ${currentPage} de ${pageCount}`, pageWidth / 2, pageHeight - 16, { align: "center" });
        doc.text(`Emitido em ${geradoEm}`, pageWidth - marginX, pageHeight - 16, { align: "right" });
      },
    });

    doc.save(`relatorio-aulas-${filtros.inicio}-a-${filtros.fim}.pdf`);
  };

  return (
    <div className="space-y-6 pt-4">
      <ReportSectionIntro icon={CalendarDays} eyebrow="Planejamento" title="Aulas planejadas" description="Acompanhe o que foi previsto, realizado ou cancelado por período, docente, turma e componente." />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <ReportMetric label="Registros" value={sorted.length} />
          <ReportMetric label="Planejados" value={statusCounts.planejado} tone="amber" />
          <ReportMetric label="Realizados" value={statusCounts.realizado} tone="emerald" />
          <ReportMetric label="Cancelados" value={statusCounts.cancelado} tone="violet" />
        </div>
        <Button onClick={handleExportPDF} disabled={sorted.length === 0}>
          <FileDown className="h-4 w-4 mr-2" />Exportar PDF
        </Button>
      </div>

      <Card className="border-sky-100 p-4 sm:p-5">
        <div className="mb-4"><h3 className="font-medium">Refinar consulta</h3><p className="mt-1 text-sm text-muted-foreground">Os resultados e o PDF são atualizados conforme os filtros abaixo.</p></div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <div className="space-y-1"><Label>Data inicial</Label><Input type="date" value={filtros.inicio} onChange={(e) => setFiltros({ ...filtros, inicio: e.target.value })} /></div>
          <div className="space-y-1"><Label>Data final</Label><Input type="date" value={filtros.fim} onChange={(e) => setFiltros({ ...filtros, fim: e.target.value })} /></div>
          {isAdmin && <FiltroSelect label="Docente" value={filtros.docente} onChange={(v) => setFiltros({ ...filtros, docente: v })} options={[{ value: "all", label: "Todos" }, ...docentes.map((d) => ({ value: d.id, label: d.nome }))]} />}
          <FiltroSelect label="Componente" value={filtros.componente} onChange={(v) => setFiltros({ ...filtros, componente: v })} options={[{ value: "all", label: "Todos" }, ...componentes.map((d) => ({ value: d.id, label: d.nome }))]} />
          <FiltroSelect label="Turma" value={filtros.turma} onChange={(v) => setFiltros({ ...filtros, turma: v })} options={[{ value: "all", label: "Todas" }, ...turmas.map((d) => ({ value: d.id, label: `${d.serie} — ${d.nome}` }))]} />
          <FiltroSelect label="Status" value={filtros.status} onChange={(v) => setFiltros({ ...filtros, status: v })} options={[
            { value: "all", label: "Todos" }, { value: "planejado", label: "Planejado" }, { value: "realizado", label: "Realizado" }, { value: "cancelado", label: "Cancelado" }
          ]} />
        </div>
        {!isAdmin && !user?.docente_id && (
          <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-3 py-2 mt-3">
            Seu login ainda não está vinculado a um docente. Peça para um administrador vincular seu usuário em <b>Usuários</b> para ver seu relatório aqui.
          </p>
        )}
      </Card>

      <Card className="overflow-hidden p-0">
        <div className="border-b bg-muted/30 p-4 sm:p-5"><h3 className="font-medium">Pré-visualização</h3><div className="mt-1 text-sm text-muted-foreground">
          {isLoading ? "Carregando..." : `${sorted.length} registro(s) encontrado(s) no período de ${fmtDate(filtros.inicio)} a ${fmtDate(filtros.fim)}.`}
        </div></div>
        {!isLoading && sorted.length > 0 && (
          <div className="max-h-[480px] overflow-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted sticky top-0">
                <tr>
                  <th className="text-left p-2">Data</th>
                  <th className="text-left p-2">Horário</th>
                  <th className="text-left p-2">Docente</th>
                  <th className="text-left p-2">Componente</th>
                  <th className="text-left p-2">Turma</th>
                  <th className="text-left p-2">Conteúdo</th>
                  <th className="text-left p-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {sorted.slice(0, 50).map((r) => (
                  <tr key={r.id} className="border-t">
                    <td className="p-2 whitespace-nowrap">{fmtDate(r.data)}</td>
                    <td className="p-2 whitespace-nowrap">{r.horarios_padrao?.label}</td>
                    <td className="p-2">{r.docentes?.nome ?? "—"}</td>
                    <td className="p-2">{r.componentes_curriculares?.nome ?? "—"}</td>
                    <td className="p-2">{r.turmas ? `${r.turmas.serie} ${r.turmas.nome}` : "—"}</td>
                    <td className="p-2">{r.conteudo || "—"}</td>
                    <td className="p-2 capitalize">{r.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {sorted.length > 50 && (
              <div className="p-2 text-xs text-muted-foreground text-center">
                Pré-visualização de 50 de {sorted.length} registros. Exporte em PDF para ver todos.
              </div>
            )}
          </div>
        )}
        {!isLoading && sorted.length === 0 && <div className="p-8 text-center text-sm text-muted-foreground">Nenhum planejamento encontrado para os filtros selecionados.</div>}
      </Card>
    </div>
  );
}

type FormatoRelatorio = "tabela" | "lista";

function RelatorioDocente() {
  const { user, isAdmin } = useAuth();
  const [docenteId, setDocenteId] = useState<string>("");
  const [periodo, setPeriodo] = useState({ inicio: startOfWeekISO(), fim: endOfWeekISO() });
  const [formato, setFormato] = useState<FormatoRelatorio>("tabela");

  const { data: docentesLista = [] } = useQuery({
    queryKey: ["docentes", "ativos", "select-relatorio"],
    enabled: isAdmin,
    queryFn: async () => {
      const { data, error } = await supabase.from("docentes").select("*").eq("ativo", true).order("nome");
      if (error) throw error;
      return data as Docente[];
    },
  });

  // Para professor: sempre o próprio docente. Para admin: o selecionado no dropdown.
  const scopedDocenteId = isAdmin ? (docenteId || null) : (user?.docente_id ?? null);

  const { data: horarios = [] } = useQuery({
    queryKey: ["horarios", "ativos", "ordenados"],
    queryFn: async () => {
      const { data, error } = await supabase.from("horarios_padrao").select("*").eq("ativo", true).order("ordem");
      if (error) throw error;
      return data as Horario[];
    },
  });

  const { data: aulas = [], isLoading } = useQuery({
    queryKey: ["planejamentos", "docente-relatorio", scopedDocenteId, periodo],
    enabled: !!scopedDocenteId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("planejamentos")
        .select(PLAN_SELECT)
        .eq("docente_id", scopedDocenteId!)
        .gte("data", periodo.inicio).lte("data", periodo.fim)
        .neq("status", "cancelado")
        .order("data").order("horario_id");
      if (error) throw error;
      return (data ?? []) as unknown as PlanejamentoFull[];
    },
  });

  const qc = useQueryClient();
  const { data: acs = [], isLoading: isLoadingAC } = useQuery({
    queryKey: ["atividades_complementares", scopedDocenteId, periodo],
    enabled: !!scopedDocenteId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("atividades_complementares")
        .select(AC_SELECT)
        .eq("docente_id", scopedDocenteId!)
        .gte("data", periodo.inicio).lte("data", periodo.fim)
        .order("data").order("horario_id");
      if (error) throw error;
      return (data ?? []) as unknown as AtividadeComplementarFull[];
    },
  });

  const [acFormOpen, setAcFormOpen] = useState(false);
  const [acEditing, setAcEditing] = useState<AtividadeComplementarFull | null>(null);

  const delAC = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("atividades_complementares").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("AC excluída"); qc.invalidateQueries({ queryKey: ["atividades_complementares"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const docenteSelecionado = isAdmin ? docentesLista.find((d) => d.id === docenteId) : null;
  const nomeDocente = isAdmin ? (docenteSelecionado?.nome ?? null) : (user?.nome ?? null);

  const datas = useMemo(() => {
    if (!periodo.inicio || !periodo.fim) return [];
    const start = new Date(periodo.inicio + "T00:00:00");
    const end = new Date(periodo.fim + "T00:00:00");
    if (start > end) return [];
    const out: string[] = [];
    const d = new Date(start);
    while (d <= end) {
      if (DIAS_LETIVOS.includes(d.getDay())) out.push(d.toISOString().slice(0, 10));
      d.setDate(d.getDate() + 1);
    }
    return out;
  }, [periodo]);

  const mapaAulas = useMemo(() => {
    const m = new Map<string, PlanejamentoFull>();
    for (const a of aulas) m.set(`${a.data}__${a.horario_id}`, a);
    return m;
  }, [aulas]);

  const mapaAC = useMemo(() => {
    const m = new Map<string, AtividadeComplementarFull>();
    for (const a of acs) m.set(`${a.data}__${a.horario_id}`, a);
    return m;
  }, [acs]);

  const geradoEm = fmtDateTime(new Date());

  const handleExportPDF = () => {
    if (!nomeDocente) return;
    const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const marginX = 32;

    doc.setFillColor(0, 123, 184);
    doc.rect(marginX, 28, 28, 28, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text("C", marginX + 14, 48, { align: "center" });

    doc.setTextColor(0, 108, 159);
    doc.setFontSize(13);
    doc.text("ClassHub", marginX + 38, 44);
    doc.setTextColor(85, 85, 85);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.text("Gestão escolar", marginX + 38, 55);

    doc.setTextColor(60, 60, 60);
    doc.setFontSize(8.5);
    const metaX = pageWidth - marginX;
    doc.text(`Emitido em: ${geradoEm}`, metaX, 36, { align: "right" });
    doc.text(`Gerado por: ${user?.nome ?? "—"}`, metaX, 47, { align: "right" });

    doc.setDrawColor(0, 123, 184);
    doc.setLineWidth(1.2);
    doc.line(marginX, 68, pageWidth - marginX, 68);

    doc.setTextColor(26, 26, 26);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.text(`Grade de Aulas — ${nomeDocente}`, pageWidth / 2, 86, { align: "center" });

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(85, 85, 85);
    doc.text(`Período: ${fmtDate(periodo.inicio)} a ${fmtDate(periodo.fim)}`, pageWidth / 2, 102, { align: "center" });

    if (formato === "tabela") {
      const head = ["Horário", ...datas.map((dt) => `${new Date(dt + "T00:00:00").toLocaleDateString("pt-BR", { weekday: "short" })} ${fmtDate(dt)}`)];
      const body = horarios.map((h) => [
        h.eh_intervalo
          ? { content: `${h.label} (Intervalo)`, styles: { fillColor: [254, 226, 226], textColor: [153, 27, 27], fontStyle: "bold" } }
          : `${h.label}${h.hora_inicio ? `\n${h.hora_inicio.slice(0, 5)}–${h.hora_fim?.slice(0, 5) ?? ""}` : ""}`,
        ...datas.map((dt) => {
          if (h.eh_intervalo) return { content: "Intervalo", styles: { fillColor: [254, 226, 226], textColor: [153, 27, 27] } };
          const a = mapaAulas.get(`${dt}__${h.id}`);
          const ac = mapaAC.get(`${dt}__${h.id}`);
          if (ac) return { content: `AC — ${ac.categorias_ac?.nome ?? "—"}`, styles: { fillColor: [226, 245, 251], textColor: [0, 108, 159], fontStyle: "bold" } };
          if (!a) return "—";
          return `${a.componentes_curriculares?.nome ?? "—"}\n${a.turmas ? `${a.turmas.serie} ${a.turmas.nome}` : "—"}`;
        }),
      ]);
      autoTable(doc, {
        startY: 118,
        head: [head],
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        body: body as any,
        margin: { left: marginX, right: marginX, bottom: 36 },
        styles: { font: "helvetica", fontSize: 8.5, cellPadding: 5, overflow: "linebreak", valign: "top", textColor: [34, 34, 34], halign: "center" },
        headStyles: { fillColor: [0, 123, 184], textColor: 255, fontStyle: "bold", fontSize: 8.5 },
        alternateRowStyles: { fillColor: [240, 249, 252] },
        columnStyles: { 0: { cellWidth: 80, halign: "left", fontStyle: "bold" } },
        showHead: "everyPage",
        didDrawPage: () => {
          const pageCount = doc.getNumberOfPages();
          const currentPage = doc.getCurrentPageInfo().pageNumber;
          doc.setFont("helvetica", "normal");
          doc.setFontSize(8);
          doc.setTextColor(119, 119, 119);
          doc.text("ClassHub — Gestão escolar", marginX, pageHeight - 16);
          doc.text(`Página ${currentPage} de ${pageCount}`, pageWidth / 2, pageHeight - 16, { align: "center" });
          doc.text(`Emitido em ${geradoEm}`, pageWidth - marginX, pageHeight - 16, { align: "right" });
        },
      });
    } else {
      type LinhaLista = { data: string; ordem: number; horarioLabel: string; tipo: "Aula" | "AC"; col3: string; col4: string; status: string };
      const linhasAulas: LinhaLista[] = aulas.map((a) => ({
        data: a.data, ordem: a.horarios_padrao?.ordem ?? 0, horarioLabel: a.horarios_padrao?.label ?? "",
        tipo: "Aula", col3: a.componentes_curriculares?.nome ?? "—", col4: a.turmas ? `${a.turmas.serie} ${a.turmas.nome}` : "—", status: a.status,
      }));
      const linhasAC: LinhaLista[] = acs.map((a) => ({
        data: a.data, ordem: a.horarios_padrao?.ordem ?? 0, horarioLabel: a.horarios_padrao?.label ?? "",
        tipo: "AC", col3: a.categorias_ac?.nome ?? "—", col4: a.observacao || "—", status: "—",
      }));
      const linhas = [...linhasAulas, ...linhasAC].sort((x, y) => x.data === y.data ? x.ordem - y.ordem : x.data.localeCompare(y.data));
      const body = linhas.map((r) => [fmtDate(r.data), r.horarioLabel, r.tipo, r.col3, r.col4, r.status]);
      autoTable(doc, {
        startY: 118,
        head: [["Data", "Horário", "Tipo", "Componente / Categoria", "Turma / Observação", "Status"]],
        body,
        margin: { left: marginX, right: marginX, bottom: 36 },
        styles: { font: "helvetica", fontSize: 9, cellPadding: 5, overflow: "linebreak", valign: "top", textColor: [34, 34, 34] },
        headStyles: { fillColor: [0, 123, 184], textColor: 255, fontStyle: "bold", fontSize: 9 },
        alternateRowStyles: { fillColor: [240, 249, 252] },
        showHead: "everyPage",
        didDrawPage: () => {
          const pageCount = doc.getNumberOfPages();
          const currentPage = doc.getCurrentPageInfo().pageNumber;
          doc.setFont("helvetica", "normal");
          doc.setFontSize(8);
          doc.setTextColor(119, 119, 119);
          doc.text("ClassHub — Gestão escolar", marginX, pageHeight - 16);
          doc.text(`Página ${currentPage} de ${pageCount}`, pageWidth / 2, pageHeight - 16, { align: "center" });
          doc.text(`Emitido em ${geradoEm}`, pageWidth - marginX, pageHeight - 16, { align: "right" });
        },
      });
    }

    doc.save(`grade-${(nomeDocente || "docente").toLowerCase().replace(/\s+/g, "-")}-${periodo.inicio}-a-${periodo.fim}.pdf`);
  };

  return (
    <div className="space-y-6 pt-4">
      <ReportSectionIntro icon={LayoutGrid} eyebrow="Docentes" title="Grade e atividades complementares" description="Consulte a rotina de cada docente em formato de grade ou lista, com aulas e atividades complementares no mesmo relatório." />
      <div className="flex items-center justify-between flex-wrap gap-2">
        <p className="text-sm text-muted-foreground max-w-xl">
          {isAdmin
            ? "Selecione um docente e um período para preparar a consulta ou exportar a grade."
            : "Sua grade de aulas no período selecionado."}
        </p>
        <div className="flex gap-2">
          {isAdmin && (
            <Button variant="outline" onClick={() => { setAcEditing(null); setAcFormOpen(true); }} disabled={!scopedDocenteId}>
              <Plus className="h-4 w-4 mr-2" />Lançar AC
            </Button>
          )}
          <Button onClick={handleExportPDF} disabled={!scopedDocenteId || datas.length === 0}>
            <FileDown className="h-4 w-4 mr-2" />Exportar PDF
          </Button>
        </div>
      </div>

      <Card className="border-sky-100 p-4 sm:p-5">
        <div className="mb-4"><h3 className="font-medium">Configurar relatório</h3><p className="mt-1 text-sm text-muted-foreground">Defina o docente, o período e o formato de visualização.</p></div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {isAdmin && (
            <div className="space-y-1 col-span-2 md:col-span-1">
              <Label>Docente</Label>
              <Select value={docenteId} onValueChange={setDocenteId}>
                <SelectTrigger><SelectValue placeholder="Selecione um docente" /></SelectTrigger>
                <SelectContent>
                  {docentesLista.map((d) => <SelectItem key={d.id} value={d.id}>{d.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="space-y-1"><Label>Data inicial</Label><Input type="date" value={periodo.inicio} onChange={(e) => setPeriodo({ ...periodo, inicio: e.target.value })} /></div>
          <div className="space-y-1"><Label>Data final</Label><Input type="date" value={periodo.fim} onChange={(e) => setPeriodo({ ...periodo, fim: e.target.value })} /></div>
          <div className="space-y-1">
            <Label>Formato</Label>
            <Select value={formato} onValueChange={(v) => setFormato(v as FormatoRelatorio)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="tabela">Tabela (grade)</SelectItem>
                <SelectItem value="lista">Lista</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        {!isAdmin && !user?.docente_id && (
          <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-3 py-2 mt-3">
            Seu login ainda não está vinculado a um docente. Peça para um administrador vincular seu usuário em <b>Usuários</b> para ver sua grade aqui.
          </p>
        )}
        {isAdmin && !docenteId && (
          <p className="text-xs text-muted-foreground mt-3">Selecione um docente acima para gerar a grade.</p>
        )}
      </Card>

      {scopedDocenteId && (
        <Card className="overflow-hidden p-0">
          <div className="border-b bg-muted/30 p-4 sm:p-5">
            <div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="font-medium">{nomeDocente ?? "Docente"}</h3><div className="mt-1 text-sm text-muted-foreground">
              {(isLoading || isLoadingAC) ? "Carregando..." : `Período de ${fmtDate(periodo.inicio)} a ${fmtDate(periodo.fim)}.`}
            </div></div><div className="grid grid-cols-2 gap-2 sm:grid-cols-3"><ReportMetric label="Aulas" value={aulas.length} /><ReportMetric label="ACs" value={acs.length} tone="violet" /><ReportMetric label="Dias letivos" value={datas.length} tone="emerald" /></div></div>
          </div>

          {!isLoading && !isLoadingAC && formato === "tabela" && datas.length > 0 && horarios.length > 0 && (
            <div className="overflow-auto max-h-[560px] border rounded-md">
              <table className="w-full text-sm border-collapse">
                <thead className="bg-muted sticky top-0 z-10">
                  <tr>
                    <th className="text-left p-2 sticky left-0 bg-muted z-20 whitespace-nowrap">Horário</th>
                    {datas.map((dt) => (
                      <th key={dt} className="text-center p-2 whitespace-nowrap">
                        <div className="capitalize">{new Date(dt + "T00:00:00").toLocaleDateString("pt-BR", { weekday: "short" })}</div>
                        <div className="text-xs font-normal text-muted-foreground">{fmtDate(dt)}</div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {horarios.map((h) => (
                    <tr key={h.id} className={`border-t ${h.eh_intervalo ? "bg-red-50" : ""}`}>
                      <td className={`p-2 sticky left-0 whitespace-nowrap font-medium ${h.eh_intervalo ? "bg-red-50 text-red-800" : "bg-background"}`}>
                        {h.label}
                        <div className={`text-xs font-normal ${h.eh_intervalo ? "text-red-700/80" : "text-muted-foreground"}`}>
                          {h.eh_intervalo ? "Intervalo" : `${h.hora_inicio?.slice(0, 5)}–${h.hora_fim?.slice(0, 5)}`}
                        </div>
                      </td>
                      {datas.map((dt) => {
                        if (h.eh_intervalo) {
                          return <td key={dt} className="p-2 text-center align-top bg-red-50 text-xs text-red-700/70">Intervalo</td>;
                        }
                        const a = mapaAulas.get(`${dt}__${h.id}`);
                        const ac = mapaAC.get(`${dt}__${h.id}`);
                        return (
                          <td key={dt} className="p-2 text-center align-top">
                            {ac ? (
                              <div className="rounded-md border px-2 py-1 space-y-0.5 bg-violet-50 border-violet-200">
                                <div className="text-xs font-medium text-violet-800">AC — {ac.categorias_ac?.nome ?? "—"}</div>
                                {ac.observacao && <div className="text-[11px] text-violet-700/80">{ac.observacao}</div>}
                                {isAdmin && (
                                  <div className="flex gap-1 justify-center pt-1">
                                    <Button size="sm" variant="outline" className="h-6 px-1.5" onClick={() => { setAcEditing(ac); setAcFormOpen(true); }}><Pencil className="h-3 w-3" /></Button>
                                    <Button size="sm" variant="outline" className="h-6 px-1.5" onClick={() => { if (confirm("Excluir esta AC?")) delAC.mutate(ac.id); }}><Trash2 className="h-3 w-3" /></Button>
                                  </div>
                                )}
                              </div>
                            ) : a ? (
                              <div className="rounded-md border px-2 py-1 space-y-0.5" style={{ borderLeft: `4px solid ${a.docentes?.cor_identificadora || "#007BB8"}` }}>
                                <div className="text-xs font-medium">{a.componentes_curriculares?.nome ?? "—"}</div>
                                <div className="text-[11px] text-muted-foreground">{a.turmas ? `${a.turmas.serie} ${a.turmas.nome}` : "—"}</div>
                              </div>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {!isLoading && !isLoadingAC && formato === "lista" && (
            <div className="overflow-auto max-h-[480px] border rounded-md">
              <table className="w-full text-sm">
                <thead className="bg-muted sticky top-0">
                  <tr>
                    <th className="text-left p-2">Data</th>
                    <th className="text-left p-2">Horário</th>
                    <th className="text-left p-2">Tipo</th>
                    <th className="text-left p-2">Componente / Categoria</th>
                    <th className="text-left p-2">Turma / Observação</th>
                    <th className="text-left p-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ...aulas.map((a) => ({
                      key: `aula-${a.id}`, data: a.data, ordem: a.horarios_padrao?.ordem ?? 0, horarioLabel: a.horarios_padrao?.label ?? "",
                      tipo: "Aula" as const, col3: a.componentes_curriculares?.nome ?? "—", col4: a.turmas ? `${a.turmas.serie} ${a.turmas.nome}` : "—", status: a.status,
                    })),
                    ...acs.map((a) => ({
                      key: `ac-${a.id}`, data: a.data, ordem: a.horarios_padrao?.ordem ?? 0, horarioLabel: a.horarios_padrao?.label ?? "",
                      tipo: "AC" as const, col3: a.categorias_ac?.nome ?? "—", col4: a.observacao || "—", status: "—",
                    })),
                  ]
                    .sort((x, y) => (x.data === y.data ? x.ordem - y.ordem : x.data.localeCompare(y.data)))
                    .map((r) => (
                      <tr key={r.key} className={`border-t ${r.tipo === "AC" ? "bg-violet-50" : ""}`}>
                        <td className="p-2 whitespace-nowrap">{fmtDate(r.data)}</td>
                        <td className="p-2 whitespace-nowrap">{r.horarioLabel}</td>
                        <td className="p-2">
                          {r.tipo === "AC" ? <Badge className="bg-violet-100 text-violet-800 hover:bg-violet-100">AC</Badge> : <Badge variant="secondary">Aula</Badge>}
                        </td>
                        <td className="p-2">{r.col3}</td>
                        <td className="p-2">{r.col4}</td>
                        <td className="p-2 capitalize">{r.status}</td>
                      </tr>
                    ))}
                  {aulas.length === 0 && acs.length === 0 && (
                    <tr><td colSpan={6} className="text-center text-muted-foreground py-6">Nenhuma aula ou AC neste período.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {isAdmin && scopedDocenteId && acFormOpen && (
        <LancarACDialog
          open={acFormOpen}
          onClose={() => setAcFormOpen(false)}
          docenteId={scopedDocenteId}
          horarios={horarios}
          editing={acEditing}
        />
      )}
    </div>
  );
}

function LancarACDialog({
  open, onClose, docenteId, horarios, editing,
}: {
  open: boolean; onClose: () => void; docenteId: string; horarios: Horario[]; editing: AtividadeComplementarFull | null;
}) {
  const qc = useQueryClient();
  const [data, setData] = useState(editing?.data ?? todayISO());
  const [horarioId, setHorarioId] = useState(editing?.horario_id ?? "");
  const [categoriaId, setCategoriaId] = useState(editing?.categoria_id ?? "");
  const [observacao, setObservacao] = useState(editing?.observacao ?? "");

  const { data: categorias = [] } = useQuery({
    queryKey: ["categorias_ac", "ativas"],
    queryFn: async () => {
      const { data, error } = await supabase.from("categorias_ac").select("*").eq("ativo", true).order("nome");
      if (error) throw error;
      return data as CategoriaAC[];
    },
  });

  const save = useMutation({
    mutationFn: async () => {
      if (!horarioId) throw new Error("Selecione o horário.");
      if (!categoriaId) throw new Error("Selecione a categoria.");
      const payload = { docente_id: docenteId, data, horario_id: horarioId, categoria_id: categoriaId, observacao: observacao || null };
      if (editing) {
        const { error } = await supabase.from("atividades_complementares").update(payload).eq("id", editing.id);
        if (error) {
          if (error.code === "23505") throw new Error("Este docente já tem uma AC lançada neste horário/dia.");
          throw error;
        }
      } else {
        const { error } = await supabase.from("atividades_complementares").insert(payload);
        if (error) {
          if (error.code === "23505") throw new Error("Este docente já tem uma AC lançada neste horário/dia.");
          throw error;
        }
      }
    },
    onSuccess: () => {
      toast.success(editing ? "AC atualizada" : "AC lançada");
      qc.invalidateQueries({ queryKey: ["atividades_complementares"] });
      onClose();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editing ? "Editar AC" : "Lançar Atividade Complementar"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2"><Label>Data</Label><Input type="date" value={data} onChange={(e) => setData(e.target.value)} /></div>
            <div className="space-y-2">
              <Label>Horário</Label>
              <Select value={horarioId} onValueChange={setHorarioId}>
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>{horarios.map((h) => <SelectItem key={h.id} value={h.id}>{h.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Categoria</Label>
            <Select value={categoriaId} onValueChange={setCategoriaId}>
              <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
              <SelectContent>
                {categorias.length === 0 && <div className="px-3 py-2 text-xs text-muted-foreground">Nenhuma categoria cadastrada — crie em "Categorias de AC".</div>}
                {categorias.map((c) => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Observação (opcional)</Label>
            <Textarea rows={3} value={observacao} onChange={(e) => setObservacao(e.target.value)} placeholder="Ex: Apresentou plano de aula do 2º bimestre, feedback positivo." />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={() => save.mutate()} disabled={save.isPending}>{save.isPending ? "Salvando..." : "Salvar"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Dias da semana em que a escola funciona (1=Segunda ... 6=Sábado). Domingo (0) é sempre ignorado.
const DIAS_LETIVOS = [1, 2, 3, 4, 5, 6];

type Ocupacao = { turma: Turma | null; docente: Docente | null; componente: Componente | null; tipo_atividade: string | null; alunos_participantes: string | null; recursos_utilizados: string | null; habilidades: string | null; objeto_conhecimento: string | null };

function RelatorioLaboratorio() {
  const { user } = useAuth();
  const [periodo, setPeriodo] = useState({ inicio: startOfWeekISO(), fim: endOfWeekISO() });
  const [formato, setFormato] = useState<FormatoRelatorio>("tabela");
  const [laboratorioId, setLaboratorioId] = useState("");
  // Os tipos locais ainda não contêm laboratorios; serão regenerados após a migration.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any;
  const { data: laboratorios = [] } = useQuery({ queryKey: ["laboratorios", "relatorio"], queryFn: async () => {
    const { data, error } = await sb.from("laboratorios").select("id, nome, slug").eq("ativo", true).order("nome");
    if (error) throw error;
    return (data ?? []) as { id: string; nome: string; slug: string }[];
  }});
  useEffect(() => { if (!laboratorioId && laboratorios[0]) setLaboratorioId(laboratorios[0].id); }, [laboratorioId, laboratorios]);
  const laboratorio = laboratorios.find((item) => item.id === laboratorioId);

  const { data: horarios = [] } = useQuery({
    queryKey: ["horarios", "ativos", "ordenados"],
    queryFn: async () => {
      const { data, error } = await supabase.from("horarios_padrao").select("*").eq("ativo", true).order("ordem");
      if (error) throw error;
      return data as Horario[];
    },
  });

  const { data: ocupacoes = [], isLoading } = useQuery({
    queryKey: ["laboratorio_agendamentos", "disponibilidade", laboratorioId, periodo],
    enabled: !!laboratorioId,
    queryFn: async () => {
      const { data, error } = await sb
        .from("laboratorio_agendamentos")
        .select(`data, horario_id, tipo_atividade, alunos_participantes, recursos_utilizados, habilidades, objeto_conhecimento, turmas:turma_id(*), docentes:docente_id(*), componentes_curriculares:componente_id(*)`)
        .gte("data", periodo.inicio)
        .lte("data", periodo.fim)
        .eq("laboratorio_id", laboratorioId)
        .neq("status", "cancelado");
      if (error) throw error;
      return (data ?? []) as unknown as ({ data: string; horario_id: string; turmas: Turma | null; docentes: Docente | null; componentes_curriculares: Componente | null } & Omit<Ocupacao, "turma" | "docente" | "componente">)[];
    },
  });

  const datas = useMemo(() => {
    if (!periodo.inicio || !periodo.fim) return [];
    const start = new Date(periodo.inicio + "T00:00:00");
    const end = new Date(periodo.fim + "T00:00:00");
    if (start > end) return [];
    const out: string[] = [];
    const d = new Date(start);
    while (d <= end) {
      if (DIAS_LETIVOS.includes(d.getDay())) out.push(d.toISOString().slice(0, 10));
      d.setDate(d.getDate() + 1);
    }
    return out;
  }, [periodo]);

  const mapaOcupacao = useMemo(() => {
    const m = new Map<string, Ocupacao[]>();
    for (const o of ocupacoes) {
      const key = `${o.data}__${o.horario_id}`;
      const arr = m.get(key) ?? [];
      arr.push({ turma: o.turmas, docente: o.docentes, componente: o.componentes_curriculares, tipo_atividade: o.tipo_atividade, alunos_participantes: o.alunos_participantes, recursos_utilizados: o.recursos_utilizados, habilidades: o.habilidades, objeto_conhecimento: o.objeto_conhecimento });
      m.set(key, arr);
    }
    return m;
  }, [ocupacoes]);
  const horariosDisponiveis = horarios.filter((horario) => !horario.eh_intervalo);
  const totalSlots = datas.length * horariosDisponiveis.length;
  const slotsOcupados = useMemo(() => Array.from(mapaOcupacao.values()).filter((itens) => itens.length > 0).length, [mapaOcupacao]);
  const slotsEmRevisao = useMemo(() => Array.from(mapaOcupacao.values()).filter((itens) => itens.length > 1).length, [mapaOcupacao]);

  const geradoEm = fmtDateTime(new Date());

  const handleExportPDF = () => {
    const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const marginX = 32;

    doc.setFillColor(0, 123, 184);
    doc.rect(marginX, 28, 28, 28, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text("C", marginX + 14, 48, { align: "center" });

    doc.setTextColor(0, 108, 159);
    doc.setFontSize(13);
    doc.text("ClassHub", marginX + 38, 44);
    doc.setTextColor(85, 85, 85);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.text("Gestão escolar", marginX + 38, 55);

    doc.setTextColor(60, 60, 60);
    doc.setFontSize(8.5);
    const metaX = pageWidth - marginX;
    doc.text(`Emitido em: ${geradoEm}`, metaX, 36, { align: "right" });
    doc.text(`Responsável: ${user?.nome ?? "—"}`, metaX, 47, { align: "right" });

    doc.setDrawColor(0, 123, 184);
    doc.setLineWidth(1.2);
    doc.line(marginX, 68, pageWidth - marginX, 68);

    doc.setTextColor(26, 26, 26);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.text(`Disponibilidade — ${laboratorio?.nome ?? "Laboratório"}`, pageWidth / 2, 86, { align: "center" });

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(85, 85, 85);
    doc.text(`Período: ${fmtDate(periodo.inicio)} a ${fmtDate(periodo.fim)}`, pageWidth / 2, 102, { align: "center" });

    if (formato === "tabela") {
      const head = ["Horário", ...datas.map((dt) => `${new Date(dt + "T00:00:00").toLocaleDateString("pt-BR", { weekday: "short" })} ${fmtDate(dt)}`)];
      const body = horarios.map((h) => [
        h.eh_intervalo
          ? { content: `${h.label} (Intervalo)`, styles: { fillColor: [254, 226, 226], textColor: [153, 27, 27], fontStyle: "bold" } }
          : `${h.label}${h.hora_inicio ? `\n${h.hora_inicio.slice(0, 5)}–${h.hora_fim?.slice(0, 5) ?? ""}` : ""}`,
        ...datas.map((dt) => {
          if (h.eh_intervalo) return { content: "Intervalo", styles: { fillColor: [254, 226, 226], textColor: [153, 27, 27] } };
          const ocs = mapaOcupacao.get(`${dt}__${h.id}`) ?? [];
          if (ocs.length === 0) return { content: "Livre", styles: { textColor: [21, 128, 61] } };
          const texto = ocs.map((oc) => `${oc.turma ? `${oc.turma.serie} ${oc.turma.nome}` : "—"} (${oc.docente?.nome ?? "—"})`).join("\n");
          return {
            content: `${ocs.length > 1 ? "Ocupado (revisar)" : "Ocupado"}\n${texto}`,
            styles: { textColor: ocs.length > 1 ? [180, 130, 0] : [185, 28, 28] },
          };
        }),
      ]);
      autoTable(doc, {
        startY: 118,
        head: [head],
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        body: body as any,
        margin: { left: marginX, right: marginX, bottom: 36 },
        styles: { font: "helvetica", fontSize: 8.5, cellPadding: 5, overflow: "linebreak", valign: "top", textColor: [34, 34, 34], halign: "center" },
        headStyles: { fillColor: [0, 123, 184], textColor: 255, fontStyle: "bold", fontSize: 8.5 },
        alternateRowStyles: { fillColor: [240, 249, 252] },
        columnStyles: { 0: { cellWidth: 80, halign: "left", fontStyle: "bold" } },
        showHead: "everyPage",
        didDrawPage: () => {
          const pageCount = doc.getNumberOfPages();
          const currentPage = doc.getCurrentPageInfo().pageNumber;
          doc.setFont("helvetica", "normal");
          doc.setFontSize(8);
          doc.setTextColor(119, 119, 119);
          doc.text("ClassHub — Gestão escolar", marginX, pageHeight - 16);
          doc.text(`Página ${currentPage} de ${pageCount}`, pageWidth / 2, pageHeight - 16, { align: "center" });
          doc.text(`Emitido em ${geradoEm}`, pageWidth - marginX, pageHeight - 16, { align: "right" });
        },
      });
    } else {
      const body: (string | { content: string; styles: Record<string, unknown> })[][] = [];
      for (const dt of datas) {
        for (const h of horarios) {
          if (h.eh_intervalo) {
            body.push([
              `${new Date(dt + "T00:00:00").toLocaleDateString("pt-BR", { weekday: "short" })} ${fmtDate(dt)}`,
              `${h.label}`,
              { content: "Intervalo", styles: { textColor: [153, 27, 27], fontStyle: "bold" } },
              "—",
            ]);
            continue;
          }
          const ocs = mapaOcupacao.get(`${dt}__${h.id}`) ?? [];
          const statusTxt = ocs.length === 0 ? "Livre" : ocs.length > 1 ? "Ocupado (revisar)" : "Ocupado";
          body.push([
            `${new Date(dt + "T00:00:00").toLocaleDateString("pt-BR", { weekday: "short" })} ${fmtDate(dt)}`,
            `${h.label}${h.hora_inicio ? ` (${h.hora_inicio.slice(0, 5)}–${h.hora_fim?.slice(0, 5) ?? ""})` : ""}`,
            { content: statusTxt, styles: { textColor: ocs.length > 1 ? [180, 130, 0] : ocs.length === 1 ? [185, 28, 28] : [21, 128, 61], fontStyle: "bold" } },
            ocs.length > 0 ? ocs.map((oc) => [
              `${oc.turma ? `${oc.turma.serie} ${oc.turma.nome}` : "—"} · ${oc.docente?.nome ?? "—"} · ${oc.componente?.nome ?? "—"}`,
              oc.tipo_atividade === "oficina_pedagogica" ? "Oficina pedagógica" : oc.tipo_atividade === "aula_pratica" ? "Aula prática" : "",
              oc.alunos_participantes ? `Participantes: ${oc.alunos_participantes}` : "",
              oc.recursos_utilizados ? `Recursos: ${oc.recursos_utilizados}` : "",
              oc.habilidades ? `Habilidades: ${oc.habilidades}` : "",
              oc.objeto_conhecimento ? `Objeto: ${oc.objeto_conhecimento}` : "",
            ].filter(Boolean).join("\n")).join("\n\n") : "—",
          ]);
        }
      }

      autoTable(doc, {
        startY: 118,
        head: [["Data", "Horário", "Status", "Ocupado por"]],
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        body: body as any,
        margin: { left: marginX, right: marginX, bottom: 36 },
        styles: { font: "helvetica", fontSize: 9, cellPadding: 5, overflow: "linebreak", valign: "top", textColor: [34, 34, 34] },
        headStyles: { fillColor: [0, 123, 184], textColor: 255, fontStyle: "bold", fontSize: 9 },
        alternateRowStyles: { fillColor: [240, 249, 252] },
        columnStyles: { 0: { cellWidth: 90 }, 1: { cellWidth: 110 }, 2: { cellWidth: 60 }, 3: { cellWidth: "auto" } },
        showHead: "everyPage",
        didDrawPage: () => {
          const pageCount = doc.getNumberOfPages();
          const currentPage = doc.getCurrentPageInfo().pageNumber;
          doc.setFont("helvetica", "normal");
          doc.setFontSize(8);
          doc.setTextColor(119, 119, 119);
          doc.text("ClassHub — Gestão escolar", marginX, pageHeight - 16);
          doc.text(`Página ${currentPage} de ${pageCount}`, pageWidth / 2, pageHeight - 16, { align: "center" });
          doc.text(`Emitido em ${geradoEm}`, pageWidth - marginX, pageHeight - 16, { align: "right" });
        },
      });
    }

    doc.save(`disponibilidade-${laboratorio?.slug ?? "laboratorio"}-${periodo.inicio}-a-${periodo.fim}.pdf`);
  };

  return (
    <div className="space-y-6 pt-4">
      <ReportSectionIntro icon={FlaskConical} eyebrow="Ambientes" title="Uso dos laboratórios" description="Visualize a ocupação por horário, acompanhe conflitos e exporte uma grade pronta para organização da equipe." />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <ReportMetric label="Horários" value={totalSlots} />
          <ReportMetric label="Livres" value={Math.max(totalSlots - slotsOcupados, 0)} tone="emerald" />
          <ReportMetric label="Ocupados" value={slotsOcupados} tone="amber" />
          <ReportMetric label="A revisar" value={slotsEmRevisao} tone="violet" />
        </div>
        <Button onClick={handleExportPDF} disabled={datas.length === 0 || horarios.length === 0}>
          <FileDown className="h-4 w-4 mr-2" />Exportar PDF
        </Button>
      </div>

      <Card className="border-sky-100 p-4 sm:p-5">
        <div className="mb-4"><h3 className="font-medium">Consultar agenda</h3><p className="mt-1 text-sm text-muted-foreground">Escolha o ambiente e o período para atualizar a visualização.</p></div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-1"><Label>Laboratório</Label><Select value={laboratorioId} onValueChange={setLaboratorioId}><SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger><SelectContent>{laboratorios.map((lab) => <SelectItem key={lab.id} value={lab.id}>{lab.nome}</SelectItem>)}</SelectContent></Select></div>
          <div className="space-y-1"><Label>Data inicial</Label><Input type="date" value={periodo.inicio} onChange={(e) => setPeriodo({ ...periodo, inicio: e.target.value })} /></div>
          <div className="space-y-1"><Label>Data final</Label><Input type="date" value={periodo.fim} onChange={(e) => setPeriodo({ ...periodo, fim: e.target.value })} /></div>
          <div className="space-y-1">
            <Label>Formato</Label>
            <Select value={formato} onValueChange={(v) => setFormato(v as FormatoRelatorio)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="tabela">Tabela (grade)</SelectItem>
                <SelectItem value="lista">Lista</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      <Card className="overflow-hidden p-0">
        <div className="border-b bg-muted/30 p-4 sm:p-5"><h3 className="font-medium">Agenda do ambiente</h3><div className="mt-1 text-sm text-muted-foreground">
          {isLoading ? "Carregando..." : datas.length === 0 ? "Selecione um período válido." : `Período de ${fmtDate(periodo.inicio)} a ${fmtDate(periodo.fim)} · ${datas.length} dia(s) letivo(s) · ${horarios.length} horário(s).`}
        </div></div>
        {!isLoading && formato === "tabela" && datas.length > 0 && horarios.length > 0 && (
            <div className="overflow-auto max-h-[560px] border rounded-md">
              <table className="w-full text-sm border-collapse">
                <thead className="bg-muted sticky top-0 z-10">
                  <tr>
                    <th className="text-left p-2 sticky left-0 bg-muted z-20 whitespace-nowrap">Horário</th>
                    {datas.map((dt) => (
                      <th key={dt} className="text-center p-2 whitespace-nowrap">
                        <div className="capitalize">{new Date(dt + "T00:00:00").toLocaleDateString("pt-BR", { weekday: "short" })}</div>
                        <div className="text-xs font-normal text-muted-foreground">{fmtDate(dt)}</div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {horarios.map((h) => (
                    <tr key={h.id} className={`border-t ${h.eh_intervalo ? "bg-red-50" : ""}`}>
                      <td className={`p-2 sticky left-0 whitespace-nowrap font-medium ${h.eh_intervalo ? "bg-red-50 text-red-800" : "bg-background"}`}>
                        {h.label}
                        <div className={`text-xs font-normal ${h.eh_intervalo ? "text-red-700/80" : "text-muted-foreground"}`}>
                          {h.eh_intervalo ? "Intervalo" : `${h.hora_inicio?.slice(0, 5)}–${h.hora_fim?.slice(0, 5)}`}
                        </div>
                      </td>
                      {datas.map((dt) => {
                        if (h.eh_intervalo) {
                          return <td key={dt} className="p-2 text-center align-top bg-red-50 text-xs text-red-700/70">Intervalo</td>;
                        }
                        const ocs = mapaOcupacao.get(`${dt}__${h.id}`) ?? [];
                        return (
                          <td key={dt} className="p-2 text-center align-top">
                            {ocs.length > 0 ? (
                              <div className="space-y-1">
                                <Badge variant={ocs.length > 1 ? "outline" : "destructive"} className={ocs.length > 1 ? "border-amber-400 text-amber-700 bg-amber-50" : ""}>
                                  {ocs.length > 1 ? `Revisar (${ocs.length})` : "Ocupado"}
                                </Badge>
                                <div className="text-xs text-muted-foreground leading-tight space-y-1">
                                  {ocs.map((oc, i) => (
                                    <div key={i}>
                                      {oc.turma ? `${oc.turma.serie} ${oc.turma.nome}` : "—"}
                                      <br />
                                      {oc.docente?.nome ?? "—"}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ) : (
                              <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Livre</Badge>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {!isLoading && formato === "lista" && (
            <div className="overflow-auto max-h-[480px] border rounded-md">
              <table className="w-full text-sm">
                <thead className="bg-muted sticky top-0">
                  <tr>
                    <th className="text-left p-2">Data</th>
                    <th className="text-left p-2">Horário</th>
                    <th className="text-left p-2">Status</th>
                    <th className="text-left p-2">Ocupado por</th>
                  </tr>
                </thead>
                <tbody>
                  {datas.flatMap((dt) =>
                    horarios.map((h) => {
                      if (h.eh_intervalo) {
                        return (
                          <tr key={`${dt}__${h.id}`} className="border-t bg-red-50">
                            <td className="p-2 whitespace-nowrap capitalize text-red-800">{new Date(dt + "T00:00:00").toLocaleDateString("pt-BR", { weekday: "short" })} {fmtDate(dt)}</td>
                            <td className="p-2 whitespace-nowrap text-red-800">{h.label}</td>
                            <td className="p-2"><Badge variant="outline" className="border-red-300 text-red-800 bg-red-100">Intervalo</Badge></td>
                            <td className="p-2 text-red-700/70">—</td>
                          </tr>
                        );
                      }
                      const ocs = mapaOcupacao.get(`${dt}__${h.id}`) ?? [];
                      return (
                        <tr key={`${dt}__${h.id}`} className="border-t">
                          <td className="p-2 whitespace-nowrap capitalize">{new Date(dt + "T00:00:00").toLocaleDateString("pt-BR", { weekday: "short" })} {fmtDate(dt)}</td>
                          <td className="p-2 whitespace-nowrap">{h.label}</td>
                          <td className="p-2">
                            {ocs.length > 1 ? (
                              <Badge variant="outline" className="border-amber-400 text-amber-700 bg-amber-50">Revisar ({ocs.length})</Badge>
                            ) : ocs.length === 1 ? (
                              <Badge variant="destructive">Ocupado</Badge>
                            ) : (
                              <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Livre</Badge>
                            )}
                          </td>
                          <td className="p-2 text-muted-foreground">
                            {ocs.length > 0 ? ocs.map((oc) => `${oc.turma ? `${oc.turma.serie} ${oc.turma.nome}` : "—"} · ${oc.docente?.nome ?? "—"} · ${oc.componente?.nome ?? "—"}`).join(" | ") : "—"}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}
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
