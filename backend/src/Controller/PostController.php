<?php

namespace App\Controller;

use App\Repository\PostRepository;
use App\Repository\PostInteractionRepository;
use Doctrine\ORM\Tools\Pagination\Paginator;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Annotation\Route;
use Symfony\Component\Security\Http\Attribute\IsGranted;
use Symfony\Component\Serializer\SerializerInterface;
use Symfony\Component\Validator\Validator\ValidatorInterface;
use App\Service\PostService;
use Symfony\Component\HttpFoundation\JsonResponse;
use App\Request\CreatePostRequest;
use Symfony\Component\Security\Http\Attribute\CurrentUser;
use Doctrine\ORM\EntityManagerInterface;
use App\Entity\UserInteraction;
use App\Entity\Post;
use App\Entity\User;
use App\Repository\UserRepository;
use App\Entity\Notifications;
use App\Repository\NotificationsRepository;

class PostController extends AbstractController
{
    #[Route('/posts/search', name: 'posts.search', methods: ['GET'])]
    #[IsGranted('ROLE_USER')]
    public function searchPosts(
        Request $request,
        EntityManagerInterface $entityManager,
        PostInteractionRepository $interactionRepository,
        #[CurrentUser] $user
    ): JsonResponse {
        $query = $request->query->get('query', '');

        if (empty($query)) {
            return $this->json(['posts' => []]);
        }

        // Recherche dans les posts et leurs utilisateurs associés
        $qb = $entityManager->createQueryBuilder();
        $qb->select('p')
            ->from(Post::class, 'p')
            ->leftJoin('p.user', 'u')
            ->where($qb->expr()->orX(
                $qb->expr()->like('p.content', ':query'),
                $qb->expr()->like('u.name', ':query'),
                $qb->expr()->like('u.mention', ':query')
            ))
            ->andWhere('u.is_private = false') // Exclure les posts des utilisateurs en mode privé
            ->setParameter('query', '%' . $query . '%')
            ->orderBy('p.created_at', 'DESC');

        $results = $qb->getQuery()->getResult();

        $posts = [];
        foreach ($results as $post) {
            $userPost = $post->getIdUser();

            // Récupérer l'interaction de l'utilisateur avec ce post
            $interaction = $interactionRepository->findOneBy([
                'user' => $user,
                'post' => $post
            ]);

            // Compter le nombre total de likes pour ce post
            $totalLikes = $interactionRepository->count(['post' => $post, 'liked' => true]);

            $posts[] = [
                'id' => $post->getId(),
                'content' => $post->isCensored() ? 'Ce message enfreint les conditions d\'utilisation de la plateforme' : $post->getContent(),
                'mediaUrl' => $post->getMediaUrl(),
                'created_at' => $post->getCreatedAt()->format('Y-m-d H:i:s'),
                'likes' => $post->isCensored() ? 0 : $totalLikes,
                'isLiked' => $interaction ? $interaction->isLiked() : false,
                'isCensored' => $post->isCensored(),
                'isPinned' => $post->isPinned(),
                'user' => $userPost ? [
                    'id' => $userPost->getId(),
                    'email' => $userPost->getEmail(),
                    'name' => $userPost->getName(),
                    'mention' => $userPost->getMention(),
                    'avatar' => $userPost->getAvatar(),
                    'isbanned' => $userPost->isbanned(),
                    'readOnly' => $userPost->isReadOnly()
                ] : null
            ];
        }

        return $this->json(['posts' => $posts]);
    }

    #[Route('/posts', name: 'posts.list', methods: ['GET'])]
    public function index(
        Request $request,
        PostRepository $postRepository,
        PostInteractionRepository $interactionRepository,
        EntityManagerInterface $entityManager,
        #[CurrentUser] $user = null
    ): JsonResponse {
        // Pagination
        $page = $request->query->getInt('page', 1);
        $limit = 5;
        $offset = ($page - 1) * $limit;

        // Créer une requête personnalisée pour exclure les posts des utilisateurs en mode privé
        $qb = $entityManager->createQueryBuilder();
        $qb->select('p')
            ->from(Post::class, 'p')
            ->join('p.user', 'u')
            ->where('u.is_private = false')
            ->orderBy('p.created_at', 'DESC')
            ->setFirstResult($offset)
            ->setMaxResults($limit);

        $posts = $qb->getQuery()->getResult();

        // Formater les données
        $formattedPosts = [];
        foreach ($posts as $post) {
            $formattedPosts[] = $this->formatPostForResponse($post, $user, $interactionRepository);
        }

        // Compter le nombre total de posts d'utilisateurs non privés pour la pagination
        $totalQb = $entityManager->createQueryBuilder();
        $totalQb->select('COUNT(p.id)')
            ->from(Post::class, 'p')
            ->join('p.user', 'u')
            ->where('u.is_private = false');

        $totalPosts = $totalQb->getQuery()->getSingleScalarResult();
        $totalPages = ceil($totalPosts / $limit);

        // Déterminer les liens de pagination
        $previousPage = $page > 1 ? $page - 1 : null;
        $nextPage = $page < $totalPages ? $page + 1 : null;

        // Construire la réponse paginée
        return $this->json([
            'posts' => $formattedPosts,
            'previous_page' => $previousPage,
            'next_page' => $nextPage
        ]);
    }

