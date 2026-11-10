import { CheckIcon, PlusIcon } from "lucide-react";
import { PLANS } from "../landing-data";
import { Eyebrow, SignUpButton, wrap } from "./preview-parts";

export function LandingPricing() {
	return (
		<section
			id="precios"
			aria-labelledby="pricing-title"
			className={`${wrap} border-t border-border py-14 sm:py-21`}
		>
			<div className="mb-7 text-left sm:mb-10 sm:text-center">
				<div className="flex sm:justify-center">
					<Eyebrow index="04 /">A tu medida</Eyebrow>
				</div>
				<h2
					id="pricing-title"
					className="mt-3.5 mb-4 font-heading text-[41px] leading-[1.06] font-normal tracking-[-0.045em] text-foreground sm:text-[clamp(38px,4.2vw,56px)]"
				>
					Empieza gratis.
					<br />
					Crece si lo necesitas.
				</h2>
				<p className="text-[13px] text-muted-foreground sm:text-sm">
					Lo básico para ordenar tu mes no te cuesta nada.
				</p>
			</div>
			<div className="mx-auto grid max-w-222 items-stretch gap-4.5 md:grid-cols-[1fr_1.12fr] md:gap-5">
				{PLANS.map((plan) => (
					<article
						key={plan.name}
						className={`relative flex flex-col rounded-3xl border p-6 sm:p-7 md:p-8.5 ${plan.highlight ? "border-foreground bg-foreground text-background" : "border-input bg-background"}`}
					>
						{plan.highlight ? (
							<span className="mb-3 inline-flex self-start rounded-full bg-primary-foreground px-2.5 py-1 text-xs font-bold tracking-[0.04em] text-primary">
								EL PLAN ANUAL TE SALE MEJOR
							</span>
						) : null}
						<div className="flex items-center justify-between">
							<h3 className="text-[22px] font-semibold tracking-tight">{plan.name}</h3>
							{plan.highlight ? (
								<PlusIcon aria-hidden="true" className="size-6 text-primary" />
							) : null}
						</div>
						<p
							className={`mt-1 text-xs ${plan.highlight ? "text-background/70" : "text-muted-foreground"}`}
						>
							{plan.sub}
						</p>
						<p className="mt-6 font-heading text-[46px] leading-tight tracking-[-0.04em] sm:text-[38px] md:text-[46px]">
							{plan.price}
							<small
								className={`ml-1.5 font-sans text-xs tracking-normal ${plan.highlight ? "text-background/70" : "text-muted-foreground"}`}
							>
								{plan.priceNote}
							</small>
						</p>
						<p
							className={`mt-2 min-h-5.5 text-xs ${plan.highlight ? "text-background/70" : "text-muted-foreground"}`}
						>
							{plan.monthly}
						</p>
						<ul className="mt-6 mb-8 grid gap-3 text-[13px] sm:text-xs">
							{plan.features.map((feature) => (
								<li key={feature} className="flex items-baseline gap-2.5">
									<CheckIcon
										aria-hidden="true"
										className="size-4 flex-none translate-y-0.5 text-envelope-savings"
									/>
									{feature}
								</li>
							))}
						</ul>
						<SignUpButton
							size="xl"
							variant={plan.highlight ? "default" : "outline"}
							className="mt-auto min-h-13 w-full rounded-full"
						>
							{plan.cta}
						</SignUpButton>
						<p
							className={`mt-3 text-center text-xs ${plan.highlight ? "text-background/70" : "text-muted-foreground"}`}
						>
							{plan.foot}
						</p>
					</article>
				))}
			</div>
		</section>
	);
}
