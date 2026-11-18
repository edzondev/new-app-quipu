import { useLocalSearchParams } from "expo-router";
import { parseDetected } from "@/features/detection/params";
import { RegisterForm } from "@/features/register/form";

export function RegisterScreen() {
	const detected = parseDetected(useLocalSearchParams());
	// key: un aviso nuevo con la hoja abierta rehace el formulario en vez de mostrar el anterior.
	return <RegisterForm key={`${detected?.cents}-${detected?.merchant}`} detected={detected} />;
}
