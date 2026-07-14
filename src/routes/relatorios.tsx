import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileDown } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
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

  const { isAdmin } = useAuth();
  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["relatorio", filtros, isAdmin ? "all" : user?.id],
    queryFn: async () => {
      let q = supabase.from("planejamentos").select(PLAN_SELECT)
        .gte("data", filtros.inicio).lte("data", filtros.fim)
        .order("data").order("horario_id");
      if (!isAdmin && user?.id) q = q.eq("owner_id", user.id);
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

  const handleExportPDF = () => {
    const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const marginX = 32;

    // Cabeçalho institucional
    doc.setFillColor(109, 40, 217);
    doc.rect(marginX, 28, 28, 28, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text("P", marginX + 14, 48, { align: "center" });

    doc.setTextColor(109, 40, 217);
    doc.setFontSize(13);
    doc.text("Planeja", marginX + 38, 44);
    doc.setTextColor(85, 85, 85);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.text("Sistema de Planejamento de Aulas", marginX + 38, 55);

    doc.setTextColor(60, 60, 60);
    doc.setFontSize(8.5);
    const metaX = pageWidth - marginX;
    doc.text(`Emitido em: ${geradoEm}`, metaX, 36, { align: "right" });
    doc.text(`Responsável: ${user?.nome ?? "—"}`, metaX, 47, { align: "right" });
    doc.text(`Total de registros: ${sorted.length}`, metaX, 58, { align: "right" });

    doc.setDrawColor(109, 40, 217);
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
      headStyles: { fillColor: [109, 40, 217], textColor: 255, fontStyle: "bold", fontSize: 9 },
      alternateRowStyles: { fillColor: [246, 243, 251] },
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
        doc.text("Planeja — Planejamento de Aulas", marginX, pageHeight - 16);
        doc.text(`Página ${currentPage} de ${pageCount}`, pageWidth / 2, pageHeight - 16, { align: "center" });
        doc.text(`Emitido em ${geradoEm}`, pageWidth - marginX, pageHeight - 16, { align: "right" });
      },
    });

    doc.save(`relatorio-aulas-${filtros.inicio}-a-${filtros.fim}.pdf`);
  };

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Relatórios</h1>
          <p className="text-sm text-muted-foreground">Filtre e exporte relatórios de aulas em PDF.</p>
        </div>
        <Button onClick={handleExportPDF} disabled={sorted.length === 0}>
          <FileDown className="h-4 w-4 mr-2" />Exportar PDF
        </Button>
      </div>

      <Card className="p-4">
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

      <Card className="p-4">
        <div className="text-sm text-muted-foreground mb-3">
          {isLoading ? "Carregando..." : `${sorted.length} registro(s) encontrado(s) no período de ${fmtDate(filtros.inicio)} a ${fmtDate(filtros.fim)}.`}
        </div>
        {!isLoading && sorted.length > 0 && (
          <div className="overflow-auto max-h-[480px] border rounded-md">
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
