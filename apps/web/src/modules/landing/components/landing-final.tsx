import { SignUpButton, wrap } from "./preview-parts";

export function LandingFinal() {
	return (
		<section aria-labelledby="final-title" className={wrap}>
			<div className="relative flex flex-col items-center justify-between gap-6 overflow-hidden rounded-[23px] bg-primary px-6 py-9 text-center text-primary-foreground sm:rounded-[30px] sm:px-10 sm:py-12 md:flex-row md:gap-10 md:text-left lg:px-16 lg:py-15">
				<div
					aria-hidden="true"
					className="absolute -top-20 -right-8 h-100 w-57 rotate-38 rounded-full border-2 border-primary-foreground opacity-13 md:top-[-160px] md:right-17.5 md:h-125"
				/>
				<div className="relative">
					<h2
						id="final-title"
						className="font-heading text-[39px] leading-[1.1] font-normal tracking-[-0.045em] sm:text-[46px] lg:text-[54px]"
					>
						Empieza tu mes con
						<br />
						un número claro.
					</h2>
					<p className="mx-auto mt-4 max-w-62 text-xs leading-[1.8] opacity-90 sm:text-xs md:mx-0 md:max-w-none">
						No se trata de dejar de gastar. Se trata de saber con cuánto cuentas.
					</p>
				</div>
				<SignUpButton
					size="xl"
					className="relative min-h-13 w-full flex-none rounded-full border-transparent bg-background px-6 text-foreground hover:bg-background/90 md:w-auto"
				>
					Empezar gratis
				</SignUpButton>
			</div>
		</section>
	);
}
