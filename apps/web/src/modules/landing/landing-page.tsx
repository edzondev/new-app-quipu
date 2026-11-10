import { LandingComparison } from "./components/landing-comparison";
import { LandingCouples } from "./components/landing-couples";
import { LandingFaq } from "./components/landing-faq";
import { LandingFinal } from "./components/landing-final";
import { LandingFooter } from "./components/landing-footer";
import { LandingHero } from "./components/landing-hero";
import { LandingNav } from "./components/landing-nav";
import { LandingPricing } from "./components/landing-pricing";
import { LandingSteps } from "./components/landing-steps";

export function LandingPage() {
	return (
		<>
			<a
				href="#contenido"
				className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-5 focus:z-20 focus:rounded-full focus:bg-foreground focus:px-5 focus:py-3 focus:text-background"
			>
				Saltar al contenido
			</a>
			<LandingNav />
			<main id="contenido" className="scroll-smooth motion-reduce:scroll-auto">
				<LandingHero />
				<LandingSteps />
				<LandingComparison />
				<LandingCouples />
				<LandingPricing />
				<LandingFaq />
				<LandingFinal />
			</main>
			<LandingFooter />
		</>
	);
}
