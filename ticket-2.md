##Reproduction du probleme : 

1. Ouvrir l'application dans le navigateur (http://localhost:8080).
2. Cliquer sur « Composer » pour un bouquet du catalogue, puis sur « Ajouter au panier ».
3. Dans la section panier, la quantité initiale est de 1.
4. Cliquer une première fois sur le bouton « + » : la quantité passe subitement à 4 au lieu de 2.
5. Cliquer une deuxième fois sur le bouton « + » : la quantité passe à 10 au lieu de 5.
6. Cliquer une troisième fois sur le bouton « + » : la quantité passe à 22.

##Prompt : 

Ticket 2 : le bouton + ajoute plusieurs bouquets
Symptôme : le bouton + du panier ajoute plusieurs exemplaires à chaque clic, et ce
nombre augmente.
Étapes : ajouter un bouquet, cliquer une fois sur +, le nombre affiche 4 
Attendu : un clic ajoute exactement un exemplaire.
Obtenu : 4 et quand je reclique ca passe a 10 puis 22 etc...
Code concerné : js/panier.js, js/affichage.js, js/app.js (gestionnaires d'événements).

##Hypothèses de l'ia, retenues ou écartés, et comment vous les avez vérifiées: 

Les 3 hypothèses classées par probabilité :

Hypothèse 1 (Retenue / Très probable) : Accumulation d'écouteurs d'événements « click » sur `#panier-liste` dans `afficherPanier()`
Mécanisme : Dans `js/affichage.js#L69-L73`, la fonction `afficherPanier()` attache un écouteur `liste.addEventListener("click", ...)` à l'élément `#panier-liste`. Or, le conteneur `liste` reste en place dans le DOM (seuls ses enfants sont vidés par `replaceChildren()`). Comme `afficherPanier()` est appelé à chaque `rafraichir()`, un nouvel écouteur s'accumule à chaque rafraîchissement. Lors d'un clic, les écouteurs existants s'exécutent en série, chacun appelant `quandActionPanier()`, qui modifie la quantité puis déclenche `rafraichir()`, ce qui ajoute encore un nouvel écouteur pour chacun. Cela explique exactement la suite observée (3 écouteurs initiaux $\to$ +3 $\to$ quantité 4 et 6 écouteurs $\to$ +6 $\to$ quantité 10 et 12 écouteurs $\to$ +12 $\to$ quantité 22).
Preuve à chercher dans le navigateur :
Point d'arrêt : Poser un point d'arrêt dans les DevTools sur la ligne 76 de `js/app.js` (`if (action === "plus") changerQuantite(index, 1);`).
Commande console :
```javascript
// Vérifier le nombre d'appels à quandActionPanier lors d'un unique clic
// Ou inspecter les écouteurs sur le nœud DOM dans Chrome DevTools :
getEventListeners(document.querySelector("#panier-liste")).click.length;
```
Confirmation : La console DevTools indique que `getEventListeners(document.querySelector("#panier-liste")).click.length` est strictement supérieur à 1 (par exemple 3 avant le premier clic sur +), et le point d'arrêt dans `quandActionPanier()` est touché plusieurs fois consécutivement pour un seul clic physique.
Infirmation : `getEventListeners(document.querySelector("#panier-liste")).click.length` vaut exactement 1 et le point d'arrêt n'est franchi qu'une seule fois.

Hypothèse 2 (Écartée / Peu probable) : Double déclenchement par propagation (bubbling) ou duplication d'écouteurs inline et délégués
Mécanisme : Le bouton « + » porterait un écouteur direct en plus de l'écouteur délégué sur le parent `ul#panier-liste`, ou l'événement se propagerait à deux conteneurs distincts écoutant l'action « plus ».
Preuve à chercher dans le navigateur :
Point d'arrêt : Poser un point d'arrêt sur la ligne 70 de `js/affichage.js` (`const cible = evenement.target.closest("button[data-action]");`).
Commande console :
```javascript
// Vérifier si des écouteurs existent sur le bouton lui-même
getEventListeners(document.querySelector("button[data-action=plus]"));
```
Confirmation : Des écouteurs `click` sont attachés directement sur l'élément `button` en plus du conteneur parent.
Infirmation : Le bouton ne possède aucun écouteur propre (l'objet est vide `{}`), seul le parent `#panier-liste` intercepte les clics. De plus, ce phénomène produirait un nombre fixe d'incréments (+2), et non une suite croissante exponentielle (3, puis 6, puis 12).

Hypothèse 3 (Écartée / Très peu probable) : Calcul d'incrémentation erroné dans `changerQuantite()` ou effet de bord dans `panier.js`
Mécanisme : La fonction `changerQuantite(index, ecart)` dans `js/panier.js#L31` recevrait un paramètre `ecart` erroné (différent de 1) ou une boucle interne incrémenterait plusieurs fois l'article.
Preuve à chercher dans le navigateur :
Point d'arrêt : Poser un point d'arrêt dans `js/panier.js#L34` (`ligne.quantite += ecart;`).
Commande console :
```javascript
console.log({ ecart, avant: ligne.quantite });
```
Confirmation : La variable `ecart` vaut une valeur différente de 1 (ex. 3, puis 6).
Infirmation : La variable `ecart` vaut toujours exactement 1, mais la ligne est exécutée de multiples fois d'affilée pour un seul clic souris.

##Prompt 2 : 

applique le correctif de l'hypothese 1

##Cause et correctif expliqué : 

### Cause
Dans `js/affichage.js`, la fonction `afficherPanier(lignes, surAction)` rattachait à chaque appel un nouvel écouteur d'événement `click` via `liste.addEventListener("click", ...)` sur le conteneur persistant `#panier-liste`.
Comme `afficherPanier` est réexécuté à chaque mise à jour du panier (`rafraichir()`), les écouteurs s'accumulaient indéfiniment. Lors d'un clic sur « + », chaque écouteur accumulé s'exécutait l'un après l'autre, appelant `changerQuantite(index, 1)` puis `rafraichir()`, ce qui doublait le nombre d'écouteurs et produisait la suite d'ajouts non désirée (1 -> 4 -> 10 -> 22...).

### Correctif appliqué dans `js/affichage.js`
Remplacement de `liste.addEventListener("click", ...)` par la propriété directe `liste.onclick = ...` (ligne 69).
Ainsi, chaque appel à `afficherPanier()` réassigne la fonction de rappel au lieu d'en empiler une nouvelle. Il n'y a donc plus qu'un unique gestionnaire d'événement actif sur `#panier-liste` à tout moment.

```javascript
  // Les boutons + , − et Supprimer de toutes les lignes (propriété réassignée pour éviter l'accumulation d'écouteurs).
  liste.onclick = (evenement) => {
    const cible = evenement.target.closest("button[data-action]");
    if (!cible) return;
    surAction(cible.dataset.action, Number(cible.dataset.index));
  };
```

##Vérification : 

Le correctif a été vérifié :
1. Ajout d'un bouquet au panier : quantité initiale = 1.
2. Clic sur « + » : la quantité passe exactement à 2 (au lieu de 4).
3. Nouveau clic sur « + » : la quantité passe exactement à 3 (au lieu de 10).
4. Clic sur « − » : la quantité repasse exactement à 2.
5. Clic sur « Supprimer » : l'action est déclenchée une seule fois.
6. L'écouteur `onclick` est réassigné de façon idempotente et ne s'accumule plus.


Réponses roussel :

Bonjour, un clic sur « + » déclenchait plusieurs ajouts au panier. Ce comportement a été corrigé et vérifié. Rechargez la page, puis cliquez une fois pour ajouter un seul bouquet.