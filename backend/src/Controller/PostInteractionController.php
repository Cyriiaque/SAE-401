<?php

namespace App\Controller;

use App\Repository\PostRepository;
use App\Repository\PostInteractionRepository;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Annotation\Route;
use Symfony\Component\Security\Http\Attribute\IsGranted;
use Symfony\Component\Security\Http\Attribute\CurrentUser;
use App\Entity\PostInteraction;

class PostInteractionController extends AbstractController
{
    #[Route('/posts/{id}/like', name: 'posts.like', methods: ['POST'])]
    #[IsGranted('ROLE_USER')]
    public function create(
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

    #[Route('/posts/{id}/reply', name: 'posts.reply', methods: ['POST'])]
    #[IsGranted('ROLE_USER')]
    public function reply(
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

        $data = json_decode($request->getContent(), true);

        // Validation des données
        if (!isset($data['reply']) || empty(trim($data['reply']))) {
            return $this->json(['message' => 'Le contenu de la réponse est requis'], Response::HTTP_BAD_REQUEST);
        }

        // Limiter la longueur de la réponse
        if (strlen($data['reply']) > 280) {
            return $this->json(['message' => 'La réponse ne doit pas dépasser 280 caractères'], Response::HTTP_BAD_REQUEST);
        }

        // Vérifier si l'utilisateur a déjà une interaction avec ce post
        $interaction = $interactionRepository->findOneBy([
            'user' => $user,
            'post' => $post
        ]);

        // Vérifier si l'utilisateur a déjà répondu
        if ($interaction && $interaction->getReply() !== null && $interaction->getRepliedAt() !== null) {
            return $this->json(
                ['message' => 'Vous avez déjà répondu à ce post'],
                Response::HTTP_BAD_REQUEST
            );
        }

        if (!$interaction) {
            // Créer une nouvelle interaction
            $interaction = new PostInteraction();
            $interaction->setUser($user);
            $interaction->setPost($post);
            $interaction->setLiked(false); // Par défaut, pas de like
            $entityManager->persist($interaction);
        }

        // Ajouter la réponse
        $interaction->setReply($data['reply']);
        $interaction->setRepliedAt(new \DateTime());

        $entityManager->flush();

        return $this->json([
            'id' => $interaction->getId(),
            'reply' => $interaction->getReply(),
            'replied_at' => $interaction->getRepliedAt()->format('Y-m-d H:i:s'),
            'user' => [
                'id' => $user->getId(),
                'name' => $user->getName(),
                'mention' => $user->getMention(),
                'avatar' => $user->getAvatar()
            ],
            'isLiked' => $interaction->isLiked()
        ]);
    }

    #[Route('/posts/{id}/replies', name: 'posts.replies', methods: ['GET'])]
    public function getReplies(
        int $id,
        PostRepository $postRepository,
        PostInteractionRepository $interactionRepository,
        #[CurrentUser] $user = null
    ): JsonResponse {
        $post = $postRepository->find($id);

        if (!$post) {
            return $this->json(['message' => 'Post non trouvé'], Response::HTTP_NOT_FOUND);
        }

        // Récupérer toutes les interactions qui ont une réponse non vide
        $interactions = $interactionRepository->findBy([
            'post' => $post
        ]);

        $replies = [];
        foreach ($interactions as $interaction) {
            if ($interaction->getReply() && $interaction->getRepliedAt()) {
                $interactionUser = $interaction->getUser();

                $replies[] = [
                    'id' => $interaction->getId(),
                    'reply' => $interaction->getReply(),
                    'replied_at' => $interaction->getRepliedAt()->format('Y-m-d H:i:s'),
                    'user' => [
                        'id' => $interactionUser->getId(),
                        'name' => $interactionUser->getName(),
                        'mention' => $interactionUser->getMention(),
                        'avatar' => $interactionUser->getAvatar(),
                        'isbanned' => $interactionUser->isbanned()
                    ],
                    'isLiked' => $interaction->isLiked()
                ];
            }
        }

        // Trier les réponses par date (la plus récente en premier)
        usort($replies, function ($a, $b) {
            return strtotime($b['replied_at']) - strtotime($a['replied_at']);
        });

        return $this->json([
            'replies' => $replies
        ]);
    }
}
