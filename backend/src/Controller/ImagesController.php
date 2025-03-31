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

        // Log des données reçues pour débogage
        error_log('Demande de suppression de fichier reçue: ' . print_r($data, true));

        if (!$filename) {
            error_log('Erreur: Nom de fichier manquant');
            return $this->json(['message' => 'Nom de fichier requis'], 400);
        }

        // Chemin du dossier public des images
        $publicImagesDir = $this->getParameter('kernel.project_dir') . '/public/images';
        $filePath = $publicImagesDir . '/' . $filename;

        error_log('Tentative de suppression du fichier: ' . $filePath);

        // Vérifier si le fichier existe
        if (!file_exists($filePath)) {
            error_log('Erreur: Fichier non trouvé: ' . $filePath);
            return $this->json([
                'message' => 'Fichier non trouvé',
                'filename' => $filename,
                'path' => $filePath
            ], 404);
        }

        // Vérifier si le fichier appartient à un utilisateur (pour avatar et banner)
        $isUserMedia = false;

        // Si c'est l'avatar ou banner de l'utilisateur courant, mise à jour du profil
        if ($user->getAvatar() === $filename) {
            $user->setAvatar(null);
            $isUserMedia = true;
            error_log('Le fichier est l\'avatar de l\'utilisateur, mise à jour du profil');
        } elseif ($user->getBanner() === $filename) {
            $user->setBanner(null);
            $isUserMedia = true;
            error_log('Le fichier est la bannière de l\'utilisateur, mise à jour du profil');
        }

        if ($isUserMedia) {
            try {
                $entityManager->persist($user);
                $entityManager->flush();
                error_log('Profil utilisateur mis à jour');
            } catch (\Exception $e) {
                error_log('Erreur lors de la mise à jour du profil: ' . $e->getMessage());
                return $this->json(['message' => 'Erreur lors de la mise à jour du profil'], 500);
            }
        }

        // Supprimer le fichier
        try {
            // Vérifier les permissions avant suppression
            if (!is_writable($filePath)) {
                error_log('Fichier non modifiable: ' . $filePath . ' - Tentative de modification des permissions');
                // Tenter de changer les permissions si possible
                chmod($filePath, 0666);

                if (!is_writable($filePath)) {
                    error_log('Échec de la modification des permissions: ' . $filePath);
                    return $this->json([
                        'message' => 'Impossible de supprimer le fichier: permissions insuffisantes',
                        'filepath' => $filePath
                    ], 500);
                }
            }

            // Informations sur le fichier pour débogage
            $fileInfo = [
                'exists' => file_exists($filePath),
                'size' => file_exists($filePath) ? filesize($filePath) : null,
                'permissions' => file_exists($filePath) ? substr(sprintf('%o', fileperms($filePath)), -4) : null,
                'is_writable' => is_writable($filePath),
                'owner' => function_exists('posix_getpwuid') ? posix_getpwuid(fileowner($filePath))['name'] : fileowner($filePath),
            ];
            error_log('Informations sur le fichier: ' . print_r($fileInfo, true));

            if (unlink($filePath)) {
                error_log('Fichier supprimé avec succès: ' . $filePath);
                return $this->json([
                    'message' => 'Fichier supprimé avec succès',
                    'filename' => $filename
                ]);
            } else {
                error_log('Échec de la suppression du fichier: ' . $filePath);
                return $this->json([
                    'message' => 'Échec de la suppression du fichier pour une raison inconnue',
                    'filepath' => $filePath,
                    'fileInfo' => $fileInfo
                ], 500);
            }
        } catch (\Exception $e) {
            error_log('Exception lors de la suppression du fichier: ' . $e->getMessage());
            return $this->json([
                'message' => 'Erreur lors de la suppression du fichier',
                'error' => $e->getMessage(),
                'filepath' => $filePath
            ], 500);
        }
    }
}
