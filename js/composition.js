// Composition d'un bouquet : taille, vase et carte, puis ajout au panier.

import { formaterPrix } from "./outils.js";
import { prixUnitaire } from "./prix.js";

// Choix en cours dans le formulaire de composition.
const options = { taille: "petit", vase: false, carte: false, message: "" };

let bouquetCourant = null;
let reglesOptions = null;
let quandAjoute = null;

// Prépare le formulaire de composition à partir des options du catalogue.
export function preparerComposition(optionsCatalogue, surAjout) {
  reglesOptions = optionsCatalogue;
  quandAjoute = surAjout;

  const tailles = document.querySelector("#choix-taille");
  reglesOptions.tailles.forEach((taille) => {
    const label = document.createElement("label");
    label.className = "flex items-center gap-2 py-2";
    const radio = document.createElement("input");
    radio.type = "radio";
    radio.name = "taille";
    radio.value = taille.id;
    radio.className = "size-5 accent-roussel-vert";
    const texte = taille.supplement ? taille.libelle + " (+ " + formaterPrix(taille.supplement) + ")" : taille.libelle;
    label.append(radio, document.createTextNode(texte));
    tailles.append(label);
  });

  document.querySelector("#libelle-vase").textContent =
    reglesOptions.vase.libelle + " (+ " + formaterPrix(reglesOptions.vase.prix) + ")";
  document.querySelector("#libelle-carte").textContent =
    reglesOptions.carte.libelle + " (+ " + formaterPrix(reglesOptions.carte.prix) + ")";
  document.querySelector("#message-carte").maxLength = reglesOptions.carte.longueurMax;
  actualiserCompteurCarte();

  document.querySelector("#form-composition").addEventListener("change", lireFormulaire);
  document.querySelector("#message-carte").addEventListener("input", lireFormulaire);
  document.querySelector("#form-composition").addEventListener("submit", ajouter);
}

// Ouvre la composition pour un bouquet du catalogue.
export function ouvrirComposition(bouquet) {
  bouquetCourant = bouquet;
  options.taille = "petit";
  options.vase = false;
  options.carte = false;
  options.message = "";
  remplirFormulaire();
  document.querySelector("#composition").hidden = false;
  document.querySelector("#nom-composition").textContent = bouquet.nom;
  afficherPrixComposition();
  document.querySelector("#composition").scrollIntoView({ behavior: "smooth" });
}

// Met le formulaire en accord avec les choix en cours.
function remplirFormulaire() {
  document.querySelectorAll("input[name=taille]").forEach((radio) => {
    radio.checked = radio.value === options.taille;
  });
  document.querySelector("#option-vase").checked = options.vase;
  document.querySelector("#option-carte").checked = options.carte;
  document.querySelector("#message-carte").value = options.message;
  document.querySelector("#zone-message").hidden = !options.carte;
  actualiserCompteurCarte();
}

// Lit le formulaire après chaque changement.
function lireFormulaire() {
  const taille = document.querySelector("input[name=taille]:checked");
  options.taille = taille ? taille.value : "petit";
  options.vase = document.querySelector("#option-vase").checked;
  options.carte = document.querySelector("#option-carte").checked;
  const message = document.querySelector("#message-carte").value;
  options.message = options.carte ? message.slice(0, reglesOptions.carte.longueurMax) : "";
  document.querySelector("#zone-message").hidden = !options.carte;
  actualiserCompteurCarte();
  afficherPrixComposition();
}

// Affiche la limite et le nombre de caractères restants pour la carte.
function actualiserCompteurCarte() {
  const aide = document.querySelector("#aide-carte");
  if (!aide || !reglesOptions) return;
  const max = reglesOptions.carte.longueurMax;
  const longueur = document.querySelector("#message-carte").value.length;
  const restant = max - longueur;
  if (restant <= 0) {
    aide.textContent = "Limite de " + max + " caractères atteinte (format carte 8 × 5 cm).";
    aide.className = "mt-1 text-sm font-bold text-roussel-rose";
  } else {
    aide.textContent = restant + " caractère" + (restant > 1 ? "s" : "") + " restant" + (restant > 1 ? "s" : "") + " (" + max + " max, format carte 8 × 5 cm).";
    aide.className = "mt-1 text-sm text-roussel-gris";
  }
}

// Affiche le prix du bouquet tel qu'il est composé.
function afficherPrixComposition() {
  const prix = prixUnitaire({ bouquetId: bouquetCourant.id, options, quantite: 1 });
  document.querySelector("#prix-composition").textContent = formaterPrix(prix);
}

// Ajoute le bouquet composé au panier.
function ajouter(evenement) {
  evenement.preventDefault();
  if (!bouquetCourant) return;
  quandAjoute(bouquetCourant.id, options);
  const confirmation = document.querySelector("#confirmation-ajout");
  confirmation.textContent = bouquetCourant.nom + " ajouté au panier.";
}
