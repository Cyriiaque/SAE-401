<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Auto-generated Migration: Please modify to your needs!
 */
final class Version20250403083937 extends AbstractMigration
{
    public function getDescription(): string
    {
        return '';
    }

    public function up(Schema $schema): void
    {
        // this up() migration is auto-generated, please modify it to your needs
        $this->addSql('ALTER TABLE post ADD original_content VARCHAR(255) DEFAULT NULL, ADD original_media_url VARCHAR(255) DEFAULT NULL, ADD original_created_at DATETIME DEFAULT NULL COMMENT \'(DC2Type:datetime_immutable)\', ADD original_user_id INT DEFAULT NULL, ADD original_user_name VARCHAR(255) DEFAULT NULL, ADD original_user_mention VARCHAR(255) DEFAULT NULL, ADD original_user_avatar VARCHAR(255) DEFAULT NULL');
    }

    public function down(Schema $schema): void
    {
        // this down() migration is auto-generated, please modify it to your needs
        $this->addSql('ALTER TABLE post DROP original_content, DROP original_media_url, DROP original_created_at, DROP original_user_id, DROP original_user_name, DROP original_user_mention, DROP original_user_avatar');
    }
}