    #[Route('/posts/followed', name: 'posts.followed', methods: ['GET'])]
    #[IsGranted('ROLE_USER')]
    public function getFollowedPosts(
        Request $request,
        PostRepository $postRepository,
        PostInteractionRepository $interactionRepository,
        EntityManagerInterface $entityManager,
        #[CurrentUser] $user
    ): Response {
        $page = max(1, $request->query->getInt('page', 1));
        $limit = 5;
        $offset = ($page - 1) * $limit;

        // Récupérer les IDs des utilisateurs suivis
        $qb = $entityManager->createQueryBuilder();
        $followedUserIds = $qb->select('IDENTITY(ui.target)')
            ->from(UserInteraction::class, 'ui')
            ->where('ui.source = :user')
            ->andWhere('ui.follow = true')
            ->setParameter('user', $user)
            ->getQuery()
            ->getResult();

        // Si aucun utilisateur suivi, retourner une liste vide
        if (empty($followedUserIds)) {
            return $this->json([
                'posts' => [],
                'previous_page' => null,
                'next_page' => null
            ]);
        }

        // Requête pour récupérer les posts des utilisateurs suivis
        $qb = $entityManager->createQueryBuilder();
        $query = $qb->select('p')
            ->from(Post::class, 'p')
            ->where($qb->expr()->in('p.user', ':followedUserIds'))
            ->setParameter('followedUserIds', $followedUserIds)
            ->orderBy('p.created_at', 'DESC')
            ->setFirstResult($offset)
            ->setMaxResults($limit)
            ->getQuery();

        $paginator = new Paginator($query);
        $totalPostsCount = count($paginator);
        $totalPages = ceil($totalPostsCount / $limit);

        // Calcul des pages précédente et suivante
        $previousPage = $page > 1 ? $page - 1 : null;
        $nextPage = $page < $totalPages ? $page + 1 : null;

        $posts = [];
        foreach ($paginator as $post) {
            $userPost = $post->getIdUser();

            // Récupérer l'interaction de l'utilisateur avec ce post
            $interaction = $interactionRepository->findOneBy([
                'user' => $user,
                'post' => $post
            ]);

            // Compter le nombre total de likes pour ce post
            $totalLikes = $interactionRepository->count(['post' => $post, 'liked' => true]);

            $posts[] = [
                'id' => $post->getId(),
                'content' => $post->isCensored() ? 'Ce message enfreint les conditions d\'utilisation de la plateforme' : $post->getContent(),
                'mediaUrl' => $post->getMediaUrl(),
                'created_at' => $post->getCreatedAt()->format('Y-m-d H:i:s'),
                'likes' => $post->isCensored() ? 0 : $totalLikes,
                'isLiked' => $interaction ? $interaction->isLiked() : false,
                'isCensored' => $post->isCensored(),
                'isPinned' => $post->isPinned(),
                'user' => $userPost ? [
                    'id' => $userPost->getId(),
                    'email' => $userPost->getEmail(),
                    'name' => $userPost->getName(),
                    'mention' => $userPost->getMention(),
                    'avatar' => $userPost->getAvatar(),
                    'isbanned' => $userPost->isbanned(),
                    'readOnly' => $userPost->isReadOnly(),
                    'is_private' => $userPost->isPrivate()
                ] : null
            ];
        }

        return $this->json([
            'posts' => $posts,
            'previous_page' => $previousPage,
            'next_page' => $nextPage
        ]);
    }

