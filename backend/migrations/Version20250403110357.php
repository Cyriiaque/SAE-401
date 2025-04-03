<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Auto-generated Migration: Please modify to your needs!
 */
final class Version20250403110357 extends AbstractMigration
{
    public function getDescription(): string
    {
        return '';
    }

    public function up(Schema $schema): void
    {
        // this up() migration is auto-generated, please modify it to your needs
        $this->addSql('ALTER TABLE post DROP retweeted_user_name, DROP retweeted_user_mention, DROP retweeted_user_avatar');
    }

    public function down(Schema $schema): void
    {
        // this down() migration is auto-generated, please modify it to your needs
        $this->addSql('ALTER TABLE post ADD retweeted_user_name VARCHAR(255) DEFAULT NULL, ADD retweeted_user_mention VARCHAR(255) DEFAULT NULL, ADD retweeted_user_avatar VARCHAR(255) DEFAULT NULL');
    }
}
