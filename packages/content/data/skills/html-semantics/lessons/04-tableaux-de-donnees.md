---
title: Les tableaux de données
summary: Baliser un tableau avec légende, en-têtes et groupes de lignes pour qu’il soit lisible par tous.
durationMinutes: 45
sources:
  - title: WHATWG — Les tableaux
    url: https://html.spec.whatwg.org/multipage/tables.html
  - title: MDN — L’élément table
    url: https://developer.mozilla.org/fr/docs/Web/HTML/Reference/Elements/table
  - title: W3C WAI — Tutoriel sur les tableaux (en anglais)
    url: https://www.w3.org/WAI/tutorials/tables/
---

## À quoi sert un tableau ?

Un tableau HTML présente des **données à deux dimensions** : chaque valeur se comprend
grâce à sa ligne **et** à sa colonne. « 220 € » ne veut rien dire seul ; « 220 € » à
l’intersection de « Débutant » et « Trimestre » est une information.

Une personne voyante fait ce croisement d’un coup d’œil. Une personne qui utilise un
lecteur d’écran parcourt le tableau cellule par cellule : pour qu’elle entende
« Débutant, Trimestre, 220 € » plutôt que « 220 € » tout court, le navigateur doit savoir
quelles cellules sont des **en-têtes**. C’est tout l’enjeu du balisage.

À l’inverse, un tableau ne sert **jamais** à la mise en page (placer un menu à gauche et
un texte à droite). Cette pratique date d’avant le CSS moderne ; aujourd’hui, la mise en
page se fait avec flexbox et grid, que tu verras dans la compétence sur le responsive.

## Les éléments de base

| Élément   | Rôle                                                              |
| --------- | ----------------------------------------------------------------- |
| `table`   | le tableau                                                        |
| `caption` | la légende (le titre) du tableau, premier enfant de `table`       |
| `tr`      | une ligne (table row)                                             |
| `th`      | une cellule d’en-tête (table header)                              |
| `td`      | une cellule de données (table data)                               |
| `thead`   | le groupe des lignes d’en-tête                                    |
| `tbody`   | le groupe des lignes de données                                   |
| `tfoot`   | le groupe des lignes de pied (totaux, notes)                      |

## Un tableau simple, bien balisé

Enregistre ce document sous `tarifs.html` et ouvre-le :

```html
<!DOCTYPE html>
<html lang="fr">
  <head>
    <meta charset="utf-8">
    <title>Tarifs — Atelier de Lou</title>
  </head>
  <body>
    <table>
      <caption>Tarifs des cours de céramique, en euros</caption>
      <thead>
        <tr>
          <th scope="col">Formule</th>
          <th scope="col">Séance</th>
          <th scope="col">Trimestre</th>
          <th scope="col">Année</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <th scope="row">Débutant</th>
          <td>25</td>
          <td>220</td>
          <td>600</td>
        </tr>
        <tr>
          <th scope="row">Confirmé</th>
          <td>30</td>
          <td>260</td>
          <td>700</td>
        </tr>
      </tbody>
    </table>
  </body>
</html>
```

Le navigateur affiche la légende au-dessus, les en-têtes en gras et centrés, les données
en dessous. Pas de bordures : elles viendront du CSS.

### caption : le titre du tableau

`caption` est le **premier enfant** de `table`. Il donne son nom au tableau : un lecteur
d’écran l’annonce en entrant dans le tableau, avant le nombre de lignes et de colonnes.
Les unités communes à tout le tableau (« en euros ») ont leur place ici : on évite ainsi
de répéter « € » dans chaque cellule.

Un `h2` placé juste avant le tableau est utile pour le plan de la page, mais il n’est pas
associé au tableau comme l’est `caption`. Les deux peuvent coexister.

### th et scope : les en-têtes

Une cellule `th` est un en-tête. L’attribut `scope` précise ce qu’elle « couvre » :

- `scope="col"` : l’en-tête s’applique à toute sa **colonne** ;
- `scope="row"` : l’en-tête s’applique à toute sa **ligne**.

Dans ce tableau simple, les navigateurs devinent correctement même sans `scope`, mais
l’attribut rend l’intention explicite et devient indispensable dès que la structure se
complique. Prends l’habitude de toujours l’écrire.

Voici l’arbre d’accessibilité que Chromium calcule pour ce tableau (extrait obtenu avec
l’outil de test Playwright, qui affiche les rôles et les noms) :

