import { SITE_DESCRIPTION } from "#/lib/site";
import { CheckIcon } from "lucide-react";
import { Button } from "#/components/ui/button";
import { ENVELOPES, HERO_CHECKS } from "../landing-data";
import {
	Brand,
	Dot,
	EnvelopeRow,
	Eyebrow,
	Label,
	MiniRow,
	Money,
	SignUpButton,
	wrap,
} from "./preview-parts";

const CORDS = [
	{
		id: "n",
		color: "text-envelope-needs",
		d: "M-80 100 C200 130 290 360 630 430 S1110 540 1490 720",
	},
	{
		id: "g",
		color: "text-envelope-wants",
		d: "M-80 175 C200 200 320 410 650 480 S1140 600 1490 765",
	},
	{
		id: "a",
		color: "text-envelope-savings",
		d: "M-80 250 C220 270 350 460 670 530 S1150 665 1490 810",
	},
] as const;

function Cords() {
	return (
		<svg
			viewBox="0 0 1400 760"
			aria-hidden="true"
			className="pointer-events-none absolute -top-5 left-1/2 h-155 w-215 -translate-x-1/2 overflow-visible sm:-top-7 sm:h-190 sm:w-[calc(100%+240px)] min-[1500px]:w-[1500px]"
		>
			{CORDS.map(({ id, color, d }) => (
				<g key={id} className={color}>
					<path d={d} fill="none" stroke="currentColor" strokeWidth="22" strokeLinecap="round" />
					<path
						d={d}
						fill="none"
						className="stroke-background opacity-25"
						strokeWidth="2"
						strokeDasharray="2 7"
					/>
				</g>
			))}
		</svg>
	);
}

