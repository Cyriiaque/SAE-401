# SAE Starter
Ce repository a pour but de fournir une base pour un environnement Docker local pour la SAE4.DWeb-DI.01.

## Récupérer les fichiers du repository

Pour récupérer les fichiers de ce repository, ***ne faites pas de clone ou de fork !*** Cliquez simplement sur "Code", puis "Download ZIP" à la place.

Vous pouvez ensuite suivre les instructions détaillées un peu plus bas pour installer la base de votre frontend et de votre backend.

## Installation du frontend

Si vous avez déjà commencés à travailler sur votre frontend, déplacez votre code dans un dossier `frontend` à la racine de ce repository.

Si ce n'est pas le cas, exécutez la commande `docker compose run --rm sae-frontend` suivie de celle permettant d'installer les fichiers de votre base de votre application React.

Voici un exemple pour faire une installation avec Vite:
```
# Installation d'un projet React avec Vite
docker compose run --rm sae-frontend npm create vite@latest . -- --template react

# Installe les dépendances
docker compose run --rm sae-frontend npm install
```

**Pensez bien à nommer le dossier `frontend`, sinon votre application ne fonctionnera pas.**

Vous aurez aussi besoin de configurer le serveur Vite pour qu'il soit compatible avec votre environnement Docker. Pour cela, remplacez le fichier `frontend/vite.config.js` par celui-ci:
```
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: "/",
  plugins: [react()],
  preview: {
   port: 5173,
   strictPort: true,
  },
  server: {
   port: 5173,
   strictPort: true,
   host: true,
   origin: "http://localhost:8090",
   allowedHosts: ["sae-frontend"]
  },
});
```

## Installation du backend

Si vous avez déjà commencés à travailler sur votre backend, déplacez votre code dans un dossier `backend` à la racine de ce repository, en supprimant s'ils sont présents le fichier `docker-compose.yml` et le dossier `docker/`, afin qu'ils ne perturbent pas le nouvel environnement Docker.

Si vous n'aviez pas encore commencé à travailler sur votre backend, exécutez la commande `docker compose run --rm sae-backend` suivie de celle permettant d'installer les fichiers de votre base de votre application Symfony en utilisant le conteneur Docker où composer est installé:

Voici un exemple:
```
# Installe Symfony dans un répertoire tmp_application/
docker compose run --rm sae-backend composer create-project symfony/skeleton:"7.2.*" tmp_application

# Permet d'extraire les fichiers du répertoire tmp_application/
docker compose run --rm sae-backend /bin/bash -c "cd tmp_application; cp -Rp . ..; cd -; rm -Rf tmp_application"
```

**Pensez bien à nommer le dossier `backend`, sinon votre application ne fonctionnera pas.**

## Lancer l'environnement
Si les dépendances ne sont pas installés (c'est-à-dire si vous n'avez pas les dossiers `frontend/node_modules` et `backend/vendor`), exécutez les commandes suivantes:
```
# Installe les dépendances pour le frontend
docker compose run --rm sae-frontend npm install

# Installe les dépendances pour le backend
docker compose run --rm sae-backend composer install
```

Si tout est OK, vous pouvez lancer les conteneurs avec `docker compose up -d` (vérifiez qu'ils tournent bien en ouvrant Docker Desktop), et essayez d'accéder aux différents liens pour voir si tout est fonctionnel.

## Import/Export de la base de données
Il vous est fortement conseillé de faire un export régulier de l'ensemble des tables de votre base de données. Vous pouvez placer le fichier SQL dans un dossier `docker/mysql/sql_import_scripts/` pour qu'il soit automatiquement réimporté par Docker lors de la création du conteneur `sae-mysql` (seulement si aucune autre table n'existe déjà).

## Liens
- Frontend : [http://localhost:8090](http://localhost:8090)
- Backend : [http://localhost:8080](http://localhost:8080)
- phpMyAdmin : [http://localhost:8070](http://localhost:8070)
