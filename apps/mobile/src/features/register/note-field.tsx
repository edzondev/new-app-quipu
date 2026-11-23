import { NOTE_MAX_LENGTH } from "@quipu/backend/shared/budget";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { ExpandChevron } from "@/components/ui/expand-chevron";
import { TextField } from "@/components/ui/text-field";

/** «Más detalles»: starts open when there is already a concept (detected or being edited). */
export function NoteField({
	value,
	onChange,
	placeholder,
}: {
	value: string;
	onChange: (value: string) => void;
	placeholder: string;
}) {
	const [open, setOpen] = useState(value !== "");

	return (
		<View className="mt-3">
			<Pressable
				accessibilityRole="button"
				accessibilityState={{ expanded: open }}
				onPress={() => setOpen((current) => !current)}
				className="min-h-11 flex-row items-center gap-1.5 self-start active:opacity-60"
			>
				<Text className="text-[13.5px] font-semibold text-muted-foreground">Más detalles</Text>
				<ExpandChevron open={open} />
			</Pressable>
			{open ? (
				<>
					<Text className="mt-1 text-[13px] text-muted-foreground">Concepto · opcional</Text>
					<TextField
						value={value}
						onChangeText={onChange}
						placeholder={placeholder}
						maxLength={NOTE_MAX_LENGTH}
						accessibilityLabel="Concepto"
					/>
				</>
			) : null}
		</View>
	);
}
