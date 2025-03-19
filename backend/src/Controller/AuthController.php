<?php

namespace App\Controller;

use App\Entity\User;
use Doctrine\ORM\EntityManagerInterface;
use Lexik\Bundle\JWTAuthenticationBundle\Services\JWTTokenManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\PasswordHasher\Hasher\UserPasswordHasherInterface;
use Symfony\Component\Routing\Annotation\Route;
use Symfony\Component\Validator\Validator\ValidatorInterface;

class AuthController extends AbstractController
{
    #[Route('/login', name: 'login', methods: ['POST'])]
    public function login(Request $request, JWTTokenManagerInterface $JWTManager): JsonResponse
    {
        $data = json_decode($request->getContent(), true);

        if (!$data || !isset($data['email']) || !isset($data['password'])) {
            return $this->json([
                'message' => 'Email et mot de passe requis'
            ], JsonResponse::HTTP_BAD_REQUEST);
        }

        return $this->json([
            'token' => $JWTManager->create($this->getUser()),
            'user' => [
                'id' => $this->getUser()->getId(),
                'email' => $this->getUser()->getEmail(),
                'name' => $this->getUser()->getName(),
                'mention' => $this->getUser()->getMention()
            ]
        ]);
    }

    #[Route('/register', name: 'register', methods: ['POST'])]
    public function register(
        Request $request,
        EntityManagerInterface $entityManager,
        UserPasswordHasherInterface $passwordHasher,
        ValidatorInterface $validator
    ): JsonResponse {
        try {
            $data = json_decode($request->getContent(), true);

            if (!$data || !isset($data['email']) || !isset($data['password']) || !isset($data['name']) || !isset($data['mention'])) {
                return $this->json([
                    'message' => 'Tous les champs sont requis'
                ], JsonResponse::HTTP_BAD_REQUEST);
            }

            // Vérifier si l'email existe déjà
            $existingUser = $entityManager->getRepository(User::class)->findOneBy(['email' => $data['email']]);
            if ($existingUser) {
                return $this->json([
                    'message' => 'Un utilisateur avec cet email existe déjà'
                ], JsonResponse::HTTP_CONFLICT);
            }

            $user = new User();
            $user->setEmail($data['email']);
            $user->setName($data['name']);
            $user->setMention($data['mention']);
            $user->setPassword(
                $passwordHasher->hashPassword($user, $data['password'])
            );

            $errors = $validator->validate($user);
            if (count($errors) > 0) {
                $errorMessages = [];
                foreach ($errors as $error) {
                    $errorMessages[] = $error->getMessage();
                }
                return $this->json([
                    'message' => 'Erreur de validation',
                    'errors' => $errorMessages
                ], JsonResponse::HTTP_BAD_REQUEST);
            }

            $entityManager->persist($user);
            $entityManager->flush();

            return $this->json([
                'message' => 'Utilisateur créé avec succès',
                'user' => [
                    'id' => $user->getId(),
                    'email' => $user->getEmail(),
                    'name' => $user->getName(),
                    'mention' => $user->getMention()
                ]
            ], JsonResponse::HTTP_CREATED);
        } catch (\Exception $e) {
            return $this->json([
                'message' => 'Une erreur est survenue lors de l\'inscription',
                'error' => $e->getMessage()
            ], JsonResponse::HTTP_INTERNAL_SERVER_ERROR);
        }
    }
}
