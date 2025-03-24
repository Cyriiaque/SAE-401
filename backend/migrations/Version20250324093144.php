<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Auto-generated Migration: Please modify to your needs!
 */
final class Version20250324093144 extends AbstractMigration
{
    public function getDescription(): string
    {
        return '';
    }

    public function up(Schema $schema): void
    {
        // this up() migration is auto-generated, please modify it to your needs
        $this->addSql('ALTER TABLE post_interaction DROP FOREIGN KEY FK_DBCD778879F37AE5');
        $this->addSql('ALTER TABLE post_interaction DROP FOREIGN KEY FK_DBCD77889514AA5C');
        $this->addSql('DROP INDEX IDX_DBCD778879F37AE5 ON post_interaction');
        $this->addSql('DROP INDEX IDX_DBCD77889514AA5C ON post_interaction');
        $this->addSql('ALTER TABLE post_interaction ADD user_id INT NOT NULL, ADD post_id INT NOT NULL, DROP id_user_id, DROP id_post_id');
        $this->addSql('ALTER TABLE post_interaction ADD CONSTRAINT FK_DBCD7788A76ED395 FOREIGN KEY (user_id) REFERENCES user (id)');
        $this->addSql('ALTER TABLE post_interaction ADD CONSTRAINT FK_DBCD77884B89032C FOREIGN KEY (post_id) REFERENCES post (id)');
        $this->addSql('CREATE INDEX IDX_DBCD7788A76ED395 ON post_interaction (user_id)');
        $this->addSql('CREATE INDEX IDX_DBCD77884B89032C ON post_interaction (post_id)');
    }

    public function down(Schema $schema): void
    {
        // this down() migration is auto-generated, please modify it to your needs
        $this->addSql('ALTER TABLE post_interaction DROP FOREIGN KEY FK_DBCD7788A76ED395');
        $this->addSql('ALTER TABLE post_interaction DROP FOREIGN KEY FK_DBCD77884B89032C');
        $this->addSql('DROP INDEX IDX_DBCD7788A76ED395 ON post_interaction');
        $this->addSql('DROP INDEX IDX_DBCD77884B89032C ON post_interaction');
        $this->addSql('ALTER TABLE post_interaction ADD id_user_id INT NOT NULL, ADD id_post_id INT NOT NULL, DROP user_id, DROP post_id');
        $this->addSql('ALTER TABLE post_interaction ADD CONSTRAINT FK_DBCD778879F37AE5 FOREIGN KEY (id_user_id) REFERENCES user (id) ON UPDATE NO ACTION ON DELETE NO ACTION');
        $this->addSql('ALTER TABLE post_interaction ADD CONSTRAINT FK_DBCD77889514AA5C FOREIGN KEY (id_post_id) REFERENCES post (id) ON UPDATE NO ACTION ON DELETE NO ACTION');
        $this->addSql('CREATE INDEX IDX_DBCD778879F37AE5 ON post_interaction (id_user_id)');
        $this->addSql('CREATE INDEX IDX_DBCD77889514AA5C ON post_interaction (id_post_id)');
    }
}
