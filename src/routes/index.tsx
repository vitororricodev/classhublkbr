import { createFileRoute } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CalendarDays, Database, Megaphone, Pin, Users } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { muralDb, muralTipoLabel, todayISO, type MuralPublicacao } from "@/lib/mural";

export const Route = createFileRoute("/")({ component: Dashboard });

function Dashboard() {
  const { user, isAdmin } = useAuth();
  const hoje = todayISO();
  const { data: publicacoes = [], isLoading, isError } = useQuery({
    queryKey: ["mural_publicacoes", "visiveis", hoje],
    queryFn: async () => {
      const { data, error } = await muralDb
        .from("mural_publicacoes")
        .select("*")
        .eq("ativo", true)
        .lte("inicio_exibicao", hoje)
        .or(`fim_exibicao.is.null,fim_exibicao.gte.${hoje}`)
        .order("fixado", { ascending: false })
        .order("data_evento", { ascending: true, nullsFirst: false })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as MuralPublicacao[];
    },
  });
  const destaque = publicacoes.find((item) => item.fixado) ?? publicacoes.find((item) => item.tipo === "destaque") ?? publicacoes[0];
  const avisos = publicacoes.filter((item) => item.id !== destaque?.id && item.tipo !== "evento").slice(0, 6);
  const eventos = publicacoes.filter((item) => item.tipo === "evento" && item.data_evento && item.data_evento >= hoje).slice(0, 5);

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-primary">SGE · Mural escolar</p>
          <h1 className="text-3xl font-semibold tracking-tight">Olá, {user?.nome?.split(" ")[0] ?? "bem-vindo"}.</h1>
          <p className="mt-1 text-sm text-muted-foreground">Acompanhe os avisos e eventos importantes da escola.</p>
        </div>
        {isAdmin && <Button asChild variant="outline"><Link to="/mural"><Megaphone className="h-4 w-4" />Gerenciar mural</Link></Button>}
      </header>
      {isLoading && <Card className="p-10 text-center text-sm text-muted-foreground">Carregando mural...</Card>}
      {isError && <Card className="border-destructive/30 p-10 text-center text-sm text-muted-foreground">Não foi possível carregar o mural agora.</Card>}
      {!isLoading && !isError && (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(18rem,0.85fr)]">
          <section className="space-y-5">
            {destaque ? <PublicacaoDestaque publicacao={destaque} /> : <MuralVazio isAdmin={isAdmin} />}
            {avisos.length > 0 && <div className="space-y-3"><h2 className="text-lg font-semibold">Avisos recentes</h2><div className="grid gap-3 sm:grid-cols-2">{avisos.map((item) => <PublicacaoCard key={item.id} publicacao={item} />)}</div></div>}
          </section>
          <section className="space-y-3"><h2 className="text-lg font-semibold">Próximos eventos</h2><Card className="divide-y overflow-hidden">{eventos.length > 0 ? eventos.map((item) => <EventoItem key={item.id} publicacao={item} />) : <CardContent className="py-10 text-center text-sm text-muted-foreground">Nenhum evento futuro publicado.</CardContent>}</Card></section>
        </div>
      )}
      <ConsultasStatus />
    </div>
  );
}

function PublicacaoDestaque({ publicacao }: { publicacao: MuralPublicacao }) {
  return <Card className="overflow-hidden border-primary/20 bg-gradient-to-br from-primary/10 via-card to-accent/40"><CardContent className="p-6 sm:p-8"><div className="mb-4 flex items-center gap-2 text-sm font-medium text-primary"><Pin className="h-4 w-4" />{publicacao.fixado ? "Comunicado fixado" : muralTipoLabel[publicacao.tipo]}</div><h2 className="text-2xl font-semibold tracking-tight">{publicacao.titulo}</h2><p className="mt-3 max-w-3xl whitespace-pre-wrap text-sm leading-6 text-muted-foreground">{publicacao.conteudo}</p>{publicacao.data_evento && <p className="mt-5 flex items-center gap-2 text-sm font-medium text-primary"><CalendarDays className="h-4 w-4" />{formatarEvento(publicacao)}</p>}</CardContent></Card>;
}