    #[Route('/addpost', name: 'posts.create', methods: ['POST'], format: 'json')]
    #[IsGranted('ROLE_USER')]
    public function create(
        Request $request,
        EntityManagerInterface $entityManager,
        UserRepository $userRepository,
        NotificationsRepository $notificationsRepository
    ): JsonResponse {
        $data = json_decode($request->getContent(), true);

        // Validation des données
        if (!isset($data['content'])) {
            return $this->json(['message' => 'Contenu requis'], 400);
        }

        /** @var User $user */
        $user = $this->getUser();

        $post = new Post();
        $post->setContent($data['content']);
        $post->setIdUser($user);
        $post->setCreatedAt(new \DateTimeImmutable('now', new \DateTimeZone('Europe/Paris')));

        // Gestion du verrouillage des commentaires
        if (isset($data['isLocked']) && is_bool($data['isLocked'])) {
            $post->setIsLocked($data['isLocked']);
        }

        // Gestion des médias (jusqu'à 10)
        if (isset($data['mediaUrls']) && is_array($data['mediaUrls']) && count($data['mediaUrls']) <= 10) {
            $post->setMediaUrl(implode(',', $data['mediaUrls']));
        }

        $entityManager->persist($post);
        $entityManager->flush();

        // Analyser le contenu pour trouver les mentions (@username)
        preg_match_all('/@([a-zA-Z0-9_]+)/', $data['content'], $matches);

        // S'il y a des mentions, créer des notifications
        if (!empty($matches[1])) {
            foreach ($matches[1] as $mention) {
                // Trouver l'utilisateur par son nom d'utilisateur (mention)
                $mentionedUser = $userRepository->findOneBy(['mention' => $mention]);

                // Si l'utilisateur existe et n'est pas l'auteur du post
                if ($mentionedUser && $mentionedUser->getId() !== $user->getId()) {
                    // Créer une notification
                    $notification = new Notifications();
                    $notification->setSource($user);
                    $notification->setTarget($mentionedUser);
                    $notification->setContent($user->getName() . " vous a mentionné dans un post");
                    $notification->setCreatedAt(new \DateTime('now', new \DateTimeZone('Europe/Paris')));
                    $notification->setIsRead(false);

                    // Enregistrer la notification
                    $notificationsRepository->save($notification, false);
                }
            }
            // Flush après avoir créé toutes les notifications
            if ($entityManager->getUnitOfWork()->size() > 0) {
                $entityManager->flush();
            }
        }

        return $this->json([
            'id' => $post->getId(),
            'content' => $post->getContent(),
            'created_at' => $post->getCreatedAt()->format('Y-m-d H:i:s'),
            'mediaUrl' => $post->getMediaUrl(),
            'likes' => 0,
            'isLiked' => false,
            'user' => [
                'id' => $user->getId(),
                'name' => $user->getName(),
                'mention' => $user->getMention(),
                'avatar' => $user->getAvatar()
            ]
        ]);
    }

    #[Route('/posts/{id}', name: 'posts.get', methods: ['GET'])]
    public function get(
        int $id,
        PostRepository $postRepository,
        PostInteractionRepository $interactionRepository,
        #[CurrentUser] $user
    ): JsonResponse {
        $post = $postRepository->find($id);

        if (!$post) {
            return $this->json(['message' => 'Post non trouvé'], Response::HTTP_NOT_FOUND);
        }

        return $this->json($this->formatPostForResponse($post, $user, $interactionRepository));
    }

    #[Route('/post/{id}', name: 'post.get_single', methods: ['GET'])]
    public function getSinglePost(
        int $id,
        PostRepository $postRepository,
        PostInteractionRepository $interactionRepository,
        #[CurrentUser] $user
    ): Response {
        // Récupérer le post par son ID
        $post = $postRepository->find($id);

        if (!$post) {
            return $this->json(['message' => 'Post non trouvé'], Response::HTTP_NOT_FOUND);
        }

        $userPost = $post->getIdUser();

        // Récupérer l'interaction de l'utilisateur avec ce post
        $interaction = $interactionRepository->findOneBy([
            'user' => $user,
            'post' => $post
        ]);

        // Compter le nombre total de likes pour ce post
        $totalLikes = $interactionRepository->count(['post' => $post, 'liked' => true]);

        // Log des informations du post pour débogage
        error_log('Récupération du post ID ' . $id . ', médias: ' . $post->getMediaUrl());

        $postData = [
            'id' => $post->getId(),
            'content' => $post->isCensored() ? 'Ce message enfreint les conditions d\'utilisation de la plateforme' : $post->getContent(),
            'mediaUrl' => $post->getMediaUrl(),
            'created_at' => $post->getCreatedAt()->format('Y-m-d H:i:s'),
            'likes' => $post->isCensored() ? 0 : $totalLikes,
            'isLiked' => $interaction ? $interaction->isLiked() : false,
            'isCensored' => $post->isCensored(),
            'isPinned' => $post->isPinned(),
            'isRetweet' => $post->isRetweet(),
            'retweetCount' => $post->getRetweetCount(),
            'user' => $userPost ? [
                'id' => $userPost->getId(),
                'email' => $userPost->getEmail(),
                'name' => $userPost->getName(),
                'mention' => $userPost->getMention(),
                'avatar' => $userPost->getAvatar(),
                'isbanned' => $userPost->isbanned(),
                'readOnly' => $userPost->isReadOnly()
            ] : null
        ];

        // Ajouter les informations sur le post original et l'utilisateur qui a retweeté
        if ($post->isRetweet()) {
            $originalPost = $post->getOriginalPost();
            $originalUser = $post->getOriginalUser();

            if ($originalPost) {
                $postData['originalPost'] = [
                    'id' => $originalPost->getId(),
                    'content' => $post->getRetweetedContent() ?? $originalPost->getContent(), // Priorité au contenu sauvegardé
                    'mediaUrl' => $post->getMediaUrl(), // Utiliser le média du retweet qui est une copie de l'original
                    'created_at' => $originalPost->getCreatedAt()->format('Y-m-d H:i:s'),
                    'user' => $originalPost->getIdUser() ? [
                        'id' => $originalPost->getIdUser()->getId(),
                        'name' => $originalPost->getIdUser()->getName(),
                        'mention' => $originalPost->getIdUser()->getMention(),
                        'avatar' => $originalPost->getIdUser()->getAvatar(),
                        'isPrivate' => $originalPost->getIdUser()->isPrivate()
                    ] : null
                ];
            }
            // Si le post original a été supprimé, mais que nous avons son contenu sauvegardé
            else if ($post->getRetweetedContent() !== null) {
                $postData['originalPost'] = [
                    'id' => null, // L'ID n'existe plus
                    'content' => $post->getRetweetedContent(),
                    'mediaUrl' => $post->getMediaUrl(), // Utiliser le mediaUrl du retweet (qui a été copié du post original)
                    'created_at' => null, // Nous n'avons pas la date sauvegardée
                    'user' => $originalUser ? [
                        'id' => $originalUser->getId(),
                        'name' => $originalUser->getName(),
                        'mention' => $originalUser->getMention(),
                        'avatar' => $originalUser->getAvatar(),
                        'isPrivate' => $originalUser->isPrivate()
                    ] : null,
                    'deleted' => true // Indiquer que le post original a été supprimé
                ];
            }

            if ($originalUser) {
                $postData['originalUser'] = [
                    'id' => $originalUser->getId(),
                    'name' => $originalUser->getName(),
                    'mention' => $originalUser->getMention(),
                    'avatar' => $originalUser->getAvatar(),
                    'isPrivate' => $originalUser->isPrivate()
                ];
            }
        }

        return $this->json($postData);
    }

