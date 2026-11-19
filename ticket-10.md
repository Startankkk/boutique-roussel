##Reproduction du probleme : 

1. Ouvrir l'application dans le navigateur (http://localhost:8080).
2. Ouvrir la console des outils de développement (F12) et injecter un panier au format de la version 1 dans le localStorage :
   ```javascript
   localStorage.setItem("panier-roussel", JSON.stringify([
     { nom: "Pivoine poudrée", prix: 34.9 }
   ]));
   ```
3. Recharger la page (F5).
4. Observer le panier et le récapitulatif :
   - La ligne du panier affiche « NaN € ».
   - Le sous-total affiche « NaN € ».
   - Le total affiche « NaN € ».
   - Le bouton « Commander » est bloqué ou produit des incohérences.

##Prompt : 

Ticket 10 : « NaN € » pour les clientes de la version 1
Symptôme : pour une cliente qui commandait avec la version 1, le panier affiche
« NaN € » et la commande est bloquée. Les autres clientes n'ont pas le problème.
Règle : les paniers de la version 1 ne sont pas repris (cahier des charges).
Étapes : dans le navigateur, injecter dans localStorage une valeur au format de la
version 1 (demander à l'IA de la deviner à partir du code, puis la vérifier), recharger,
observer.
Attendu : le panier est ignoré ou vidé proprement, sans NaN.
Obtenu : [affichage observé].
Code concerné : js/stockage.js, js/panier.js, js/prix.js.

##Hypothèses de l'ia, retenues ou écartés, et comment vous les avez vérifiées: 

Format de la version 1 déduit du code :
En examinant `js/stockage.js#L19` (`donnees.lignes || donnees`) et `js/affichage.js#L52` (`bouquet ? bouquet.nom : ligne.nom`), on déduit que la version 1 stockait directement un tableau d'articles `[{ nom: "...", prix: ... }]` (sans enveloppe `{ version: 2, lignes, codePromo }`, sans `bouquetId` ni propriété `quantite`).

Les 3 hypothèses classées par probabilité :

Hypothèse 1 (Retenue / Très probable) : Absence de contrôle de version (`donnees.version === VERSION`) dans `chargerPanier()` (`js/stockage.js#L13-L20`)
Mécanisme : `js/stockage.js` définit la constante `VERSION = 2` et enregistre sous le format `{ version: 2, lignes, codePromo }`.
Cependant, lors de la lecture dans `chargerPanier()`, le code ne vérifie jamais si `donnees.version === VERSION`. Au contraire, la ligne 19 effectue un fallback :
`return { lignes: donnees.lignes || donnees, codePromo: donnees.codePromo || "" };`
qui charge aveuglément les données au format de la version 1 (un tableau brut sans `quantite` ni `bouquetId`).
Lors du calcul du prix dans `js/prix.js#L34`, `prixLigne(ligne)` exécute `prixUnitaire(ligne) * ligne.quantite`.
Comme `ligne.quantite` vaut `undefined`, `prixUnitaire * undefined` produit `NaN`.
La fonction `formaterPrix(NaN)` affiche alors « NaN € » dans l'interface et bloque la commande.
Selon le cahier des charges (« les paniers de la version 1 ne sont pas repris »), `chargerPanier()` doit ignorer toute sauvegarde dont la version n'est pas strictement égale à 2 (et renvoyer un panier vide `{ lignes: [], codePromo: "" }`).
Preuve à chercher dans le navigateur :
Point d'arrêt : Poser un point d'arrêt dans `js/stockage.js#L18` (`const donnees = JSON.parse(brut);`).
Commande console :
```javascript
const brut = localStorage.getItem("panier-roussel");
const donnees = JSON.parse(brut);
console.log({
  estTableauBrut: Array.isArray(donnees),
  version: donnees.version,
  estVersion2: donnees.version === 2
});
```
Confirmation : `donnees.version` est `undefined` (ou différent de 2), mais `chargerPanier()` renvoie quand même ces lignes au lieu d'un tableau vide `[]`.
Infirmation : `chargerPanier()` vérifie déjà la version et ignore les données de version 1.

Hypothèse 2 (Écartée / Peu probable) : Erreur de syntaxe JSON dans `localStorage`
Mécanisme : Le contenu stocké par la version 1 serait invalide et ferait échouer `JSON.parse()`.
Preuve à chercher dans le navigateur :
Commande console :
```javascript
try {
  JSON.parse(localStorage.getItem("panier-roussel"));
  console.log("JSON valide");
} catch (e) {
  console.log("Erreur JSON :", e.message);
}
```
Confirmation : Une exception `SyntaxError` est levée.
Infirmation : Le JSON se parse sans aucune erreur (`"JSON valide"`), le problème vient uniquement de l'incompatibilité de structure des données.

Hypothèse 3 (Écartée / Très peu probable) : Identifiant de bouquet manquant dans le catalogue
Mécanisme : Le calcul `NaN` proviendrait d'un bouquet introuvable dans le catalogue.
Preuve à chercher dans le navigateur :
Commande console :
```javascript
import("./js/prix.js").then(m => {
  console.log("Prix avec bouquet inconnu mais quantite 1 :", m.prixLigne({ bouquetId: "inconnu", quantite: 1 }));
});
```
Confirmation : L'expression renvoie `NaN`.
Infirmation : L'expression renvoie `0` (grâce à `let prix = bouquet ? bouquet.prix : 0;`). Le `NaN` provient bien de `quantite` valant `undefined`.

##Prompt 2 : 

##Cause et correctif expliqué : 

##Vérification : 
