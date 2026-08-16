import { createFileRoute, Link } from "@tanstack/react-router";
import { MonitorSmartphone, FlaskConical, CalendarDays, Settings } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/laboratorios")({ component: LaboratoriosHubPage });

const labs = [
  { slug: "informatica", nome: "Laboratório de Informática", descricao: "Computadores, projetor e recursos digitais.", icon: MonitorSmartphone },
  { slug: "multidisciplinar", nome: "Laboratório Multidisciplinar", descricao: "Ambiente flexível para atividades de diferentes componentes.", icon: FlaskConical },
] as const;

function LaboratoriosHubPage() {
  const { isAdmin } = useAuth();
  return <div className="p-4 sm:p-6 lg:p-8 space-y-6">
    <div><h1 className="text-2xl font-semibold">Laboratórios</h1><p className="text-sm text-muted-foreground">Escolha o ambiente que deseja reservar.</p></div>
    <div className="grid gap-4 md:grid-cols-2 max-w-4xl">
      {labs.map((lab) => {
        const Icon = lab.icon;
        return <Card key={lab.slug} className="p-6 flex flex-col gap-4">
          <div className="h-11 w-11 rounded-lg bg-primary/10 text-primary flex items-center justify-center"><Icon className="h-6 w-6" /></div>
          <div><h2 className="font-semibold">{lab.nome}</h2><p className="mt-1 text-sm text-muted-foreground">{lab.descricao}</p></div>
          <div className="mt-auto flex flex-wrap gap-2">
            <Button asChild><Link to="/solicitar-laboratorio" search={{ lab: lab.slug } as never}><CalendarDays className="mr-2 h-4 w-4" />Solicitar horário</Link></Button>
            {isAdmin && <Button asChild variant="outline"><Link to="/laboratorio" search={{ lab: lab.slug } as never}><Settings className="mr-2 h-4 w-4" />Gerenciar agenda</Link></Button>}
            {isAdmin && <Button asChild variant="ghost"><Link to="/aprovacoes-laboratorio" search={{ lab: lab.slug } as never}>Aprovações</Link></Button>}
          </div>
        </Card>;
      })}
    </div>
  </div>;
}
