<?php

namespace App\Controller;

use App\Repository\UserRepository;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Annotation\Route;
use Symfony\Component\Security\Http\Attribute\IsGranted;
use Doctrine\ORM\EntityManagerInterface;

class UserController extends AbstractController
{
    #[Route('/users', name: 'app_users_list', methods: ['GET'])]
    #[IsGranted('ROLE_ADMIN')]
    public function index(UserRepository $userRepository): JsonResponse
    {
        $users = $userRepository->findAll();

        $usersArray = array_map(function ($user) {
            return [
                'id' => $user->getId(),
                'email' => $user->getEmail(),
                'name' => $user->getName(),
                'mention' => $user->getMention(),
                'avatar' => $user->getAvatar(),
                'banner' => $user->getBanner(),
                'biography' => $user->getBiography(),
                'roles' => $user->getRoles(),
                'isbanned' => $user->isbanned()
            ];
        }, $users);

        return $this->json($usersArray);
    }

    #[Route('/users/{id}', name: 'app_user_update', methods: ['PUT'])]
    #[IsGranted('ROLE_USER')]
    public function update(
        int $id,
        Request $request,
        UserRepository $userRepository,
        EntityManagerInterface $entityManager
    ): JsonResponse {
        $user = $userRepository->find($id);

        if (!$user) {
            return $this->json(['message' => 'Utilisateur non trouvé'], 404);
        }

        $data = json_decode($request->getContent(), true);

        // Valider la longueur du nom et de la mention
        if (isset($data['name']) && strlen($data['name']) > 20) {
            return $this->json([
                'message' => 'Le nom ne doit pas dépasser 20 caractères'
            ], JsonResponse::HTTP_BAD_REQUEST);
        }

        if (isset($data['mention']) && strlen($data['mention']) > 20) {
            return $this->json([
                'message' => 'La mention ne doit pas dépasser 20 caractères'
            ], JsonResponse::HTTP_BAD_REQUEST);
        }

        if (isset($data['name'])) {
            $user->setName($data['name']);
        }
        if (isset($data['mention'])) {
            $user->setMention($data['mention']);
        }
        if (isset($data['avatar'])) {
            $user->setAvatar($data['avatar']);
        }

        if (isset($data['banner'])) {
            $user->setBanner($data['banner']);
        }
        if (isset($data['biography'])) {
            $user->setBiography($data['biography']);
        }
        if (isset($data['roles'])) {
            $user->setRoles($data['roles']);
        }
        if (isset($data['isbanned'])) {
            $user->setIsbanned($data['isbanned']);
        }
        if (isset($data['postReload'])) {
            $user->setPostReload($data['postReload']);
        }
        if (isset($data['isVerified'])) {
            $user->setIsVerified($data['isVerified']);
        }
        if (isset($data['email'])) {
            $user->setEmail($data['email']);
        }

        $entityManager->flush();

        return $this->json([
            'id' => $user->getId(),
            'email' => $user->getEmail(),
            'name' => $user->getName(),
            'mention' => $user->getMention(),
            'avatar' => $user->getAvatar(),
            'banner' => $user->getBanner(),
            'biography' => $user->getBiography(),
            'roles' => $user->getRoles(),
            'isbanned' => $user->isbanned(),
            'postReload' => $user->getPostReload(),
            'isVerified' => $user->isVerified()
        ]);
    }

    #[Route('/users/{id}/ban', name: 'app_user_ban', methods: ['PUT'])]
    #[IsGranted('ROLE_ADMIN')]
    public function toggleBan(
        int $id,
        UserRepository $userRepository,
        EntityManagerInterface $entityManager
    ): JsonResponse {
        $user = $userRepository->find($id);

        if (!$user) {
            return $this->json(['message' => 'Utilisateur non trouvé'], 404);
        }

        // Vérifier si l'utilisateur est un admin
        if (in_array('ROLE_ADMIN', $user->getRoles())) {
            return $this->json(['message' => 'Impossible de bannir un administrateur'], 403);
        }

        // Inverser le statut de bannissement
        $user->setIsbanned(!$user->isbanned());
        $entityManager->flush();

        return $this->json([
            'id' => $user->getId(),
            'email' => $user->getEmail(),
            'name' => $user->getName(),
            'mention' => $user->getMention(),
            'isBanned' => $user->isbanned()
        ]);
    }

    #[Route('/users/{id}/profile', name: 'app_user_profile', methods: ['GET'])]
    #[IsGranted('ROLE_USER')]
    public function getUserProfile(
        int $id,
        UserRepository $userRepository
    ): JsonResponse {
        $user = $userRepository->find($id);

        if (!$user) {
            return $this->json(['message' => 'Utilisateur non trouvé'], 404);
        }

        return $this->json([
            'id' => $user->getId(),
            'email' => $user->getEmail(),
            'name' => $user->getName(),
            'mention' => $user->getMention(),
            'avatar' => $user->getAvatar(),
            'banner' => $user->getBanner(),
            'biography' => $user->getBiography(),
            'roles' => $user->getRoles(),
            'isbanned' => $user->isbanned()
        ]);
    }
}
