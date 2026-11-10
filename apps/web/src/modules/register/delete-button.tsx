import { useState } from "react";
import { Button } from "#/components/ui/button";

export function DeleteButton({
	prompt,
	disabled,
	onDelete,
}: {
	prompt: string;
	disabled: boolean;
	onDelete: () => void;
}) {
	const [confirm, setConfirm] = useState(false);

	if (confirm) {
		return (
			<>
				<p className="mr-auto text-sm text-muted-foreground">{prompt}</p>
				<Button type="button" variant="ghost" disabled={disabled} onClick={onDelete}>
					Eliminar
				</Button>
				<Button type="button" variant="ghost" disabled={disabled} onClick={() => setConfirm(false)}>
					Cancelar
				</Button>
			</>
		);
	}

	return (
		<Button type="button" variant="ghost" disabled={disabled} onClick={() => setConfirm(true)}>
			Eliminar
		</Button>
	);
}
