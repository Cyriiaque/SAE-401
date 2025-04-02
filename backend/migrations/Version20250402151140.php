<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Auto-generated Migration: Please modify to your needs!
 */
final class Version20250402151140 extends AbstractMigration
{
    public function getDescription(): string
    {
        return '';
    }

    public function up(Schema $schema): void
    {
        // this up() migration is auto-generated, please modify it to your needs
        $this->addSql('ALTER TABLE post ADD original_post_id INT DEFAULT NULL, ADD retweeted_by_id INT DEFAULT NULL, ADD retweet_count INT DEFAULT 0 NOT NULL');
        $this->addSql('ALTER TABLE post ADD CONSTRAINT FK_5A8A6C8DCD09ADDB FOREIGN KEY (original_post_id) REFERENCES post (id)');
        $this->addSql('ALTER TABLE post ADD CONSTRAINT FK_5A8A6C8D96053B72 FOREIGN KEY (retweeted_by_id) REFERENCES user (id)');
        $this->addSql('CREATE INDEX IDX_5A8A6C8DCD09ADDB ON post (original_post_id)');
        $this->addSql('CREATE INDEX IDX_5A8A6C8D96053B72 ON post (retweeted_by_id)');
    }

    public function down(Schema $schema): void
    {
        // this down() migration is auto-generated, please modify it to your needs
        $this->addSql('ALTER TABLE post DROP FOREIGN KEY FK_5A8A6C8DCD09ADDB');
        $this->addSql('ALTER TABLE post DROP FOREIGN KEY FK_5A8A6C8D96053B72');
        $this->addSql('DROP INDEX IDX_5A8A6C8DCD09ADDB ON post');
        $this->addSql('DROP INDEX IDX_5A8A6C8D96053B72 ON post');
        $this->addSql('ALTER TABLE post DROP original_post_id, DROP retweeted_by_id, DROP retweet_count');
    }
}