```text
- table "Tarifs des cours de céramique, en euros":
  - caption: Tarifs des cours de céramique, en euros
  - rowgroup:
    - row "Formule Séance Trimestre Année":
      - columnheader "Formule"
      - columnheader "Séance"
      - columnheader "Trimestre"
      - columnheader "Année"
  - rowgroup:
    - row "Débutant 25 220 600":
      - rowheader "Débutant"
      - cell "25"
      - cell "220"
      - cell "600"
    - row "Confirmé 30 260 700":
      - rowheader "Confirmé"
      - cell "30"
      - cell "260"
      - cell "700"
```

Le tableau porte le nom de sa légende, et chaque en-tête a le rôle `columnheader` ou
`rowheader`. Quand une personne arrive sur la cellule « 220 », son lecteur d’écran peut
annoncer « Débutant », « Trimestre » puis la valeur.

### thead, tbody, tfoot : les groupes de lignes

Ces éléments regroupent les lignes par fonction. Ils aident à la mise en forme (styler
l’en-tête), à l’impression (certains navigateurs répètent `thead` en haut de chaque page
imprimée) et à la lecture du code.

Si tu n’écris pas `tbody`, le navigateur l’ajoute lui-même. Ce code :

```html
<table>
  <tr><td>1</td></tr>
</table>
```

devient, dans le DOM de Chromium (espaces de l’indentation omis) :

```text
<table><tbody><tr><td>1</td></tr></tbody></table>
```

C’est bon à savoir le jour où un sélecteur CSS comme `table > tr` ne fonctionne pas : les
lignes ne sont pas enfants directs de `table`.

`tfoot` sert aux lignes de synthèse, comme un total :

```html
<table>
  <caption>Dépenses du stage de mars, en euros</caption>
  <thead>
    <tr>
      <th scope="col">Poste</th>
      <th scope="col">Montant</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <th scope="row">Argile</th>
      <td>120</td>
    </tr>
    <tr>
      <th scope="row">Émaux</th>
      <td>85</td>
    </tr>
  </tbody>
  <tfoot>
    <tr>
      <th scope="row">Total</th>
      <td>205</td>
    </tr>
  </tfoot>
</table>
```

## Ce qui se passe sans en-têtes

Le même tableau de tarifs écrit uniquement avec des `td`, la première ligne mise en gras
à la main :

```html
<table>
  <tr>
    <td><b>Formule</b></td>
    <td><b>Séance</b></td>
  </tr>
  <tr>
    <td>Débutant</td>
    <td>25</td>
  </tr>
</table>
```

À l’écran, c’est presque pareil. Dans l’arbre d’accessibilité, il n’y a plus aucun
en-tête : le gras ne dit rien de la fonction d’une cellule. Chromium va même plus loin :
faute d’en-têtes et de légende, il classe ce tableau comme un probable **tableau de mise
en page** (rôle interne `LayoutTable`, visible dans l’arbre d’accessibilité complet des
outils de développement). Certaines technologies d’assistance s’appuient sur cette
indication pour ne pas l’annoncer comme un tableau : la personne entend alors une suite
de mots sans structure.

## Cellules fusionnées : colspan et rowspan

- `colspan="2"` : la cellule s’étend sur deux colonnes ;
- `rowspan="2"` : la cellule s’étend sur deux lignes.

```html
<table>
  <caption>Planning du samedi</caption>
  <thead>
    <tr>
      <th scope="col">Horaire</th>
      <th scope="col">Salle A</th>
      <th scope="col">Salle B</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <th scope="row">9 h – 10 h</th>
      <td rowspan="2">Tour, niveau 1</td>
      <td>Modelage</td>
    </tr>
    <tr>
      <th scope="row">10 h – 11 h</th>
      <td>Émaillage</td>
    </tr>
    <tr>
      <th scope="row">11 h – 12 h</th>
      <td colspan="2">Rangement collectif</td>
    </tr>
  </tbody>
</table>
```

Observe la deuxième ligne de données : elle ne contient que **deux** cellules écrites. La
colonne « Salle A » de cette ligne est déjà occupée par la cellule « Tour, niveau 1 », qui
descend depuis la ligne du dessus. Si tu ajoutes une cellule de trop, tout le reste de la
ligne se décale d’une colonne, et le tableau devient faux sans aucun message d’erreur.

:::tip[Compter les colonnes]
Pour chaque ligne, additionne les `colspan` (1 par défaut) des cellules écrites et les
cellules occupées par un `rowspan` venu d’au-dessus : le total doit être le même pour
toutes les lignes. Ici : 3, puis 1 + 1 occupée + 1 = 3, puis 1 + 2 = 3.

:::

Les cellules fusionnées compliquent la lecture non visuelle. Avant d’en mettre, demande-toi
si deux tableaux simples ne seraient pas plus clairs.

## En-têtes sur plusieurs niveaux

