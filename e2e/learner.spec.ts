import { expect, test } from '@playwright/test';

const answer =
  'Je convertis explicitement le montant avec Number parce que la saisie est une chaîne de caractères, puis je compare strictement et j’arrondis seulement au moment de l’affichage final.';

test('a learner signs up, reads, passes an oral and can contest it', async ({
  page,
}) => {
  await page.goto('/inscription');
  await page.getByLabel('Prénom ou pseudonyme').fill('Camille');
  await page
    .getByLabel('Adresse e-mail')
    .fill(`e2e-${Date.now()}@example.invalid`);
  await page.getByLabel('Mot de passe').fill('une phrase de passe longue');
  await page.getByRole('button', { name: 'Créer mon compte' }).click();
  await expect(page).toHaveURL(/tableau-de-bord/);
  await expect(page.getByText('Reprendre la lecture')).toBeVisible();

  await page.goto('/competences/js-basics/executer-javascript');
  await page.getByRole('button', { name: 'Marquer comme lue' }).click();
  await expect(page.getByRole('button', { name: /Leçon lue/ })).toBeVisible();

  await page.goto('/tableau-de-bord');
  await page.getByRole('link', { name: 'Lire la leçon' }).click();
  await expect(page).toHaveURL(/\/competences\/js-basics\/[a-z0-9-]+$/);
  await expect(page).not.toHaveURL(/executer-javascript$/);

  await page.goto('/defis/js-basics-sans-ia');
  await page
    .getByLabel('Ton travail')
    .fill('const total = 8.5;\nconsole.log(total.toFixed(2));');
  await page.getByRole('button', { name: 'Enregistrer mon travail' }).click();
  await page.getByRole('button', { name: 'Passer l’oral' }).click();
  await page
    .locator('form')
    .getByRole('button', { name: 'Passer l’oral' })
    .click();
  await expect(page).toHaveURL(/oraux\//);
  await expect(page.getByRole('timer')).toBeVisible();

  for (let question = 1; question <= 3; question++) {
    await expect(page.getByText(`Question ${question} sur 3`)).toBeVisible();
    await page.getByLabel('Ta réponse').fill(answer);
    await page.getByRole('button', { name: 'Envoyer ma réponse' }).click();
  }
  await expect(
    page.getByRole('heading', { name: 'Compétence validée' }),
  ).toBeVisible();
  await expect(page.getByText('Contester ce résultat')).toBeVisible();

  await page.goto('/tableau-de-bord');
  await expect(
    page.getByText('1 compétence validée sur', { exact: false }),
  ).toBeVisible();
  await expect(
    page.getByText('1 leçon lue sur', { exact: false }),
  ).toBeVisible();
});

test('a wrong password is refused without revealing the account', async ({
  page,
}) => {
  await page.goto('/connexion');
  await page.getByLabel('Adresse e-mail').fill('personne@example.invalid');
  await page.getByLabel('Mot de passe').fill('mauvais mot de passe');
  await page.getByRole('button', { name: 'Se connecter' }).click();
  await expect(page.locator('form').getByRole('alert')).toHaveText(
    'Adresse e-mail ou mot de passe incorrect.',
  );
});
