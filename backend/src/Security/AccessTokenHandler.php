<?php

// src/Security/AccessTokenHandler.php
namespace App\Security;

use App\Repository\UserRepository;
use Symfony\Component\Security\Core\Exception\BadCredentialsException;
use Symfony\Component\Security\Http\AccessToken\AccessTokenHandlerInterface;
use Symfony\Component\Security\Http\Authenticator\Passport\Badge\UserBadge;
use App\Entity\User;
use Doctrine\ORM\EntityManagerInterface;
use Psr\Log\LoggerInterface;

class AccessTokenHandler implements AccessTokenHandlerInterface
{
    public function __construct(
        private UserRepository $repository,
        private EntityManagerInterface $entityManager,
        private LoggerInterface $logger
    ) {}

    public function getUserBadgeFrom(string $accessToken): UserBadge
    {
        // Log le token reçu
        $this->logger->info('Token reçu: ' . $accessToken);

        // Supprimer le préfixe "Bearer " si présent
        if (str_starts_with($accessToken, 'Bearer ')) {
            $accessToken = substr($accessToken, 7);
            $this->logger->info('Token après suppression du préfixe: ' . $accessToken);
        }

        // Rechercher le token dans la base de données
        $user = $this->repository->findOneBy(['api_token' => $accessToken]);

        if (null === $user) {
            $this->logger->error('Token non trouvé dans la base de données');
            throw new BadCredentialsException('Invalid credentials.');
        }

        if (!$user->isValid()) {
            $this->logger->error('Token expiré');
            throw new BadCredentialsException('Token expired.');
        }

        $this->logger->info('User ID trouvé: ' . $user->getId());

        return new UserBadge($user->getId());
    }

    public function createToken(User $user): string
    {
        $token = bin2hex(random_bytes(32));
        $this->logger->info('Nouveau token créé: ' . $token);

        $user->setApiToken($token);
        $this->entityManager->flush();

        return $token;
    }
}
