import { FOOTER_LINKS } from "../landing-data";
import { Brand, wrap } from "./preview-parts";

export function LandingFooter() {
	return (
		<footer className={`${wrap} pt-8.5 pb-6 sm:pt-10.5`}>
			<div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center sm:gap-5">
				<div className="sm:flex sm:items-center sm:gap-6">
					<a href="#contenido" aria-label="Quipu, volver arriba">
						<Brand />
					</a>
					<p className="text-[11px] text-muted-foreground">Tu dinero, con las cosas claras.</p>
				</div>
				{/* Privacidad, Términos y Contacto aún no tienen página: van como texto, sin enlace. */}
				<ul aria-label="Información legal" className="flex gap-6">
					{FOOTER_LINKS.map((label) => (
						<li key={label} className="flex min-h-11 items-center text-[11px]">
							{label}
						</li>
					))}
				</ul>
			</div>
			<div className="mt-4 flex flex-col justify-between gap-3 border-t border-border pt-4.5 text-[9px] text-muted-foreground sm:mt-6 sm:flex-row sm:text-[10px]">
				<span>© 2026 Quipu</span>
				<span>Hecho en Lima, para tu día a día.</span>
			</div>
		</footer>
	);
}