export function LandingHero() {
	return (
		<section
			aria-labelledby="hero-title"
			className="relative overflow-hidden bg-[radial-gradient(color-mix(in_srgb,var(--input)_45%,transparent)_0.65px,transparent_0.65px)] bg-size-[8px_8px] pt-10 sm:pt-14 lg:pt-17"
		>
			<div className="pointer-events-none absolute inset-0 bg-linear-to-b from-background via-transparent via-40% to-background" />
			<div className={`${wrap} relative text-center`}>
				<div className="flex justify-center">
					<Eyebrow>
						<span aria-hidden="true" className="flex gap-1">
							<Dot color="var(--envelope-needs)" />
							<Dot color="var(--envelope-wants)" />
							<Dot color="var(--envelope-savings)" />
						</span>
						Tu dinero, con las cosas claras
					</Eyebrow>
				</div>
				<h1
					id="hero-title"
					className="mx-auto mt-6 mb-5 max-w-237 font-heading text-[clamp(44px,7.9vw,92px)] leading-[1.06] font-normal tracking-[-0.045em] text-foreground"
				>
					Sabe cuánto puedes gastar <em className="text-primary not-italic">hoy.</em>
				</h1>
				<p className="mx-auto max-w-156 text-[13px] leading-[1.85] text-muted-foreground sm:text-base sm:leading-[1.8]">
					{SITE_DESCRIPTION}
				</p>
				<ul className="mt-5 mb-7 flex flex-wrap justify-center gap-x-3 gap-y-1 text-[10px] font-medium sm:gap-x-7 sm:text-xs">
					{HERO_CHECKS.map((check) => (
						<li key={check}>
							<CheckIcon
								aria-hidden="true"
								className="mr-1.5 inline size-3.5 text-envelope-savings"
							/>
							{check}
						</li>
					))}
				</ul>
				<div className="mx-auto flex max-w-84 flex-col justify-center gap-2.5 sm:max-w-none sm:flex-row sm:gap-3">
					<SignUpButton size="xl" className="min-h-13 rounded-full px-6">
						Empezar gratis
					</SignUpButton>
					<Button
						variant="outline"
						size="xl"
						render={<a href="#precios" />}
						className="min-h-13 rounded-full px-6"
					>
						Ver precios
					</Button>
				</div>
				<p className="mt-4 text-[10px] text-muted-foreground sm:text-[11px]">
					Sin tarjeta. Sin hojas de cálculo. A tu ritmo.
				</p>
			</div>

			<div className={`${wrap} relative mt-4 pt-10 pb-5 sm:mt-6 sm:pt-15 sm:pb-10`}>
				<Cords />
				<div
					role="img"
					aria-label="Ejemplo del Inicio de Quipu. Hola, Miguel. Puedes gastar hoy 68 soles con 59 céntimos, sin tocar tus compromisos ni tu ahorro. Sobres: Necesidades 530 soles con 60, Gustos 292 soles con 50 y Ahorro 266 soles. Próximo compromiso: Celular, vence en 3 días."
					className="relative mx-auto w-full max-w-250 overflow-hidden rounded-xl border border-input bg-background text-left shadow-2xl shadow-foreground/10 sm:rounded-[15px]"
				>
					<div
						aria-hidden="true"
						className="flex h-7 items-center justify-center border-b border-border bg-muted text-[9px] text-muted-foreground sm:h-9 sm:text-[10px]"
					>
						quipu · /inicio
					</div>
					<div
						aria-hidden="true"
						className="flex h-14.5 items-center justify-between gap-2.5 border-b border-border px-4 sm:h-17 sm:px-6"
					>
						<span className="scale-75 origin-left">
							<Brand />
						</span>
						<span className="hidden gap-4 text-[10px] text-muted-foreground md:flex">
							<b className="text-foreground">Inicio</b>
							<span>Movimientos</span>
							<span>Progreso</span>
							<span>Ahorros</span>
							<span>Compromisos</span>
						</span>
						<span className="flex items-center gap-2">
							<span className="rounded-full bg-foreground px-3 py-2 text-[9px] font-semibold text-background sm:px-3.5 sm:text-[10px]">
								+ Registrar
							</span>
							<span className="grid size-7 place-items-center rounded-full bg-primary/15 text-[11px] font-bold text-primary">
								M
							</span>
						</span>
					</div>
					<div aria-hidden="true" className="p-5 sm:p-7 lg:px-10">
						<h2 className="font-heading text-[27px] font-normal tracking-tight sm:text-3xl">
							Hola, Miguel
						</h2>
						<p className="mt-1 text-[10px] text-muted-foreground sm:text-[11px]">
							Ciclo 15 oct → 14 nov · quedan 16 días
						</p>
						<div className="mt-6 grid gap-6 sm:mt-7 md:grid-cols-2 md:gap-12">
							<div>
								<Label>Puedes gastar hoy</Label>
								<Money int="68" dec=".59" className="text-[76px] sm:text-[88px]" />
								<p className="max-w-60 text-[10px] text-muted-foreground sm:text-[11px]">
									Sin tocar tus compromisos ni tu ahorro.
								</p>
							</div>
							<div>
								<Label>Tus sobres</Label>
								{ENVELOPES.map((envelope) => (
									<EnvelopeRow key={envelope.name} envelope={envelope} />
								))}
							</div>
						</div>
						<div className="mt-6 grid gap-6 border-t border-border pt-5 md:grid-cols-2 md:gap-12">
							<div>
								<Label>Próximos compromisos</Label>
								<MiniRow
									color="var(--warning)"
									name="Celular"
									detail="Vence en 3 días · Necesidades"
									amount="S/ 50.00"
									action="Ya pagué"
								/>
								<MiniRow
									color="var(--envelope-needs)"
									name="Internet"
									detail="Vence el 6 nov · Necesidades"
									amount="S/ 89.00"
								/>
								<div className="max-sm:hidden">
									<MiniRow
										color="var(--envelope-wants)"
										name="Streaming"
										detail="Vence el 9 nov · Gustos"
										amount="S/ 35.00"
									/>
								</div>
							</div>
							<div className="max-md:hidden">
								<Label>Movimientos recientes</Label>
								<MiniRow
									color="var(--envelope-wants)"
									name="Bodega"
									detail="Gustos · hoy"
									amount="− S/ 20.00"
								/>
								<MiniRow
									color="var(--envelope-needs)"
									name="Mercado"
									detail="Necesidades · hoy"
									amount="− S/ 25.00"
								/>
								<MiniRow
									color="var(--envelope-savings)"
									name="Sueldo"
									detail="Ingreso · ayer"
									amount="+ S/ 2,800.00"
								/>
							</div>
						</div>
					</div>
				</div>
			</div>
		</section>
	);
}
