import { COMPARISON_COLUMNS, COMPARISON_ROWS } from "../landing-data";
import { Eyebrow, wrap } from "./preview-parts";

export function LandingComparison() {
	return (
		<section aria-labelledby="compare-title" className="pb-15 lg:pb-24">
			<div className={`${wrap} rounded-[23px] bg-muted p-5 pt-7 sm:rounded-[30px] sm:p-9 lg:p-12`}>
				<div className="mb-7 flex flex-col justify-between gap-5 sm:flex-row sm:items-end sm:gap-9">
					<div>
						<Eyebrow index="02 /">Menos cuentas en la cabeza</Eyebrow>
						<h2
							id="compare-title"
							className="mt-3 font-heading text-[40px] leading-[1.06] font-normal tracking-[-0.045em] text-foreground lg:text-5xl"
						>
							Por qué Quipu.
						</h2>
					</div>
					<p className="max-w-61 text-sm leading-[1.8] text-muted-foreground max-sm:max-w-none">
						Excel sirve. Quipu te deja el número listo para el día a día.
					</p>
				</div>
				<table className="block w-full text-[13px] leading-normal sm:table">
					<caption className="sr-only">
						Comparación entre Quipu, Excel y no llevar un registro de tus finanzas
					</caption>
					<thead className="sr-only sm:not-sr-only sm:table-header-group">
						<tr>
							<th
								scope="col"
								className="py-5 pr-4 text-left text-xs font-medium text-muted-foreground"
							>
								En el día a día
							</th>
							{COMPARISON_COLUMNS.map((column, index) => (
								<th
									key={column}
									scope="col"
									className={`px-4.5 py-5 text-left text-xs font-medium text-muted-foreground ${index === 0 ? "rounded-t-2xl bg-background font-heading text-xl font-bold text-foreground" : ""}`}
								>
									{column}
								</th>
							))}
						</tr>
					</thead>
					<tbody className="grid sm:table-row-group">
						{COMPARISON_ROWS.map((row, rowIndex) => {
							const last = rowIndex === COMPARISON_ROWS.length - 1;
							return (
								<tr
									key={row.criterion}
									className="grid grid-cols-[repeat(3,minmax(0,1fr))] gap-x-1.5 gap-y-2 border-t border-input py-4 sm:table-row sm:border-0"
								>
									<th
										scope="row"
										className={`col-span-full pb-1.5 text-left text-xs font-medium sm:w-2/5 sm:py-5 sm:pr-4 sm:text-[13px] ${last ? "" : "sm:border-b sm:border-border"}`}
									>
										{row.criterion}
									</th>
									{row.values.map((value, index) => (
										<td
											key={COMPARISON_COLUMNS[index]}
											className={`min-w-0 rounded-lg p-2 text-xs wrap-break-word leading-[1.6] sm:px-4.5 sm:py-5 ${index === 0 ? "bg-background font-semibold text-foreground sm:font-normal" : "text-muted-foreground"} ${last ? "" : "sm:border-b sm:border-border"} ${index === 0 && last ? "sm:rounded-b-2xl" : "sm:rounded-none"}`}
										>
											<span
												aria-hidden="true"
												className={`mb-1.5 block text-xs font-bold sm:hidden ${index === 0 ? "text-envelope-savings" : "text-muted-foreground"}`}
											>
												{COMPARISON_COLUMNS[index]}
											</span>
											{value}
										</td>
									))}
								</tr>
							);
						})}
					</tbody>
				</table>
				<p className="mt-4 text-xs leading-[1.8] text-muted-foreground">
					Excel: versión web gratuita, sin fórmulas ni automatizaciones propias. Los avisos de Quipu
					se ven dentro de la app.
				</p>
			</div>
		</section>
	);
}
