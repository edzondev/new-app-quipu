export function FieldError({ children }: { children?: string }) {
	return children ? (
		<p role="alert" className="mt-1.5 text-xs text-warning-foreground">
			{children}
		</p>
	) : null;
}
