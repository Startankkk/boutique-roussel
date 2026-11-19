##Reproduction du probleme : 

1. Ouvrir l'application dans le navigateur (http://localhost:8080).
2. Choisir le bouquet « Blanc pur » (38,90 €) et cliquer sur « Composer ».
3. Sélectionner la taille « Moyen » (+ 8,20 €) et cocher l'option « Vase en verre » (+ 12,90 €).
4. Le prix affiché dans la composition est de 60,00 €.
5. Cliquer sur « Ajouter au panier ».
6. Saisir le code postal « 37000 » dans la section Livraison.
7. Observer le récapitulatif :
   - Sous-total affiché : 60,00 €
   - Livraison affichée : 5,90 € (au lieu de « Offerte »)
   - Total affiché : 65,90 € (au lieu de 60,00 €)

##Prompt : 

Ticket 6 : livraison facturée alors que le total atteint 60 €
Symptôme : avec un sous-total de 60,00 €, la livraison de 5,90 € est facturée.
Règle du cahier des charges : livraison offerte dès 60 € d'achat, calculée sur le
sous-total avant remise.
Étapes : [Blanc pur, taille moyenne, avec vase, code postal 37000, noter le sous-total
puis les frais].
Attendu : livraison à 0 €.
Obtenu : [sous-total et frais affichés].
Code concerné : js/livraison.js, js/prix.js, data/livraison.json.

##Hypothèses de l'ia, retenues ou écartés, et comment vous les avez vérifiées: 

Les 3 hypothèses classées par probabilité :

Hypothèse 1 (Retenue / Très probable) : Imprécision de calcul arithmétique en virgule flottante standard IEEE 754
Mécanisme : Les prix unitaires et options sont définis sous forme de nombres décimaux dans `data/catalogue.json` :
- Bouquet Blanc pur : `38.9`
- Supplément taille moyenne : `8.2`
- Option vase : `12.9`
En arithmétique binaire flottante JavaScript :
`38.9 + 8.2 + 12.9 === 59.99999999999999`
Lors de l'affichage dans `js/affichage.js`, l'appel à `formaterPrix(montant)` formate la valeur avec 2 décimales, ce qui arrondit visuellement à « 60,00 € ».
Cependant, dans `js/livraison.js#L27`, la fonction `fraisLivraison` teste la valeur brute :
`if (montant >= regles.seuilGratuite) return 0;`
Or `59.99999999999999 >= 60` s'évalue strictement à `false`. Le seuil de gratuité de 60 € n'est donc pas considéré comme atteint, et les frais de zone (5,90 €) sont facturés.
À noter que `js/outils.js` contient une fonction `arrondir(montant)` prévue à cet effet mais jamais appelée dans `js/prix.js`.
Preuve à chercher dans le navigateur :
Point d'arrêt : Poser un point d'arrêt dans `js/livraison.js#L27` sur la ligne `if (montant >= regles.seuilGratuite)`.
Commande console :
```javascript
// Vérifier la valeur exacte du paramètre montant reçu :
console.log({
  montantReel: montant,
  seuil: regles.seuilGratuite,
  atteint: montant >= regles.seuilGratuite,
  affiche: montant.toLocaleString("fr-FR", { style: "currency", currency: "EUR" })
});
```
Confirmation : La console affiche `montantReel: 59.99999999999999`, `atteint: false`, et `affiche: "60,00 €"`.
Infirmation : `montantReel` vaut exactement `60` ou un nombre supérieur ou égal à 60.

Hypothèse 2 (Écartée / Peu probable) : Seuil de gratuité strict (`>`) au lieu de supérieur ou égal (`>=`)
Mécanisme : Le code testerait `montant > regles.seuilGratuite` au lieu de `montant >= regles.seuilGratuite`.
Preuve à chercher dans le navigateur :
Point d'arrêt : Vérifier l'opérateur dans `js/livraison.js#L27`.
Confirmation : L'opérateur est `>` (strictement supérieur).
Infirmation : L'opérateur dans `js/livraison.js` est bien `>=`. Le blocage provient de la valeur numérique `59.99999999999999`.

Hypothèse 3 (Écartée / Peu probable) : Calcul des frais basé sur le montant après remise au lieu du sous-total
Mécanisme : La fonction `fraisLivraison` recevrait un montant déduit d'une remise ou d'un calcul intermédiaire.
Preuve à chercher dans le navigateur :
Point d'arrêt : Dans `js/app.js#L107` sur `fraisLivraison(etat.codePostal, montant)`.
Commande console :
```javascript
console.log("Montant transmis à fraisLivraison :", montant, "SousTotal :", sousTotal(lignes));
```
Confirmation : Le montant transmis est inférieur au sous-total (par exemple si une remise était soustraite avant la livraison).
Infirmation : Le montant transmis provient directement de `sousTotal(lignes)`.

##Prompt 2 : 

##Cause et correctif expliqué : 

##Vérification : 
