<?php

namespace App\Controller;

use App\Entity\Notifications;
use App\Entity\User;
use App\Repository\NotificationsRepository;
use App\Repository\UserRepository;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Annotation\Route;
use Symfony\Component\Serializer\SerializerInterface;

class NotificationsController extends AbstractController
{
    private $notificationsRepository;
    private $userRepository;
    private $entityManager;
    private $serializer;

    public function __construct(
        NotificationsRepository $notificationsRepository,
        UserRepository $userRepository,
        EntityManagerInterface $entityManager,
        SerializerInterface $serializer
    ) {
        $this->notificationsRepository = $notificationsRepository;
        $this->userRepository = $userRepository;
        $this->entityManager = $entityManager;
        $this->serializer = $serializer;
    }

    /**
     * Récupérer toutes les notifications de l'utilisateur connecté
     */
    #[Route('/notifications', name: 'get_notifications', methods: ['GET'])]
    public function getNotifications(): JsonResponse
    {
        /** @var User $user */
        $user = $this->getUser();
        if (!$user) {
            return $this->json(['message' => 'Utilisateur non authentifié'], Response::HTTP_UNAUTHORIZED);
        }

        $notifications = $this->notificationsRepository->findByTargetUser($user->getId());

        $formattedNotifications = [];
        foreach ($notifications as $notification) {
            $sourceUser = $notification->getSource();
            $formattedNotifications[] = [
                'id' => $notification->getId(),
                'content' => $notification->getContent(),
                'created_at' => $notification->getCreatedAt()->format('Y-m-d H:i:s'),
                'is_read' => $notification->isRead(),
                'is_validated' => $notification->isValidated(),
                'source' => [
                    'id' => $sourceUser->getId(),
                    'name' => $sourceUser->getName(),
                    'mention' => $sourceUser->getMention(),
                    'avatar' => $sourceUser->getAvatar(),
                ]
            ];
        }

        return $this->json(['notifications' => $formattedNotifications]);
    }

    /**
     * Récupérer le nombre de notifications non lues
     */
    #[Route('/notifications/unread-count', name: 'get_unread_notifications_count', methods: ['GET'])]
    public function getUnreadNotificationsCount(): JsonResponse
    {
        /** @var User $user */
        $user = $this->getUser();
        if (!$user) {
            return $this->json(['message' => 'Utilisateur non authentifié'], Response::HTTP_UNAUTHORIZED);
        }

        $unreadNotifications = $this->notificationsRepository->findUnreadByTargetUser($user->getId());
        $count = count($unreadNotifications);

        return $this->json(['count' => $count]);
    }

    /**
     * Marquer toutes les notifications de l'utilisateur comme lues
     */
    #[Route('/notifications/mark-all-read', name: 'mark_all_notifications_as_read', methods: ['POST'])]
    public function markAllAsRead(): JsonResponse
    {
        /** @var User $user */
        $user = $this->getUser();
        if (!$user) {
            return $this->json(['message' => 'Utilisateur non authentifié'], Response::HTTP_UNAUTHORIZED);
        }

        $this->notificationsRepository->markAllAsReadForUser($user->getId());

        return $this->json(['message' => 'Toutes les notifications ont été marquées comme lues']);
    }

    /**
     * Marquer une notification comme lue
     */
    #[Route('/notifications/{id}/mark-read', name: 'mark_notification_as_read', methods: ['POST'])]
    public function markAsRead(int $id): JsonResponse
    {
        /** @var User $user */
        $user = $this->getUser();
        if (!$user) {
            return $this->json(['message' => 'Utilisateur non authentifié'], Response::HTTP_UNAUTHORIZED);
        }

        $notification = $this->notificationsRepository->find($id);
        if (!$notification) {
            return $this->json(['message' => 'Notification non trouvée'], Response::HTTP_NOT_FOUND);
        }

        if ($notification->getTarget()->getId() !== $user->getId()) {
            return $this->json(['message' => 'Vous n\'êtes pas autorisé à accéder à cette notification'], Response::HTTP_FORBIDDEN);
        }

        $notification->setIsRead(true);
        $this->entityManager->flush();

        return $this->json(['message' => 'Notification marquée comme lue']);
    }

    /**
     * Rechercher des notifications
     */
    #[Route('/notifications/search', name: 'search_notifications', methods: ['GET'])]
    public function searchNotifications(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $this->getUser();
        if (!$user) {
            return $this->json(['message' => 'Utilisateur non authentifié'], Response::HTTP_UNAUTHORIZED);
        }

        $query = $request->query->get('query', '');

        // Récupérer toutes les notifications de l'utilisateur
        $notifications = $this->notificationsRepository->findByTargetUser($user->getId());

        // Filtrer par le contenu contenant la requête
        $filteredNotifications = [];
        foreach ($notifications as $notification) {
            if (
                stripos($notification->getContent(), $query) !== false ||
                stripos($notification->getSource()->getName(), $query) !== false ||
                stripos($notification->getSource()->getMention(), $query) !== false
            ) {

                $sourceUser = $notification->getSource();
                $filteredNotifications[] = [
                    'id' => $notification->getId(),
                    'content' => $notification->getContent(),
                    'created_at' => $notification->getCreatedAt()->format('Y-m-d H:i:s'),
                    'is_read' => $notification->isRead(),
                    'is_validated' => $notification->isValidated(),
                    'source' => [
                        'id' => $sourceUser->getId(),
                        'name' => $sourceUser->getName(),
                        'mention' => $sourceUser->getMention(),
                        'avatar' => $sourceUser->getAvatar(),
                    ]
                ];
            }
        }

        return $this->json(['notifications' => $filteredNotifications]);
    }
}
