import { formatCents } from "@quipu/backend/shared/budget";
import { type Interval, monthlyEquivalent } from "@quipu/backend/shared/billing";
import type { ComponentProps, ReactNode } from "react";
import { useId } from "react";
import {
	FormSheetDescription,
	FormSheetPanel,
	FormSheetPopup,
	FormSheetTitle,
} from "#/components/form-sheet";
import { QuipuMark } from "#/components/quipu-mark";
import { Button } from "#/components/ui/button";
import { Skeleton } from "#/components/ui/skeleton";
import { useCheckout } from "../use-checkout";
import { type PlusFeature, PlusFeatures } from "./plus-features";

export function PlusOffer({
	highlight,
	finalFocus,
}: {
	highlight?: PlusFeature;
	finalFocus: ComponentProps<typeof FormSheetPopup>["finalFocus"];
}) {
	const checkout = useCheckout();
	const compareId = useId();
	const { status, prices, period } = checkout;
	const noPrice = status === "ready" && prices[period] === null;

	return (
		<FormSheetPopup finalFocus={finalFocus} className="md:max-w-232">
			<FormSheetPanel className="p-0 md:grid md:grid-cols-[1.08fr_1fr]">
				<div className="flex flex-col justify-center px-6 pt-7 pb-6 md:col-start-2 md:row-start-1 md:px-9 md:pt-11 md:pb-8">
					<QuipuMark className="mb-3.5 h-9 w-10 md:mb-4.5 md:h-10.5 md:w-11" />
					<FormSheetTitle className="text-[26px] leading-tight font-semibold tracking-tight md:text-[29px]">
						Quipu Plus
					</FormSheetTitle>
					<FormSheetDescription className="mt-2">Elige cómo pagar.</FormSheetDescription>

					<fieldset className="mt-5 grid min-w-0 gap-2.5 md:mt-7">
						<legend className="sr-only">Periodicidad</legend>
						<PeriodOption value="year" checked={period === "year"} onChange={checkout.setPeriod}>
							<span className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
								Anual
								{checkout.savings !== null ? (
									<span className="rounded-md bg-popover px-2 py-0.5 text-xs font-medium whitespace-nowrap text-primary">
										Ahorras S/ {formatCents(checkout.savings)}
									</span>
								) : null}
							</span>
							<Price status={status} cents={prices.year} unit="al año" />
							{prices.year !== null ? (
								<span className="mt-1 block text-xs font-normal text-muted-foreground">
									Equivale a S/ {formatCents(monthlyEquivalent(prices.year))} al mes.
								</span>
							) : null}
						</PeriodOption>
						<PeriodOption value="month" checked={period === "month"} onChange={checkout.setPeriod}>
							Mensual
							<Price status={status} cents={prices.month} unit="al mes" />
						</PeriodOption>
					</fieldset>

					{status === "error" ? (
						<div role="alert" className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1">
							<p className="text-sm text-warning-foreground">No pudimos cargar los precios.</p>
							<Button
								variant="outline"
								className="pointer-coarse:min-h-11"
								onClick={checkout.retry}
							>
								Reintentar
							</Button>
						</div>
					) : null}

					<Button
						size="xl"
						className="mt-5 h-12 w-full rounded-full sm:h-12"
						disabled={!checkout.canPay}
						onClick={checkout.start}
					>
						{checkout.opening ? "Abriendo pago…" : "Continuar"}
					</Button>
					{checkout.failed ? (
						<p role="alert" className="mt-2 text-center text-xs text-warning-foreground">
							No pudimos abrir el pago. Intenta de nuevo.
						</p>
					) : null}
					{status === "error" ? null : (
						<p className="mt-3 text-center text-xs leading-relaxed text-muted-foreground">
							{noPrice ? (
								"El pago aún no está disponible."
							) : (
								<>
									{period === "year" ? "Cobro anual." : "Cobro mensual."} Renovación automática.
									<span className="block">Pago seguro · Cancela cuando quieras.</span>
								</>
							)}
						</p>
					)}
				</div>

				<section
					aria-labelledby={compareId}
					className="flex flex-col bg-muted px-6 pt-6 pb-7 md:col-start-1 md:row-start-1 md:px-7.5 md:pt-10 md:pb-8"
				>
					<h2 id={compareId} className="text-lg font-semibold tracking-tight md:text-xl">
						Lo que suma Plus
					</h2>
					<p className="mt-1.5 mb-5 text-xs text-muted-foreground md:mt-2 md:text-[13px]">
						Todo lo de Gratis, más estas funciones.
					</p>
					<PlusFeatures highlight={highlight} />
					<p className="mt-auto pt-6 text-xs text-muted-foreground">
						El resto de Quipu sigue gratis.
					</p>
				</section>
			</FormSheetPanel>
		</FormSheetPopup>
	);
}

function PeriodOption({
	value,
	checked,
	onChange,
	children,
}: {
	value: Interval;
	checked: boolean;
	onChange: (value: Interval) => void;
	children: ReactNode;
}) {
	return (
		<label className="flex min-h-22 cursor-pointer items-center gap-3 rounded-xl border border-border px-4 py-3.5 font-semibold has-checked:border-primary has-checked:bg-primary/8 has-focus-visible:ring-2 has-focus-visible:ring-ring has-focus-visible:ring-offset-1 has-focus-visible:ring-offset-background">
			<input
				type="radio"
				name="plus-period"
				value={value}
				checked={checked}
				onChange={() => onChange(value)}
				className="peer sr-only"
			/>
			<span
				aria-hidden
				className="size-4.5 shrink-0 rounded-full border-[1.5px] border-muted-foreground peer-checked:border-[5px] peer-checked:border-primary"
			/>
			<span className="min-w-0 flex-1">{children}</span>
		</label>
	);
}

function Price({
	status,
	cents,
	unit,
}: {
	status: ReturnType<typeof useCheckout>["status"];
	cents: number | null;
	unit: string;
}) {
	if (status === "loading") return <Skeleton className="mt-1.5 h-7 w-32" />;
	if (status === "error") return null;
	if (cents === null) {
		return <strong className="mt-1 block text-[17px] font-semibold">Precio por confirmar</strong>;
	}
	return (
		<span className="mt-1 flex items-baseline gap-1.5 text-[13px] font-normal">
			<strong className="text-[22px] leading-tight font-semibold tracking-tight tabular-nums">
				S/ {formatCents(cents)}
			</strong>
			{unit}
		</span>
	);
}
