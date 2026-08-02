import { useState } from "react";
import { CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

function isoToDate(iso: string): Date | undefined {
  if (!iso) return undefined;
  return new Date(iso + "T00:00:00");
}

function dateToIso(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/**
 * Campo de data com calendário visual (em vez do input nativo do navegador).
 * Sempre trabalha com string ISO ("yyyy-MM-dd"), igual ao resto do sistema.
 */
export function DatePicker({
  value, onChange, placeholder = "Selecione a data", className,
}: {
  value: string;
  onChange: (iso: string) => void;
  placeholder?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const selected = isoToDate(value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className={cn("w-full justify-start text-left font-normal", !value && "text-muted-foreground", className)}
        >
          <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
          {selected ? selected.toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "short", year: "numeric" }) : placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={selected}
          onSelect={(d) => { if (d) { onChange(dateToIso(d)); setOpen(false); } }}
          defaultMonth={selected}
          weekStartsOn={0}
        />
      </PopoverContent>
    </Popover>
  );
}
