<?php

namespace App\Entity;

use App\Repository\PostRepository;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity(repositoryClass: PostRepository::class)]
class Post
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    #[ORM\Column(length: 280, nullable: true)]
    private ?string $content = null;

    #[ORM\Column(length: 255, nullable: true)]
    private ?string $mediaUrl = null;

    #[ORM\Column(type: Types::DATETIME_MUTABLE)]
    private ?\DateTimeInterface $created_at = null;

    #[ORM\ManyToOne(targetEntity: User::class)]
    private ?User $user = null;

    #[ORM\Column(type: 'boolean', options: ['default' => false])]
    private ?bool $isCensored = false;

    #[ORM\Column(type: 'boolean', options: ['default' => false])]
    private ?bool $isPinned = false;

    #[ORM\ManyToOne(targetEntity: self::class)]
    #[ORM\JoinColumn(nullable: true, onDelete: "SET NULL")]
    private ?self $originalPost = null;

    #[ORM\Column(type: 'integer', options: ['default' => 0])]
    private ?int $retweetCount = 0;

    /**
     * Relation vers l'utilisateur qui a créé le post original du retweet
     * Ceci est différent de retweetedBy qui représentait l'utilisateur qui a fait le retweet
     * originalUser représente l'utilisateur propriétaire du post original
     */
    #[ORM\ManyToOne(targetEntity: User::class)]
    #[ORM\JoinColumn(name: "original_user_id", nullable: true)]
    private ?User $originalUser = null;

    #[ORM\Column(length: 280, nullable: true)]
    private ?string $retweeted_content = null;

    public function getId(): ?int
    {
        return $this->id;
    }

    public function setId(int $id): static
    {
        $this->id = $id;

        return $this;
    }

    public function getContent(): ?string
    {
        return $this->content;
    }

    public function setContent(?string $content): static
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

    public function getIdUser(): ?User
    {
        return $this->user;
    }

    public function setIdUser(?User $user): static
    {
        $this->user = $user;

        return $this;
    }

    public function getMediaUrl(): ?string
    {
        return $this->mediaUrl;
    }

    public function setMediaUrl(?string $mediaUrl): static
    {
        $this->mediaUrl = $mediaUrl;
        return $this;
    }

    public function isCensored(): ?bool
    {
        return $this->isCensored;
    }

    public function setIsCensored(bool $isCensored): static
    {
        $this->isCensored = $isCensored;
        return $this;
    }

    public function isPinned(): ?bool
    {
        return $this->isPinned;
    }

    public function setIsPinned(bool $isPinned): static
    {
        $this->isPinned = $isPinned;
        return $this;
    }

    public function getOriginalPost(): ?self
    {
        return $this->originalPost;
    }

    public function setOriginalPost(?self $originalPost): static
    {
        $this->originalPost = $originalPost;
        return $this;
    }

    public function getRetweetCount(): ?int
    {
        return $this->retweetCount;
    }

    public function setRetweetCount(int $retweetCount): static
    {
        $this->retweetCount = $retweetCount;
        return $this;
    }

    public function incrementRetweetCount(): static
    {
        $this->retweetCount++;
        return $this;
    }

    public function decrementRetweetCount(): static
    {
        if ($this->retweetCount > 0) {
            $this->retweetCount--;
        }
        return $this;
    }

    public function getRetweetedBy(): ?User
    {
        return $this->originalUser;
    }

    public function setRetweetedBy(?User $retweetedBy): static
    {
        $this->originalUser = $retweetedBy;
        return $this;
    }

    public function isRetweet(): bool
    {
        return $this->originalPost !== null || $this->originalUser !== null || $this->retweeted_content !== null;
    }

    public function getRetweetedContent(): ?string
    {
        return $this->retweeted_content;
    }

    public function setRetweetedContent(?string $retweeted_content): static
    {
        $this->retweeted_content = $retweeted_content;
        return $this;
    }

    public function saveOriginalPostData(): void
    {
        if (!$this->originalPost) {
            return;
        }

        $this->retweeted_content = $this->originalPost->getContent();

        if (!$this->mediaUrl && $this->originalPost->getMediaUrl()) {
            $this->mediaUrl = $this->originalPost->getMediaUrl();
        }

        // S'assurer que l'information de l'utilisateur original est préservée
        if ($this->originalPost->getIdUser() && !$this->originalUser) {
            $this->originalUser = $this->originalPost->getIdUser();
        }
    }

    /**
     * Récupère l'utilisateur propriétaire du post original qui a été retweeté.
     * À utiliser à la place de getRetweetedBy qui est maintenu pour compatibilité.
     */
    public function getOriginalUser(): ?User
    {
        return $this->originalUser;
    }

    /**
     * Définit l'utilisateur propriétaire du post original qui a été retweeté.
     * À utiliser à la place de setRetweetedBy qui est maintenu pour compatibilité.
     */
    public function setOriginalUser(?User $originalUser): static
    {
        $this->originalUser = $originalUser;
        return $this;
    }
}
