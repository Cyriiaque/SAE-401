<?php

namespace App\Entity;

use App\Repository\UserInteractionRepository;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity(repositoryClass: UserInteractionRepository::class)]
class UserInteraction
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    #[ORM\ManyToOne]
    #[ORM\JoinColumn(nullable: false)]
    private ?User $source = null;

    #[ORM\ManyToOne]
    #[ORM\JoinColumn(nullable: false)]
    private ?User $target = null;

    #[ORM\Column(type: 'boolean', options: ['default' => false])]
    private ?bool $follow = null;

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

    public function isFollow(): ?bool
    {
        return $this->follow;
    }

    public function setFollow(bool $follow): static
    {
        $this->follow = $follow;

        return $this;
    }
}
