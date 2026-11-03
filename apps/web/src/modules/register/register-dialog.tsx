import { createContext, useContext, useState } from "react";
import { Dialog } from "#/components/ui/dialog";
import type { Draft } from "./movement-draft";
import { RegisterForm } from "./register-form";

const RegisterContext = createContext<(draft?: Partial<Draft>) => void>(() => {});

export function useRegister() {
	return useContext(RegisterContext);
}

export function RegisterProvider({ children }: { children: React.ReactNode }) {
	const [open, setOpen] = useState(false);
	const [session, setSession] = useState(0);
	const [draft, setDraft] = useState<Draft>({ kind: "expense", amount: "" });

	function openRegister(next?: Partial<Draft>) {
		setDraft({ kind: "expense", amount: "", ...next });
		setSession((current) => current + 1);
		setOpen(true);
	}

	return (
		<RegisterContext.Provider value={openRegister}>
			{children}
			<Dialog open={open} onOpenChange={setOpen}>
				{open ? <RegisterForm key={session} draft={draft} onDone={() => setOpen(false)} /> : null}
			</Dialog>
		</RegisterContext.Provider>
	);
}
