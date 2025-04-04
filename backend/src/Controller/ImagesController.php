<?php

namespace App\Controller;

use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\Routing\Annotation\Route;
use Symfony\Component\Security\Http\Attribute\IsGranted;
use Symfony\Component\HttpFoundation\File\Exception\FileException;
use Symfony\Component\String\Slugger\SluggerInterface;
use App\Repository\UserRepository;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\Security\Core\Authentication\Token\Storage\TokenStorageInterface;
use App\Entity\User;
use Symfony\Component\HttpFoundation\Response;

class ImagesController extends AbstractController
{

    #[Route('/images/{filename}', name: 'get_image', methods: ['GET'])]
    public function getImage($filename)
    {
        $publicImagesDir = $this->getParameter('kernel.project_dir') . '/public/images';
        $filePath = $publicImagesDir . '/' . $filename;

        if (!file_exists($filePath)) {
            return new Response('File not found', 404);
        }

        $mimeType = mime_content_type($filePath);
        return new Response(file_get_contents($filePath), 200, ['Content-Type' => $mimeType]);
    }

    #[Route('/upload-image', name: 'upload_image', methods: ['POST'])]
    #[IsGranted('ROLE_USER')]
    public function uploadImage(
        Request $request,
        SluggerInterface $slugger,
        EntityManagerInterface $entityManager,
    ): JsonResponse {
        /** @var User $user */
        $user = $this->getUser();
        if (!$user) {
            return $this->json(['message' => 'Utilisateur non authentifié'], 401);
        }

        // Récupérer le fichier
        $file = $request->files->get('file');
        $type = $request->request->get('type');

        if (!$file) {
            return $this->json(['message' => 'Aucun fichier n\'a été téléchargé'], 400);
        }

        // Valider le type de fichier
        $allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/webm', 'video/ogg'];
        if (!in_array($file->getMimeType(), $allowedTypes)) {
            return $this->json(['message' => 'Type de fichier non autorisé'], 400);
        }

        // Valider la taille du fichier (max 50Mo)
        if ($file->getSize() > 50 * 1024 * 1024) {
            return $this->json(['message' => 'Fichier trop volumineux (max 50Mo)'], 400);
        }

        // Générer un nom de fichier unique
        $originalFilename = pathinfo($file->getClientOriginalName(), PATHINFO_FILENAME);
        $safeFilename = $slugger->slug($originalFilename);
        $newFilename = 'media_' . uniqid() . '.' . $file->guessExtension();

        // Chemin du dossier public des images
        $publicImagesDir = $this->getParameter('kernel.project_dir') . '/public/images';

        try {
            // Supprimer l'ancienne image si elle existe (uniquement pour avatar et banner)
            if ($type === 'avatar' && $user->getAvatar()) {
                $oldAvatarPath = $publicImagesDir . '/' . $user->getAvatar();
                if (file_exists($oldAvatarPath)) {
                    unlink($oldAvatarPath);
                }
            } elseif ($type === 'banner' && $user->getBanner()) {
                $oldBannerPath = $publicImagesDir . '/' . $user->getBanner();
                if (file_exists($oldBannerPath)) {
                    unlink($oldBannerPath);
                }
            }

            // Déplacer le fichier dans le dossier public
            $file->move(
                $publicImagesDir,
                $newFilename
            );
        } catch (FileException $e) {
            return $this->json(['message' => 'Erreur lors du téléchargement du fichier'], 500);
        }

        // Mettre à jour le profil utilisateur si nécessaire (uniquement pour avatar et banner)
        try {
            if ($type === 'avatar') {
                $user->setAvatar($newFilename);
            } elseif ($type === 'banner') {
                $user->setBanner($newFilename);
            }

            $entityManager->persist($user);
            $entityManager->flush();
        } catch (\Exception $e) {
            return $this->json(['message' => 'Erreur lors de la mise à jour du profil'], 500);
        }

        return $this->json([
            'message' => 'Fichier téléchargé avec succès',
            'filename' => $newFilename
        ]);
    }

