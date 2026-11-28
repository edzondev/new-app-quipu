import { NAME_MAX_LENGTH } from "@quipu/backend/shared/budget";
import { type Cadence, type CycleStartDay, parseStartDay } from "@quipu/backend/shared/plan";
import {
	DEFAULT_START_DAY,
	describeCycleChange,
	getStartDayLabel,
} from "@quipu/backend/shared/start-day";
import { useState } from "react";
import { Linking, Text, View } from "react-native";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { Button } from "@/components/ui/button";
import { Chips } from "@/components/ui/chips";
import { Notice } from "@/components/ui/notice";
import { SheetHeader } from "@/components/ui/sheet-header";
import { TextField } from "@/components/ui/text-field";
import { CODE_LENGTH, otpDigits } from "@/features/auth/validation";
import {
	CADENCE_LABELS,
	CADENCE_ORDER,
	currentCycleText,
	type Cycle,
} from "@/features/cycle/cycle-days";
import { DayList } from "@/features/cycle/day-list";
import { DayRow } from "@/features/cycle/day-row";
import { SUBSCRIPTIONS_URL } from "./links";

function CadenceChips({
	cadence,
	onChange,
}: {
	cadence: Cadence;
	onChange: (cadence: Cadence) => void;
}) {
	return (
		<Chips
			options={CADENCE_LABELS}
			selectedIndex={CADENCE_ORDER.indexOf(cadence)}
			onChange={(index) => onChange(CADENCE_ORDER[index])}
		/>
	);
}

// The sheet unmounts its content when it closes: each opening starts from the saved cycle.
function CycleForm({
	cycle,
	currentEndDate,
	onSave,
	onClose,
}: {
	cycle: Cycle;
	currentEndDate: string;
	onSave: (cycle: Cycle) => void;
	onClose: () => void;
}) {
	const [cadence, setCadence] = useState(cycle.cadence);
	const [day, setDay] = useState<CycleStartDay>(cycle.cycleStartDay);
	const [picking, setPicking] = useState(false);

	if (picking) {
		return (
			<DayList
				cadence={cadence}
				value={day}
				onPick={(picked) => {
					setDay(picked);
					setPicking(false);
				}}
			/>
		);
	}

	const next = { cadence, cycleStartDay: day };
	const unchanged = cadence === cycle.cadence && day === cycle.cycleStartDay;

	return (
		<View>
			<SheetHeader title="Tu ciclo" />
			<Text className="mt-1.5 text-sm leading-[21px] text-muted-foreground">
				Ahora: {currentCycleText(cycle)}.
			</Text>
			<View className="mt-4">
				<CadenceChips
					cadence={cadence}
					onChange={(picked) => {
						setCadence(picked);
						setDay(parseStartDay(DEFAULT_START_DAY[picked]));
					}}
				/>
			</View>
			<View className="mt-3">
				<DayRow
					label="Te pagan"
					value={getStartDayLabel(cadence, day)}
					accessibilityLabel={`Te pagan ${getStartDayLabel(cadence, day)}. Cambiar`}
					onPress={() => setPicking(true)}
				/>
			</View>
			<View className="mt-3.5">
				<Notice>{describeCycleChange(next, currentEndDate)}</Notice>
			</View>
			<View className="mt-[18px] mb-2">
				<Button
					label="Guardar"
					disabled={unchanged}
					onPress={() => {
						onSave(next);
						onClose();
					}}
				/>
			</View>
		</View>
	);
}

export function CycleSheet({
	isPresented,
	onDismiss,
	cycle,
	currentEndDate,
	onSave,
}: {
	isPresented: boolean;
	onDismiss: () => void;
	cycle: Cycle;
	currentEndDate: string;
	onSave: (cycle: Cycle) => void;
}) {
	return (
		<BottomSheet isPresented={isPresented} onDismiss={onDismiss}>
			<CycleForm
				cycle={cycle}
				currentEndDate={currentEndDate}
				onSave={onSave}
				onClose={onDismiss}
			/>
		</BottomSheet>
	);
}

type Content = {
	email: string;
	date: string;
	lines: string[];
	stillPaying: boolean;
	onConfirm: () => void;
	onClose: () => void;
};

// The sheet unmounts its content when it closes: each opening starts at the notice.
function DeleteContent({ email, date, lines, stillPaying, onConfirm, onClose }: Content) {
	const [step, setStep] = useState<"notice" | "code">("notice");
	const [code, setCode] = useState("");

	if (step === "code") {
		return (
			<View>
				<Text className="text-3xl font-semibold text-foreground">Revisa tu correo</Text>
				<Text className="mt-2 text-sm text-muted-foreground">
					Escribe el código que enviamos a{" "}
					<Text className="font-semibold text-foreground">{email}</Text>.
				</Text>
				<Text className="mt-5 text-xs text-muted-foreground">Código</Text>
				<TextField
					value={code}
					onChangeText={(text) => setCode(otpDigits(text))}
					keyboardType="number-pad"
					autoComplete="one-time-code"
					autoFocus
					accessibilityLabel="Código de 6 dígitos"
				/>
				<Text className="mt-2 text-[13px] text-muted-foreground">Vence en 5 minutos.</Text>
				<View className="mt-5 gap-2">
					<Button
						label="Eliminar cuenta"
						variant="warning"
						disabled={code.length < CODE_LENGTH}
						onPress={onConfirm}
					/>
					<Button label="Cancelar" variant="secondary" onPress={onClose} />
				</View>
			</View>
		);
	}

	return (
		<View>
			<Text className="text-3xl font-semibold text-foreground">Eliminar tu cuenta</Text>
			<Text className="mt-2 text-sm text-muted-foreground">
				El {date} borraremos tu cuenta y tus datos en Quipu. Hasta ese día puedes cancelar.
			</Text>
			<View className="mt-4 gap-2">
				{lines.map((line) => (
					<Text key={line} className="text-sm text-foreground">
						{line}
					</Text>
				))}
			</View>
			{stillPaying ? (
				<View className="mt-4 gap-1">
					<Text className="text-sm font-semibold text-foreground">Tu Quipu Plus sigue activo.</Text>
					<Text className="text-sm text-muted-foreground">
						Cancélalo aparte para que no se te cobre.
					</Text>
					<View className="mt-2">
						<Button
							label="Administrar suscripción"
							variant="secondary"
							onPress={() => void Linking.openURL(SUBSCRIPTIONS_URL)}
						/>
					</View>
				</View>
			) : null}
			<View className="mt-6 gap-2">
				<Button label="Enviar código" variant="warning" onPress={() => setStep("code")} />
				<Button label="Cancelar" variant="secondary" onPress={onClose} />
			</View>
		</View>
	);
}

export function DeleteSheet({
	isPresented,
	onDismiss,
	...content
}: { isPresented: boolean; onDismiss: () => void } & Omit<Content, "onClose">) {
	return (
		<BottomSheet isPresented={isPresented} onDismiss={onDismiss}>
			<DeleteContent {...content} onClose={onDismiss} />
		</BottomSheet>
	);
}

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
