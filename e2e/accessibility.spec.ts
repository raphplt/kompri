import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

/** Fails on any WCAG 2.1 A or AA violation found by axe on the page. */
async function audit(page: Page) {
  const { violations } = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();
  expect(
    violations.map((v) => ({
      rule: v.id,
      impact: v.impact,
      targets: v.nodes.map((n) => n.target.join(' ')),
    })),
  ).toEqual([]);
}

const publicPages = [
  '/',
  '/competences/js-basics',
  '/competences/js-basics/executer-javascript',
  '/defis/js-basics-sans-ia',
  '/recherche?q=promesse',
  '/connexion',
  '/inscription',
  '/mot-de-passe-oublie',
  '/comment-ca-marche',
  '/mentions-legales',
  '/confidentialite',
  '/conditions',
  '/page-inexistante',
  '/mot-de-passe/nouveau?jeton=invalide',
];

for (const path of publicPages) {
  test(`public page ${path} has no WCAG A/AA violation`, async ({ page }) => {
    await page.goto(path);
    await audit(page);
  });
}

test('learner pages have no WCAG A/AA violation', async ({ page }) => {
  await page.goto('/inscription');
  await page.getByLabel('Prénom ou pseudonyme').fill('Alex');
  await page
    .getByLabel('Adresse e-mail')
    .fill(`a11y-${Date.now()}@example.invalid`);
  await page.getByLabel('Mot de passe').fill('une phrase de passe longue');
  await page.getByRole('button', { name: 'Créer mon compte' }).click();
  await expect(page).toHaveURL(/tableau-de-bord/);
  for (const path of [
    '/tableau-de-bord',
    '/compte',
    '/competences/js-basics',
    '/competences/js-basics/executer-javascript',
    '/defis/js-basics-sans-ia',
  ]) {
    await page.goto(path);
    await audit(page);
  }

  await page.goto('/defis/js-basics-sans-ia');
  await page.getByLabel('Ton travail').fill('console.log((8.5).toFixed(2));');
  await page.getByRole('button', { name: 'Enregistrer mon travail' }).click();
  await page.getByRole('button', { name: 'Passer l’oral' }).click();
  await audit(page);
  await page
    .locator('form')
    .getByRole('button', { name: 'Passer l’oral' })
    .click();
  await expect(page.getByRole('timer')).toBeVisible();
  await audit(page);
  const answer =
    'toFixed renvoie une chaîne de caractères arrondie au nombre de ' +
    'décimales demandé, donc le résultat sert à l’affichage et il faut ' +
    'garder le nombre pour continuer les calculs sans erreur.';
  for (let question = 1; question <= 3; question++) {
    await expect(page.getByText(`Question ${question} sur 3`)).toBeVisible();
    await page.getByLabel('Ta réponse').fill(answer);
    await page.getByRole('button', { name: 'Envoyer ma réponse' }).click();
  }
  await expect(
    page.getByRole('heading', { name: 'Compétence validée' }),
  ).toBeVisible();
  await audit(page);
});

test.describe('dark theme', () => {
  test.use({ colorScheme: 'dark' });
  for (const path of [
    '/',
    '/competences/js-basics',
    '/competences/js-basics/executer-javascript',
    '/recherche?q=promesse',
    '/inscription',
  ]) {
    test(`dark page ${path} has no WCAG A/AA violation`, async ({ page }) => {
      await page.goto(path);
      await audit(page);
    });
  }
});
