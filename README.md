# MICRO SERVICE DE PAIEMENT : PAYPAS

## Équipe

- Gautier de MAUROY
- Mickaël DESCLAUX-ARRAMOND
- Jérémy DUFLOT
- Mahery GONIN
- Solène GOUIN

## TÂCHES

### FRONT

- Front de tout
- Afficher les champs de carte bleue
  - vérification avec regexp
  - msg de validation de champs
- Le pipeline à gérer

### BACK

- BDD
  - Le(s) facture(s) à intégrer ou non en bdd
    - que quand le paiement est validé
    - créer un détail de facture avec le panier
    - mettre le user
    - date et heure
  - Le paiement
    - date et heure
    - refusé
    - validé
    - le user
- Vérifier que le token est bon dès le début
  - on redirige ou non vers l'auth du front
- Récupérer le panier
  - le choper dans le localStorage
- Calculer le montant total
- Appuyer sur payer
  - vérification du token, est-ce que le token est toujours bon => on avise en fonction
  - on envoie le résultat au front et au catalogue
    - le front il reçoit juste un msg validé ou pas validé
    - le catalogue il reçoit validé ou pas validé + le panier
    - on redirige vers une page du front qui dit si la commande est validé ou non
- Sécurité
  - intégrer le middleware CORS
  - Middleware d'auth
- Routes dont on a besoin
  - Validation de paiement

### RÉPARTITION

- Gautier
  - FRONT + COMMUNICATION

- Mickaël
  - BACK

- Jérémy
  - BACK

- Mahery
  - BACK

- Solène
  - FRONT

## LIVRABLE

- Groupe 4 :

Paiement
Votre rôle est d'accepter ou de refuser un paiement d'un client authentifié qui a choisi un produit dans le catalogue
Équipe transverse directe : Catalogue > Groupe 1
Équipe transverse indirect : Authentication > Groupe 2
Équipe sans lien : Front > Groupe 3

Rôle : Prendre une commande, calculer le total, et simuler un paiement.

Livrable attendu : Une API qui reçoit une liste d'ID de livres et l'ID de l'utilisateur, vérifie le prix auprès du Catalogue, et valide la transaction.
Tech lead : Gautier

Acceptation ou refusation

Rollback en cas de paiement refusé, le catalogue doit récupérer +1 si refusé

Vérifier le prix au niveau du catalogue (groupe 1, équipe catalogue)

Lien entre bouton pour la page de paiement, à nous de faire la page vers laquelle l'user est redirigé pour gérer le module de paiement (front/ groupe 3)

JWT doit aussi être utilisé pour le paiement ? A voir avec l'équipe auth, le groupe 2

Restock de la qté de produit et l'info qui permet de restock côté équipe catalogue => groupe 1 / équipe catalogue

## TECHNOS

### FRONT PART

- Rendu HTML du front

### BACK PART

- Express

## ARBORESCENCE

```text
  root
  ├── controllers
  │  └── paymentController.js
  ├── db
  │  └── index.js
  ├── dtos
  │  └── cardDto.js
  │  └── cartDto.js // localStorage, fait par le Front
  │  └── userDto.js // à voir avec le README de l'auth
  ├── middlewares
  │  └── récupérer celui de l'auth
  ├── routers
  │  └── index.js
  ├── services
  │  └── cartCalculator.js
  │  └── cartHandler.js
  │  └── paymentHandler.js
  ├── views
  │  └── child 2
  │       ├── child 3
  │       └── child 4
  │           ├── child 5
  │           └── child 6
  │               └── child 7
  └── child 8
```

## Relations avec les équipes

### Équipe Catalogue

- Quelle db ils utilisent ? Postgresql
- quel endpoint pour soit vous envoyer les infos et vous gérez le fait de modifier la bdd // dans leur README
- une doc swagger pour l'API
//
- Besoin d'envoyer une clé unique pour l’idempotence

### Équipe Authentification

- JWT ou session comment vous zalé fèr ?
  - Utilisation d'un JWT qui expire au bout de 5mn pour sécuriser le paiement
- Un README avec le contenu de votre token
- On reçoit quoi de vous pour vérifier qu'on a un user connecté ? => middleware de vérification de connexion ; si le token est expiré, on renvoie sur le front de connexion

### Équipe Front

- localStorage pour le panier, avoir la structure de l'objet depuis le README
//
- Rediscuter des endpoints

### Steven
