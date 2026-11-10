import {
	Accordion,
	AccordionItem,
	AccordionPanel,
	AccordionTrigger,
} from "#/components/ui/accordion";
import { FAQ } from "../landing-data";
import { Eyebrow, wrap } from "./preview-parts";

export function LandingFaq() {
	return (
		<section
			id="preguntas"
			aria-labelledby="faq-title"
			className={`${wrap} pt-2 pb-15 sm:pt-8 lg:pb-25`}
		>
			<div className="grid gap-7 md:grid-cols-[0.8fr_1.2fr] md:gap-10 lg:grid-cols-[0.82fr_1.18fr] lg:gap-20">
				<div>
					<Eyebrow index="05 /">Sin vueltas</Eyebrow>
					<h2
						id="faq-title"
						className="mt-4 font-heading text-[41px] leading-[1.06] font-normal tracking-[-0.045em] text-foreground sm:text-[clamp(38px,4.2vw,56px)]"
					>
						Por si te
						<br />
						lo preguntabas.
					</h2>
					<p className="mt-4 max-w-65 text-[13px] leading-[1.8] text-muted-foreground">
						Tu dinero es algo personal.
						<br />
						Está bien querer saber más.
					</p>
				</div>
				<Accordion defaultValue={[FAQ[0].question]} className="border-t border-input">
					{FAQ.map((item) => (
						<AccordionItem key={item.question} value={item.question} className="border-input">
							<AccordionTrigger className="min-h-18 items-center py-5 text-[13px] font-semibold text-foreground sm:text-sm">
								{item.question}
							</AccordionTrigger>
							<AccordionPanel className="pr-5 pb-6 text-xs leading-[1.9] sm:pr-8 sm:text-[13px]">
								{item.answer}
							</AccordionPanel>
						</AccordionItem>
					))}
				</Accordion>
			</div>
		</section>
	);
}