    #[Route('/posts/{id}', name: 'posts.delete', methods: ['DELETE'])]
    #[IsGranted('ROLE_USER')]
    public function deletePost(
        int $id,
        PostRepository $postRepository,
        PostInteractionRepository $interactionRepository,
        EntityManagerInterface $entityManager,
        #[CurrentUser] User $user
    ): JsonResponse {
        $post = $postRepository->find($id);

        if (!$post) {
            return $this->json(['message' => 'Post non trouvé'], Response::HTTP_NOT_FOUND);
        }

        // Vérifier que l'utilisateur est bien l'auteur du post ou un admin
        if ($post->getIdUser()->getId() !== $user->getId() && !in_array('ROLE_ADMIN', $user->getRoles())) {
            return $this->json(['message' => 'Vous n\'êtes pas autorisé à supprimer ce post'], Response::HTTP_FORBIDDEN);
        }

        // Récupérer et traiter les médias avant la suppression du post
        $mediaUrls = $post->getMediaUrl() ? explode(',', $post->getMediaUrl()) : [];

        // Si c'est un retweet, décrémenter le compteur du post original
        if ($post->isRetweet() && $post->getOriginalPost()) {
            $originalPost = $post->getOriginalPost();
            $originalPost->decrementRetweetCount();
            $entityManager->persist($originalPost);
        }
        // Si c'est un post original qui a été retweeté, sauvegarder les données pour les retweets
        else if ($post->getRetweetCount() > 0) {
            // Trouver tous les retweets qui référencent ce post
            $retweets = $postRepository->findBy(['originalPost' => $post]);

            // Pour chaque retweet, sauvegarder les informations du post original
            foreach ($retweets as $retweet) {
                // Sauvegarder le contenu et le mediaUrl du post original
                $retweet->saveOriginalPostData();

                // S'assurer que originalUser est défini si ce n'est pas déjà le cas
                if (!$retweet->getOriginalUser() && $post->getIdUser()) {
                    $retweet->setOriginalUser($post->getIdUser());
                }

                // Détacher le retweet du post original
                $retweet->setOriginalPost(null);

                $entityManager->persist($retweet);
            }
            // Flush ici pour sauvegarder les changements avant de supprimer le post original
            $entityManager->flush();
        }

        // Supprimer d'abord toutes les interactions associées au post
        $interactions = $interactionRepository->findBy(['post' => $post]);
        foreach ($interactions as $interaction) {
            $entityManager->remove($interaction);
        }

        // Supprimer le post
        $entityManager->remove($post);
        $entityManager->flush();

        // Maintenant que le post est supprimé, vérifier et supprimer les médias si nécessaire
        foreach ($mediaUrls as $mediaUrl) {
            if (!empty($mediaUrl)) {
                $this->deleteMediaFile($mediaUrl, $id, $entityManager);
            }
        }

        return $this->json(['message' => 'Post supprimé avec succès']);
    }

