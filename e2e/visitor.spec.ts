import { expect, test } from '@playwright/test';

test('a visitor browses the path, a skill and a lesson', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/Kompri/);
  await expect(page.locator('html')).toHaveAttribute('lang', 'fr');
  await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);
  await page
    .getByRole('link', { name: /^JavaScript : valeurs, types et variables/ })
    .click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    'JavaScript : valeurs, types et variables',
  );
  await page.getByRole('link', { name: 'Commencer le cours' }).click();
  await expect(page.locator('article pre code').first()).toBeVisible();
  // Code blocks are highlighted on the server.
  await expect(page.locator('article .hljs-keyword').first()).toBeVisible();
  await page.getByRole('button', { name: /tuteur IA/ }).click();
  await expect(
    page.getByText('Connecte-toi pour utiliser le tuteur.'),
  ).toBeVisible();
});

test('a visitor searches the lessons', async ({ page }) => {
  await page.goto('/');
  await page
    .getByRole('navigation', { name: 'Navigation principale' })
    .getByRole('link', { name: 'Rechercher' })
    .click();
  await page.getByRole('searchbox').fill('requetes parametrees');
  await page.getByRole('button', { name: 'Rechercher' }).click();
  await expect(page).toHaveURL(/q=requetes\+parametrees/);
  await expect(page.getByRole('heading', { level: 2 })).toContainText(
    'pour « requetes parametrees »',
  );
  await expect(page.locator('mark').first()).toBeVisible();
  await page
    .getByRole('link', { name: /Requêtes paramétrées/ })
    .first()
    .click();
  await expect(page).toHaveURL(/requetes-parametrees-et-injection$/);
});

test('legal pages and the sitemap are published', async ({ page, request }) => {
  for (const path of ['/mentions-legales', '/confidentialite', '/conditions']) {
    await page.goto(path);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  }
  await page.goto('/mentions-legales');
  await expect(
    page.getByText('SIREN : 942 906 157', { exact: false }),
  ).toBeVisible();
  const sitemap = await (await request.get('/sitemap.xml')).text();
  expect(sitemap).toContain('/competences/js-basics');
  const robots = await (await request.get('/robots.txt')).text();
  expect(robots).toContain('Disallow: /oraux/');
});

test('an unknown page answers 404 with a way back', async ({ page }) => {
  const response = await page.goto('/competences/absente');
  expect(response?.status()).toBe(404);
  await expect(
    page.getByRole('link', { name: 'Retour à l’accueil' }),
  ).toBeVisible();
});
