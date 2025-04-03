<?php

namespace App\Repository;

use App\Entity\User;
use App\Entity\UserInteraction;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;
use Symfony\Component\Security\Core\Exception\UnsupportedUserException;
use Symfony\Component\Security\Core\User\PasswordAuthenticatedUserInterface;
use Symfony\Component\Security\Core\User\PasswordUpgraderInterface;

/**
 * @extends ServiceEntityRepository<User>
 */
class UserRepository extends ServiceEntityRepository implements PasswordUpgraderInterface
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, User::class);
    }

    /**
     * Used to upgrade (rehash) the user's password automatically over time.
     */
    public function upgradePassword(PasswordAuthenticatedUserInterface $user, string $newHashedPassword): void
    {
        if (!$user instanceof User) {
            throw new UnsupportedUserException(sprintf('Instances of "%s" are not supported.', $user::class));
        }

        $user->setPassword($newHashedPassword);
        $this->getEntityManager()->persist($user);
        $this->getEntityManager()->flush();
    }

    /**
     * Vérifie si un utilisateur est bloqué par un autre utilisateur
     * 
     * @param int $userId ID de l'utilisateur potentiellement bloqué
     * @param int $blockerUserId ID de l'utilisateur qui pourrait avoir bloqué
     * @return bool true si l'utilisateur est bloqué, false sinon
     */
    public function isUserBlockedBy(int $userId, int $blockerUserId): bool
    {
        $em = $this->getEntityManager();
        $qb = $em->createQueryBuilder();

        $result = $qb->select('COUNT(ui.id)')
            ->from(UserInteraction::class, 'ui')
            ->where('ui.source = :blocker')
            ->andWhere('ui.target = :blocked')
            ->andWhere('ui.isBlocked = true')
            ->setParameter('blocker', $blockerUserId)
            ->setParameter('blocked', $userId)
            ->getQuery()
            ->getSingleScalarResult();

        return $result > 0;
    }

    //    /**
    //     * @return User[] Returns an array of User objects
    //     */
    //    public function findByExampleField($value): array
    //    {
    //        return $this->createQueryBuilder('u')
    //            ->andWhere('u.exampleField = :val')
    //            ->setParameter('val', $value)
    //            ->orderBy('u.id', 'ASC')
    //            ->setMaxResults(10)
    //            ->getQuery()
    //            ->getResult()
    //        ;
    //    }

    //    public function findOneBySomeField($value): ?User
    //    {
    //        return $this->createQueryBuilder('u')
    //            ->andWhere('u.exampleField = :val')
    //            ->setParameter('val', $value)
    //            ->getQuery()
    //            ->getOneOrNullResult()
    //        ;
    //    }
}