    #[Route('/posts/{id}', name: 'posts.update', methods: ['PUT'], format: 'json')]
    #[IsGranted('ROLE_USER')]
    public function update(
        int $id,
        Request $request,
        PostRepository $postRepository,
        PostInteractionRepository $interactionRepository,
        EntityManagerInterface $entityManager,
        #[CurrentUser] $user
    ): JsonResponse {
        $post = $postRepository->find($id);

        if (!$post) {
            return $this->json(['message' => 'Post non trouvé'], Response::HTTP_NOT_FOUND);
        }

        // Vérifier si l'utilisateur est le propriétaire du post
        if ($post->getIdUser()->getId() !== $user->getId()) {
            return $this->json(['message' => 'Vous n\'êtes pas autorisé à modifier ce post'], Response::HTTP_FORBIDDEN);
        }

        $data = json_decode($request->getContent(), true);

        // Validation des données (contenu et/ou média requis)
        if (!isset($data['content']) && !isset($data['mediaUrls'])) {
            return $this->json(['message' => 'Contenu ou média requis'], 400);
        }

        // Récupérer les médias actuels du post
        $currentMediaUrls = $post->getMediaUrl() ? explode(',', $post->getMediaUrl()) : [];

        // Médias après modification
        $newMediaUrls = isset($data['mediaUrls']) && is_array($data['mediaUrls']) ? $data['mediaUrls'] : [];

        // Identifier les médias qui ont été supprimés
        $removedMedias = array_diff($currentMediaUrls, $newMediaUrls);

        // Vérifier si les médias supprimés sont utilisés ailleurs
        foreach ($removedMedias as $mediaUrl) {
            if (!empty($mediaUrl)) {
                $this->deleteMediaFile($mediaUrl, $id, $entityManager);
            }
        }

        // Mise à jour du contenu si présent
        if (isset($data['content'])) {
            $post->setContent($data['content']);
        }

        // Mise à jour des médias si présents
        if (isset($data['mediaUrls']) && is_array($data['mediaUrls']) && count($data['mediaUrls']) <= 10) {
            $post->setMediaUrl(implode(',', $data['mediaUrls']));
        }

        // Mise à jour du statut de verrouillage si présent
        if (isset($data['isLocked'])) {
            $post->setIsLocked($data['isLocked']);
        }

        // Les modifications du post original n'affectent pas les retweets existants
        // car les retweets contiennent déjà une copie du contenu et des médias

        $entityManager->flush();

        // Récupérer le nombre de likes
        $totalLikes = $interactionRepository->count(['post' => $post, 'liked' => true]);

        // Vérifier si l'utilisateur a liké ce post
        $interaction = $interactionRepository->findOneBy([
            'user' => $user,
            'post' => $post
        ]);

        return $this->json([
            'id' => $post->getId(),
            'content' => $post->getContent(),
            'created_at' => $post->getCreatedAt()->format('Y-m-d H:i:s'),
            'mediaUrl' => $post->getMediaUrl(),
            'likes' => $totalLikes,
            'isLiked' => $interaction ? $interaction->isLiked() : false,
            'user' => [
                'id' => $user->getId(),
                'name' => $user->getName(),
                'mention' => $user->getMention(),
                'avatar' => $user->getAvatar()
            ]
        ]);
    }

    #[Route('/posts/{id}/toggle-censorship', name: 'posts.toggle_censorship', methods: ['PUT'])]
    #[IsGranted('ROLE_USER')]
    public function toggleCensorship(
        int $id,
        PostRepository $postRepository,
        EntityManagerInterface $entityManager
    ): JsonResponse {
        $post = $postRepository->find($id);

        if (!$post) {
            return $this->json(['message' => 'Post non trouvé'], Response::HTTP_NOT_FOUND);
        }

        // Inverser le statut de censure
        $post->setIsCensored(!$post->isCensored());
        $entityManager->flush();

        return $this->json([
            'id' => $post->getId(),
            'isCensored' => $post->isCensored(),
            'message' => $post->isCensored() ? 'Post censuré avec succès' : 'Censure retirée avec succès'
        ]);
    }

    #[Route('/posts/{id}/toggle-pin', name: 'posts.toggle_pin', methods: ['PATCH'])]
    #[IsGranted('ROLE_USER')]
    public function togglePin(
        int $id,
        PostRepository $postRepository,
        EntityManagerInterface $entityManager,
        #[CurrentUser] $user
    ): JsonResponse {
        $post = $postRepository->find($id);

        if (!$post) {
            return $this->json(['message' => 'Post non trouvé'], Response::HTTP_NOT_FOUND);
        }

        // Vérifier si l'utilisateur est le propriétaire du post
        if ($post->getIdUser()->getId() !== $user->getId()) {
            return $this->json(['message' => 'Vous n\'êtes pas autorisé à épingler ce post'], Response::HTTP_FORBIDDEN);
        }

        // Si le post est déjà épinglé, le désépingler
        if ($post->isPinned()) {
            $post->setIsPinned(false);
        } else {
            // Sinon, d'abord désépingler tous les autres posts de l'utilisateur
            $userPosts = $postRepository->findBy(['user' => $user, 'isPinned' => true]);
            foreach ($userPosts as $userPost) {
                $userPost->setIsPinned(false);
            }

            // Puis épingler le post actuel
            $post->setIsPinned(true);
        }

        $entityManager->flush();

        return $this->json([
            'id' => $post->getId(),
            'isPinned' => $post->isPinned(),
            'message' => $post->isPinned() ? 'Post épinglé avec succès' : 'Post désépinglé avec succès'
        ]);
    }

