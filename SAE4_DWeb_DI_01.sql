-- phpMyAdmin SQL Dump
-- version 5.2.2
-- https://www.phpmyadmin.net/
--
-- Hôte : sae-mysql
-- Généré le : lun. 07 avr. 2025 à 08:21
-- Version du serveur : 8.4.4
-- Version de PHP : 8.2.27

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Base de données : `SAE4_DWeb_DI_01`
--

-- --------------------------------------------------------

--
-- Structure de la table `doctrine_migration_versions`
--

CREATE TABLE `doctrine_migration_versions` (
  `version` varchar(191) COLLATE utf8mb3_unicode_ci NOT NULL,
  `executed_at` datetime DEFAULT NULL,
  `execution_time` int DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_unicode_ci;

--
-- Déchargement des données de la table `doctrine_migration_versions`
--

INSERT INTO `doctrine_migration_versions` (`version`, `executed_at`, `execution_time`) VALUES
('DoctrineMigrations\\Version20250318095508', '2025-03-18 09:56:04', 54),
('DoctrineMigrations\\Version20250318182035', '2025-03-19 07:20:34', 4),
('DoctrineMigrations\\Version20250318182646', '2025-03-19 07:20:34', 0),
('DoctrineMigrations\\Version20250319072009', '2025-03-19 07:20:34', 52),
('DoctrineMigrations\\Version20250319082747', '2025-03-19 08:28:04', 50),
('DoctrineMigrations\\Version20250319083534', '2025-03-19 08:36:08', 62),
('DoctrineMigrations\\Version20250319084736', '2025-03-19 08:55:04', 46),
('DoctrineMigrations\\Version20250319085913', '2025-03-19 08:59:18', 34),
('DoctrineMigrations\\Version20250319092608', '2025-03-19 09:26:13', 31),
('DoctrineMigrations\\Version20250319092703', '2025-03-19 09:27:13', 82),
('DoctrineMigrations\\Version20250319093230', '2025-03-19 09:32:36', 45),
('DoctrineMigrations\\Version20250319094033', '2025-03-19 09:40:40', 350),
('DoctrineMigrations\\Version20250319094340', '2025-03-19 09:43:45', 395),
('DoctrineMigrations\\Version20250320185337', '2025-03-20 18:53:54', 133),
('DoctrineMigrations\\Version20250321104849', '2025-03-21 10:48:58', 73),
('DoctrineMigrations\\Version20250321132736', '2025-03-21 13:27:44', 89),
('DoctrineMigrations\\Version20250322155013', '2025-03-22 15:50:22', 37),
('DoctrineMigrations\\Version20250324091536', '2025-03-24 09:15:43', 44),
('DoctrineMigrations\\Version20250324092402', '2025-03-24 09:24:10', 44),
('DoctrineMigrations\\Version20250324092549', '2025-03-24 09:25:54', 80),
('DoctrineMigrations\\Version20250324093051', '2025-03-24 09:30:55', 327),
('DoctrineMigrations\\Version20250324093144', '2025-03-24 09:31:48', 393),
('DoctrineMigrations\\Version20250324103006', '2025-03-24 10:30:16', 52),
('DoctrineMigrations\\Version20250326072823', '2025-03-26 07:28:35', 79),
('DoctrineMigrations\\Version20250326150343', '2025-03-26 15:03:55', 121),
('DoctrineMigrations\\Version20250327163639', '2025-03-27 16:36:49', 55),
('DoctrineMigrations\\Version20250328083047', '2025-03-28 08:30:52', 48),
('DoctrineMigrations\\Version20250328162847', '2025-03-28 16:28:55', 477),
('DoctrineMigrations\\Version20250328165209', '2025-03-28 16:52:13', 36),
('DoctrineMigrations\\Version20250330213608', '2025-03-30 21:36:19', 180),
('DoctrineMigrations\\Version20250331084549', '2025-03-31 08:46:03', 80),
('DoctrineMigrations\\Version20250331090335', '2025-03-31 09:03:39', 45),
('DoctrineMigrations\\Version20250401082224', '2025-04-01 08:22:45', 120),
('DoctrineMigrations\\Version20250401144832', '2025-04-01 14:48:40', 93),
('DoctrineMigrations\\Version20250401160627', '2025-04-01 16:06:39', 64),
('DoctrineMigrations\\Version20250401163609', '2025-04-01 16:36:13', 62),
('DoctrineMigrations\\Version20250402122526', '2025-04-02 12:25:50', 138),
('DoctrineMigrations\\Version20250402151140', '2025-04-02 15:11:51', 684),
('DoctrineMigrations\\Version20250403083937', '2025-04-03 08:39:49', 202),
('DoctrineMigrations\\Version20250403090334', '2025-04-03 09:03:39', 132),
('DoctrineMigrations\\Version20250403105738', '2025-04-03 10:57:46', 377),
('DoctrineMigrations\\Version20250403110357', '2025-04-03 11:04:02', 47),
('DoctrineMigrations\\Version20250403124610', '2025-04-03 12:46:16', 514),
('DoctrineMigrations\\Version20250404141340', '2025-04-04 14:13:54', 406),
('DoctrineMigrations\\Version20250407072615', '2025-04-07 07:26:34', 186);

-- --------------------------------------------------------

--
-- Structure de la table `notifications`
--

CREATE TABLE `notifications` (
  `id` int NOT NULL,
  `source_id` int NOT NULL,
  `target_id` int NOT NULL,
  `content` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` datetime NOT NULL,
  `is_read` tinyint(1) NOT NULL DEFAULT '0',
  `is_validated` tinyint(1) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Déchargement des données de la table `notifications`
--

INSERT INTO `notifications` (`id`, `source_id`, `target_id`, `content`, `created_at`, `is_read`, `is_validated`) VALUES
(1, 22, 4, 'Test de notif', '2025-04-04 14:28:15', 1, 1),
(2, 22, 4, 'Test de notif lue', '2025-04-04 14:32:13', 1, 1),
(3, 4, 22, 'l\'utilisateur a liké votre post', '2025-04-06 10:45:29', 1, 1),
(4, 22, 4, 'Le Christ Cosmique a aimé votre post', '2025-04-06 10:52:15', 1, NULL),
(5, 22, 4, 'Le Christ Cosmique a aimé votre post', '2025-04-06 10:53:23', 1, NULL),
(6, 22, 4, 'Le Christ Cosmique a repartagé votre post', '2025-04-06 11:03:30', 1, NULL),
(7, 4, 22, 'Cyriaque a aimé votre post', '2025-04-06 13:10:50', 1, NULL),
(8, 4, 22, 'Cyriaque vous a mentionné dans un post', '2025-04-06 13:18:33', 1, NULL),
(9, 4, 22, 'Cyriaque a commencé à vous suivre', '2025-04-06 13:19:06', 1, NULL),
(10, 22, 4, 'Le Christ Cosmique vous a mentionné dans un post', '2025-04-06 13:29:16', 1, NULL),
(11, 4, 22, 'Cyriaque a repartagé votre post', '2025-04-06 13:29:37', 1, NULL),
(12, 22, 4, 'Le Christ Cosmique vous a mentionné dans un post', '2025-04-06 13:54:31', 1, NULL),
(13, 4, 22, 'Cyriaque a répondu à votre post', '2025-04-06 13:55:26', 1, NULL),
(14, 22, 4, 'Le Christ Cosmique a aimé votre post', '2025-04-06 17:29:30', 1, NULL),
(15, 22, 4, 'Le Christ Cosmique a aimé votre post', '2025-04-06 17:32:00', 1, NULL),
(16, 22, 4, 'Le Christ Cosmique a aimé votre post', '2025-04-06 17:36:55', 1, NULL),
(17, 22, 4, 'Le Christ Cosmique a aimé votre post', '2025-04-06 18:04:40', 1, NULL),
(18, 22, 4, 'Le Christ Cosmique a aimé votre post', '2025-04-06 18:09:55', 1, NULL),
(19, 4, 22, 'Cyriaque a repartagé votre post', '2025-04-07 09:34:31', 0, NULL);

-- --------------------------------------------------------

--
-- Structure de la table `post`
--

CREATE TABLE `post` (
  `id` int NOT NULL,
  `content` varchar(280) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `user_id` int DEFAULT NULL,
  `media_url` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `is_censored` tinyint(1) NOT NULL DEFAULT '0',
  `is_pinned` tinyint(1) NOT NULL DEFAULT '0',
  `original_post_id` int DEFAULT NULL,
  `original_user_id` int DEFAULT NULL,
  `retweet_count` int NOT NULL DEFAULT '0',
  `retweeted_content` varchar(280) COLLATE utf8mb4_unicode_ci DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Déchargement des données de la table `post`
--

INSERT INTO `post` (`id`, `content`, `created_at`, `user_id`, `media_url`, `is_censored`, `is_pinned`, `original_post_id`, `original_user_id`, `retweet_count`, `retweeted_content`) VALUES
(1, '1er post de test', '2025-03-18 09:57:00', 4, NULL, 0, 0, NULL, NULL, 0, NULL),
(2, '2ème post de test', '2025-03-18 09:57:40', 4, NULL, 0, 0, NULL, NULL, 0, NULL),
(3, '3ème post de test', '2025-03-18 09:58:04', 4, NULL, 0, 0, NULL, NULL, 0, NULL),
(4, 'Test de neuil favééééééééé', '2025-03-20 11:41:00', 5, NULL, 0, 0, NULL, NULL, 0, NULL),
(5, 'test', '2025-03-21 13:36:11', 4, NULL, 0, 0, NULL, NULL, 0, NULL),
(6, 'test', '2025-03-21 13:39:56', 4, NULL, 0, 0, NULL, NULL, 0, NULL),
(7, 'test', '2025-03-21 13:40:55', 4, NULL, 0, 0, NULL, NULL, 0, NULL),
(8, 'testssts', '2025-03-21 13:44:10', 4, NULL, 0, 0, NULL, NULL, 0, NULL),
(9, 'teshrg', '2025-03-21 13:48:08', 4, NULL, 0, 0, NULL, NULL, 0, NULL),
(11, 'je suis un neuil humide', '2025-03-21 13:50:59', 5, NULL, 0, 0, NULL, NULL, 0, NULL),
(12, 'loliolo', '2025-03-21 13:51:57', 5, NULL, 0, 0, NULL, NULL, 0, NULL),
(13, 'alexis est parti à 14h', '2025-03-21 13:53:29', 5, NULL, 0, 0, NULL, NULL, 0, NULL),
(14, 'il manque beaucoup de monde dans la salle', '2025-03-21 14:08:53', 5, NULL, 0, 0, NULL, NULL, 0, NULL),
(15, 'test', '2025-03-22 14:54:24', 5, NULL, 0, 0, NULL, NULL, 0, NULL),
(16, 'oe pas mal', '2025-03-22 14:56:59', 6, NULL, 0, 0, NULL, NULL, 0, NULL),
(17, 'test', '2025-03-24 09:59:57', 5, NULL, 0, 0, NULL, NULL, 0, NULL),
(18, 'c\'est il', '2025-03-24 15:48:24', 4, NULL, 0, 0, NULL, NULL, 0, NULL),
(19, 'sredctygbul,', '2025-03-24 15:51:54', 4, NULL, 0, 0, NULL, NULL, 0, NULL),
(20, 'dcfvgbhjn', '2025-03-24 15:52:10', 4, NULL, 0, 0, NULL, NULL, 0, NULL),
(21, 'testiiiii', '2025-03-24 15:55:16', 4, NULL, 0, 0, NULL, NULL, 0, NULL),
(23, 'segrdhtfgyukhldthdfghkuyftydrgfhhuyftfyguiyffggyfjfytdrdytftyfygyfcygiyfcgugycvgugcvguchvguchgugygugvgucgygcguygcguygcygcyguycgvgugchgvgugcvgugcgugygcgugygcguygyguggcguygcgugyguguyugkguigcuguycguguygcugifcgugufcgugyfucguygycguygfcygfcygyfcygycygyfygcgcgygygggygugcggcgygcgyggygggv', '2025-03-24 15:56:29', 4, NULL, 0, 0, NULL, NULL, 0, NULL),
(32, 'test actualisation', '2025-03-26 10:38:13', 5, NULL, 0, 0, NULL, NULL, 0, NULL),
(33, 'test actu 2', '2025-03-26 10:38:33', 5, NULL, 0, 0, NULL, NULL, 0, NULL),
(34, 'test3 actu', '2025-03-26 10:39:53', 4, NULL, 0, 0, NULL, NULL, 0, NULL),
(35, 'test', '2025-03-26 14:25:59', 4, NULL, 0, 0, NULL, NULL, 0, NULL),
(37, 'test actuuuuuuuuuuuuu', '2025-03-27 14:46:43', 5, NULL, 0, 0, NULL, NULL, 0, NULL),
(38, 'actutututu', '2025-03-27 14:47:21', 5, NULL, 0, 0, NULL, NULL, 0, NULL),
(39, '=)àpo_iu-ytrezrty', '2025-03-27 15:58:12', 5, NULL, 0, 0, NULL, NULL, 0, NULL),
(40, 'jughbv', '2025-03-27 15:58:21', 5, NULL, 0, 0, NULL, NULL, 0, NULL),
(45, 'Test pas ban', '2025-03-28 14:28:13', 6, NULL, 0, 0, NULL, NULL, 0, NULL),
(46, 'test follow', '2025-03-28 17:21:54', 20, NULL, 0, 0, NULL, NULL, 0, NULL),
(47, 'je suis le messi', '2025-03-30 21:20:05', 22, 'media_67eb0a081a6e5.jpg', 1, 0, NULL, NULL, 0, NULL),
(62, 'test', '2025-04-01 08:00:58', 4, 'media_67eb9d3a204e6.webm,media_67eb9fdb79cf6.png,media_67eb9fdbbb2be.png', 0, 0, NULL, NULL, 0, NULL),
(69, 'c\'est un test #je_suis_testeur @atomic', '2025-04-02 13:50:55', 4, NULL, 0, 1, NULL, NULL, 1, NULL),
(113, 'rereerererererere test suppression rerererepost', '2025-04-03 13:06:08', 4, 'media_67ee7cd74b246.png,media_67ee7cd799b34.png,media_67ee7cd7ddb1a.png,media_67ee7cd8227af.png', 0, 0, NULL, 22, 0, 'frgtyujijygtr'),
(125, 'oooooo', '2025-04-04 08:50:01', 22, 'media_67efc53d3d14b.mp4', 0, 0, NULL, NULL, 1, NULL),
(130, '', '2025-04-04 09:40:12', 4, 'media_67efa6dab1cfb.png', 0, 0, 125, 22, 0, 'oooooo'),
(131, 'bon test', '2025-04-06 11:03:30', 22, NULL, 0, 0, 69, 4, 0, 'c\'est un test #je_suis_testeur @atomic'),
(132, '@grand_monarque je t\'id', '2025-04-06 13:18:33', 4, NULL, 0, 0, NULL, NULL, 0, NULL),
(133, 'repost @cyriiaque', '2025-04-06 13:29:16', 22, NULL, 0, 0, NULL, NULL, 1, NULL),
(134, 'c\'est fait chef', '2025-04-06 13:29:37', 4, NULL, 0, 0, 133, 22, 0, 'repost @cyriiaque'),
(135, 'commente @cyriiaque', '2025-04-06 13:54:31', 22, NULL, 0, 0, NULL, NULL, 1, NULL),
(136, 'vous me voyez pas', '2025-04-07 09:32:55', 6, NULL, 0, 0, NULL, NULL, 0, NULL),
(137, 'je republie dans ma tête (c\'est vrai)', '2025-04-07 09:34:31', 4, NULL, 0, 0, 135, 22, 0, 'commente @cyriiaque');

-- --------------------------------------------------------

--
-- Structure de la table `post_interaction`
--

CREATE TABLE `post_interaction` (
  `id` int NOT NULL,
  `liked` tinyint(1) NOT NULL,
  `user_id` int NOT NULL,
  `post_id` int NOT NULL,
  `reply` varchar(280) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `replied_at` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Déchargement des données de la table `post_interaction`
--

INSERT INTO `post_interaction` (`id`, `liked`, `user_id`, `post_id`, `reply`, `replied_at`) VALUES
(1, 1, 5, 16, NULL, NULL),
(2, 1, 4, 16, NULL, NULL),
(3, 1, 4, 15, NULL, NULL),
(4, 1, 5, 15, NULL, NULL),
(5, 1, 6, 17, NULL, NULL),
(6, 1, 6, 16, NULL, NULL),
(7, 1, 6, 15, NULL, NULL),
(8, 1, 6, 14, NULL, NULL),
(9, 1, 4, 9, NULL, NULL),
(10, 0, 4, 17, NULL, NULL),
(12, 1, 4, 23, 'test 2 réponse', '2025-04-01 08:24:24'),
(15, 0, 5, 40, NULL, NULL),
(17, 0, 4, 45, 'très beau logobi', '2025-04-01 09:48:28'),
(18, 0, 4, 46, NULL, NULL),
(20, 1, 4, 47, 'test réponse', '2025-04-01 08:23:47'),
(21, 0, 22, 47, '2eme message', '2025-04-01 09:08:11'),
(22, 0, 4, 62, NULL, NULL),
(24, 1, 6, 62, NULL, NULL),
(30, 1, 22, 69, NULL, NULL),
(31, 1, 4, 131, 'merci pour le repost', '2025-04-06 11:10:21'),
(32, 0, 4, 125, 'waaaa aaa aa aa', '2025-04-06 11:17:05'),
(33, 0, 4, 133, 'je commente', '2025-04-06 11:32:03'),
(34, 0, 4, 135, 'à vos ordres maitre', '2025-04-06 13:55:26'),
(35, 1, 22, 134, NULL, NULL),
(36, 1, 22, 132, NULL, NULL);

-- --------------------------------------------------------

--
-- Structure de la table `user`
--

CREATE TABLE `user` (
  `id` int NOT NULL,
  `email` varchar(180) COLLATE utf8mb4_unicode_ci NOT NULL,
  `roles` json NOT NULL,
  `password` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `mention` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `name` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `avatar` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `api_token` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `biography` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `banner` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `isverified` tinyint(1) NOT NULL,
  `post_reload` int NOT NULL DEFAULT '0',
  `isbanned` tinyint(1) NOT NULL DEFAULT '0',
  `read_only` tinyint(1) NOT NULL DEFAULT '0',
  `is_private` tinyint(1) NOT NULL DEFAULT '0'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Déchargement des données de la table `user`
--

INSERT INTO `user` (`id`, `email`, `roles`, `password`, `mention`, `name`, `avatar`, `api_token`, `biography`, `banner`, `isverified`, `post_reload`, `isbanned`, `read_only`, `is_private`) VALUES
(4, 'cyriaque.lemesle@gmail.com', '[\"ROLE_ADMIN\", \"ROLE_USER\"]', '$2y$13$TuiRsiWbun86yEkOsxjgsuo9snwvZ8nH4NVkhxJ4TCQVkTT0n5DJW', 'cyriiaque', 'Cyriaque', 'media_67eb0643f2412.jpg', '0e7b57efa0301f77d63f86b6da3190120e5aec7088d977efdc6cd2960a83ab12', 'aaaaaaa aaaaaaaaaaaaaaaaaaaaaaaa aaaaaaaaaaaaaaaaaaaaaaaa aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa\n', 'media_67eb06443e654.png', 1, 4, 0, 1, 0),
(5, 'lemesle.cyriaque@gmail.com', '[]', '$2y$13$Oz9VCNl20bcclguv8UlEsOdvUIGg7HYeeywVpYdpKMXegoICGGTi6', 'faveeeee', 'FP le neuil', NULL, 'd2386d4ba3270a0b7190df8611ee02dc9f201c2396ebba4d92a17e59bb1c610b', NULL, NULL, 1, 0, 1, 0, 0),
(6, 'cyci2424@gmail.com', '[]', '$2y$13$7rt6qLRH7trmS4WK.4oHfOHe.6O3QBxGMCw6eyAhGuQ/fvazBg2Lm', 'atomic', 'Logobi', NULL, '455b676da908b245a7c0507029f92e0a5f801c002ace9f45ea49f2e96161cbae', NULL, NULL, 1, 0, 0, 0, 1),
(18, 'tete@teteg.fr', '[]', '$2y$13$k8e/0uEVNRRqADzYAJ1GS.aGDmroRT02nGXVHScqefxW7H5tCA4K.', 'neuil', 'tete de neuil', NULL, NULL, NULL, NULL, 1, 0, 0, 0, 0),
(19, 'ghjygfed@uyhgff.fr', '[]', '$2y$13$wP.Mt.bqFRj/eCWjDNciSO.2UXtxBGc29ZUROFX9dMQJ2Qr9tmS1W', 'tdrfghj', 'ergtfhjk', NULL, NULL, NULL, NULL, 1, 0, 0, 0, 0),
(20, 'test@test.fr', '[]', '$2y$13$991Euf1XNC1NNS/RiqkICOx.u.q5MUqPd68xfKM3QRpg.iBgxnbKC', 'tryfghjk', 'ertyuhiko', NULL, '735c7365a4b29697263458b2f3ad03a751f72ae754ee24c6eb06f84156dd0917', NULL, NULL, 1, 0, 0, 0, 0),
(22, 'cosmique@gmail.com', '[\"ROLE_USER\"]', '$2y$13$U0Z8COhxD1NmHnq/jTjKlu/mJG6cJ6xGyn6LwHZsw6uDD90DygVDu', 'grand_monarque', 'Le Christ Cosmique', 'media_67eb07a503433.jpg', 'a4530a04e79fe1ef057292dc712514d8e57e633f2e151c654082375a8541c713', 'Waaa mais qu\'est ce que c\'est que ce truc là', 'media_67eb07a52af00.jpg', 1, 0, 0, 0, 0);

-- --------------------------------------------------------

--
-- Structure de la table `user_interaction`
--

CREATE TABLE `user_interaction` (
  `id` int NOT NULL,
  `source_id` int NOT NULL,
  `target_id` int NOT NULL,
  `follow` tinyint(1) NOT NULL DEFAULT '0',
  `is_blocked` tinyint(1) NOT NULL DEFAULT '0'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Déchargement des données de la table `user_interaction`
--

INSERT INTO `user_interaction` (`id`, `source_id`, `target_id`, `follow`, `is_blocked`) VALUES
(1, 4, 6, 1, 0),
(2, 4, 20, 0, 1),
(3, 22, 4, 0, 0),
(4, 4, 22, 1, 0);

--
-- Index pour les tables déchargées
--

--
-- Index pour la table `doctrine_migration_versions`
--
ALTER TABLE `doctrine_migration_versions`
  ADD PRIMARY KEY (`version`);

--
-- Index pour la table `notifications`
--
ALTER TABLE `notifications`
  ADD PRIMARY KEY (`id`),
  ADD KEY `IDX_6000B0D3953C1C61` (`source_id`),
  ADD KEY `IDX_6000B0D3158E0B66` (`target_id`);

--
-- Index pour la table `post`
--
ALTER TABLE `post`
  ADD PRIMARY KEY (`id`),
  ADD KEY `IDX_5A8A6C8DA76ED395` (`user_id`),
  ADD KEY `IDX_5A8A6C8DCD09ADDB` (`original_post_id`),
  ADD KEY `IDX_5A8A6C8D21EE7D62` (`original_user_id`);

--
-- Index pour la table `post_interaction`
--
ALTER TABLE `post_interaction`
  ADD PRIMARY KEY (`id`),
  ADD KEY `IDX_DBCD7788A76ED395` (`user_id`),
  ADD KEY `IDX_DBCD77884B89032C` (`post_id`);

--
-- Index pour la table `user`
--
ALTER TABLE `user`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `UNIQ_IDENTIFIER_EMAIL` (`email`);

--
-- Index pour la table `user_interaction`
--
ALTER TABLE `user_interaction`
  ADD PRIMARY KEY (`id`),
  ADD KEY `IDX_9E963432953C1C61` (`source_id`),
  ADD KEY `IDX_9E963432158E0B66` (`target_id`);

--
-- AUTO_INCREMENT pour les tables déchargées
--

--
-- AUTO_INCREMENT pour la table `notifications`
--
ALTER TABLE `notifications`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=20;

--
-- AUTO_INCREMENT pour la table `post`
--
ALTER TABLE `post`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=138;

--
-- AUTO_INCREMENT pour la table `post_interaction`
--
ALTER TABLE `post_interaction`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=37;

--
-- AUTO_INCREMENT pour la table `user`
--
ALTER TABLE `user`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=24;

--
-- AUTO_INCREMENT pour la table `user_interaction`
--
ALTER TABLE `user_interaction`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- Contraintes pour les tables déchargées
--

--
-- Contraintes pour la table `notifications`
--
ALTER TABLE `notifications`
  ADD CONSTRAINT `FK_6000B0D3158E0B66` FOREIGN KEY (`target_id`) REFERENCES `user` (`id`),
  ADD CONSTRAINT `FK_6000B0D3953C1C61` FOREIGN KEY (`source_id`) REFERENCES `user` (`id`);

--
-- Contraintes pour la table `post`
--
ALTER TABLE `post`
  ADD CONSTRAINT `FK_5A8A6C8D21EE7D62` FOREIGN KEY (`original_user_id`) REFERENCES `user` (`id`),
  ADD CONSTRAINT `FK_5A8A6C8DA76ED395` FOREIGN KEY (`user_id`) REFERENCES `user` (`id`),
  ADD CONSTRAINT `FK_5A8A6C8DCD09ADDB` FOREIGN KEY (`original_post_id`) REFERENCES `post` (`id`) ON DELETE SET NULL;

--
-- Contraintes pour la table `post_interaction`
--
ALTER TABLE `post_interaction`
  ADD CONSTRAINT `FK_DBCD77884B89032C` FOREIGN KEY (`post_id`) REFERENCES `post` (`id`),
  ADD CONSTRAINT `FK_DBCD7788A76ED395` FOREIGN KEY (`user_id`) REFERENCES `user` (`id`);

--
-- Contraintes pour la table `user_interaction`
--
ALTER TABLE `user_interaction`
  ADD CONSTRAINT `FK_9E963432158E0B66` FOREIGN KEY (`target_id`) REFERENCES `user` (`id`),
  ADD CONSTRAINT `FK_9E963432953C1C61` FOREIGN KEY (`source_id`) REFERENCES `user` (`id`);
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
