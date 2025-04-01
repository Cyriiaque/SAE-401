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

class PostController extends AbstractController
{
    #[Route('/posts', name: 'posts.index', methods: ['GET'])]
    public function index(
        Request $request,
        PostRepository $postRepository,
        PostInteractionRepository $interactionRepository,
        #[CurrentUser] $user
    ): Response {
        $page = max(1, $request->query->getInt('page', 1));
        $limit = 5;
        $offset = ($page - 1) * $limit;

        $paginator = $postRepository->paginateAllOrderedByLatest();
        $totalPostsCount = $paginator->count();
        $totalPages = ceil($totalPostsCount / $limit);

        // Calcul des pages précédente et suivante
        $previousPage = $page > 1 ? $page - 1 : null;
        $nextPage = $page < $totalPages ? $page + 1 : null;

        $posts = [];
        $count = 0;
        foreach ($paginator as $post) {
            if ($count >= $offset && $count < ($offset + $limit)) {
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
                    'user' => $userPost ? [
                        'id' => $userPost->getId(),
                        'email' => $userPost->getEmail(),
                        'name' => $userPost->getName(),
                        'mention' => $userPost->getMention(),
                        'avatar' => $userPost->getAvatar(),
                        'isbanned' => $userPost->isbanned()
                    ] : null
                ];
            }
            $count++;
        }

        return $this->json([
            'posts' => $posts,
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
                'user' => $userPost ? [
                    'id' => $userPost->getId(),
                    'email' => $userPost->getEmail(),
                    'name' => $userPost->getName(),
                    'mention' => $userPost->getMention(),
                    'avatar' => $userPost->getAvatar(),
                    'isbanned' => $userPost->isbanned()
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
        EntityManagerInterface $entityManager
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
        $post->setCreatedAt(new \DateTimeImmutable());

        // Gestion des médias (jusqu'à 10)
        if (isset($data['mediaUrls']) && is_array($data['mediaUrls']) && count($data['mediaUrls']) <= 10) {
            $post->setMediaUrl(implode(',', $data['mediaUrls']));
        }

        $entityManager->persist($post);
        $entityManager->flush();

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
    ): Response {
        $posts = [];
        $paginator = $postRepository->paginateAllOrderedByLatest();

        foreach ($paginator as $post) {
            if ($post->getIdUser()->getId() === $id) {
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
                    'user' => $userPost ? [
                        'id' => $userPost->getId(),
                        'email' => $userPost->getEmail(),
                        'name' => $userPost->getName(),
                        'mention' => $userPost->getMention(),
                        'avatar' => $userPost->getAvatar()
                    ] : null
                ];
            }
        }

        return $this->json([
            'posts' => $posts
        ]);
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
            'user' => $userPost ? [
                'id' => $userPost->getId(),
                'email' => $userPost->getEmail(),
                'name' => $userPost->getName(),
                'mention' => $userPost->getMention(),
                'avatar' => $userPost->getAvatar()
            ] : null
        ];

        return $this->json($postData);
    }

    #[Route('/posts/{id}', name: 'posts.delete', methods: ['DELETE'])]
    #[IsGranted('ROLE_USER')]
    public function delete(
        int $id,
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
            return $this->json(['message' => 'Vous n\'êtes pas autorisé à supprimer ce post'], Response::HTTP_FORBIDDEN);
        }

        // Supprimer d'abord toutes les interactions associées au post
        $interactions = $interactionRepository->findBy(['post' => $post]);
        foreach ($interactions as $interaction) {
            $entityManager->remove($interaction);
        }

        // Supprimer le post
        $entityManager->remove($post);
        $entityManager->flush();

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

        // Mise à jour du contenu si présent
        if (isset($data['content'])) {
            $post->setContent($data['content']);
        }

        // Mise à jour des médias si présents
        if (isset($data['mediaUrls']) && is_array($data['mediaUrls']) && count($data['mediaUrls']) <= 10) {
            $post->setMediaUrl(implode(',', $data['mediaUrls']));
        }

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
    #[IsGranted('ROLE_ADMIN')]
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
}
