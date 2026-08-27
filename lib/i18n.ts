import type { Locale } from "@/types/domain";

/**
 * Strings, French first.
 *
 * French is the product's default, not English — the same rule the website
 * follows. The fallback chain is requested locale → French → the key itself,
 * so a missing translation degrades to the right language rather than to
 * English or to a blank.
 */
const fr: Record<string, string> = {
  "tab.explore": "Explorer",
  "tab.eat": "Restaurants",
  "tab.trips": "Réservations",
  "tab.account": "Compte",

  "nav.hotels": "Hôtels",
  "nav.restaurants": "Restaurants",
  "nav.flights": "Vols",
  "nav.bus": "Bus",
  "nav.cars": "Voitures",
  "nav.property": "Immobilier",
  "nav.activities": "Activités",

  "home.greeting": "Réservez votre prochain voyage en RDC",
  "home.sub": "Vols, hôtels, transferts et repas — prix fermes, paiement mobile money ou espèces.",
  "home.search": "Où allez-vous ?",
  "home.popular": "Destinations populaires",
  "home.browse": "Que cherchez-vous ?",

  "common.search": "Rechercher",
  "common.cancel": "Annuler",
  "common.done": "Terminé",
  "common.retry": "Réessayer",
  "common.loading": "Chargement…",
  "common.error": "Une erreur est survenue",
  "common.from": "à partir de",
  "common.close": "Fermer",
  "common.apply": "Appliquer",
  "common.currency": "Devise",
  "common.language": "Langue",
  "common.continue": "Continuer",
  "common.back": "Retour",

  "results.none": "Aucun résultat",
  "results.noneBody": "Essayez une autre ville ou une autre date. Nous ajoutons du stock chaque semaine.",
  "results.count": "résultats",

  "cart.title": "Votre panier",
  "cart.empty": "Votre panier est vide",
  "cart.checkout": "Commander",
  "cart.subtotal": "Sous-total",
  "cart.delivery": "Livraison",
  "cart.total": "Total",
  "cart.add": "Ajouter",
  "cart.soldOut": "Épuisé aujourd’hui",
  "cart.deliveryNote": "Les frais de livraison sont ajoutés au paiement, selon votre zone.",
  "cart.oneKitchen": "Une commande ne peut venir que d’un seul restaurant.",
  "cart.emptyAndAdd": "Vider et ajouter",
  "cart.keep": "Garder",

  "checkout.title": "Paiement",
  "checkout.firstName": "Prénom",
  "checkout.lastName": "Nom",
  "checkout.phone": "Téléphone",
  "checkout.address": "Adresse de livraison",
  "checkout.zone": "Zone",
  "checkout.notes": "Indications (facultatif)",
  "checkout.cash": "Espèces",
  "checkout.online": "En ligne",
  "checkout.payCash": "Commander — payer à la livraison",
  "checkout.terms": "J’accepte que la commande soit ferme et non remboursable une fois préparée.",
  "checkout.fillIn": "Complétez vos coordonnées, l’adresse et la zone.",

  "auth.title": "Connexion",
  "auth.phoneLabel": "Votre numéro",
  "auth.sendCode": "Recevoir le code",
  "auth.codeLabel": "Code à 6 chiffres",
  "auth.verify": "Vérifier",
  "auth.sentTo": "Code envoyé au",
  "auth.nameNeeded": "Comment vous appelez-vous ?",
  "auth.signOut": "Se déconnecter",

  "trips.title": "Vos réservations",
  "trips.empty": "Aucune réservation pour l’instant",
  "trips.emptyBody": "Vos vols, chambres et commandes apparaîtront ici.",
  "account.title": "Compte",
  "account.signedOut": "Vous n’êtes pas connecté",
  "account.signIn": "Se connecter"
};

const en: Record<string, string> = {
  "tab.explore": "Explore",
  "tab.eat": "Restaurants",
  "tab.trips": "Bookings",
  "tab.account": "Account",

  "nav.hotels": "Hotels",
  "nav.restaurants": "Restaurants",
  "nav.flights": "Flights",
  "nav.bus": "Bus",
  "nav.cars": "Cars",
  "nav.property": "Property",
  "nav.activities": "Activities",

  "home.greeting": "Book your next trip in the DRC",
  "home.sub": "Flights, hotels, transfers and food — firm prices, mobile money or cash.",
  "home.search": "Where are you going?",
  "home.popular": "Popular destinations",
  "home.browse": "What are you looking for?",

  "common.search": "Search",
  "common.cancel": "Cancel",
  "common.done": "Done",
  "common.retry": "Try again",
  "common.loading": "Loading…",
  "common.error": "Something went wrong",
  "common.from": "from",
  "common.close": "Close",
  "common.apply": "Apply",
  "common.currency": "Currency",
  "common.language": "Language",
  "common.continue": "Continue",
  "common.back": "Back",

  "results.none": "No results",
  "results.noneBody": "Try another city or another date. We add stock every week.",
  "results.count": "results",

  "cart.title": "Your basket",
  "cart.empty": "Your basket is empty",
  "cart.checkout": "Checkout",
  "cart.subtotal": "Subtotal",
  "cart.delivery": "Delivery",
  "cart.total": "Total",
  "cart.add": "Add",
  "cart.soldOut": "Sold out today",
  "cart.deliveryNote": "Delivery is added at checkout, based on your zone.",
  "cart.oneKitchen": "One order can only come from one restaurant.",
  "cart.emptyAndAdd": "Empty and add",
  "cart.keep": "Keep it",

  "checkout.title": "Checkout",
  "checkout.firstName": "First name",
  "checkout.lastName": "Last name",
  "checkout.phone": "Phone",
  "checkout.address": "Delivery address",
  "checkout.zone": "Zone",
  "checkout.notes": "Directions (optional)",
  "checkout.cash": "Cash",
  "checkout.online": "Online",
  "checkout.payCash": "Order — pay on delivery",
  "checkout.terms": "I accept the order is firm and non-refundable once it is being cooked.",
  "checkout.fillIn": "Fill in your details, address and zone.",

  "auth.title": "Sign in",
  "auth.phoneLabel": "Your number",
  "auth.sendCode": "Send me a code",
  "auth.codeLabel": "6-digit code",
  "auth.verify": "Verify",
  "auth.sentTo": "Code sent to",
  "auth.nameNeeded": "What should we call you?",
  "auth.signOut": "Sign out",

  "trips.title": "Your bookings",
  "trips.empty": "No bookings yet",
  "trips.emptyBody": "Your flights, rooms and orders will appear here.",
  "account.title": "Account",
  "account.signedOut": "You are not signed in",
  "account.signIn": "Sign in"
};

const CATALOGUES: Record<Locale, Record<string, string>> = { fr, en };

/** Requested locale → French → the key itself. Never English by default. */
export const translate = (locale: Locale, key: string) =>
  CATALOGUES[locale]?.[key] ?? CATALOGUES.fr[key] ?? key;

export const localized = (value: Localized | undefined, locale: Locale): string =>
  value?.[locale] || value?.fr || value?.en || "";

type Localized = Partial<Record<Locale, string>>;
