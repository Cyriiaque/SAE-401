<?php

namespace App\Controller;

use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Annotation\Route;
use Symfony\Component\Security\Http\Attribute\IsGranted;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\Security\Http\Attribute\CurrentUser;
use App\Entity\User;
use App\Repository\UserRepository;

class SettingsController extends AbstractController
{
    #[Route('/user/settings/post-reload', name: 'user_settings_post_reload', methods: ['PUT'])]
    #[IsGranted('ROLE_USER')]
    public function updatePostReload(
        Request $request,
        EntityManagerInterface $entityManager,
        #[CurrentUser] $user
    ): JsonResponse {
        $data = json_decode($request->getContent(), true);

        if (
            !isset($data['postReload']) ||
            !is_int($data['postReload']) ||
            $data['postReload'] < 0 ||
            $data['postReload'] > 9
        ) {
            return $this->json(['message' => 'Valeur invalide'], JsonResponse::HTTP_BAD_REQUEST);
        }

        $user->setPostReload($data['postReload']);
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
            'postReload' => $user->getPostReload()
        ]);
    }
}
