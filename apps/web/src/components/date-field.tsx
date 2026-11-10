import { formatFullDay, formatLocalDate, parseLocalDate } from "@quipu/backend/shared/dates";
import { es } from "@daypicker/react/locale";
import { cn } from "cn";
import { CalendarIcon } from "lucide-react";
import { useState } from "react";
import { Button } from "#/components/ui/button";
import { Calendar } from "#/components/ui/calendar";
import { Popover, PopoverPopup, PopoverTrigger } from "#/components/ui/popover";

/** A day picked from a calendar. Today is marked, and the days before it are off. */
export function DateField({
	value,
	onChange,
	today,
	invalid,
}: {
	value: string;
	onChange: (date: string) => void;
	/** The Lima date, never the browser's. */
	today: string;
	invalid?: boolean;
}) {
	const [open, setOpen] = useState(false);
	const todayDate = parseLocalDate(today);

	return (
		<Popover open={open} onOpenChange={setOpen}>
			<PopoverTrigger
				render={
					<Button
						type="button"
						variant="outline"
						size="xl"
						aria-label={value ? `Fecha, ${formatFullDay(value)}` : "Fecha"}
						aria-invalid={invalid ? true : undefined}
						className={cn("w-full justify-start font-normal", invalid && "border-warning")}
					/>
				}
			>
				<CalendarIcon aria-hidden />
				{value ? formatFullDay(value) : <span className="text-muted-foreground">Fecha</span>}
			</PopoverTrigger>
			<PopoverPopup align="start">
				<Calendar
					mode="single"
					locale={es}
					today={todayDate}
					defaultMonth={value ? parseLocalDate(value) : todayDate}
					selected={value ? parseLocalDate(value) : undefined}
					disabled={{ before: todayDate }}
					onSelect={(date) => {
						if (!date) return;
						onChange(formatLocalDate(date));
						setOpen(false);
					}}
				/>
			</PopoverPopup>
		</Popover>
	);
}