Quand un en-tête couvre un **groupe** de colonnes, on le signale avec `scope="colgroup"`
et des éléments `colgroup` qui déclarent les groupes. Exemple : des places restantes par
jour et par créneau.

```html
<table>
  <caption>Places restantes par atelier</caption>
  <colgroup></colgroup>
  <colgroup span="2"></colgroup>
  <colgroup span="2"></colgroup>
  <thead>
    <tr>
      <td rowspan="2"></td>
      <th scope="colgroup" colspan="2">Mardi</th>
      <th scope="colgroup" colspan="2">Jeudi</th>
    </tr>
    <tr>
      <th scope="col">Matin</th>
      <th scope="col">Soir</th>
      <th scope="col">Matin</th>
      <th scope="col">Soir</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <th scope="row">Tour</th>
      <td>2</td>
      <td>0</td>
      <td>4</td>
      <td>1</td>
    </tr>
    <tr>
      <th scope="row">Modelage</th>
      <td>5</td>
      <td>3</td>
      <td>0</td>
      <td>2</td>
    </tr>
  </tbody>
</table>
```

- Le premier `colgroup` couvre la colonne des noms d’atelier, les deux suivants
  regroupent chacun deux colonnes (`span="2"`).
- « Mardi » couvre le groupe de ses deux colonnes ; « Matin » et « Soir » couvrent
  chacun leur colonne ; « Tour » couvre sa ligne. La cellule « 0 » de la première ligne
  est donc associée à « Tour », « Mardi » et « Soir ».
- La cellule vide en haut à gauche est un `td` : ce n’est l’en-tête de rien.

Pour les cas encore plus irréguliers, la norme prévoit l’attribut `headers` : on donne
un `id` à chaque `th` et chaque `td` liste les `id` de ses en-têtes, séparés par des
espaces, par exemple `<td headers="tour mardi soir">0</td>`. C’est fiable mais lourd à
maintenir : dans la plupart des cas, simplifier le tableau est la meilleure solution.

## Quand ne pas utiliser de tableau

- **Pour mettre en page** : jamais. CSS grid et flexbox existent pour cela.
- **Pour une liste à une dimension** (une liste de noms, de liens) : `ul` ou `ol`.
- **Pour des paires terme–valeur** sans seconde dimension (une fiche technique) : `dl`
  convient souvent mieux.

Et si un tableau de mise en page existe déjà dans un vieux site que tu ne peux pas
réécrire tout de suite, il ne doit contenir ni `th`, ni `caption`, ni `scope` : ces
éléments mentiraient sur sa nature.

## Pièges courants

- **Des `td` en gras au lieu de `th`** : visuellement proche, aucun en-tête pour les
  technologies d’assistance. Correction : `th` avec `scope`.
- **Pas de `caption`** : le tableau n’a pas de nom. Correction : une légende courte,
  avec les unités communes.
- **Un `rowspan` ou `colspan` mal compté** : le tableau se décale. Correction : compter
  les colonnes ligne par ligne.
- **Une cellule vide d’en-tête écrite en `th`**. Correction : `td` vide.
- **Un tableau pour aligner des blocs**. Correction : CSS.
- **Croire que `table > tr` cible les lignes** alors que le navigateur a inséré `tbody`.

## Exercices

### Exercice 1 — Baliser un tableau

L’association Les Jardins partagés publie ses récoltes du mois de juin, en kilos.
Parcelle Nord : 12 de tomates, 4 de courgettes. Parcelle Sud : 9 de tomates, 7 de
courgettes. Écris le tableau avec légende, en-têtes de lignes et de colonnes, et une
ligne de total.

:::solution
```html
<table>
  <caption>Récoltes de juin par parcelle, en kilos</caption>
  <thead>
    <tr>
      <th scope="col">Parcelle</th>
      <th scope="col">Tomates</th>
      <th scope="col">Courgettes</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <th scope="row">Nord</th>
      <td>12</td>
      <td>4</td>
    </tr>
    <tr>
      <th scope="row">Sud</th>
      <td>9</td>
      <td>7</td>
    </tr>
  </tbody>
  <tfoot>
    <tr>
      <th scope="row">Total</th>
      <td>21</td>
      <td>11</td>
    </tr>
  </tfoot>
</table>
```

- La légende dit de quoi parle le tableau et donne l’unité commune : les cellules
  contiennent seulement des nombres.
- Les noms de légumes sont des en-têtes de colonnes, les parcelles des en-têtes de
  lignes : chaque nombre se lit « parcelle, légume, quantité ».
