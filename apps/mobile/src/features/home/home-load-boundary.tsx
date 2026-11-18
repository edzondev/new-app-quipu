import { Component, type ReactNode } from "react";
import { ReloadError } from "@/components/ui/reload-error";

type Props = { children: ReactNode };
type State = { failed: boolean };

/**
 * Convex throws a failed query during render, and a failed cycle opening throws too.
 * This shows P3 instead of crashing, and retries by mounting the children again.
 */
export class HomeLoadBoundary extends Component<Props, State> {
	state: State = { failed: false };

	static getDerivedStateFromError(): State {
		return { failed: true };
	}

	retry = () => {
		this.setState({ failed: false });
	};

	render() {
		if (this.state.failed) {
			return (
				<ReloadError
					message="No pudimos cargar tu inicio."
					detail="Tus datos están a salvo. Prueba otra vez."
					onRetry={this.retry}
				/>
			);
		}
		return this.props.children;
	}
}
