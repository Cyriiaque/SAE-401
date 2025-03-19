<?php

namespace App\Controller;

use App\Repository\PostRepository;
use Doctrine\ORM\Tools\Pagination\Paginator;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Annotation\Route;
use Symfony\Component\Security\Http\Authentication\AuthenticationUtils;

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
                $posts[] = [
                    'id' => $post->getId(),
                    'content' => $post->getContent(),
                    'created_at' => $post->getCreatedAt()->format('Y-m-d H:i:s')
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
}
