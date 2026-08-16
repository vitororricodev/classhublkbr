import { createFileRoute, Link } from "@tanstack/react-router";
import { MonitorSmartphone, FlaskConical, CalendarPlus, Settings, ClipboardCheck, ArrowRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";
import { useLaboratorioAtual } from "@/lib/laboratorios";

export const Route = createFileRoute("/laboratorios")({ component: LaboratoriosHubPage });

const labs = [
  { slug: "informatica", nome: "Laboratório de Informática", descricao: "Computadores, projetor e recursos digitais.", icon: MonitorSmartphone },
  { slug: "multidisciplinar", nome: "Laboratório Multidisciplinar", descricao: "Ambiente flexível para atividades de diferentes componentes.", icon: FlaskConical },
] as const;

function LaboratoriosHubPage() {
  const { isAdmin, user } = useAuth();
  const { data: laboratorios = [] } = useLaboratorioAtual();
  return <div className="p-4 sm:p-6 lg:p-8 space-y-6">
    <div><h1 className="text-2xl font-semibold">Laboratórios</h1><p className="text-sm text-muted-foreground">Escolha o ambiente que deseja reservar.</p></div>
    <div className="grid gap-6 md:grid-cols-2 max-w-6xl">
      {labs.map((lab) => {
        const Icon = lab.icon;
        const laboratorio = laboratorios.find((item) => item.slug === lab.slug);
        const podeGerir = isAdmin || (!!laboratorio && user?.laboratorio_ids.includes(laboratorio.id));
        return <Card key={lab.slug} className="min-h-80 p-8 flex flex-col gap-6">
          <div className="h-14 w-14 rounded-xl bg-primary/10 text-primary flex items-center justify-center"><Icon className="h-7 w-7" /></div>
          <div><h2 className="text-xl font-semibold">{lab.nome}</h2><p className="mt-2 text-base text-muted-foreground">{lab.descricao}</p></div>
          <div className="mt-auto space-y-3">
            <Button asChild size="lg" className="group h-12 w-full justify-between px-4 text-base shadow-md shadow-primary/20">
              <Link to="/solicitar-laboratorio" search={{ lab: lab.slug } as never}>
                <span className="flex items-center gap-2"><CalendarPlus className="h-5 w-5" />Solicitar horário</span>
                <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
              </Link>
            </Button>
            {podeGerir && (
              <div className="grid gap-3 sm:grid-cols-2">
                <Button asChild variant="outline" className="h-11 justify-start border-primary/25 bg-primary/5 px-4 text-primary hover:bg-primary/10 hover:text-primary">
                  <Link to="/laboratorio" search={{ lab: lab.slug } as never}><Settings className="h-4 w-4" />Gerenciar agenda</Link>
                </Button>
                <Button asChild variant="outline" className="h-11 justify-start border-primary/25 bg-primary/5 px-4 text-primary hover:bg-primary/10 hover:text-primary">
                  <Link to="/aprovacoes-laboratorio" search={{ lab: lab.slug } as never}><ClipboardCheck className="h-4 w-4" />Aprovações</Link>
                </Button>
              </div>
            )}
          </div>
        </Card>;
      })}
    </div>
  </div>;
}
