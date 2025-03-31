<?php

namespace App\Request;

use Symfony\Component\Validator\Constraints as Assert;

class CreatePostRequest
{
    #[Assert\NotBlank(message: 'Le contenu ne peut pas être vide')]
    #[Assert\Length(
        min: 1,
        max: 280,
        minMessage: 'Le contenu doit faire au moins {{ limit }} caractère',
        maxMessage: 'Le contenu ne peut pas dépasser {{ limit }} caractères'
    )]
    private string $content;

    #[Assert\Length(max: 255)]
    private ?string $mediaUrl = null;

    public function getContent(): string
    {
        return $this->content;
    }

    public function setContent(string $content): self
    {
        $this->content = $content;
        return $this;
    }

    public function getMediaUrl(): ?string
    {
        return $this->mediaUrl;
    }

    public function setMediaUrl(?string $mediaUrl): self
    {
        $this->mediaUrl = $mediaUrl;
        return $this;
    }
}
