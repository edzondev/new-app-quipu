import { useQueryClient } from "@tanstack/react-query";
import { Button } from "#/components/ui/button";

/** A page that could not load: says what failed and offers to ask again. */
export function ReloadError({ message }: { message: string }) {
	const queryClient = useQueryClient();
	return (
		<div role="alert" className="pt-6">
			<p className="text-sm text-warning-foreground">{message}</p>
			<Button
				variant="outline"
				size="xl"
				className="mt-3"
				onClick={() => {
					void queryClient.invalidateQueries();
				}}
			>
				Reintentar
			</Button>
		</div>
	);
}
