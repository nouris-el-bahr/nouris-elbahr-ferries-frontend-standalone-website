/**
 * Application routes
 */

export const ROUTES = {
  // Dashboard
  HOME: "/",
  DASHBOARD: "/",

  // Reports
  PAYMENT: "/payment",
  SALES: "/sales",
  CONSOLIDATED: "/consolidated",

  // Results
  RESULTS: "/results",
} as const;

export const ROUTE_LABELS = {
  [ROUTES.HOME]: "Tableau de bord",
  [ROUTES.PAYMENT]: "Rapport de paiement",
  [ROUTES.SALES]: "Rapport de ventes",
  [ROUTES.CONSOLIDATED]: "Facture consolidée",
  [ROUTES.RESULTS]: "Résultats",
} as const;

export const MAIN_NAVIGATION = [
  { href: ROUTES.HOME, label: ROUTE_LABELS[ROUTES.HOME], icon: "LayoutDashboard" },
  { href: ROUTES.PAYMENT, label: ROUTE_LABELS[ROUTES.PAYMENT], icon: "CreditCard" },
  { href: ROUTES.SALES, label: ROUTE_LABELS[ROUTES.SALES], icon: "BarChart2" },
  { href: ROUTES.CONSOLIDATED, label: ROUTE_LABELS[ROUTES.CONSOLIDATED], icon: "Zap" },
  { href: ROUTES.RESULTS, label: ROUTE_LABELS[ROUTES.RESULTS], icon: "FileSpreadsheet" },
] as const;

export const PUBLIC_ROUTES = [ROUTES.HOME];
