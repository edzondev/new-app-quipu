import { ArrowLeft } from "lucide-react";
import { Button } from "#/components/ui/button";

export function StepHeader({ title, onBack }: { title: string; onBack?: () => void }) {
	return (
		<>
			{onBack ? (
				<Button
					type="button"
					variant="ghost"
					className="mt-6 h-8 gap-2 p-0 text-muted-foreground hover:bg-transparent hover:text-foreground"
					onClick={onBack}
				>
					<ArrowLeft strokeWidth={1.5} />
					Volver
				</Button>
			) : null}
			<h1 className="mt-9 text-4xl font-normal leading-tight tracking-tight sm:text-5xl">
				{title}
			</h1>
		</>
	);
}
