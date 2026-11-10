import { createContext, useContext, useState } from "react";
import { FormSheet } from "#/components/form-sheet";
import { EditSavingForm } from "#/modules/savings/components/edit-saving-form";
import type { Draft, SavingDraft } from "./movement-draft";
import { RegisterForm } from "./register-form";

type Opened = Partial<Draft> | SavingDraft;

const RegisterContext = createContext<(draft?: Opened) => void>(() => {});

export function useRegister() {
	return useContext(RegisterContext);
}

export function RegisterProvider({ children }: { children: React.ReactNode }) {
	const [open, setOpen] = useState(false);
	const [session, setSession] = useState(0);
	const [draft, setDraft] = useState<Draft | SavingDraft>({ kind: "expense", amount: "" });

	function openRegister(next?: Opened) {
		setDraft(next && "row" in next ? next : { kind: "expense", amount: "", ...next });
		setSession((current) => current + 1);
		setOpen(true);
	}

	const close = () => setOpen(false);

	return (
		<RegisterContext.Provider value={openRegister}>
			{children}
			<FormSheet open={open} onOpenChange={setOpen}>
				{"row" in draft ? (
					<EditSavingForm key={session} row={draft.row} onDone={close} />
				) : (
					<RegisterForm key={session} draft={draft} onDone={close} />
				)}
			</FormSheet>
		</RegisterContext.Provider>
	);
}
