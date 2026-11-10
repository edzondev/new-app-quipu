export const NAV_LINKS = [
	{ href: "#como-funciona", label: "Cómo funciona" },
	{ href: "#parejas", label: "Para parejas" },
	{ href: "#precios", label: "Precios" },
	{ href: "#preguntas", label: "Preguntas" },
] as const;

export const HERO_CHECKS = ["En soles", "Sin conectar tu banco", "Lo básico, gratis"] as const;

export type Envelope = {
	name: string;
	amount: string;
	total: string;
	percent: number;
	color: string;
};

export const ENVELOPES: readonly Envelope[] = [
	{
		name: "Necesidades",
		amount: "S/ 530.60",
		total: "de S/ 763.60",
		percent: 69,
		color: "var(--envelope-needs)",
	},
	{
		name: "Gustos",
		amount: "S/ 292.50",
		total: "de S/ 383.00",
		percent: 76,
		color: "var(--envelope-wants)",
	},
	{
		name: "Ahorro",
		amount: "S/ 266.00",
		total: "de S/ 532.00",
		percent: 50,
		color: "var(--envelope-savings)",
	},
];

export const STEPS = [
	{
		number: "01",
		title: "Anotas",
		text: "El sueldo, el mercado, ese cafecito. Registra lo que entra y lo que sale.",
		label: "Ejemplo de registro: un gasto de 25 soles en el mercado, del sobre Necesidades.",
	},
	{
		number: "02",
		title: "Quipu reparte",
		text: "Tu dinero tiene un lugar: Necesidades, Gustos y Ahorro. Tú eliges el reparto.",
		label: "Ejemplo de los tres sobres: Necesidades, Gustos y Ahorro.",
	},
	{
		number: "03",
		title: "Sabes tu número",
		text: "Mira cuánto puedes gastar hoy. Tus pagos pendientes y tu ahorro ya están separados.",
		label: "Ejemplo del número del día: puedes gastar 68 soles con 59. Celular vence en tres días.",
	},
] as const;

export const COMPARISON_COLUMNS = ["Quipu", "Excel", "No llevar nada"] as const;

export const COMPARISON_ROWS = [
	{
		criterion: "Te dice cuánto puedes gastar hoy",
		values: ["Sí", "Haciendo cuentas", "No"],
	},
	{
		criterion: "Reserva tus pagos del mes antes de gastar",
		values: ["Sí", "A mano", "No"],
	},
	{
		criterion: "Te avisa antes de que venza un pago",
		values: ["Sí", "No", "No"],
	},
	{
		criterion: "Para parejas, cada uno con lo suyo",
		values: ["Sí, con Quipu Plus", "Complicado", "No"],
	},
	{ criterion: "Precio", values: ["Gratis lo básico", "Gratis", "Gratis"] },
] as const;

export const PLANS = [
	{
		name: "Gratis",
		sub: "Para empezar con las cosas claras.",
		price: "S/ 0",
		priceNote: "sin límite de tiempo",
		monthly: "Lo esencial, todos los días.",
		features: [
			"Registra ingresos y gastos",
			"Sobres y tu número del día",
			"Compromisos y sus vencimientos",
			"2 metas de ahorro",
			"Tu fondo de emergencia",
		],
		cta: "Empezar gratis",
		foot: "Sin tarjeta.",
		highlight: false,
	},
	{
		name: "Quipu Plus",
		sub: "Más espacio para tus planes y los de ambos.",
		price: "S/ 89.90",
		priceNote: "al año",
		monthly: "o S/ 12.90 al mes",
		features: [
			"Todo lo de Gratis",
			"Nuestro espacio, para los dos",
			"Más de 2 metas de ahorro",
			"Progreso completo con PDF y Excel",
		],
		cta: "Probar Quipu Plus",
		foot: "14 días gratis, sin tarjeta.",
		highlight: true,
	},
] as const;

export const FAQ = [
	{
		question: "¿Tengo que conectar mi banco?",
		answer:
			"No. Tú anotas tus ingresos y gastos. Quipu no necesita entrar a tu cuenta bancaria para ayudarte a ordenar tu mes.",
	},
	{
		question: "¿Está en soles?",
		answer:
			"Sí. Tus movimientos, sobres, compromisos y metas se llevan en soles (S/). Pensado para tu día a día en Perú.",
	},
	{
		question: "¿Qué pasa si se acaba mi Plus?",
		answer:
			"Tus datos se quedan. Lo que es parte de Plus pasa a solo lectura; puedes seguir usando las funciones del plan Gratis.",
	},
	{
		question: "¿Funciona en el celular?",
		answer:
			"Sí, puedes usar la web desde el navegador de tu celular. La app para el celular viene pronto.",
	},
	{
		question: "¿Necesito saber de finanzas?",
		answer:
			"No. Empieza con lo que tienes hoy y anota tus movimientos. Quipu separa tu dinero en sobres y te muestra cuánto puedes gastar cada día.",
	},
] as const;

export const FOOTER_LINKS = ["Privacidad", "Términos", "Contacto"] as const;