function PublicacaoCard({ publicacao }: { publicacao: MuralPublicacao }) {
  return <Card className="p-5"><div className="mb-2 text-xs font-medium uppercase tracking-wide text-primary">{muralTipoLabel[publicacao.tipo]}</div><h3 className="font-semibold">{publicacao.titulo}</h3><p className="mt-2 line-clamp-3 whitespace-pre-wrap text-sm leading-6 text-muted-foreground">{publicacao.conteudo}</p></Card>;
}

function EventoItem({ publicacao }: { publicacao: MuralPublicacao }) {
  return <div className="flex gap-3 p-4"><div className="flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-lg bg-primary/10 text-primary"><span className="text-xs font-semibold">{new Date(`${publicacao.data_evento}T00:00:00`).toLocaleDateString("pt-BR", { month: "short" }).replace(".", "")}</span><span className="text-base font-bold leading-none">{new Date(`${publicacao.data_evento}T00:00:00`).getDate()}</span></div><div><h3 className="text-sm font-semibold">{publicacao.titulo}</h3><p className="mt-1 text-sm text-muted-foreground">{publicacao.hora_evento?.slice(0, 5) ?? "Dia todo"}</p></div></div>;
}

function MuralVazio({ isAdmin }: { isAdmin: boolean }) {
  return <Card className="border-dashed p-10 text-center"><Megaphone className="mx-auto h-9 w-9 text-primary" /><h2 className="mt-4 text-lg font-semibold">O mural está pronto.</h2><p className="mt-1 text-sm text-muted-foreground">{isAdmin ? "Publique o primeiro aviso para a comunidade escolar." : "Ainda não há avisos publicados."}</p>{isAdmin && <Button asChild className="mt-5"><Link to="/mural">Publicar aviso</Link></Button>}</Card>;
}

function ConsultasStatus() {
  const hoje = todayISO();
  const banco = useQuery({ queryKey: ["saude", "banco"], queryFn: async () => { const { error } = await supabase.from("docentes").select("id", { count: "exact", head: true }).limit(1); if (error) throw error; return true; }, retry: 1 });
  const calendario = useQuery({ queryKey: ["saude", "calendario", hoje], queryFn: async () => { const { error } = await supabase.from("planejamentos").select("id", { count: "exact", head: true }).eq("data", hoje); if (error) throw error; return true; }, retry: 1 });
  const usuarios = useQuery({ queryKey: ["saude", "usuarios"], queryFn: async () => { const { error } = await supabase.from("usuarios").select("id", { count: "exact", head: true }).eq("ativo", true); if (error) throw error; return true; }, retry: 1 });
  const status = (consulta: { isSuccess: boolean; isError: boolean }) => consulta.isSuccess ? "bg-emerald-500" : consulta.isError ? "bg-red-500" : "bg-muted-foreground/40";
  return <div className="fixed bottom-4 right-4 z-20 flex items-center gap-2 rounded-full border bg-card/95 p-2 shadow-lg backdrop-blur" aria-label="Estado das consultas do sistema"><StatusIcon label="Banco de dados" Icon={Database} color={status(banco)} /><StatusIcon label="Agenda" Icon={CalendarDays} color={status(calendario)} /><StatusIcon label="Usuários" Icon={Users} color={status(usuarios)} /></div>;
}

function StatusIcon({ label, Icon, color }: { label: string; Icon: typeof Database; color: string }) { return <span title={label} className={`flex h-8 w-8 items-center justify-center rounded-full text-white ${color}`}><Icon className="h-4 w-4" /><span className="sr-only">{label}</span></span>; }

function formatarEvento(publicacao: MuralPublicacao) { return `${new Date(`${publicacao.data_evento}T00:00:00`).toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" })}${publicacao.hora_evento ? ` · ${publicacao.hora_evento.slice(0, 5)}` : ""}`; }
