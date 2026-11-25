import { QueryErrorResetBoundary } from "@tanstack/react-query";
import { Component, type ReactNode, Suspense } from "react";
import { ReloadError } from "@/components/ui/reload-error";

type Props = { message: string; onReset: () => void; children: ReactNode };
type State = { failed: boolean };

/** A failed query or cycle opening throws during render: this shows P3 instead of crashing. */
class FailedBoundary extends Component<Props, State> {
	state: State = { failed: false };

	static getDerivedStateFromError(): State {
		return { failed: true };
	}

	retry = () => {
		// The failed queries are reset first, or mounting the children again would read the same error.
		this.props.onReset();
		this.setState({ failed: false });
	};

	render() {
		if (this.state.failed) {
			return <ReloadError message={this.props.message} onRetry={this.retry} />;
		}
		return this.props.children;
	}
}

/** What a screen shows while its data loads (`fallback`, P1) and when it cannot load (`message`, P3). */
export function LoadBoundary({
	message,
	fallback = null,
	children,
}: {
	message: string;
	fallback?: ReactNode;
	children: ReactNode;
}) {
	return (
		<QueryErrorResetBoundary>
			{({ reset }) => (
				<FailedBoundary message={message} onReset={reset}>
					<Suspense fallback={fallback}>{children}</Suspense>
				</FailedBoundary>
			)}
		</QueryErrorResetBoundary>
	);
}