    #[Route('/posts/{id}/retweet', name: 'posts.retweet', methods: ['POST'])]
    #[IsGranted('ROLE_USER')]
    public function retweet(
        int $id,
        Request $request,
        PostRepository $postRepository,
        EntityManagerInterface $entityManager,
        UserRepository $userRepository,
        NotificationsRepository $notificationsRepository,
        #[CurrentUser] User $currentUser
    ): JsonResponse {
        // Récupérer le post original
        $originalPost = $postRepository->find($id);
        if (!$originalPost) {
            return $this->json(['message' => 'Post non trouvé'], Response::HTTP_NOT_FOUND);
        }

        // Vérifier si l'utilisateur est banni
        if ($currentUser->isbanned()) {
            return $this->json(['message' => 'Votre compte est suspendu'], Response::HTTP_FORBIDDEN);
        }

        // Vérifier si l'utilisateur essaie de retweeter son propre tweet
        if ($originalPost->getIdUser()->getId() === $currentUser->getId()) {
            return $this->json(['message' => 'Vous ne pouvez pas repartager votre propre post'], Response::HTTP_BAD_REQUEST);
        }

        // Vérifier si l'utilisateur est bloqué par l'auteur du post
        $isBlocked = $userRepository->isUserBlockedBy($currentUser->getId(), $originalPost->getIdUser()->getId());
        if ($isBlocked) {
            return $this->json(['message' => 'Vous ne pouvez pas repartager le post d\'un utilisateur qui vous a bloqué'], Response::HTTP_FORBIDDEN);
        }

        // Vérifier s'il existe déjà un retweet du même post par cet utilisateur
        $existingRetweet = $postRepository->findOneBy([
            'user' => $currentUser,
            'originalPost' => $originalPost
        ]);

        if ($existingRetweet) {
            return $this->json(['message' => 'Vous avez déjà repartagé ce post'], Response::HTTP_BAD_REQUEST);
        }

        // Traiter les données
        $data = json_decode($request->getContent(), true);
        $content = $data['content'] ?? '';

        // Créer le nouveau post (retweet)
        $retweet = new Post();
        $retweet->setContent($content);
        $retweet->setOriginalPost($originalPost);
        $retweet->setOriginalUser($originalPost->getIdUser()); // Stocker l'utilisateur original
        $retweet->setIdUser($currentUser); // L'utilisateur qui retweet devient le propriétaire
        $retweet->setCreatedAt(new \DateTimeImmutable('now', new \DateTimeZone('Europe/Paris')));

        // Stocker le contenu du post original dans le champ retweeted_content
        $retweet->setRetweetedContent($originalPost->getContent());

        // Copier le mediaUrl du post original dans le retweet
        if ($originalPost->getMediaUrl()) {
            $retweet->setMediaUrl($originalPost->getMediaUrl());
        }

        // Si le champ content est vide, utilisez le contenu du post original
        if (empty($content)) {
            $retweet->setContent('');  // Laisser le content vide au lieu de copier le contenu du post original
        }

        // Incrémenter le compteur de retweets du post original
        $originalPost->incrementRetweetCount();

        // Créer une notification pour l'auteur du post original
        $notification = new Notifications();
        $notification->setSource($currentUser);
        $notification->setTarget($originalPost->getIdUser());
        $notification->setContent($currentUser->getName() . " a repartagé votre post");
        $notification->setCreatedAt(new \DateTime('now', new \DateTimeZone('Europe/Paris')));
        $notification->setIsRead(false);
        $notificationsRepository->save($notification, false);

        // Persister les changements
        $entityManager->persist($retweet);
        $entityManager->flush();

        return $this->json([
            'id' => $retweet->getId(),
            'content' => $retweet->getContent(),
            'created_at' => $retweet->getCreatedAt()->format('Y-m-d H:i:s'),
            'mediaUrl' => $retweet->getMediaUrl(),
            'likes' => 0,
            'isLiked' => false,
            'retweets' => 0,
            'isRetweet' => true,
            'originalPost' => [
                'id' => $originalPost->getId(),
                'content' => $originalPost->getContent(),
                'mediaUrl' => $originalPost->getMediaUrl(),
                'created_at' => $originalPost->getCreatedAt()->format('Y-m-d H:i:s'),
                'user' => $originalPost->getIdUser() ? [
                    'id' => $originalPost->getIdUser()->getId(),
                    'name' => $originalPost->getIdUser()->getName(),
                    'mention' => $originalPost->getIdUser()->getMention(),
                    'avatar' => $originalPost->getIdUser()->getAvatar(),
                    'isPrivate' => $originalPost->getIdUser()->isPrivate()
                ] : null
            ],
            'originalUser' => [
                'id' => $originalPost->getIdUser()->getId(),
                'name' => $originalPost->getIdUser()->getName(),
                'mention' => $originalPost->getIdUser()->getMention(),
                'avatar' => $originalPost->getIdUser()->getAvatar(),
                'isPrivate' => $originalPost->getIdUser()->isPrivate()
            ],
            'user' => [
                'id' => $currentUser->getId(),
                'name' => $currentUser->getName(),
                'mention' => $currentUser->getMention(),
                'avatar' => $currentUser->getAvatar(),
                'isbanned' => $currentUser->isbanned(),
                'readOnly' => $currentUser->isReadOnly()
            ]
        ]);
    }

