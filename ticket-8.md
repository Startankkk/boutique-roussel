##Reproduction du probleme : 

1. Ouvrir l'application dans le navigateur (http://localhost:8080).
2. Composer et ajouter un bouquet au panier.
3. Renseigner le code postal « 37000 » et choisir un jour de livraison dans la liste déroulante.
4. Dans la section Livraison > Moment, cocher le bouton radio « Après-midi ».
5. Cliquer sur le bouton « Commander ».
6. Observer le message de confirmation affiché dans `#message-commande` :
   - Constat : « Merci ! Votre commande est enregistrée pour le ... (matin). »
   - Attendu : « Merci ! Votre commande est enregistrée pour le ... (après-midi). »

##Prompt : 

Ticket 8 : livraison « après-midi » devenue « matin »
Symptôme : une livraison choisie l'après-midi apparaît comme « matin » dans la
confirmation et dans la commande.
Étapes : [choisir un créneau après-midi, aller jusqu'au récapitulatif, noter le libellé].
Attendu : « après-midi » partout.
Obtenu : « matin ».
Code concerné : js/livraison.js, js/affichage.js, js/composition.js, js/app.js.

##Hypothèses de l'ia, retenues ou écartés, et comment vous les avez vérifiées: 

Les 3 hypothèses classées par probabilité :

Hypothèse 1 (Retenue / Très probable) : Absence du pseudo-sélecteur CSS `:checked` dans `commander()` (`js/app.js#L116`)
Mécanisme : Dans `js/app.js#L116`, la fonction `commander()` récupère le moment sélectionné via :
```javascript
const moment = document.querySelector("input[name=moment]");
```
En standard DOM, `querySelector()` renvoie le premier élément correspondant rencontré dans le document. Comme le bouton radio « Matin » est inséré en premier dans le DOM par `afficherMoments()` dans `js/affichage.js#L105-L115`, `document.querySelector("input[name=moment]")` sélectionne systématiquement le bouton radio « Matin », quel que soit le bouton effectivement coché par l'utilisatrice. L'expression `moment.nextSibling.textContent.toLowerCase()` extrait donc toujours la valeur textuelle du premier élément, soit `"matin"`.
Preuve à chercher dans le navigateur :
Point d'arrêt : Poser un point d'arrêt dans `js/app.js#L116` lors du clic sur le bouton « Commander ».
Commande console :
```javascript
// Après avoir coché "Après-midi" :
const sansChecked = document.querySelector("input[name=moment]");
const avecChecked = document.querySelector("input[name=moment]:checked");
console.log({
  sansCheckedValue: sansChecked.value,
  sansCheckedLibelle: sansChecked.nextSibling.textContent,
  avecCheckedValue: avecChecked.value,
  avecCheckedLibelle: avecChecked.nextSibling.textContent
});
```
Confirmation : `sansCheckedValue` vaut `"matin"` (et son libellé `"Matin"`), alors que `avecCheckedValue` vaut `"apres-midi"` (et son libellé `"Après-midi"`).
Infirmation : `document.querySelector("input[name=moment]")` renvoie le bouton sélectionné.

Hypothèse 2 (Écartée / Peu probable) : Réinitialisation du groupe radio avant la commande
Mécanisme : Un rafraîchissement d'affichage intempestif (`rafraichir()`) réinvoquerait `afficherMoments()` et recréerait les boutons radio en cochant à nouveau « Matin » par défaut (`radio.checked = index === 0`).
Preuve à chercher dans le navigateur :
Commande console :
```javascript
console.log(document.querySelector("input[value=apres-midi]").checked);
```
Confirmation : Le bouton « Après-midi » est décoché et le bouton « Matin » est redevenu coché juste avant le clic sur commander.
Infirmation : Le bouton « Après-midi » reste bel et bien coché (`checked === true`) dans le DOM au moment de la commande.

Hypothèse 3 (Écartée / Très peu probable) : Confusion d'identifiant ou de valeur dans les données `livraison.json`
Mécanisme : L'objet des moments dans `data/livraison.json` aurait un libellé inversé ou erroné pour le créneau d'après-midi.
Preuve à chercher dans le navigateur :
Commande console :
```javascript
console.log((await import("./js/livraison.js")).momentsDeLivraison());
```
Confirmation : L'objet avec l'identifiant `"apres-midi"` a pour libellé `"Matin"`.
Infirmation : Les objets sont conformes (`{ id: "matin", libelle: "Matin" }`, `{ id: "apres-midi", libelle: "Après-midi" }`).

##Prompt 2 : 

applique le correctif adapté selon toi et verifie si cela n'a pas créer un autre bug dans les tickets précedents

##Cause et correctif expliqué : 

### Cause
Dans `js/app.js#L116`, la fonction `commander()` utilisait le sélecteur `document.querySelector("input[name=moment]")`.
Sans le pseudo-sélecteur `:checked`, cette méthode renvoie systématiquement le premier élément trouvé dans l'arbre DOM (qui correspond au créneau « Matin » généré en tête de liste). Le créneau sélectionné par l'utilisatrice (« Après-midi ») était donc ignoré lors de la validation.

### Correctif appliqué dans `js/app.js`
Remplacement du sélecteur par `document.querySelector("input[name=moment]:checked")` à la ligne 116 de `js/app.js` :
```javascript
// Le bouton « Commander » : vérifie la commande puis la confirme.
function commander() {
  const message = document.querySelector("#message-commande");
  const jour = document.querySelector("#jour-livraison");
  const moment = document.querySelector("input[name=moment]:checked");
  ...
```

##Vérification : 

Le correctif a été vérifié :
1. **Scénario du ticket** :
   - Sélection du créneau « Après-midi ».
   - Clic sur « Commander ».
   - Message de confirmation : « Merci ! Votre commande est enregistrée pour le ... (après-midi). »
2. **Scénario créneau « Matin »** :
   - Sélection du créneau « Matin ».
   - Clic sur « Commander ».
   - Message de confirmation : « Merci ! Votre commande est enregistrée pour le ... (matin). »
3. **Non-régression complète des tickets 1 à 7** :
   - Ticket 1 (Code promo mobile & casse) : **PASS**.
   - Ticket 2 (Bouton + et écouteurs d'événements) : **PASS**.
   - Ticket 3 (Occasion merci pour petit-mot) : **PASS**.
   - Ticket 4 (Deux tailles distinctes d'un même bouquet) : **PASS**.
   - Ticket 5 (Suppression ciblée sans vider le panier) : **PASS**.
   - Ticket 6 (Livraison offerte à 60,00 €) : **PASS**.
   - Ticket 7 (Limite carte 150 caractères et décompte dynamique) : **PASS**.
