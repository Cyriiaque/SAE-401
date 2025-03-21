<?php

namespace App\Controller;

use App\Repository\PostRepository;
use Doctrine\ORM\Tools\Pagination\Paginator;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Annotation\Route;
use Symfony\Component\Security\Http\Authentication\AuthenticationUtils;
use Symfony\Component\Security\Http\Attribute\IsGranted;
use Symfony\Component\Serializer\SerializerInterface;
use Symfony\Component\Validator\Validator\ValidatorInterface;
use App\Service\PostService;
use Symfony\Component\HttpFoundation\JsonResponse;
use App\Request\CreatePostRequest;
use Symfony\Component\Security\Http\Attribute\CurrentUser;

class PostController extends AbstractController
{
    #[Route('/posts', name: 'posts.index', methods: ['GET'])]
    public function index(Request $request, PostRepository $postRepository): Response
    {
        $page = max(1, $request->query->getInt('page', 1));
        $limit = 2;
        $offset = ($page - 1) * $limit;

        $paginator = $postRepository->paginateAllOrderedByLatest();
        $totalPostsCount = $paginator->count();
        $totalPages = ceil($totalPostsCount / $limit);

        // Calcul des pages précédente et suivante
        $previousPage = $page > 1 ? $page - 1 : null;
        $nextPage = $page < $totalPages ? $page + 1 : null;

        $posts = [];
        $count = 0;
        foreach ($paginator as $post) {
            if ($count >= $offset && $count < ($offset + $limit)) {
                $user = $post->getIdUser();
                $posts[] = [
                    'id' => $post->getId(),
                    'content' => $post->getContent(),
                    'created_at' => $post->getCreatedAt()->format('Y-m-d H:i:s'),
                    'user' => $user ? [
                        'id' => $user->getId(),
                        'email' => $user->getEmail(),
                        'name' => $user->getName(),
                        'mention' => $user->getMention(),
                        'avatar' => $user->getAvatar()
                    ] : null
                ];
            }
            $count++;
        }

        return $this->json([
            'posts' => $posts,
            'previous_page' => $previousPage,
            'next_page' => $nextPage
        ]);
    }

    #[Route('/addpost', name: 'posts.create', methods: ['POST'], format: 'json')]
    #[IsGranted('ROLE_USER')]
    public function createPost(
        Request $request,
        SerializerInterface $serializer,
        ValidatorInterface $validator,
        PostService $postService,
        #[CurrentUser] $user
    ): JsonResponse {
        if (!$user) {
            return $this->json(['message' => 'Non authentifié'], Response::HTTP_UNAUTHORIZED);
        }

        /** @var CreatePostRequest $payload */
        $payload = $serializer->deserialize($request->getContent(), CreatePostRequest::class, 'json');

        $errors = $validator->validate($payload);
        if (count($errors) > 0) {
            return $this->json(['errors' => (string) $errors], Response::HTTP_UNPROCESSABLE_ENTITY);
        }

        $post = $postService->create($payload, $user);

        return $this->json(['id' => $post->getId()], Response::HTTP_CREATED);
    }
}
