<?php

namespace App\Controller;

use App\Entity\User;
use App\Entity\UserInteraction;
use App\Repository\UserRepository;
use App\Repository\UserInteractionRepository;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\Routing\Annotation\Route;
use Symfony\Component\Security\Http\Attribute\IsGranted;
use Symfony\Component\Security\Http\Attribute\CurrentUser;

class UserInteractionController extends AbstractController
{
    #[Route('/users/{id}/follow-status', name: 'app_user_follow_status', methods: ['GET'])]
    #[IsGranted('ROLE_USER')]
    public function checkFollowStatus(
        int $id,
        UserRepository $userRepository,
        UserInteractionRepository $interactionRepository,
        #[CurrentUser] User $currentUser
    ): JsonResponse {
        // Vérifier si l'utilisateur existe
        $targetUser = $userRepository->find($id);
        if (!$targetUser) {
            return $this->json(['message' => 'Utilisateur non trouvé'], 404);
        }

        // Vérifier si l'utilisateur ne tente pas de se suivre lui-même
        if ($currentUser->getId() === $targetUser->getId()) {
            return $this->json(['isFollowing' => false]);
        }

        // Rechercher l'interaction de suivi existante
        $interaction = $interactionRepository->findOneBy([
            'source' => $currentUser,
            'target' => $targetUser
        ]);

        return $this->json([
            'isFollowing' => $interaction ? $interaction->isFollow() : false
        ]);
    }

    #[Route('/users/{id}/toggle-follow', name: 'app_user_toggle_follow', methods: ['POST'])]
    #[IsGranted('ROLE_USER')]
    public function toggleFollow(
        int $id,
        UserRepository $userRepository,
        UserInteractionRepository $interactionRepository,
        EntityManagerInterface $entityManager,
        #[CurrentUser] User $currentUser
    ): JsonResponse {
        // Vérifier si l'utilisateur existe
        $targetUser = $userRepository->find($id);
        if (!$targetUser) {
            return $this->json(['message' => 'Utilisateur non trouvé'], 404);
        }

        // Vérifier si l'utilisateur ne tente pas de se suivre lui-même
        if ($currentUser->getId() === $targetUser->getId()) {
            return $this->json(['message' => 'Impossible de se suivre soi-même'], 400);
        }

        // Rechercher l'interaction de suivi existante
        $interaction = $interactionRepository->findOneBy([
            'source' => $currentUser,
            'target' => $targetUser
        ]);

        // Si aucune interaction n'existe, en créer une nouvelle
        if (!$interaction) {
            $interaction = new UserInteraction();
            $interaction->setSource($currentUser);
            $interaction->setTarget($targetUser);
            $interaction->setFollow(true);
            $entityManager->persist($interaction);
        } else {
            // Inverser le statut de suivi
            $interaction->setFollow(!$interaction->isFollow());
        }

        $entityManager->flush();

        return $this->json([
            'isFollowing' => $interaction->isFollow()
        ]);
    }
}
