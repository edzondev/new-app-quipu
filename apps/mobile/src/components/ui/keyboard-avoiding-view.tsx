import { KeyboardAvoidingView as KeyboardControllerAvoidingView } from "react-native-keyboard-controller";
import { withUniwind } from "uniwind";

// Android is edge-to-edge, so the system does not resize the window for the keyboard: this does it.
export const KeyboardAvoidingView = withUniwind(KeyboardControllerAvoidingView);
