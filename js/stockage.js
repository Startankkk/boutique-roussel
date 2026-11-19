// Sauvegarde du panier dans le navigateur, pour le retrouver à la visite suivante.

const CLE = "panier-roussel";
const VERSION = 2;

// Enregistre le panier et le code promo.
export function sauverPanier(lignes, codePromo) {
  const donnees = { version: VERSION, lignes, codePromo };
  localStorage.setItem(CLE, JSON.stringify(donnees));
}

// Relit le panier enregistré, ou un panier vide.
export function chargerPanier() {
  const brut = localStorage.getItem(CLE);
  if (!brut) {
    return { lignes: [], codePromo: "" };
  }
  try {
    const donnees = JSON.parse(brut);
    if (!donnees || donnees.version !== VERSION || !Array.isArray(donnees.lignes)) {
      return { lignes: [], codePromo: "" };
    }
    return { lignes: donnees.lignes, codePromo: donnees.codePromo || "" };
  } catch {
    return { lignes: [], codePromo: "" };
  }
}
