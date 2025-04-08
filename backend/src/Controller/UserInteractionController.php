<?php

namespace App\Controller;

use App\Entity\Notifications;
use App\Entity\User;
use App\Entity\UserInteraction;
use App\Repository\UserRepository;
use App\Repository\UserInteractionRepository;
use App\Repository\NotificationsRepository;
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

        // Vérifier si la cible a bloqué l'utilisateur courant
        $isBlocked = false;
        $reverseInteraction = $interactionRepository->findOneBy([
            'source' => $targetUser,
            'target' => $currentUser
        ]);

        if ($reverseInteraction && $reverseInteraction->isBlocked()) {
            $isBlocked = true;
        }

        return $this->json([
            'isFollowing' => $interaction ? $interaction->isFollow() : false,
            'isBlockedByTarget' => $isBlocked,
            'isPending' => $interaction ? $interaction->isPending() : false,
            'isPrivate' => $targetUser->isPrivate()
        ]);
    }

    #[Route('/users/{id}/toggle-follow', name: 'app_user_toggle_follow', methods: ['POST'])]
    #[IsGranted('ROLE_USER')]
    public function toggleFollow(
        int $id,
        UserRepository $userRepository,
        UserInteractionRepository $interactionRepository,
        NotificationsRepository $notificationsRepository,
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

        // Vérifier si la cible a bloqué l'utilisateur courant
        $reverseInteraction = $interactionRepository->findOneBy([
            'source' => $targetUser,
            'target' => $currentUser
        ]);

        if ($reverseInteraction && $reverseInteraction->isBlocked()) {
            return $this->json(['message' => 'Cet utilisateur vous a bloqué, vous ne pouvez pas le suivre'], 403);
        }

        // Rechercher l'interaction de suivi existante
        $interaction = $interactionRepository->findOneBy([
            'source' => $currentUser,
            'target' => $targetUser
        ]);

        $wasFollowing = $interaction ? $interaction->isFollow() : false;
        $wasPending = $interaction ? $interaction->isPending() : false;

        // Si aucune interaction n'existe, en créer une nouvelle
        if (!$interaction) {
            $interaction = new UserInteraction();
            $interaction->setSource($currentUser);
            $interaction->setTarget($targetUser);
            $interaction->setIsBlocked(false);

            // Si le compte est privé, mettre en attente
            if ($targetUser->isPrivate()) {
                $interaction->setPending(true);
                $interaction->setFollow(false);

                // Créer une notification pour l'utilisateur cible
                $notification = new Notifications();
                $notification->setSource($currentUser);
                $notification->setTarget($targetUser);
                $notification->setContent($currentUser->getName() . " souhaite suivre votre compte privé");
                $notification->setCreatedAt(new \DateTime('now', new \DateTimeZone('Europe/Paris')));
                $notification->setIsRead(false);
                $notificationsRepository->save($notification, false);
            } else {
                $interaction->setFollow(true);
                $interaction->setPending(false);

                // Créer une notification si l'utilisateur commence à suivre la cible
                $notification = new Notifications();
                $notification->setSource($currentUser);
                $notification->setTarget($targetUser);
                $notification->setContent($currentUser->getName() . " a commencé à vous suivre");
                $notification->setCreatedAt(new \DateTime('now', new \DateTimeZone('Europe/Paris')));
                $notification->setIsRead(false);
                $notificationsRepository->save($notification, false);
            }

            $entityManager->persist($interaction);
        } else {
            // Si l'utilisateur est déjà en attente, annuler la demande
            if ($interaction->isPending()) {
                $interaction->setPending(false);
                $interaction->setFollow(false);
            }
            // Si l'utilisateur est déjà abonné, se désabonner
            else if ($interaction->isFollow()) {
                $interaction->setFollow(false);
            }
            // Sinon, mettre en attente si le compte est privé
            else {
                if ($targetUser->isPrivate()) {
                    $interaction->setPending(true);

                    // Créer une notification pour l'utilisateur cible
                    $notification = new Notifications();
                    $notification->setSource($currentUser);
                    $notification->setTarget($targetUser);
                    $notification->setContent($currentUser->getName() . " souhaite suivre votre compte privé");
                    $notification->setCreatedAt(new \DateTime('now', new \DateTimeZone('Europe/Paris')));
                    $notification->setIsRead(false);
                    $notificationsRepository->save($notification, false);
                } else {
                    $interaction->setFollow(true);

                    // Créer une notification si l'utilisateur commence à suivre la cible
                    $notification = new Notifications();
                    $notification->setSource($currentUser);
                    $notification->setTarget($targetUser);
                    $notification->setContent($currentUser->getName() . " a commencé à vous suivre");
                    $notification->setCreatedAt(new \DateTime('now', new \DateTimeZone('Europe/Paris')));
                    $notification->setIsRead(false);
                    $notificationsRepository->save($notification, false);
                }
            }
        }

        $entityManager->flush();

        return $this->json([
            'isFollowing' => $interaction->isFollow(),
            'isPending' => $interaction->isPending()
        ]);
    }

    #[Route('/users/{id}/block-status', name: 'app_user_block_status', methods: ['GET'])]
    #[IsGranted('ROLE_USER')]
    public function checkBlockStatus(
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

        // Vérifier si l'utilisateur ne tente pas de vérifier le blocage de lui-même
        if ($currentUser->getId() === $targetUser->getId()) {
            return $this->json(['isBlocked' => false]);
        }

        // Rechercher l'interaction existante
        $interaction = $interactionRepository->findOneBy([
            'source' => $currentUser,
            'target' => $targetUser
        ]);

        // Vérifier si l'utilisateur cible a bloqué l'utilisateur courant
        $reverseInteraction = $interactionRepository->findOneBy([
            'source' => $targetUser,
            'target' => $currentUser
        ]);

        return $this->json([
            'isBlocked' => $interaction ? $interaction->isBlocked() : false,
            'isBlockedByTarget' => $reverseInteraction ? $reverseInteraction->isBlocked() : false
        ]);
    }

    #[Route('/users/{id}/toggle-block', name: 'app_user_toggle_block', methods: ['POST'])]
    #[IsGranted('ROLE_USER')]
    public function toggleBlock(
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

        // Vérifier si l'utilisateur ne tente pas de se bloquer lui-même
        if ($currentUser->getId() === $targetUser->getId()) {
            return $this->json(['message' => 'Impossible de se bloquer soi-même'], 400);
        }

        // Rechercher l'interaction existante
        $interaction = $interactionRepository->findOneBy([
            'source' => $currentUser,
            'target' => $targetUser
        ]);

        // Si aucune interaction n'existe, en créer une nouvelle
        if (!$interaction) {
            $interaction = new UserInteraction();
            $interaction->setSource($currentUser);
            $interaction->setTarget($targetUser);
            $interaction->setFollow(false);
            $interaction->setIsBlocked(true);
            $entityManager->persist($interaction);
        } else {
            // Inverser le statut de blocage
            $interaction->setIsBlocked(!$interaction->isBlocked());

            // Si on bloque l'utilisateur, on ne peut plus le suivre
            if ($interaction->isBlocked()) {
                $interaction->setFollow(false);
            }
        }

        // Si l'utilisateur cible suit l'utilisateur courant et qu'on le bloque, on doit le désabonner
        if ($interaction->isBlocked()) {
            $reverseInteraction = $interactionRepository->findOneBy([
                'source' => $targetUser,
                'target' => $currentUser
            ]);

            if ($reverseInteraction && $reverseInteraction->isFollow()) {
                $reverseInteraction->setFollow(false);
            }
        }

        $entityManager->flush();

        return $this->json([
            'isBlocked' => $interaction->isBlocked()
        ]);
    }

    #[Route('/users/blocked', name: 'app_user_blocked_list', methods: ['GET'])]
    #[IsGranted('ROLE_USER')]
    public function getBlockedUsers(
        UserInteractionRepository $interactionRepository,
        #[CurrentUser] User $currentUser
    ): JsonResponse {
        // Récupérer toutes les interactions où l'utilisateur courant est la source et a bloqué la cible
        $blockedInteractions = $interactionRepository->findBy([
            'source' => $currentUser,
            'isBlocked' => true
        ]);

        // Transformer les interactions en données d'utilisateurs
        $blockedUsers = [];
        foreach ($blockedInteractions as $interaction) {
            $target = $interaction->getTarget();
            $blockedUsers[] = [
                'id' => $target->getId(),
                'name' => $target->getName(),
                'mention' => $target->getMention(),
                'avatar' => $target->getAvatar(),
                'email' => $target->getEmail()
            ];
        }

        return $this->json([
            'blockedUsers' => $blockedUsers
        ]);
    }

    #[Route('/users/{id}/follow-requests', name: 'app_user_follow_requests', methods: ['GET'])]
    #[IsGranted('ROLE_USER')]
    public function getFollowRequests(
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

        // Vérifier si l'utilisateur est le propriétaire du compte
        if ($currentUser->getId() !== $targetUser->getId()) {
            return $this->json(['message' => 'Vous n\'êtes pas autorisé à voir ces demandes'], 403);
        }

        // Récupérer toutes les demandes d'abonnement en attente
        $pendingInteractions = $interactionRepository->findBy([
            'target' => $targetUser,
            'pending' => true
        ]);

        $followRequests = [];
        foreach ($pendingInteractions as $interaction) {
            $sourceUser = $interaction->getSource();
            $followRequests[] = [
                'id' => $interaction->getId(),
                'user' => [
                    'id' => $sourceUser->getId(),
                    'name' => $sourceUser->getName(),
                    'mention' => $sourceUser->getMention(),
                    'avatar' => $sourceUser->getAvatar()
                ],
                'created_at' => $interaction->getCreatedAt()->format('Y-m-d H:i:s')
            ];
        }

        return $this->json([
            'followRequests' => $followRequests
        ]);
    }

    #[Route('/users/follow-requests/{requestId}/respond', name: 'app_user_follow_request_respond', methods: ['POST'])]
    #[IsGranted('ROLE_USER')]
    public function respondToFollowRequest(
        int $requestId,
        UserInteractionRepository $interactionRepository,
        NotificationsRepository $notificationsRepository,
        EntityManagerInterface $entityManager,
        #[CurrentUser] User $currentUser
    ): JsonResponse {
        // Récupérer la notification
        $notification = $notificationsRepository->find($requestId);
        if (!$notification) {
            return $this->json(['message' => 'Notification non trouvée'], 404);
        }

        // Vérifier si l'utilisateur est le destinataire de la notification
        if ($notification->getTarget()->getId() !== $currentUser->getId()) {
            return $this->json(['message' => 'Vous n\'êtes pas autorisé à répondre à cette demande'], 403);
        }

        // Récupérer l'interaction associée à cette notification
        $interaction = $interactionRepository->findOneBy([
            'source' => $notification->getSource(),
            'target' => $notification->getTarget(),
            'pending' => true
        ]);

        if (!$interaction) {
            return $this->json(['message' => 'Demande d\'abonnement non trouvée'], 404);
        }

        // Vérifier si la demande est en attente
        if (!$interaction->isPending()) {
            return $this->json(['message' => 'Cette demande n\'est plus en attente'], 400);
        }

        // Récupérer les données de la requête
        $data = json_decode(file_get_contents('php://input'), true);
        $accepted = $data['accepted'] ?? false;

        // Mettre à jour le statut de la demande
        $interaction->setPending(false);
        $interaction->setFollow($accepted);

        // Créer une notification pour l'utilisateur qui a fait la demande
        $newNotification = new Notifications();
        $newNotification->setSource($currentUser);
        $newNotification->setTarget($interaction->getSource());
        $newNotification->setContent(
            $accepted
                ? $currentUser->getName() . " a accepté votre demande d'abonnement"
                : $currentUser->getName() . " a refusé votre demande d'abonnement"
        );
        $newNotification->setCreatedAt(new \DateTime('now', new \DateTimeZone('Europe/Paris')));
        $newNotification->setIsRead(false);
        $newNotification->setIsValidated(null);
        $notificationsRepository->save($newNotification, false);

        // Marquer la notification originale comme lue
        $notification->setIsRead(true);
        $notification->setIsValidated($accepted);
        $notificationsRepository->save($notification, false);

        $entityManager->flush();

        return $this->json([
            'accepted' => $accepted,
            'message' => $accepted ? 'Demande d\'abonnement acceptée' : 'Demande d\'abonnement refusée'
        ]);
    }
}
