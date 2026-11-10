import { formatMonthYear, monthsOfYear, shiftMonth } from "@quipu/backend/shared/dates";
import { cn } from "cn";
import { CalendarIcon, ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { type KeyboardEvent, useRef, useState } from "react";
import { Button } from "#/components/ui/button";
import { Popover, PopoverPopup, PopoverTrigger } from "#/components/ui/popover";

const LABEL = "¿Para cuándo?";
// Arrow keys move a month sideways and a row (3 months) up and down.
const STEPS: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -3, ArrowDown: 3 };

/** The months of one year in 3 columns. Past months are off, this one is marked and the chosen one is lit. */
function MonthGrid({
	value,
	today,
	onSelect,
}: {
	value: string;
	today: string;
	onSelect: (month: string) => void;
}) {
	const thisMonth = today.slice(0, 7);
	// The month the keyboard is on; the year shown is its year. It starts on the saved month.
	const [cursor, setCursor] = useState(value || thisMonth);
	const moveFocus = useRef(false);
	const year = Number(cursor.slice(0, 4));
	const canGoBack = year > Number(thisMonth.slice(0, 4));
	// A saved month already past cannot take the focus: the first one that can is this month.
	const stop = cursor < thisMonth ? thisMonth : cursor;

	function moveTo(month: string) {
		setCursor(month < thisMonth ? thisMonth : month);
	}

	function onKeyDown(event: KeyboardEvent) {
		const step = STEPS[event.key];
		if (step === undefined) return;
		event.preventDefault();
		moveFocus.current = true;
		moveTo(shiftMonth(cursor, step));
	}

	return (
		<div className="w-64">
			<div className="mb-2 flex items-center justify-between">
				<Button
					type="button"
					variant="ghost"
					size="icon"
					aria-label="Año anterior"
					className="size-11"
					disabled={!canGoBack}
					onClick={() => moveTo(shiftMonth(cursor, -12))}
				>
					<ChevronLeftIcon aria-hidden />
				</Button>
				<span className="text-sm font-medium tabular-nums" aria-live="polite">
					{year}
				</span>
				<Button
					type="button"
					variant="ghost"
					size="icon"
					aria-label="Año siguiente"
					className="size-11"
					onClick={() => moveTo(shiftMonth(cursor, 12))}
				>
					<ChevronRightIcon aria-hidden />
				</Button>
			</div>
			<div
				role="group"
				aria-label={`Meses de ${year}`}
				className="grid grid-cols-3 gap-1"
				onKeyDown={onKeyDown}
			>
				{monthsOfYear(year, today, value).map((cell) => (
					<button
						key={cell.month}
						type="button"
						aria-label={cell.label}
						aria-pressed={cell.selected}
						aria-current={cell.current ? "date" : undefined}
						disabled={cell.past}
						tabIndex={cell.month === stop ? 0 : -1}
						ref={(node) => {
							// Only after an arrow key: opening the picker must not steal focus from the field.
							if (node && moveFocus.current && cell.month === stop) {
								node.focus();
								moveFocus.current = false;
							}
						}}
						onClick={() => onSelect(cell.month)}
						className={cn(
							"flex h-11 items-center justify-center rounded-lg text-sm outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:text-muted-foreground/60 disabled:line-through",
							cell.selected
								? "bg-primary font-semibold text-primary-foreground"
								: "hover:bg-accent",
							cell.current && !cell.selected && "border border-foreground/40 font-semibold",
						)}
					>
						{cell.short}
					</button>
				))}
			</div>
		</div>
	);
}

/** A month picked from a grid: the year on top with arrows, and the 12 months below. Saves "2027-03". */
export function MonthField({
	value,
	onChange,
	today,
}: {
	value: string;
	onChange: (month: string) => void;
	/** The Lima date, never the browser's. */
	today: string;
}) {
	const [open, setOpen] = useState(false);
	const field = useRef<HTMLButtonElement>(null);

	return (
		<Popover open={open} onOpenChange={setOpen}>
			<PopoverTrigger
				render={
					<Button
						ref={field}
						type="button"
						variant="outline"
						size="xl"
						aria-label={value ? `${LABEL}, ${formatMonthYear(value)}` : LABEL}
						className="w-full justify-start font-normal"
					/>
				}
			>
				<CalendarIcon aria-hidden />
				{value ? formatMonthYear(value) : <span className="text-muted-foreground">{LABEL}</span>}
			</PopoverTrigger>
			<PopoverPopup align="start" finalFocus={field}>
				<MonthGrid
					value={value}
					today={today}
					onSelect={(month) => {
						onChange(month);
						setOpen(false);
					}}
				/>
			</PopoverPopup>
		</Popover>
	);
}
