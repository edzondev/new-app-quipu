import { formatLocalDate, formatMonthYear, parseLocalDate } from "@quipu/backend/shared/dates";
import { es } from "@daypicker/react/locale";
import { CalendarIcon } from "lucide-react";
import { useState } from "react";
import { Button } from "#/components/ui/button";
import { Calendar } from "#/components/ui/calendar";
import { Popover, PopoverPopup, PopoverTrigger } from "#/components/ui/popover";

const LABEL = "¿Para cuándo?";

/** A month picked from a calendar: the whole month is shaded and any day of it saves "2027-03". */
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
	const thisMonth = today.slice(0, 7);
	const selectedMonth = value;

	return (
		<Popover open={open} onOpenChange={setOpen}>
			<PopoverTrigger
				render={
					<Button
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
			<PopoverPopup align="start">
				<div>
					<Calendar
						mode="single"
						locale={es}
						today={parseLocalDate(today)}
						defaultMonth={parseLocalDate(`${value || thisMonth}-01`)}
						startMonth={parseLocalDate(`${thisMonth}-01`)}
						disabled={{ before: parseLocalDate(`${thisMonth}-01`) }}
						modifiers={{ chosen: (date) => formatLocalDate(date).slice(0, 7) === selectedMonth }}
						modifiersClassNames={{ chosen: "rounded-lg bg-accent" }}
						onSelect={(date) => {
							if (!date) return;
							onChange(formatLocalDate(date).slice(0, 7));
							setOpen(false);
						}}
					/>
					<p className="px-2 pb-1 text-xs text-muted-foreground">Solo cuenta el mes.</p>
				</div>
			</PopoverPopup>
		</Popover>
	);
}