    #[Route('/posts/{id}/retweet-status', name: 'posts.retweet_status', methods: ['GET'])]
    #[IsGranted('ROLE_USER')]
    public function getRetweetStatus(
        int $id,
        PostRepository $postRepository,
        #[CurrentUser] User $currentUser
    ): JsonResponse {
        $post = $postRepository->find($id);

        if (!$post) {
            return $this->json(['message' => 'Post non trouvé'], Response::HTTP_NOT_FOUND);
        }

        // Vérifier si l'utilisateur a retweeté ce post
        $hasRetweeted = $postRepository->findOneBy([
            'user' => $currentUser,
            'originalPost' => $post
        ]) !== null;

        return $this->json([
            'retweets' => $post->getRetweetCount(),
            'isRetweeted' => $hasRetweeted
        ]);
    }

    // Modifier la méthode fetchPosts pour inclure les informations de retweet
    private function formatPostForResponse(Post $post, User $currentUser = null, PostInteractionRepository $interactionRepository = null): array
    {
        $postData = [
            'id' => $post->getId(),
            'content' => $post->getContent(),
            'created_at' => $post->getCreatedAt()->format('Y-m-d H:i:s'),
            'mediaUrl' => $post->getMediaUrl(),
            'isCensored' => $post->isCensored(),
            'isPinned' => $post->isPinned(),
            'isLocked' => $post->isLocked(),
            'retweets' => $post->getRetweetCount(),
            'isRetweet' => $post->isRetweet()
        ];

        // Ajouter les informations sur le post original et l'utilisateur qui a retweeté
        if ($post->isRetweet()) {
            $originalPost = $post->getOriginalPost();
            $originalUser = $post->getOriginalUser();

            if ($originalPost) {
                $postData['originalPost'] = [
                    'id' => $originalPost->getId(),
                    'content' => $post->getRetweetedContent() ?? $originalPost->getContent(), // Priorité au contenu sauvegardé
                    'mediaUrl' => $post->getMediaUrl(), // Utiliser le média du retweet qui est une copie de l'original
                    'created_at' => $originalPost->getCreatedAt()->format('Y-m-d H:i:s'),
                    'user' => $originalPost->getIdUser() ? [
                        'id' => $originalPost->getIdUser()->getId(),
                        'name' => $originalPost->getIdUser()->getName(),
                        'mention' => $originalPost->getIdUser()->getMention(),
                        'avatar' => $originalPost->getIdUser()->getAvatar(),
                        'isPrivate' => $originalPost->getIdUser()->isPrivate()
                    ] : null
                ];
            }
            // Si le post original a été supprimé, mais que nous avons son contenu sauvegardé
            else if ($post->getRetweetedContent() !== null) {
                $postData['originalPost'] = [
                    'id' => null, // L'ID n'existe plus
                    'content' => $post->getRetweetedContent(),
                    'mediaUrl' => $post->getMediaUrl(), // Utiliser le mediaUrl du retweet (qui a été copié du post original)
                    'created_at' => null, // Nous n'avons pas la date sauvegardée
                    'user' => $originalUser ? [
                        'id' => $originalUser->getId(),
                        'name' => $originalUser->getName(),
                        'mention' => $originalUser->getMention(),
                        'avatar' => $originalUser->getAvatar(),
                        'isPrivate' => $originalUser->isPrivate()
                    ] : null,
                    'deleted' => true // Indiquer que le post original a été supprimé
                ];
            }

            if ($originalUser) {
                $postData['originalUser'] = [
                    'id' => $originalUser->getId(),
                    'name' => $originalUser->getName(),
                    'mention' => $originalUser->getMention(),
                    'avatar' => $originalUser->getAvatar(),
                    'isPrivate' => $originalUser->isPrivate()
                ];
            }
        }

        // Ajouter les informations de l'utilisateur
        $user = $post->getIdUser();
        if ($user) {
            $postData['user'] = [
                'id' => $user->getId(),
                'email' => $user->getEmail(),
                'name' => $user->getName(),
                'mention' => $user->getMention(),
                'avatar' => $user->getAvatar(),
                'isbanned' => $user->isbanned(),
                'readOnly' => $user->isReadOnly(),
                'isPrivate' => $user->isPrivate(),
                'followerRestriction' => $user->hasFollowerRestriction()
            ];
        } else {
            $postData['user'] = null;
        }

        // Ajouter les likes et le statut si l'utilisateur est connecté et le repository est fourni
        if ($currentUser && $interactionRepository) {
            $totalLikes = $interactionRepository->count(['post' => $post, 'liked' => true]);
            $postData['likes'] = $totalLikes;

            $interaction = $interactionRepository->findOneBy([
                'user' => $currentUser,
                'post' => $post
            ]);
            $postData['isLiked'] = $interaction && $interaction->isLiked();
        } else {
            $postData['likes'] = 0;
            $postData['isLiked'] = false;
        }

        return $postData;
    }

