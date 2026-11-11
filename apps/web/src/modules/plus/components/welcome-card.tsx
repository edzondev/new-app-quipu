import { cn } from "cn";
import { CircleDollarSign, Landmark, Target, Wallet } from "lucide-react";
import { type ComponentProps, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { Button } from "#/components/ui/button";
import { PLUS_CARD_BUTTON as BIG, PlusCard, PlusCardHeading, PlusRows } from "./plus-card";

const ROWS = [
	{ Icon: Wallet, name: "Tu dinero en sobres.", detail: "Necesidades, Gustos y Ahorro." },
	{ Icon: Target, name: "Tus metas de ahorro.", detail: "Ahorra para lo que quieres." },
	{
		Icon: CircleDollarSign,
		name: "Tu número del día en Inicio.",
		detail: "Mira cuánto puedes gastar hoy.",
	},
];

const LIMITS = [
	{ Icon: Target, name: "2 metas", detail: "El fondo no cuenta." },
	{ Icon: Landmark, name: "2 bancos" },
];

/**
 * B1: once, on the first Inicio after Primeros pasos, for someone on Gratis. Two steps in the same
 * card and the same height. Closing it from either step counts as seen and never starts anything.
 */
export function WelcomeCard({
	name,
	finalFocus,
	onClose,
}: {
	name: string;
	finalFocus: ComponentProps<typeof PlusCard>["finalFocus"];
	onClose: (toPlans: boolean) => void;
}) {
	const [step, setStep] = useState<1 | 2>(1);
	const titleRef = useRef<HTMLHeadingElement>(null);
	// The new step's title takes the focus, so a screen reader announces which step this is.
	const goTo = (next: 1 | 2) => {
		flushSync(() => setStep(next));
		titleRef.current?.focus();
	};

	return (
		<PlusCard
			className="h-160"
			initialFocus={titleRef}
			finalFocus={finalFocus}
			corner={
				step === 2 ? (
					<Button
						variant="ghost"
						className="absolute end-3 top-3 min-h-11 min-w-15 rounded-full bg-popover px-3 text-xs text-muted-foreground"
						onClick={() => goTo(1)}
					>
						Atrás
					</Button>
				) : null
			}
		>
			{step === 1 ? (
				<>
					<PlusCardHeading
						title={`Hola, ${name}`}
						description="Quipu reparte tu sueldo y calcula cuánto puedes gastar hasta tu próximo pago."
						titleRef={titleRef}
						className="max-w-65"
					/>
					<PlusRows rows={ROWS} className="mt-6 gap-4.75 text-sm" />
				</>
			) : (
				<>
					<PlusCardHeading
						pill="Plan Gratis"
						title="Tu plan es Gratis"
						description="Todo lo esencial, sin pagar."
						titleRef={titleRef}
					/>
					<ul className="mt-6 flex flex-wrap gap-x-7.5 gap-y-4">
						{LIMITS.map(({ Icon, name, detail }) => (
							<li key={name} className="flex items-start gap-2.5">
								<Icon aria-hidden className="mt-0.5 size-5 shrink-0 text-envelope-savings" />
								<span>
									<strong className="block text-sm font-semibold">{name}</strong>
									{detail ? (
										<span className="mt-0.5 block text-[11px] text-muted-foreground">{detail}</span>
									) : null}
								</span>
							</li>
						))}
					</ul>
					<p className="mt-6 text-xs leading-relaxed text-muted-foreground md:text-[13px]">
						<strong className="font-medium text-foreground">
							Plus suma Nuestro espacio, más metas, más bancos en Android y Progreso completo.
						</strong>{" "}
						Pruébalo gratis 14 días cuando lo necesites.
					</p>
				</>
			)}

			<div className="mt-auto pt-4.5">
				<div className="grid gap-2.5">
					{step === 1 ? (
						<Button size="xl" className={BIG} onClick={() => goTo(2)}>
							Siguiente
						</Button>
					) : (
						<>
							<Button size="xl" className={BIG} onClick={() => onClose(false)}>
								Empezar
							</Button>
							<Button size="xl" variant="outline" className={BIG} onClick={() => onClose(true)}>
								Ver Plus
							</Button>
						</>
					)}
				</div>
				<div aria-hidden className="mt-5 flex items-center justify-center gap-1.5">
					{[1, 2].map((dot) => (
						<span
							key={dot}
							className={cn(
								"h-1.5 rounded-full",
								dot === step ? "w-5.5 bg-primary" : "w-1.5 bg-border",
							)}
						/>
					))}
				</div>
			</div>
		</PlusCard>
	);
}
