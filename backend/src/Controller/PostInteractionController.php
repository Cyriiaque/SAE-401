<?php

namespace App\Controller;

use App\Repository\PostRepository;
use App\Repository\PostInteractionRepository;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Annotation\Route;
use Symfony\Component\Security\Http\Attribute\IsGranted;
use Symfony\Component\Security\Http\Attribute\CurrentUser;
use App\Entity\PostInteraction;

class PostInteractionController extends AbstractController
{
    #[Route('/posts/{id}/like', name: 'posts.like', methods: ['POST'])]
    #[IsGranted('ROLE_USER')]
    public function toggleLike(
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

        // Vérifier si l'utilisateur a déjà une interaction avec ce post
        $interaction = $interactionRepository->findOneBy([
            'user' => $user,
            'post' => $post
        ]);

        if ($interaction) {
            // Si l'utilisateur a déjà une interaction, on la met à jour
            $interaction->setLiked(!$interaction->isLiked());
        } else {
            // Créer une nouvelle interaction
            $interaction = new PostInteraction();
            $interaction->setUser($user);
            $interaction->setPost($post);
            $interaction->setLiked(true);
            $entityManager->persist($interaction);
        }

        $entityManager->flush();

        // Compter le nombre total de likes pour ce post
        $totalLikes = $interactionRepository->count(['post' => $post, 'liked' => true]);

        return $this->json([
            'likes' => $totalLikes,
            'isLiked' => $interaction->isLiked()
        ]);
    }

    #[Route('/posts/{id}/like-status', name: 'posts.like_status', methods: ['GET'])]
    #[IsGranted('ROLE_USER')]
    public function getLikeStatus(
        int $id,
        PostRepository $postRepository,
        PostInteractionRepository $interactionRepository,
        #[CurrentUser] $user
    ): JsonResponse {
        $post = $postRepository->find($id);

        if (!$post) {
            return $this->json(['message' => 'Post non trouvé'], Response::HTTP_NOT_FOUND);
        }

        $interaction = $interactionRepository->findOneBy([
            'user' => $user,
            'post' => $post
        ]);

        $totalLikes = $interactionRepository->count(['post' => $post, 'liked' => true]);

        return $this->json([
            'likes' => $totalLikes,
            'isLiked' => $interaction ? $interaction->isLiked() : false
        ]);
    }
}
