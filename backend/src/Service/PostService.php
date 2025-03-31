<?php

namespace App\Service;

use App\Entity\Post;
use App\Entity\User;
use App\Request\CreatePostRequest;
use App\Repository\PostRepository;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\SecurityBundle\Security;

class PostService
{
    public function __construct(
        private EntityManagerInterface $entityManager,
        private Security $security,
        private PostRepository $postRepository
    ) {}

    public function create(CreatePostRequest $payload, User $user): Post
    {
        $post = new Post();
        $post->setContent($payload->getContent());
        $post->setMediaUrl($payload->getMediaUrl());
        $post->setIdUser($user);
        $post->setCreatedAt(new \DateTime());

        $this->entityManager->persist($post);
        $this->entityManager->flush();

        return $post;
    }
}
