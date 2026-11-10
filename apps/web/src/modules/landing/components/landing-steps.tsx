import { ENVELOPES, STEPS } from "../landing-data";
import { Dot, EnvelopeRow, Eyebrow, Label, MiniRow, Money, wrap } from "./preview-parts";

const snippet =
	"w-full max-w-70 rounded-[14px] border border-border bg-background p-5 shadow-lg shadow-foreground/5";

function RegisterSnippet() {
	return (
		<div className={`${snippet} -rotate-2`}>
			<div className="mb-3 flex gap-4 text-[10px] text-muted-foreground">
				<b className="border-b-2 border-primary pb-1.5 text-foreground">Gasto</b>
				<span>Ingreso</span>
			</div>
			<Label>¿Cuánto fue?</Label>
			<p className="my-2 font-mono text-3xl text-foreground">S/ 25.00</p>
			<div className="mb-3 flex justify-between gap-3 border-b border-border pb-2 text-[11px]">
				<span>Mercado</span>
				<span className="text-muted-foreground">Hoy</span>
			</div>
			<div className="flex items-center justify-between">
				<span className="inline-flex items-center gap-1.5 rounded-full border border-border px-2 py-1 text-[9px]">
					<Dot color="var(--envelope-needs)" />
					Necesidades
				</span>
				<span className="rounded-full bg-foreground px-3.5 py-2 text-[10px] font-semibold text-background">
					Guardar
				</span>
			</div>
		</div>
	);
}

function EnvelopesSnippet() {
	return (
		<div className={`${snippet} mt-3 rotate-2`}>
			<Label>Cada sol, en su lugar</Label>
			{ENVELOPES.map((envelope) => (
				<EnvelopeRow key={envelope.name} envelope={envelope} />
			))}
		</div>
	);
}

function NumberSnippet() {
	return (
		<div className={`${snippet} mt-2 -rotate-1`}>
			<Label>Puedes gastar hoy</Label>
			<Money int="68" dec=".59" className="text-6xl" />
			<MiniRow color="var(--warning)" name="Celular" detail="Vence en 3 días" amount="S/ 50.00" />
		</div>
	);
}

const SNIPPETS = [RegisterSnippet, EnvelopesSnippet, NumberSnippet];

export function LandingSteps() {
	return (
		<section
			id="como-funciona"
			aria-labelledby="steps-title"
			className={`${wrap} py-14 sm:py-17 lg:py-24`}
		>
			<div className="mb-7 flex flex-col justify-between gap-5 sm:mb-10 sm:flex-row sm:items-end sm:gap-9">
				<div>
					<Eyebrow index="01 /">Un hábito sencillo</Eyebrow>
					<h2
						id="steps-title"
						className="mt-3 font-heading text-[40px] leading-[1.06] font-normal tracking-[-0.045em] text-foreground sm:text-[clamp(38px,4.2vw,56px)]"
					>
						Así funciona,
						<br />
						en tres pasos.
					</h2>
				</div>
				<p className="max-w-72 text-sm leading-[1.8] text-muted-foreground">
					No necesitas saber de finanzas.
					<br />
					Solo empezar por lo que tienes hoy.
				</p>
			</div>
			<div className="grid gap-4.5 md:grid-cols-3 md:gap-3 lg:gap-4.5">
				{STEPS.map((step, index) => {
					const Snippet = SNIPPETS[index] ?? RegisterSnippet;
					return (
						<article
							key={step.number}
							className="overflow-hidden rounded-[22px] border border-border bg-background"
						>
							<div
								role="img"
								aria-label={step.label}
								className="flex h-57.5 justify-center overflow-hidden bg-muted px-9 pt-6 md:h-52.5 md:px-3 md:pt-5 lg:h-60.5 lg:px-6"
							>
								<div aria-hidden="true" className="flex w-full justify-center">
									<Snippet />
								</div>
							</div>
							<div className="p-6 md:p-5 lg:p-6">
								<span className="mb-3 block font-mono text-xs text-primary">{step.number}</span>
								<h3 className="mb-2 text-xl font-semibold tracking-tight text-foreground">
									{step.title}
								</h3>
								<p className="max-w-65 text-[13px] leading-[1.8] text-muted-foreground">
									{step.text}
								</p>
							</div>
						</article>
					);
				})}
			</div>
		</section>
	);
}
