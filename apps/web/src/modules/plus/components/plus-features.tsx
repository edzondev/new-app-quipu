import { cn } from "cn";
import { ChartLine, Landmark, Target, Users } from "lucide-react";

const FEATURES = [
	{ key: "household", Icon: Users, name: "Nuestro espacio", detail: "Tu pareja entra gratis." },
	{ key: "banks", Icon: Landmark, name: "Más de 2 bancos", detail: "Solo en Android." },
	{ key: "goals", Icon: Target, name: "Más de 2 metas", detail: "El fondo no cuenta." },
	{ key: "progress", Icon: ChartLine, name: "Progreso completo", detail: "Compara tus ciclos." },
] as const;

export type PlusFeature = "household" | "goals";

const HEAD = "pb-3 text-xs font-medium text-muted-foreground";
const MARK = "border-t border-border text-center";

export function PlusFeatures({ highlight }: { highlight?: PlusFeature }) {
	return (
		<table className="w-full table-fixed border-separate border-spacing-0 text-left">
			<caption className="sr-only">Funciones de Gratis y Quipu Plus</caption>
			<thead>
				<tr>
					<th scope="col" className={HEAD}>
						Incluye
					</th>
					<th scope="col" className={cn(HEAD, "w-12 text-center md:w-13")}>
						Gratis
					</th>
					<th scope="col" className={cn(HEAD, "w-12 text-center md:w-13")}>
						Plus
					</th>
				</tr>
			</thead>
			<tbody>
				{FEATURES.map(({ key, Icon, name, detail }) => (
					<tr
						key={key}
						className={cn(
							key === highlight &&
								"[&>td]:bg-primary/10 [&>td:first-child]:rounded-s-lg [&>td:first-child]:ps-2.5 [&>td:last-child]:rounded-e-lg",
						)}
					>
						<td className="border-t border-border py-4">
							<span className="flex items-center gap-2.5 text-sm font-medium">
								<Icon aria-hidden className="size-4 shrink-0 text-muted-foreground" />
								{name}
							</span>
							<span className="mt-1 ms-6.5 block text-xs text-muted-foreground">{detail}</span>
						</td>
						<td className={cn(MARK, "text-muted-foreground")}>
							<span aria-hidden>—</span>
							<span className="sr-only">No incluido</span>
						</td>
						<td className={cn(MARK, "text-lg text-success")}>
							<span aria-hidden>✓</span>
							<span className="sr-only">Incluido</span>
						</td>
					</tr>
				))}
			</tbody>
		</table>
	);
}