    #[Route('/users/posts', name: 'posts.user', methods: ['GET'])]
    #[IsGranted('ROLE_USER')]
    public function getUserPosts(
        Request $request,
        PostRepository $postRepository,
        PostInteractionRepository $interactionRepository,
        EntityManagerInterface $entityManager,
        #[CurrentUser] User $user
    ): JsonResponse {
        $userId = $request->query->getInt('userId', $user->getId());
        $targetUser = $entityManager->getRepository(User::class)->find($userId);

        if (!$targetUser) {
            return $this->json(['message' => 'Utilisateur non trouvé'], Response::HTTP_NOT_FOUND);
        }

        // Vérifier si l'utilisateur cible est en mode privé
        if ($targetUser->isPrivate() && $targetUser->getId() !== $user->getId()) {
            // Vérifier si l'utilisateur courant suit l'utilisateur cible
            $qb = $entityManager->createQueryBuilder();
            $followStatus = $qb->select('ui')
                ->from(UserInteraction::class, 'ui')
                ->where('ui.source = :source')
                ->andWhere('ui.target = :target')
                ->andWhere('ui.follow = true')
                ->setParameter('source', $user)
                ->setParameter('target', $targetUser)
                ->getQuery()
                ->getResult();

            // Si l'utilisateur courant ne suit pas l'utilisateur cible, ne pas afficher les posts
            if (empty($followStatus)) {
                return $this->json(['posts' => [], 'is_private' => true]);
            }
        }

        // Utiliser findByUserOrderByPinned qui inclut les retweets
        $posts = $postRepository->findByUserOrderByPinned($targetUser->getId());

        // Filtrer les posts pour n'inclure que les posts originaux et les retweets faits par l'utilisateur du profil
        $filteredPosts = array_filter($posts, function ($post) use ($targetUser) {
            // Inclure si ce n'est pas un retweet OU si c'est un retweet fait par l'utilisateur du profil
            return !$post->isRetweet() || ($post->isRetweet() && $post->getIdUser() && $post->getIdUser()->getId() === $targetUser->getId());
        });

        $formattedPosts = [];
        foreach ($filteredPosts as $post) {
            $formattedPosts[] = $this->formatPostForResponse($post, $user, $interactionRepository);
        }

        return $this->json(['posts' => $formattedPosts]);
    }

    /**
     * Vérifie si un média est utilisé dans d'autres posts et le supprime si nécessaire
     */
    private function deleteMediaFile(string $mediaUrl, int $currentPostId, EntityManagerInterface $entityManager): bool
    {
        // Vérifier si le média est utilisé dans d'autres posts
        $isUsedElsewhere = $this->isMediaUsedElsewhere($mediaUrl, $currentPostId, $entityManager);

        // Si le média n'est pas utilisé ailleurs, on peut le supprimer physiquement
        if (!$isUsedElsewhere) {
            $mediaPath = $this->getParameter('kernel.project_dir') . '/public/images/' . $mediaUrl;

            if (file_exists($mediaPath)) {
                return unlink($mediaPath);
            }
        }

        return false;
    }

    /**
     * Vérifie si un média est utilisé dans d'autres posts
     */
    private function isMediaUsedElsewhere(string $mediaUrl, int $currentPostId, EntityManagerInterface $entityManager): bool
    {
        $qb = $entityManager->createQueryBuilder();
        $query = $qb->select('COUNT(p.id)')
            ->from(Post::class, 'p')
            ->where('p.id != :currentPostId')
            ->andWhere(
                $qb->expr()->orX(
                    $qb->expr()->eq('p.mediaUrl', ':exactMedia'),
                    $qb->expr()->like('p.mediaUrl', ':mediaStart'),
                    $qb->expr()->like('p.mediaUrl', ':mediaMiddle'),
                    $qb->expr()->like('p.mediaUrl', ':mediaEnd')
                )
            )
            ->setParameter('currentPostId', $currentPostId)
            ->setParameter('exactMedia', $mediaUrl)
            ->setParameter('mediaStart', $mediaUrl . ',%')
            ->setParameter('mediaMiddle', '%,' . $mediaUrl . ',%')
            ->setParameter('mediaEnd', '%,' . $mediaUrl)
            ->getQuery();

        return (int)$query->getSingleScalarResult() > 0;
    }

    #[Route('/posts/{id}/toggle-lock', name: 'posts.toggle_lock', methods: ['PATCH'])]
    #[IsGranted('ROLE_USER')]
    public function toggleLock(
        int $id,
        PostRepository $postRepository,
        EntityManagerInterface $entityManager,
        #[CurrentUser] $user
    ): JsonResponse {
        $post = $postRepository->find($id);

        if (!$post) {
            return $this->json(['message' => 'Post non trouvé'], Response::HTTP_NOT_FOUND);
        }

        // Vérifier si l'utilisateur est le propriétaire du post
        if ($post->getIdUser()->getId() !== $user->getId()) {
            return $this->json(['message' => 'Vous n\'êtes pas autorisé à verrouiller ce post'], Response::HTTP_FORBIDDEN);
        }

        // Inverser l'état de verrouillage
        $post->setIsLocked(!$post->isLocked());
        $entityManager->flush();

        return $this->json([
            'isLocked' => $post->isLocked()
        ]);
    }
}
