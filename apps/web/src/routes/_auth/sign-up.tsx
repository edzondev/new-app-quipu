import { createFileRoute } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { Button } from "#/components/ui/button";

export const Route = createFileRoute("/_auth/sign-up")({
	component: RouteComponent,
});

function RouteComponent() {
	return (
		<>
			<Button
				variant="ghost"
				className="mb-9 h-8 gap-2 p-0 text-muted-foreground hover:bg-transparent hover:text-ink"
			>
				<ArrowLeft strokeWidth={1.5} />
				Volver
			</Button>
			<h1 className="text-3xl sm:text-4xl">Empecemos por lo básico.</h1>
		</>
	);
}
