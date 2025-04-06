<?php

namespace App\Repository;

use App\Entity\Notifications;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<Notifications>
 */
class NotificationsRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, Notifications::class);
    }

    /**
     * Récupère toutes les notifications pour un utilisateur donné
     * 
     * @param int $userId ID de l'utilisateur
     * @return Notifications[] Returns an array of Notifications objects
     */
    public function findByTargetUser(int $userId): array
    {
        return $this->createQueryBuilder('n')
            ->where('n.target = :userId')
            ->setParameter('userId', $userId)
            ->orderBy('n.created_at', 'DESC')
            ->getQuery()
            ->getResult();
    }

    /**
     * Récupère les notifications non lues pour un utilisateur donné
     * 
     * @param int $userId ID de l'utilisateur
     * @return Notifications[] Returns an array of Notifications objects
     */
    public function findUnreadByTargetUser(int $userId): array
    {
        return $this->createQueryBuilder('n')
            ->where('n.target = :userId')
            ->andWhere('n.is_read = false')
            ->setParameter('userId', $userId)
            ->orderBy('n.created_at', 'DESC')
            ->getQuery()
            ->getResult();
    }

    /**
     * Marque toutes les notifications d'un utilisateur comme lues
     * 
     * @param int $userId ID de l'utilisateur
     * @return void
     */
    public function markAllAsReadForUser(int $userId): void
    {
        $em = $this->getEntityManager();
        $query = $em->createQuery(
            'UPDATE App\Entity\Notifications n
             SET n.is_read = true
             WHERE n.target = :userId AND n.is_read = false'
        )->setParameter('userId', $userId);

        $query->execute();
    }

    /**
     * Enregistre une notification
     */
    public function save(Notifications $notification, bool $flush = false): void
    {
        $this->getEntityManager()->persist($notification);

        if ($flush) {
            $this->getEntityManager()->flush();
        }
    }

    /**
     * Supprime une notification
     */
    public function remove(Notifications $notification, bool $flush = false): void
    {
        $this->getEntityManager()->remove($notification);

        if ($flush) {
            $this->getEntityManager()->flush();
        }
    }
}