    #[Route('/media/delete', name: 'delete_media', methods: ['POST'])]
    #[IsGranted('ROLE_USER')]
    public function deleteMedia(
        Request $request,
        EntityManagerInterface $entityManager
    ): JsonResponse {
        /** @var User $user */
        $user = $this->getUser();
        if (!$user) {
            return $this->json(['message' => 'Utilisateur non authentifié'], 401);
        }

        // Récupérer le nom du fichier à supprimer
        $data = json_decode($request->getContent(), true);
        $filename = $data['filename'] ?? null;

        if (!$filename) {
            return $this->json(['message' => 'Nom de fichier requis'], 400);
        }

        // Chemin du dossier public des images
        $publicImagesDir = $this->getParameter('kernel.project_dir') . '/public/images';
        $filePath = $publicImagesDir . '/' . $filename;

        // Vérifier si le fichier existe
        if (!file_exists($filePath)) {
            return $this->json([
                'message' => 'Fichier non trouvé',
                'filename' => $filename
            ], 404);
        }

        // Vérifier si le fichier appartient à un utilisateur (pour avatar et banner)
        $isUserMedia = false;

        // Si c'est l'avatar ou banner de l'utilisateur courant, mise à jour du profil
        if ($user->getAvatar() === $filename) {
            $user->setAvatar(null);
            $isUserMedia = true;
        } elseif ($user->getBanner() === $filename) {
            $user->setBanner(null);
            $isUserMedia = true;
        }

        if ($isUserMedia) {
            try {
                $entityManager->persist($user);
                $entityManager->flush();
            } catch (\Exception $e) {
                return $this->json(['message' => 'Erreur lors de la mise à jour du profil'], 500);
            }
        }

        // Vérifier si le fichier est utilisé dans des posts
        $isUsedInPosts = $this->isMediaUsedInPosts($filename, $entityManager);

        // Si le fichier est utilisé dans des posts, on ne le supprime pas physiquement
        if ($isUsedInPosts) {
            return $this->json([
                'message' => 'Fichier supprimé avec succès',
                'filename' => $filename
            ]);
        }

        // Supprimer le fichier
        try {
            if (unlink($filePath)) {
                return $this->json([
                    'message' => 'Fichier supprimé avec succès',
                    'filename' => $filename
                ]);
            } else {
                return $this->json([
                    'message' => 'Échec de la suppression du fichier',
                    'filename' => $filename
                ], 500);
            }
        } catch (\Exception $e) {
            return $this->json([
                'message' => 'Erreur lors de la suppression du fichier',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Vérifie si un média est utilisé dans des posts
     */
    private function isMediaUsedInPosts(string $mediaUrl, EntityManagerInterface $entityManager): bool
    {
        $postRepository = $entityManager->getRepository(\App\Entity\Post::class);

        // Vérifier si le média est utilisé exactement dans un post
        $exactMatches = $postRepository->createQueryBuilder('p')
            ->select('COUNT(p)')
            ->where('p.mediaUrl = :exactMedia')
            ->setParameter('exactMedia', $mediaUrl)
            ->getQuery()
            ->getSingleScalarResult();

        if ($exactMatches > 0) {
            return true;
        }

        // Vérifier si le média fait partie d'une liste de médias
        $partialMatches = $postRepository->createQueryBuilder('p')
            ->select('COUNT(p)')
            ->where('p.mediaUrl LIKE :mediaStart')
            ->orWhere('p.mediaUrl LIKE :mediaMiddle')
            ->orWhere('p.mediaUrl LIKE :mediaEnd')
            ->setParameter('mediaStart', $mediaUrl . ',%')
            ->setParameter('mediaMiddle', '%,' . $mediaUrl . ',%')
            ->setParameter('mediaEnd', '%,' . $mediaUrl)
            ->getQuery()
            ->getSingleScalarResult();

        return $partialMatches > 0;
    }

    #[Route('/media/check-usage', name: 'check_media_usage', methods: ['GET'])]
    #[IsGranted('ROLE_USER')]
    public function checkMediaUsage(
        Request $request,
        EntityManagerInterface $entityManager
    ): JsonResponse {
        $filename = $request->query->get('filename');

        if (!$filename) {
            return $this->json([
                'message' => 'Le nom du fichier est requis',
                'count' => 0
            ], 400);
        }

        try {
            // Vérifier si le fichier existe physiquement
            $publicImagesDir = $this->getParameter('kernel.project_dir') . '/public/images';
            $filePath = $publicImagesDir . '/' . $filename;

            if (!file_exists($filePath)) {
                return $this->json([
                    'message' => 'Le fichier n\'existe pas',
                    'count' => 0
                ]);
            }

            // Compter combien de posts utilisent ce fichier
            $postRepository = $entityManager->getRepository(\App\Entity\Post::class);

            // Compter les posts qui contiennent exactement ce fichier
            $exactMatches = $postRepository->createQueryBuilder('p')
                ->select('COUNT(p)')
                ->where('p.mediaUrl = :exactFilename')
                ->setParameter('exactFilename', $filename)
                ->getQuery()
                ->getSingleScalarResult();

            // Compter les posts qui contiennent ce fichier parmi d'autres
            $partialMatches = $postRepository->createQueryBuilder('p')
                ->select('COUNT(p)')
                ->where('p.mediaUrl LIKE :partialFilename')
                ->setParameter('partialFilename', '%' . $filename . '%')
                ->andWhere('p.mediaUrl <> :exactFilename')
                ->setParameter('exactFilename', $filename)
                ->getQuery()
                ->getSingleScalarResult();

            $totalUsage = $exactMatches + $partialMatches;

            return $this->json([
                'message' => 'Vérification réussie',
                'count' => $totalUsage,
                'details' => [
                    'exactMatches' => $exactMatches,
                    'partialMatches' => $partialMatches
                ]
            ]);
        } catch (\Exception $e) {
            return $this->json([
                'message' => 'Erreur lors de la vérification: ' . $e->getMessage(),
                'count' => 0
            ], 500);
        }
    }
}
