import { NAME_MAX_LENGTH } from "@quipu/backend/shared/budget";
import { useState } from "react";
import { Text, View } from "react-native";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { Button } from "@/components/ui/button";
import { Chips } from "@/components/ui/chips";
import { TextField } from "@/components/ui/text-field";

const DEFAULT_NAME = "Nuestro espacio";

// The sheet unmounts its content when it closes: each opening starts from the saved name.
function NameForm({
	name,
	suggestions,
	onSave,
	onClose,
}: {
	name: string | null;
	suggestions: string[];
	onSave: (name: string | null) => void;
	onClose: () => void;
}) {
	const [text, setText] = useState(name ?? "");
	const [tooLong, setTooLong] = useState(false);

	function save() {
		const clean = text.trim();
		if (clean.length > NAME_MAX_LENGTH) {
			setTooLong(true);
			return;
		}
		onSave(clean === "" ? null : clean);
		onClose();
	}

	return (
		<View>
			<Text className="text-3xl font-semibold text-foreground">Nombre del espacio</Text>
			<Text className="mt-1 text-sm text-muted-foreground">Lo ven los dos.</Text>
			<Text className="mt-5 text-xs text-muted-foreground">Nombre</Text>
			<TextField
				value={text}
				onChangeText={(value) => {
					setText(value);
					setTooLong(false);
				}}
				placeholder={DEFAULT_NAME}
				accessibilityLabel="Nombre"
			/>
			{tooLong ? (
				<Text accessibilityRole="alert" className="mt-2 text-[13px] text-warning-foreground">
					El nombre tiene máximo 40 caracteres.
				</Text>
			) : null}
			<View className="mt-4">
				<Chips
					options={suggestions}
					selectedIndex={suggestions.indexOf(text)}
					onChange={(index) => {
						setText(suggestions[index]);
						setTooLong(false);
					}}
				/>
			</View>
			<View className="mt-5">
				<Button label="Guardar" onPress={save} />
			</View>
		</View>
	);
}

/** L7. Empty goes back to «Nuestro espacio»; `onSave` gets null then. */
export function SpaceNameSheet({
	isPresented,
	onDismiss,
	name,
	partnerName,
	myName,
	onSave,
}: {
	isPresented: boolean;
	onDismiss: () => void;
	name: string | null;
	partnerName: string | null;
	myName: string;
	onSave: (name: string | null) => void;
}) {
	const suggestions = [
		DEFAULT_NAME,
		"Casa",
		...(partnerName ? [`${myName} y ${partnerName}`] : []),
	];

	return (
		<BottomSheet isPresented={isPresented} onDismiss={onDismiss}>
			<NameForm name={name} suggestions={suggestions} onSave={onSave} onClose={onDismiss} />
		</BottomSheet>
	);
}
