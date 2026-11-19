##Reproduction du probleme : 

1. Ouvrir l'application dans le navigateur (http://localhost:8080).
2. Cliquer sur « Composer » sur le bouquet « Pivoine poudrée ».
3. Laisser la taille « Petit » sélectionnée et cliquer sur « Ajouter au panier ».
4. Constater dans le panier : une ligne « Pivoine poudrée », option « Petit », quantité 1.
5. Dans le même formulaire de composition, sélectionner la taille « Grand ».
6. Constater immédiatement dans le panier (avant même d'ajouter) que la ligne existante s'est transformée en « Grand ».
7. Cliquer sur « Ajouter au panier » : aucune nouvelle ligne n'est créée, la quantité de la ligne « Grand » passe à 2.

##Prompt : 

Ticket 4 : deuxième taille qui remplace la première
Symptôme : après avoir ajouté un Pivoine poudrée en petit, puis en grand, le panier
ne contient que le grand.
Étapes : [composer petit, ajouter, composer grand, ajouter, observer le panier].
Attendu : deux lignes distinctes, une par taille.
Obtenu : [contenu du panier].
Code concerné : js/panier.js, js/composition.js.

##Hypothèses de l'ia, retenues ou écartés, et comment vous les avez vérifiées: 

Les 3 hypothèses classées par probabilité :

Hypothèse 1 (Retenue / Très probable) : Partage de référence d'objet (mutation par référence) du singleton `options` entre `js/composition.js` et `js/panier.js`
Mécanisme : Dans `js/composition.js#L7`, l'objet `options` est défini une seule fois pour tout le module : `const options = { taille: "petit", vase: false, carte: false, message: "" };`.
Lors de l'ajout au panier, la fonction `ajouter()` passe cet objet par référence sans le cloner : `quandAjoute(bouquetCourant.id, options)`.
Dans `js/panier.js#L26`, la ligne insérée stocke directement cette référence : `lignes.push({ bouquetId, options, quantite: 1 })`.
Par conséquent, lorsque l'utilisatrice clique sur le bouton radio « Grand », `lireFormulaire()` dans `js/composition.js#L71` mute directement la propriété : `options.taille = "grand"`. Comme `lignes[0].options` pointe vers ce même objet en mémoire, la ligne déjà enregistrée dans le panier est rétroactivement modifiée en « Grand ».
Lors du second clic sur « Ajouter au panier », `ajouterAuPanier()` appelle `memesOptions(ligne.options, options)`. Comme `ligne.options` et `options` sont le même objet (`ligne.options === options`), la comparaison renvoie toujours `true`. L'application croit donc qu'il s'agit du même bouquet et incrémente sa quantité à 2 au lieu d'ajouter une ligne séparée.
Preuve à chercher dans le navigateur :
Point d'arrêt : Poser un point d'arrêt dans `js/panier.js#L22` sur `const existante = lignes.find(...)`.
Commande console :
```javascript
// Après avoir ajouté un "petit" puis sélectionné "grand" dans le formulaire :
import("./js/panier.js").then(m => {
  const lignes = m.lignesPanier();
  console.log("Taille dans le panier :", lignes[0]?.options.taille);
  console.log("Même référence mémoire :", lignes[0]?.options === window.testOptions);
});
// Ou directement dans la console après le 1er ajout :
const ligne = (await import("./js/panier.js")).lignesPanier()[0];
console.log("Référence partagée :", ligne.options);
// Changer ensuite la taille dans le formulaire sans cliquer sur ajouter :
console.log("Valeur après changement formulaire :", ligne.options.taille);
```
Confirmation : La taille de la ligne existante du panier passe à `"grand"` dès la sélection du bouton radio sans même cliquer sur « Ajouter », et la comparaison d'identité `ligne.options === options` vaut `true`.
Infirmation : La ligne du panier conserve `taille: "petit"` après la modification du formulaire.

Hypothèse 2 (Écartée / Peu probable) : Fonction `memesOptions()` défaillante ignorant la taille
Mécanisme : La fonction `memesOptions(a, b)` dans `js/panier.js#L16-L18` contiendrait un bug et renverrait `true` même lorsque `a.taille !== b.taille`.
Preuve à chercher dans le navigateur :
Commande console :
```javascript
// Tester la fonction de comparaison avec deux objets distincts :
const opt1 = { taille: "petit", vase: false, carte: false, message: "" };
const opt2 = { taille: "grand", vase: false, carte: false, message: "" };
console.log("Comparaison de deux objets distincts :", opt1.taille === opt2.taille);
```
Confirmation : `memesOptions` renvoie `true` pour deux objets ayant des tailles distinctes.
Infirmation : `opt1.taille === opt2.taille` renvoie bien `false`. Le problème ne vient pas de la fonction de comparaison mais du fait qu'on lui passe deux fois le même objet.

Hypothèse 3 (Écartée / Très peu probable) : Réinitialisation ou écrasement de `lignes` dans `panier.js`
Mécanisme : `ajouterAuPanier()` écraserait l'index 0 au lieu d'utiliser `lignes.push()`.
Preuve à chercher dans le navigateur :
Point d'arrêt : Dans `js/panier.js#L26` sur `lignes.push(...)`.
Confirmation : Le tableau `lignes` est réassigné avec une seule entrée.
Infirmation : `lignes.push` fonctionne normalement, mais la branche `if (existante)` est prise car `existante` est trouvé via la référence partagée.

##Prompt 2 : 

applique le correctif le plus probable selon toi et verifie si cela n'a pas créer un autre bug ailleurs

##Cause et correctif expliqué : 

### Cause
Dans `js/composition.js`, l'objet `options` est une variable d'état unique (singleton de module).
Lors du premier ajout au panier, `ajouterAuPanier` dans `js/panier.js` insérait cet objet directement par référence dans le tableau `lignes` : `lignes.push({ bouquetId, options, quantite: 1 })`.
Dès que l'utilisatrice modifiait la taille (ou toute autre option) dans le formulaire, `options.taille` était muté en place, modifiant immédiatement l'objet stocké dans la ligne du panier.
Lors du second ajout, `memesOptions(ligne.options, options)` comparait l'objet à lui-même (`ligne.options === options`), trouvant une correspondance systématique et incrémentant la quantité de la première ligne mutée au lieu de créer une ligne distincte.

### Correctif appliqué dans `js/panier.js`
Dans `ajouterAuPanier()` (ligne 26), cloner l'objet `options` (`options: { ...options }`) lors de son insertion dans le panier :
```javascript
export function ajouterAuPanier(bouquetId, options) {
  const existante = lignes.find((ligne) => ligne.bouquetId === bouquetId && memesOptions(ligne.options, options));
  if (existante) {
    existante.quantite += 1;
  } else {
    lignes.push({ bouquetId, options: { ...options }, quantite: 1 });
  }
}
```
L'objet stocké dans le panier est désormais totalement découplé et protégé contre toute mutation ultérieure du formulaire de composition.

##Vérification : 

Le correctif a été vérifié de bout en bout :
1. **Scénario du ticket** :
   - Ajout d'un bouquet en « Petit » (qté 1).
   - Modification de la taille en « Grand » dans le formulaire : la ligne « Petit » du panier reste intacte à « Petit ».
   - Clic sur « Ajouter au panier » : une **deuxième ligne distincte** « Grand » (qté 1) est créée.
2. **Ajout d'un doublon identique** :
   - Ajout d'un second « Grand » : la quantité de la ligne « Grand » passe à 2, la ligne « Petit » reste à 1.
3. **Options additionnelles (vase, carte)** :
   - L'ajout d'une variante avec vase crée bien une 3ᵉ ligne distincte.
4. **Vérification d'absence de bugs collatéraux** :
   - Calcul des prix unitaires et sous-total : chaque ligne utilise ses propres options et suppléments sans conflit.
   - Boutons + et − : agissent indépendamment sur chaque ligne sans impacter les autres.
   - Sauvegarde dans le `localStorage` : la structure sérialisée reste identique et valide.


Réponse Roussel : 

Bonjour, le choix d’une nouvelle taille modifiait aussi le bouquet déjà ajouté. Ce problème a été corrigé. Si une ligne du panier affiche une taille incorrecte, supprimez-la puis ajoutez séparément chaque taille souhaitée.