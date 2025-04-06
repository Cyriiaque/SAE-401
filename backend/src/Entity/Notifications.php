<?php

namespace App\Entity;

use App\Repository\NotificationsRepository;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity(repositoryClass: NotificationsRepository::class)]
class Notifications
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    /**
     * L'utilisateur qui a déclenché la notification
     */
    #[ORM\ManyToOne(targetEntity: User::class)]
    #[ORM\JoinColumn(name: "source_id", nullable: false)]
    private ?User $source = null;

    /**
     * L'utilisateur qui reçoit la notification
     */
    #[ORM\ManyToOne(targetEntity: User::class)]
    #[ORM\JoinColumn(name: "target_id", nullable: false)]
    private ?User $target = null;

    /**
     * Le contenu de la notification
     */
    #[ORM\Column(length: 255)]
    private ?string $content = null;

    /**
     * La date de création de la notification
     */
    #[ORM\Column(type: Types::DATETIME_MUTABLE)]
    private ?\DateTimeInterface $created_at = null;

    /**
     * Indique si la notification a été lue
     */
    #[ORM\Column(type: 'boolean', options: ['default' => false])]
    private ?bool $is_read = false;

    /**
     * Indique si la notification a été validée (par exemple pour une demande d'abonnement)
     */
    #[ORM\Column(type: 'boolean', nullable: true)]
    private ?bool $is_validated = null;

    public function getId(): ?int
    {
        return $this->id;
    }

    public function getSource(): ?User
    {
        return $this->source;
    }

    public function setSource(?User $source): static
    {
        $this->source = $source;

        return $this;
    }

    public function getTarget(): ?User
    {
        return $this->target;
    }

    public function setTarget(?User $target): static
    {
        $this->target = $target;

        return $this;
    }

    public function getContent(): ?string
    {
        return $this->content;
    }

    public function setContent(string $content): static
    {
        $this->content = $content;

        return $this;
    }

    public function getCreatedAt(): ?\DateTimeInterface
    {
        return $this->created_at;
    }

    public function setCreatedAt(\DateTimeInterface $created_at): static
    {
        $this->created_at = $created_at;

        return $this;
    }

    public function isRead(): ?bool
    {
        return $this->is_read;
    }

    public function setIsRead(bool $is_read): static
    {
        $this->is_read = $is_read;

        return $this;
    }

    public function isValidated(): ?bool
    {
        return $this->is_validated;
    }

    public function setIsValidated(?bool $is_validated): static
    {
        $this->is_validated = $is_validated;

        return $this;
    }
}
