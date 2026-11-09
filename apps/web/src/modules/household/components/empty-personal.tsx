import { Link } from "@tanstack/react-router";
import { Button } from "#/components/ui/button";

/** P8b: someone who joined Nuestro espacio without Primeros pasos has no Personal yet. */
export function EmptyPersonal() {
	return (
		<section className="mt-10 pb-16 sm:mt-14">
			<h1 className="max-w-2xl font-heading text-3xl font-medium tracking-tight sm:text-5xl">
				Arma tu plan personal cuando quieras
			</h1>
			<p className="mt-5 max-w-lg text-sm text-muted-foreground">
				Tus sobres personales son solo tuyos. Mientras tanto, puedes llevar Nuestro espacio.
			</p>
			<Button
				size="lg"
				className="mt-8 rounded-full px-7"
				render={<Link to="/onboarding" search={{ redirect: "/home" }} />}
			>
				Armar mi plan
			</Button>
		</section>
	);
}
