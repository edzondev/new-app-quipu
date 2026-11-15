import { useLocalSearchParams } from "expo-router";
import { parseDetected } from "@/features/detection/params";
import { RegisterForm } from "@/features/register/form";

export default function RegisterScreen() {
	const detected = parseDetected(useLocalSearchParams());
	return <RegisterForm detected={detected} />;
}