- Le total est dans `tfoot` ; « Total » est l’en-tête de sa ligne.
- On aurait pu mettre les légumes en lignes et les parcelles en colonnes : les deux
  sont corrects, l’important est que chaque cellule ait ses deux en-têtes.

:::

### Exercice 2 — Compter les cellules

Ce tableau s’affiche mal : la cellule « Mercredi » apparaît sous « Soir » au lieu d’être
dans la première colonne. Explique pourquoi et corrige-le.

```html
<table>
  <caption>Ouverture de l’atelier</caption>
  <tr>
    <th scope="col">Jour</th>
    <th scope="col">Matin</th>
    <th scope="col">Soir</th>
  </tr>
  <tr>
    <th scope="row">Mardi</th>
    <td rowspan="2">Fermé</td>
    <td>18 h – 21 h</td>
  </tr>
  <tr>
    <td></td>
    <th scope="row">Mercredi</th>
    <td>18 h – 21 h</td>
  </tr>
</table>
```

:::solution
Dans la troisième ligne, la colonne « Matin » est déjà occupée par « Fermé », qui
s’étend sur deux lignes. Le `td` vide ajouté par erreur prend donc la première colonne
(sous « Mardi »), « Mercredi » est repoussé dans la troisième colonne (sous « Soir »), et
la dernière cellule déborde dans une quatrième colonne qui n’existe pas dans l’en-tête.

Il suffit de retirer la cellule vide :

```html
<table>
  <caption>Ouverture de l’atelier</caption>
  <thead>
    <tr>
      <th scope="col">Jour</th>
      <th scope="col">Matin</th>
      <th scope="col">Soir</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <th scope="row">Mardi</th>
      <td rowspan="2">Fermé</td>
      <td>18 h – 21 h</td>
    </tr>
    <tr>
      <th scope="row">Mercredi</th>
      <td>18 h – 21 h</td>
    </tr>
  </tbody>
</table>
```

Vérification : ligne 1 = 3 cellules ; ligne 2 = 3 cellules ; ligne 3 = « Mercredi »
+ « Fermé » venu d’au-dessus + « 18 h – 21 h » = 3. On en profite pour ajouter `thead` et
`tbody`, qui rendent la structure explicite.

:::

### Exercice 3 — Diagnostiquer un tableau

Liste les problèmes de ce code et propose une version corrigée.

```html
<p><b>Notes du contrôle</b></p>
<table>
  <tr>
    <td><b>Élève</b></td>
    <td><b>HTML</b></td>
    <td><b>CSS</b></td>
  </tr>
  <tr>
    <td>Inès</td>
    <td>15/20</td>
    <td>17/20</td>
  </tr>
  <tr>
    <td>Marc</td>
    <td>12/20</td>
    <td>14/20</td>
  </tr>
</table>
```

:::solution
Problèmes :

1. Le titre est un paragraphe en gras, extérieur au tableau : le tableau n’a pas de nom.
2. Les en-têtes de colonnes sont des `td` en gras : aucun rôle d’en-tête.
3. Les noms d’élèves ne sont pas des en-têtes de lignes.
4. « /20 » est répété dans chaque cellule alors que c’est une unité commune.

```html
<table>
  <caption>Notes du contrôle, sur 20</caption>
  <thead>
    <tr>
      <th scope="col">Élève</th>
      <th scope="col">HTML</th>
      <th scope="col">CSS</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <th scope="row">Inès</th>
      <td>15</td>
      <td>17</td>
    </tr>
    <tr>
      <th scope="row">Marc</th>
      <td>12</td>
      <td>14</td>
    </tr>
  </tbody>
</table>
```

Le gras disparaît du HTML : les `th` sont en gras par défaut, et toute autre mise en
forme relève du CSS. Attention : le code d’origine est **valide** pour le validateur. Les
points 1 à 3 sont des défauts d’accessibilité (aucun en-tête, aucun nom), le point 4 une
amélioration de lisibilité.

:::

## Récapitulatif

- Un tableau sert aux données à deux dimensions, jamais à la mise en page.
- `caption` en premier enfant de `table` donne son nom au tableau.
- `th` avec `scope="col"` ou `scope="row"` pour chaque en-tête ; `td` pour les données.
- `thead`, `tbody`, `tfoot` regroupent les lignes ; le navigateur ajoute `tbody` si tu
  l’omets.
- `colspan` et `rowspan` fusionnent des cellules : compte les colonnes de chaque ligne.
- `scope="colgroup"` avec `colgroup` pour les en-têtes de groupes ; `headers` et `id`
  pour les cas très irréguliers, que l’on cherche plutôt à simplifier.
- Sans `th`, un tableau perd toute structure pour les technologies d’assistance.
