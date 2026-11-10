import { ArrowUpRightIcon } from "lucide-react";
import { Button } from "#/components/ui/button";
import { Eyebrow, Label, MiniRow, Money, wrap } from "./preview-parts";

export function LandingCouples() {
	return (
		<section
			id="parejas"
			aria-labelledby="couple-title"
			className={`${wrap} pb-15 sm:pb-24 lg:pt-9`}
		>
			<div className="grid items-center gap-8 md:grid-cols-[0.88fr_1.12fr] md:gap-10 lg:gap-17">
				<div>
					<Eyebrow index="03 /">Nuestro espacio</Eyebrow>
					<h2
						id="couple-title"
						className="mt-4 mb-5 font-heading text-[41px] leading-[1.06] font-normal tracking-[-0.045em] text-foreground sm:text-[clamp(38px,4.2vw,56px)]"
					>
						Lo tuyo. Lo mío.
						<br />
						Lo nuestro.
					</h2>
					<p className="max-w-88 text-[13px] leading-[1.9] text-muted-foreground sm:text-sm">
						Cada uno lleva lo suyo y los dos ven el mismo mes. Un espacio para los gastos de casa,
						sin mezclarlo todo.
					</p>
					<p className="mt-3.5 max-w-88 text-[13px] leading-[1.9] text-muted-foreground sm:text-sm">
						Tus sobres personales son privados. Aquí solo se ve lo que aportan y lo que gastan
						juntos.
					</p>
					<p className="mt-5 inline-flex rounded-full border border-input px-3 py-1.5 text-[9px] font-semibold text-primary sm:text-[10px]">
						Parte de Quipu Plus · para dos
					</p>
					<br />
					<Button
						variant="link"
						size="xl"
						render={<a href="#precios" />}
						className="mt-3 -ms-3.5 underline decoration-input"
					>
						Conocer Quipu Plus
						<ArrowUpRightIcon aria-hidden="true" />
					</Button>
				</div>
				<div className="overflow-hidden rounded-[23px] bg-muted px-3.5 py-5 sm:rounded-[30px] sm:px-6 sm:py-7">
					<div
						role="img"
						aria-label="Ejemplo de Nuestro espacio, con Ana. Pueden gastar hoy juntos 42 soles con 33. Mercado: 45 soles, anotado por Ana. Cine: 30 soles, anotado por ti. Tus sobres personales siguen siendo privados."
						className="rotate-1 rounded-[17px] border border-border bg-background p-5 shadow-2xl shadow-foreground/10 sm:p-6"
					>
						<div aria-hidden="true">
							<div className="flex items-center justify-between gap-2.5">
								<span className="flex gap-1 rounded-full bg-muted p-1 text-[8px] text-muted-foreground sm:text-[10px]">
									<span className="px-2 py-1.5">Personal</span>
									<b className="rounded-full bg-background px-2 py-1.5 font-semibold text-foreground">
										Nuestro espacio
									</b>
								</span>
								<span className="flex">
									<span className="grid size-8 place-items-center rounded-full border-[3px] border-background bg-envelope-savings/15 text-[11px] font-bold text-envelope-savings">
										E
									</span>
									<span className="-ml-2 grid size-8 place-items-center rounded-full border-[3px] border-background bg-primary/15 text-[11px] font-bold text-primary">
										A
									</span>
								</span>
							</div>
							<h3 className="mt-5 font-heading text-[26px] font-normal tracking-tight text-foreground">
								Nuestro espacio
							</h3>
							<p className="mt-1 text-[10px] text-muted-foreground sm:text-[11px]">
								Con Ana · quedan 16 días
							</p>
							<div className="mt-5">
								<Label>Pueden gastar hoy juntos</Label>
							</div>
							<Money int="42" dec=".33" className="text-[60px] sm:text-[63px]" />
							<MiniRow
								color="var(--envelope-needs)"
								name="Mercado"
								detail="Necesidades · Anotó Ana"
								amount="− S/ 45.00"
							/>
							<MiniRow
								color="var(--envelope-wants)"
								name="Cine"
								detail="Gustos · Anotaste tú"
								amount="− S/ 30.00"
							/>
							<p className="mt-4 rounded-[10px] bg-muted p-3 text-[9px] leading-[1.7] text-muted-foreground sm:text-[10px]">
								Lo personal se queda contigo.
								<br />
								Aquí, solo lo que comparten.
							</p>
						</div>
					</div>
				</div>
			</div>
		</section>
	);
}
